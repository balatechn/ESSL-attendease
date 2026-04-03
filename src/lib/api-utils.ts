import { NextResponse } from "next/server";

export function successResponse(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export function getUserFromHeaders(headers: Headers) {
  return {
    userId: headers.get("x-user-id") || "",
    role: headers.get("x-user-role") || "",
    email: headers.get("x-user-email") || "",
    name: headers.get("x-user-name") || "",
  };
}

export function isAdmin(role: string) {
  return role === "ADMIN";
}

export function isHR(role: string) {
  return role === "HR" || role === "ADMIN";
}

export function isManager(role: string) {
  return role === "MANAGER" || role === "ADMIN";
}
