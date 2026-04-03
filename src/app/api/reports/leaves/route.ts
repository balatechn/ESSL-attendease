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
    const year = parseInt(
      searchParams.get("year") || String(new Date().getFullYear())
    );
    const department = searchParams.get("department");
    const format = searchParams.get("format");

    const where: Record<string, unknown> = {};
    if (department) {
      where.user = { department };
    }

    const leaves = await prisma.leaveApplication.findMany({
      where: {
        ...where,
        status: "HR_APPROVED",
        startDate: {
          gte: new Date(year, 0, 1),
          lte: new Date(year, 11, 31),
        },
      },
      include: {
        user: {
          select: { name: true, department: true, designation: true },
        },
      },
      orderBy: { startDate: "desc" },
    });

    const balances = await prisma.leaveBalance.findMany({
      where: { year },
      include: {
        user: {
          select: { name: true, department: true, isActive: true },
        },
      },
    });

    if (format === "csv") {
      const csvRows = [
        "Name,Department,Leave Type,Start,End,Days,Reason",
      ];
      for (const leave of leaves) {
        csvRows.push(
          [
            leave.user.name,
            leave.user.department || "",
            leave.leaveType,
            leave.startDate.toISOString().split("T")[0],
            leave.endDate.toISOString().split("T")[0],
            leave.totalDays,
            `"${leave.reason}"`,
          ].join(",")
        );
      }

      return new Response(csvRows.join("\n"), {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename=leave-report-${year}.csv`,
        },
      });
    }

    return successResponse({ leaves, balances });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
