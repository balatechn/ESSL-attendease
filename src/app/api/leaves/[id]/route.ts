import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  getUserFromHeaders,
  isManager,
  isHR,
} from "@/lib/api-utils";
import { sendLeaveStatusEmail, sendLeaveToHREmail } from "@/lib/email";

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

    const leave = await prisma.leaveApplication.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, hrId: true } } },
    });

    if (!leave) {
      return errorResponse("Leave application not found", 404);
    }

    // Manager approval
    if (
      leave.status === "PENDING" &&
      isManager(role) &&
      leave.managerId === userId
    ) {
      const newStatus =
        action === "approve" ? "MANAGER_APPROVED" : "REJECTED";

      await prisma.leaveApplication.update({
        where: { id },
        data: {
          status: newStatus,
          managerNote: note,
          managerActedAt: new Date(),
        },
      });

      await prisma.notification.create({
        data: {
          userId: leave.userId,
          title: `Leave ${action === "approve" ? "Approved by Manager" : "Rejected"}`,
          message: note || `Your leave has been ${action}d by manager`,
          type: "LEAVE",
          link: "/leaves",
        },
      });

      // Email employee about manager decision
      const empUser = await prisma.user.findUnique({ where: { id: leave.userId }, select: { email: true, name: true } });
      const mgrUser = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
      if (empUser) {
        sendLeaveStatusEmail(
          empUser.email, empUser.name, leave.leaveType,
          leave.startDate.toISOString().split("T")[0],
          leave.endDate.toISOString().split("T")[0],
          leave.totalDays, newStatus, mgrUser?.name || "Manager", "Manager", note
        );
      }

      if (newStatus === "MANAGER_APPROVED" && leave.user.hrId) {
        await prisma.notification.create({
          data: {
            userId: leave.user.hrId,
            title: "Leave Pending HR Approval",
            message: `${leave.user.name}'s leave needs approval`,
            type: "LEAVE",
            link: "/approvals",
          },
        });

        // Email HR about pending approval
        const hrUser = await prisma.user.findUnique({ where: { id: leave.user.hrId }, select: { email: true, name: true } });
        if (hrUser) {
          sendLeaveToHREmail(
            hrUser.email, hrUser.name, leave.user.name,
            leave.leaveType,
            leave.startDate.toISOString().split("T")[0],
            leave.endDate.toISOString().split("T")[0],
            leave.totalDays, leave.reason
          );
        }
      }

      return successResponse({ status: newStatus });
    }

    // HR approval
    if (leave.status === "MANAGER_APPROVED" && isHR(role)) {
      const newStatus =
        action === "approve" ? "HR_APPROVED" : "REJECTED";

      await prisma.leaveApplication.update({
        where: { id },
        data: {
          status: newStatus,
          hrId: userId,
          hrNote: note,
          hrActedAt: new Date(),
        },
      });

      // Deduct leave balance on HR approval
      if (newStatus === "HR_APPROVED") {
        await prisma.leaveBalance.update({
          where: {
            userId_year_leaveType: {
              userId: leave.userId,
              year: new Date().getFullYear(),
              leaveType: leave.leaveType,
            },
          },
          data: {
            used: { increment: leave.totalDays },
            remaining: { decrement: leave.totalDays },
          },
        });

        // Mark attendance as on leave
        const current = new Date(leave.startDate);
        while (current <= leave.endDate) {
          if (current.getDay() !== 0 && current.getDay() !== 6) {
            await prisma.attendance.upsert({
              where: {
                userId_date: {
                  userId: leave.userId,
                  date: new Date(current),
                },
              },
              update: { status: "ON_LEAVE" },
              create: {
                userId: leave.userId,
                date: new Date(current),
                status: "ON_LEAVE",
                source: "MANUAL",
              },
            });
          }
          current.setDate(current.getDate() + 1);
        }
      }

      await prisma.notification.create({
        data: {
          userId: leave.userId,
          title: `Leave ${action === "approve" ? "Fully Approved" : "Rejected by HR"}`,
          message: note || `Your leave has been ${action}d by HR`,
          type: "LEAVE",
          link: "/leaves",
        },
      });

      // Email employee about HR decision
      const empForHR = await prisma.user.findUnique({ where: { id: leave.userId }, select: { email: true, name: true } });
      const hrActor = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
      if (empForHR) {
        sendLeaveStatusEmail(
          empForHR.email, empForHR.name, leave.leaveType,
          leave.startDate.toISOString().split("T")[0],
          leave.endDate.toISOString().split("T")[0],
          leave.totalDays, newStatus, hrActor?.name || "HR", "HR", note
        );
      }

      return successResponse({ status: newStatus });
    }

    return errorResponse("Cannot process this action in current state");
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
