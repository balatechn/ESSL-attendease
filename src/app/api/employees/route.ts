import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const department = searchParams.get("department") || "";

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { biometricId: { contains: search, mode: "insensitive" } },
      ];
    }
    if (department) {
      where.department = department;
    }

    const [employees, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          department: true,
          designation: true,
          biometricId: true,
          phone: true,
          isActive: true,
          joiningDate: true,
          manager: { select: { id: true, name: true } },
          hr: { select: { id: true, name: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: "asc" },
      }),
      prisma.user.count({ where }),
    ]);

    return successResponse({
      employees,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { role } = getUserFromHeaders(req.headers);
    if (!isAdmin(role) && !isHR(role)) {
      return errorResponse("Forbidden", 403);
    }

    const body = await req.json();
    const {
      name,
      email,
      password,
      role: empRole,
      biometricId,
      department,
      designation,
      phone,
      managerId,
      hrId,
      joiningDate,
    } = body;

    if (!name || !email || !password) {
      return errorResponse("Name, email, and password are required");
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return errorResponse("Email already exists");
    }

    if (biometricId) {
      const existingBio = await prisma.user.findUnique({
        where: { biometricId },
      });
      if (existingBio) {
        return errorResponse("Biometric ID already mapped");
      }
    }

    const hashedPassword = await hashPassword(password);

    const employee = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: empRole || "EMPLOYEE",
        biometricId,
        department,
        designation,
        phone,
        managerId,
        hrId,
        joiningDate: joiningDate ? new Date(joiningDate) : null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        designation: true,
        biometricId: true,
      },
    });

    // Create default leave balances for current year
    const currentYear = new Date().getFullYear();
    await prisma.leaveBalance.createMany({
      data: [
        {
          userId: employee.id,
          year: currentYear,
          leaveType: "CL",
          total: 12,
          used: 0,
          remaining: 12,
        },
        {
          userId: employee.id,
          year: currentYear,
          leaveType: "SL",
          total: 12,
          used: 0,
          remaining: 12,
        },
        {
          userId: employee.id,
          year: currentYear,
          leaveType: "EL",
          total: 15,
          used: 0,
          remaining: 15,
        },
      ],
    });

    return successResponse(employee, 201);
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
