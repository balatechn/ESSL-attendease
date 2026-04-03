import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-utils";

// Seed endpoint - only works if no users exist
export async function POST(req: NextRequest) {
  try {
    const count = await prisma.user.count();
    if (count > 0) {
      return errorResponse("Seed data already exists. Delete all users first.");
    }

    const adminPassword = await hashPassword("Natty@2025!!");
    const userPassword = await hashPassword("user123");

    // Create admin
    const admin = await prisma.user.create({
      data: {
        name: "System Admin",
        email: "bpillai100@gmail.com",
        password: adminPassword,
        role: "ADMIN",
        department: "IT",
        designation: "Administrator",
      },
    });

    // Create HR
    const hr = await prisma.user.create({
      data: {
        name: "HR Manager",
        email: "hr@attendease.com",
        password: userPassword,
        role: "HR",
        department: "Human Resources",
        designation: "HR Manager",
      },
    });

    // Create Manager
    const manager = await prisma.user.create({
      data: {
        name: "Team Lead",
        email: "manager@attendease.com",
        password: userPassword,
        role: "MANAGER",
        department: "Engineering",
        designation: "Team Lead",
        hrId: hr.id,
      },
    });

    // Create Employees
    const emp1 = await prisma.user.create({
      data: {
        name: "John Doe",
        email: "john@attendease.com",
        password: userPassword,
        role: "EMPLOYEE",
        department: "Engineering",
        designation: "Software Engineer",
        biometricId: "1001",
        managerId: manager.id,
        hrId: hr.id,
      },
    });

    const emp2 = await prisma.user.create({
      data: {
        name: "Jane Smith",
        email: "jane@attendease.com",
        password: userPassword,
        role: "EMPLOYEE",
        department: "Engineering",
        designation: "Frontend Developer",
        biometricId: "1002",
        managerId: manager.id,
        hrId: hr.id,
      },
    });

    // Create leave balances for all users
    const currentYear = new Date().getFullYear();
    const allUsers = [admin, hr, manager, emp1, emp2];
    
    for (const user of allUsers) {
      await prisma.leaveBalance.createMany({
        data: [
          { userId: user.id, year: currentYear, leaveType: "CL", total: 12, used: 0, remaining: 12 },
          { userId: user.id, year: currentYear, leaveType: "SL", total: 12, used: 0, remaining: 12 },
          { userId: user.id, year: currentYear, leaveType: "EL", total: 15, used: 0, remaining: 15 },
        ],
      });
    }

    return successResponse({
      message: "Seed data created successfully",
      users: [
        { email: "bpillai100@gmail.com", password: "********", role: "ADMIN" },
        { email: "hr@attendease.com", password: "user123", role: "HR" },
        { email: "manager@attendease.com", password: "user123", role: "MANAGER" },
        { email: "john@attendease.com", password: "user123", role: "EMPLOYEE" },
        { email: "jane@attendease.com", password: "user123", role: "EMPLOYEE" },
      ],
    });
  } catch (error) {
    console.error("Seed error:", error);
    return errorResponse("Failed to seed data", 500);
  }
}
