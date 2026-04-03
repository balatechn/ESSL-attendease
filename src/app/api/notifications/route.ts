import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  getUserFromHeaders,
} from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const { userId } = getUserFromHeaders(req.headers);

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    return successResponse({ notifications, unreadCount });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { userId } = getUserFromHeaders(req.headers);
    const { id, markAll } = await req.json();

    if (markAll) {
      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });
    } else if (id) {
      await prisma.notification.update({
        where: { id },
        data: { isRead: true },
      });
    }

    return successResponse({ message: "Notifications updated" });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
