import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  getUserFromHeaders,
  isAdmin,
  isHR,
} from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const { role } = getUserFromHeaders(req.headers);
    if (!isAdmin(role) && !isHR(role)) {
      return errorResponse("Forbidden", 403);
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "daily";
    const date = searchParams.get("date");
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const department = searchParams.get("department");
    const format = searchParams.get("format"); // json, csv

    let where: Record<string, unknown> = {};

    if (type === "daily" && date) {
      where.date = new Date(date);
    } else if (type === "monthly" && month && year) {
      where.date = {
        gte: new Date(parseInt(year), parseInt(month) - 1, 1),
        lte: new Date(parseInt(year), parseInt(month), 0),
      };
    }

    if (department) {
      where.user = { department };
    }

    const attendance = await prisma.attendance.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            designation: true,
            biometricId: true,
          },
        },
      },
      orderBy: [{ date: "desc" }, { user: { name: "asc" } }],
    });

    if (format === "csv") {
      const csvRows = [
        "Name,Department,Date,First In,Last Out,Total Hours,Status,Late",
      ];
      for (const record of attendance) {
        csvRows.push(
          [
            record.user.name,
            record.user.department || "",
            record.date.toISOString().split("T")[0],
            record.firstIn
              ? new Date(record.firstIn).toLocaleTimeString()
              : "",
            record.lastOut
              ? new Date(record.lastOut).toLocaleTimeString()
              : "",
            record.totalHours?.toFixed(2) || "0",
            record.status,
            record.isLate ? "Yes" : "No",
          ].join(",")
        );
      }

      return new Response(csvRows.join("\n"), {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename=attendance-${type}-${date || `${year}-${month}`}.csv`,
        },
      });
    }

    // Summary stats
    const total = attendance.length;
    const present = attendance.filter(
      (a) => a.status === "PRESENT" || a.status === "HALF_DAY"
    ).length;
    const absent = attendance.filter((a) => a.status === "ABSENT").length;
    const late = attendance.filter((a) => a.isLate).length;
    const onLeave = attendance.filter((a) => a.status === "ON_LEAVE").length;

    return successResponse({
      records: attendance,
      summary: { total, present, absent, late, onLeave },
    });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
