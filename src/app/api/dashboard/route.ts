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
    const { userId, role } = getUserFromHeaders(req.headers);
    const { searchParams } = new URL(req.url);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Today's attendance summary
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isAdminOrHR = isAdmin(role) || isHR(role);

    const [
      todayAttendance,
      monthlyAttendance,
      pendingLeaves,
      pendingRegularizations,
      leaveBalances,
      recentNotifications,
    ] = await Promise.all([
      // Today's attendance for current user
      prisma.attendance.findUnique({
        where: { userId_date: { userId, date: today } },
      }),
      // Monthly attendance summary
      prisma.attendance.findMany({
        where: {
          userId,
          date: {
            gte: new Date(currentYear, currentMonth - 1, 1),
            lte: new Date(currentYear, currentMonth, 0),
          },
        },
      }),
      // Pending leaves (for approvers or own)
      isAdminOrHR
        ? prisma.leaveApplication.count({
            where: { status: { in: ["PENDING", "MANAGER_APPROVED"] } },
          })
        : prisma.leaveApplication.count({
            where: { userId, status: "PENDING" },
          }),
      // Pending regularizations
      isAdminOrHR
        ? prisma.regularization.count({
            where: { status: { in: ["PENDING", "MANAGER_APPROVED"] } },
          })
        : prisma.regularization.count({
            where: { userId, status: "PENDING" },
          }),
      // Leave balances
      prisma.leaveBalance.findMany({
        where: { userId, year: currentYear },
      }),
      // Recent notifications
      prisma.notification.findMany({
        where: { userId, isRead: false },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    // Monthly stats
    const presentDays = monthlyAttendance.filter(
      (a) => a.status === "PRESENT" || a.status === "HALF_DAY"
    ).length;
    const absentDays = monthlyAttendance.filter(
      (a) => a.status === "ABSENT"
    ).length;
    const lateDays = monthlyAttendance.filter((a) => a.isLate).length;
    const leaveDays = monthlyAttendance.filter(
      (a) => a.status === "ON_LEAVE"
    ).length;

    // Team stats for managers
    let teamStats = null;
    if (isAdmin(role) || role === "MANAGER") {
      const teamWhere = isAdmin(role)
        ? {}
        : { managerId: userId };

      const totalEmployees = await prisma.user.count({
        where: { ...teamWhere, isActive: true },
      });

      const presentToday = await prisma.attendance.count({
        where: {
          date: today,
          status: { in: ["PRESENT", "HALF_DAY"] },
          user: teamWhere,
        },
      });

      teamStats = { totalEmployees, presentToday };
    }

    return successResponse({
      todayAttendance,
      monthlyStats: {
        presentDays,
        absentDays,
        lateDays,
        leaveDays,
        totalWorking: monthlyAttendance.length,
      },
      pendingLeaves,
      pendingRegularizations,
      leaveBalances,
      recentNotifications,
      teamStats,
    });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
