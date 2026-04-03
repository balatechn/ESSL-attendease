import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  getUserFromHeaders,
  isManager,
  isHR,
} from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const { userId, role } = getUserFromHeaders(req.headers);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    const where: Record<string, unknown> = {};

    if (type === "pending-manager" && isManager(role)) {
      where.managerId = userId;
      where.status = "PENDING";
    } else if (type === "pending-hr" && isHR(role)) {
      where.status = "MANAGER_APPROVED";
    } else {
      where.userId = userId;
    }

    if (status && !type) {
      where.status = status;
    }

    const leaves = await prisma.leaveApplication.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, department: true } },
        manager: { select: { id: true, name: true } },
        hr: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(leaves);
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = getUserFromHeaders(req.headers);
    const { leaveType, startDate, endDate, reason } = await req.json();

    if (!leaveType || !startDate || !endDate || !reason) {
      return errorResponse("All fields are required");
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Calculate business days
    let totalDays = 0;
    const current = new Date(start);
    while (current <= end) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) totalDays++;
      current.setDate(current.getDate() + 1);
    }

    if (totalDays <= 0) {
      return errorResponse("Invalid date range");
    }

    // Check leave balance
    const currentYear = new Date().getFullYear();
    const balance = await prisma.leaveBalance.findUnique({
      where: {
        userId_year_leaveType: {
          userId,
          year: currentYear,
          leaveType,
        },
      },
    });

    if (!balance || balance.remaining < totalDays) {
      return errorResponse(
        `Insufficient ${leaveType} balance. Available: ${balance?.remaining || 0}`
      );
    }

    // Check for overlapping leaves
    const overlapping = await prisma.leaveApplication.findFirst({
      where: {
        userId,
        status: { notIn: ["REJECTED", "CANCELLED"] },
        OR: [
          { startDate: { lte: end }, endDate: { gte: start } },
        ],
      },
    });

    if (overlapping) {
      return errorResponse("Overlapping leave application exists");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { managerId: true, hrId: true, name: true },
    });

    const leave = await prisma.leaveApplication.create({
      data: {
        userId,
        leaveType,
        startDate: start,
        endDate: end,
        totalDays,
        reason,
        managerId: user?.managerId,
        hrId: user?.hrId,
      },
    });

    // Notify manager
    if (user?.managerId) {
      await prisma.notification.create({
        data: {
          userId: user.managerId,
          title: "New Leave Application",
          message: `${user.name} applied for ${leaveType} (${totalDays} days)`,
          type: "LEAVE",
          link: "/approvals",
        },
      });
    }

    return successResponse(leave, 201);
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
