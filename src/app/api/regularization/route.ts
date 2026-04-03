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
    const type = searchParams.get("type"); // pending-manager, pending-hr

    const where: Record<string, unknown> = {};

    if (type === "pending-manager" && isManager(role)) {
      where.managerId = userId;
      where.status = "PENDING";
    } else if (type === "pending-hr" && isHR(role)) {
      where.status = "MANAGER_APPROVED";
    } else {
      where.userId = userId;
    }

    if (status && type !== "pending-manager" && type !== "pending-hr") {
      where.status = status;
    }

    const regularizations = await prisma.regularization.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, department: true } },
        manager: { select: { id: true, name: true } },
        hr: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(regularizations);
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = getUserFromHeaders(req.headers);
    const { date, reason, requestedIn, requestedOut } = await req.json();

    if (!date || !reason) {
      return errorResponse("Date and reason are required");
    }

    // Check max 3 per month
    const requestDate = new Date(date);
    const monthStart = new Date(
      requestDate.getFullYear(),
      requestDate.getMonth(),
      1
    );
    const monthEnd = new Date(
      requestDate.getFullYear(),
      requestDate.getMonth() + 1,
      0
    );

    const count = await prisma.regularization.count({
      where: {
        userId,
        date: { gte: monthStart, lte: monthEnd },
        status: { not: "REJECTED" },
      },
    });

    const maxPerMonth = parseInt(
      process.env.MAX_REGULARIZATIONS_PER_MONTH || "3"
    );
    if (count >= maxPerMonth) {
      return errorResponse(
        `Maximum ${maxPerMonth} regularizations per month allowed`
      );
    }

    // Get user's manager
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { managerId: true, hrId: true },
    });

    const regularization = await prisma.regularization.create({
      data: {
        userId,
        date: requestDate,
        reason,
        requestedIn: requestedIn ? new Date(requestedIn) : null,
        requestedOut: requestedOut ? new Date(requestedOut) : null,
        managerId: user?.managerId,
        hrId: user?.hrId,
      },
    });

    // Notify manager
    if (user?.managerId) {
      await prisma.notification.create({
        data: {
          userId: user.managerId,
          title: "New Regularization Request",
          message: `Regularization request for ${requestDate.toLocaleDateString()}`,
          type: "REGULARIZATION",
          link: "/approvals",
        },
      });
    }

    return successResponse(regularization, 201);
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
