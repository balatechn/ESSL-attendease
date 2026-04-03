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
    const { searchParams } = new URL(req.url);
    const year = parseInt(
      searchParams.get("year") || String(new Date().getFullYear())
    );
    const employeeId = searchParams.get("employeeId") || userId;

    const balances = await prisma.leaveBalance.findMany({
      where: { userId: employeeId, year },
    });

    return successResponse(balances);
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
