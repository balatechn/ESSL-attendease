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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const employee = await prisma.user.findUnique({
      where: { id },
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
        createdAt: true,
        manager: { select: { id: true, name: true } },
        hr: { select: { id: true, name: true } },
        leaveBalances: {
          where: { year: new Date().getFullYear() },
        },
      },
    });

    if (!employee) {
      return errorResponse("Employee not found", 404);
    }

    return successResponse(employee);
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { role } = getUserFromHeaders(req.headers);
    if (!isAdmin(role) && !isHR(role)) {
      return errorResponse("Forbidden", 403);
    }

    const { id } = await params;
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
      isActive,
    } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (empRole !== undefined) updateData.role = empRole;
    if (biometricId !== undefined) updateData.biometricId = biometricId;
    if (department !== undefined) updateData.department = department;
    if (designation !== undefined) updateData.designation = designation;
    if (phone !== undefined) updateData.phone = phone;
    if (managerId !== undefined) updateData.managerId = managerId;
    if (hrId !== undefined) updateData.hrId = hrId;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (joiningDate !== undefined)
      updateData.joiningDate = joiningDate ? new Date(joiningDate) : null;
    if (password) updateData.password = await hashPassword(password);

    const employee = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        designation: true,
        biometricId: true,
        isActive: true,
      },
    });

    return successResponse(employee);
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { role } = getUserFromHeaders(req.headers);
    if (!isAdmin(role)) {
      return errorResponse("Forbidden", 403);
    }

    const { id } = await params;
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return successResponse({ message: "Employee deactivated" });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
