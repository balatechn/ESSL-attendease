import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  getUserFromHeaders,
  isManager,
  isHR,
} from "@/lib/api-utils";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, role } = getUserFromHeaders(req.headers);
    const { id } = await params;
    const { action, note } = await req.json();

    if (!["approve", "reject"].includes(action)) {
      return errorResponse("Invalid action");
    }

    const regularization = await prisma.regularization.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, hrId: true } } },
    });

    if (!regularization) {
      return errorResponse("Regularization not found", 404);
    }

    // Manager approval
    if (
      regularization.status === "PENDING" &&
      isManager(role) &&
      regularization.managerId === userId
    ) {
      const newStatus =
        action === "approve" ? "MANAGER_APPROVED" : "REJECTED";

      await prisma.regularization.update({
        where: { id },
        data: {
          status: newStatus,
          managerNote: note,
          managerActedAt: new Date(),
        },
      });

      // Notify employee
      await prisma.notification.create({
        data: {
          userId: regularization.userId,
          title: `Regularization ${action === "approve" ? "Approved by Manager" : "Rejected"}`,
          message: note || `Your regularization request has been ${action}d`,
          type: "REGULARIZATION",
          link: "/regularization",
        },
      });

      // If approved, notify HR
      if (newStatus === "MANAGER_APPROVED" && regularization.user.hrId) {
        await prisma.notification.create({
          data: {
            userId: regularization.user.hrId,
            title: "Regularization Pending HR Approval",
            message: `${regularization.user.name}'s regularization needs your approval`,
            type: "REGULARIZATION",
            link: "/approvals",
          },
        });
      }

      return successResponse({ status: newStatus });
    }

    // HR approval
    if (
      regularization.status === "MANAGER_APPROVED" &&
      isHR(role)
    ) {
      const newStatus =
        action === "approve" ? "HR_APPROVED" : "REJECTED";

      await prisma.regularization.update({
        where: { id },
        data: {
          status: newStatus,
          hrId: userId,
          hrNote: note,
          hrActedAt: new Date(),
        },
      });

      // If HR approved, update attendance
      if (newStatus === "HR_APPROVED") {
        await prisma.attendance.upsert({
          where: {
            userId_date: {
              userId: regularization.userId,
              date: regularization.date,
            },
          },
          update: {
            firstIn: regularization.requestedIn,
            lastOut: regularization.requestedOut,
            status: "PRESENT",
            source: "REGULARIZED",
            totalHours:
              regularization.requestedIn && regularization.requestedOut
                ? (regularization.requestedOut.getTime() -
                    regularization.requestedIn.getTime()) /
                  (1000 * 60 * 60)
                : 8,
            isLate: false,
            lateMinutes: 0,
          },
          create: {
            userId: regularization.userId,
            date: regularization.date,
            firstIn: regularization.requestedIn,
            lastOut: regularization.requestedOut,
            status: "PRESENT",
            source: "REGULARIZED",
            totalHours: 8,
          },
        });
      }

      // Notify employee
      await prisma.notification.create({
        data: {
          userId: regularization.userId,
          title: `Regularization ${action === "approve" ? "Fully Approved" : "Rejected by HR"}`,
          message: note || `Your regularization has been ${action}d by HR`,
          type: "REGULARIZATION",
          link: "/regularization",
        },
      });

      return successResponse({ status: newStatus });
    }

    return errorResponse("Cannot process this action in current state");
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
