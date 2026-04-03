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
    const date = searchParams.get("date");
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const employeeId = searchParams.get("employeeId");

    const targetUserId =
      isAdmin(role) || isHR(role) ? employeeId || userId : userId;

    const where: Record<string, unknown> = { userId: targetUserId };

    if (date) {
      where.date = new Date(date);
    } else if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0);
      where.date = { gte: startDate, lte: endDate };
    }

    const attendance = await prisma.attendance.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, department: true } },
      },
      orderBy: { date: "desc" },
    });

    return successResponse(attendance);
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
