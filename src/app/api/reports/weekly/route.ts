import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  getUserFromHeaders,
  isAdmin,
  isHR,
} from "@/lib/api-utils";
import { sendWeeklyAttendanceReport } from "@/lib/email";

// GET: Generate and optionally email weekly attendance report
// Query params: ?email=true to send email, ?weekStart=YYYY-MM-DD
export async function GET(req: NextRequest) {
  try {
    const { role } = getUserFromHeaders(req.headers);
    if (!isAdmin(role) && !isHR(role)) {
      return errorResponse("Forbidden", 403);
    }

    const { searchParams } = new URL(req.url);
    const shouldEmail = searchParams.get("email") === "true";

    // Calculate week range (Monday to Sunday)
    let weekStart: Date;
    const weekStartParam = searchParams.get("weekStart");
    if (weekStartParam) {
      weekStart = new Date(weekStartParam);
    } else {
      // Default: last complete week (previous Monday to Sunday)
      const today = new Date();
      const dayOfWeek = today.getDay();
      const daysToLastMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      weekStart = new Date(today);
      weekStart.setDate(today.getDate() - daysToLastMonday - 7);
    }
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const weekRange = `${weekStart.toISOString().split("T")[0]} to ${weekEnd.toISOString().split("T")[0]}`;

    // Fetch all active employees
    const employees = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        department: true,
        designation: true,
        email: true,
      },
      orderBy: [{ department: "asc" }, { name: "asc" }],
    });

    // Fetch attendance for the week
    const attendances = await prisma.attendance.findMany({
      where: {
        date: { gte: weekStart, lte: weekEnd },
      },
      select: {
        userId: true,
        date: true,
        status: true,
        firstIn: true,
        lastOut: true,
        totalHours: true,
        isLate: true,
        lateMinutes: true,
      },
    });

    // Build attendance map: userId -> date -> record
    const attendanceMap = new Map<string, Map<string, typeof attendances[0]>>();
    for (const a of attendances) {
      if (!attendanceMap.has(a.userId)) {
        attendanceMap.set(a.userId, new Map());
      }
      attendanceMap.get(a.userId)!.set(
        new Date(a.date).toISOString().split("T")[0],
        a
      );
    }

    // Fetch approved leaves for the week
    const leaves = await prisma.leaveApplication.findMany({
      where: {
        status: "HR_APPROVED",
        startDate: { lte: weekEnd },
        endDate: { gte: weekStart },
      },
      select: { userId: true, startDate: true, endDate: true, leaveType: true },
    });

    const leaveMap = new Map<string, Set<string>>();
    for (const l of leaves) {
      if (!leaveMap.has(l.userId)) {
        leaveMap.set(l.userId, new Set());
      }
      const d = new Date(l.startDate);
      while (d <= l.endDate && d <= weekEnd) {
        if (d >= weekStart) {
          leaveMap.get(l.userId)!.add(d.toISOString().split("T")[0]);
        }
        d.setDate(d.getDate() + 1);
      }
    }

    // Generate dates for the week (Mon-Fri)
    const weekDates: string[] = [];
    const d = new Date(weekStart);
    while (d <= weekEnd) {
      if (d.getDay() !== 0 && d.getDay() !== 6) {
        weekDates.push(d.toISOString().split("T")[0]);
      }
      d.setDate(d.getDate() + 1);
    }

    // Build report
    const report = employees.map((emp) => {
      const empAttendance = attendanceMap.get(emp.id);
      const empLeaves = leaveMap.get(emp.id);

      let presentDays = 0;
      let absentDays = 0;
      let lateDays = 0;
      let leaveDays = 0;
      let halfDays = 0;
      let totalHours = 0;

      const dailyStatus: Record<string, string> = {};

      for (const date of weekDates) {
        const record = empAttendance?.get(date);
        const onLeave = empLeaves?.has(date);

        if (onLeave || record?.status === "ON_LEAVE") {
          dailyStatus[date] = "L";
          leaveDays++;
        } else if (record) {
          if (record.status === "PRESENT") {
            dailyStatus[date] = record.isLate ? "P*" : "P";
            presentDays++;
            if (record.isLate) lateDays++;
          } else if (record.status === "HALF_DAY") {
            dailyStatus[date] = "H";
            halfDays++;
          } else {
            dailyStatus[date] = "A";
            absentDays++;
          }
          totalHours += record.totalHours || 0;
        } else {
          dailyStatus[date] = "A";
          absentDays++;
        }
      }

      return {
        name: emp.name,
        department: emp.department || "-",
        designation: emp.designation || "-",
        presentDays,
        absentDays,
        lateDays,
        leaveDays,
        halfDays,
        totalHours: Math.round(totalHours * 100) / 100,
        dailyStatus,
      };
    });

    // Generate HTML table for email
    if (shouldEmail) {
      const dayHeaders = weekDates
        .map((d) => {
          const day = new Date(d).toLocaleDateString("en-US", { weekday: "short" });
          const dateNum = new Date(d).getDate();
          return `<th style="padding: 6px 8px; border: 1px solid #d1d5db; background: #f3f4f6; font-size: 11px;">${day}<br>${dateNum}</th>`;
        })
        .join("");

      const rows = report
        .map(
          (r) => `
          <tr>
            <td style="padding: 6px 8px; border: 1px solid #d1d5db; white-space: nowrap;">${r.name}</td>
            <td style="padding: 6px 8px; border: 1px solid #d1d5db;">${r.department}</td>
            ${weekDates
              .map((d) => {
                const s = r.dailyStatus[d];
                const bg =
                  s === "P" ? "#dcfce7" : s === "P*" ? "#fef9c3" : s === "A" ? "#fecaca" : s === "L" ? "#dbeafe" : s === "H" ? "#fde68a" : "#fff";
                return `<td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: center; background: ${bg}; font-weight: bold;">${s}</td>`;
              })
              .join("")}
            <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: center;">${r.presentDays}</td>
            <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: center;">${r.absentDays}</td>
            <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: center;">${r.lateDays}</td>
            <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: center;">${r.leaveDays}</td>
            <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: center;">${r.totalHours}h</td>
          </tr>`
        )
        .join("");

      const reportHtml = `
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 12px;">
            <thead>
              <tr>
                <th style="padding: 6px 8px; border: 1px solid #d1d5db; background: #1e40af; color: white; text-align: left;">Employee</th>
                <th style="padding: 6px 8px; border: 1px solid #d1d5db; background: #1e40af; color: white; text-align: left;">Dept</th>
                ${dayHeaders}
                <th style="padding: 6px 8px; border: 1px solid #d1d5db; background: #1e40af; color: white;">P</th>
                <th style="padding: 6px 8px; border: 1px solid #d1d5db; background: #1e40af; color: white;">A</th>
                <th style="padding: 6px 8px; border: 1px solid #d1d5db; background: #1e40af; color: white;">Late</th>
                <th style="padding: 6px 8px; border: 1px solid #d1d5db; background: #1e40af; color: white;">Leave</th>
                <th style="padding: 6px 8px; border: 1px solid #d1d5db; background: #1e40af; color: white;">Hours</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <p style="margin-top: 12px; font-size: 12px; color: #6b7280;">
          <strong>Legend:</strong> P = Present, P* = Present (Late), A = Absent, L = On Leave, H = Half Day
        </p>
      `;

      // Send to all admins
      const admins = await prisma.user.findMany({
        where: { role: "ADMIN", isActive: true },
        select: { email: true, name: true },
      });

      for (const admin of admins) {
        await sendWeeklyAttendanceReport(
          admin.email,
          admin.name,
          reportHtml,
          weekRange
        );
      }

      return successResponse({
        message: `Weekly report emailed to ${admins.length} admin(s)`,
        weekRange,
        employeeCount: report.length,
      });
    }

    return successResponse({ weekRange, weekDates, report });
  } catch (error) {
    console.error("Weekly report error:", error);
    return errorResponse("Failed to generate weekly report", 500);
  }
}
