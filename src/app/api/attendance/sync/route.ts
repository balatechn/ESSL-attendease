import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { fetchBiometricData } from "@/lib/mssql";
import {
  successResponse,
  errorResponse,
  getUserFromHeaders,
  isAdmin,
  isHR,
} from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  try {
    const { role } = getUserFromHeaders(req.headers);
    if (!isAdmin(role) && !isHR(role)) {
      return errorResponse("Forbidden", 403);
    }

    const { fromDate, toDate } = await req.json();
    if (!fromDate || !toDate) {
      return errorResponse("fromDate and toDate are required");
    }

    const officeStart = process.env.OFFICE_START_TIME || "09:00";
    const lateThreshold = parseInt(
      process.env.LATE_THRESHOLD_MINUTES || "15"
    );

    // Fetch from SQL Server
    const punches = await fetchBiometricData(fromDate, toDate);

    // Group by user and date
    const grouped: Record<
      string,
      Record<string, Date[]>
    > = {};

    for (const punch of punches) {
      const uid = punch.UserId;
      const dateKey = new Date(punch.LogDate).toISOString().split("T")[0];
      if (!grouped[uid]) grouped[uid] = {};
      if (!grouped[uid][dateKey]) grouped[uid][dateKey] = [];
      grouped[uid][dateKey].push(new Date(punch.LogDate));
    }

    let synced = 0;

    // Map biometric users to internal users
    const biometricUsers = await prisma.user.findMany({
      where: { biometricId: { not: null } },
      select: { id: true, biometricId: true },
    });

    const bioMap = new Map(
      biometricUsers.map((u) => [u.biometricId!, u.id])
    );

    for (const [bioId, dates] of Object.entries(grouped)) {
      const internalUserId = bioMap.get(bioId);
      if (!internalUserId) continue;

      for (const [dateStr, timestamps] of Object.entries(dates)) {
        timestamps.sort((a, b) => a.getTime() - b.getTime());
        const firstIn = timestamps[0];
        const lastOut = timestamps.length > 1
          ? timestamps[timestamps.length - 1]
          : null;

        const totalHours = lastOut
          ? (lastOut.getTime() - firstIn.getTime()) / (1000 * 60 * 60)
          : 0;

        // Calculate late mark
        const [startHour, startMin] = officeStart.split(":").map(Number);
        const officeStartMinutes = startHour * 60 + startMin;
        const inMinutes =
          firstIn.getHours() * 60 + firstIn.getMinutes();
        const isLate = inMinutes > officeStartMinutes + lateThreshold;
        const lateMinutes = isLate
          ? inMinutes - officeStartMinutes
          : 0;

        const status = totalHours >= 4 && totalHours < 7
          ? "HALF_DAY"
          : totalHours >= 7
          ? "PRESENT"
          : "ABSENT";

        await prisma.attendance.upsert({
          where: {
            userId_date: {
              userId: internalUserId,
              date: new Date(dateStr),
            },
          },
          update: {
            firstIn,
            lastOut,
            totalHours: Math.round(totalHours * 100) / 100,
            isLate,
            lateMinutes,
            status,
            source: "BIOMETRIC",
          },
          create: {
            userId: internalUserId,
            date: new Date(dateStr),
            firstIn,
            lastOut,
            totalHours: Math.round(totalHours * 100) / 100,
            isLate,
            lateMinutes,
            status,
            source: "BIOMETRIC",
          },
        });

        synced++;
      }
    }

    return successResponse({ synced, message: `Synced ${synced} records` });
  } catch (error) {
    console.error("Sync error:", error);
    return errorResponse("Failed to sync biometric data", 500);
  }
}
