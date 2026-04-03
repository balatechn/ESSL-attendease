const BASE_URL = "";

async function request(url: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request("/api/auth/logout", { method: "POST" }),
  getMe: () => request("/api/auth/me"),

  // Dashboard
  getDashboard: () => request("/api/dashboard"),

  // Employees
  getEmployees: (params?: string) =>
    request(`/api/employees${params ? `?${params}` : ""}`),
  getEmployee: (id: string) => request(`/api/employees/${id}`),
  createEmployee: (data: Record<string, unknown>) =>
    request("/api/employees", { method: "POST", body: JSON.stringify(data) }),
  updateEmployee: (id: string, data: Record<string, unknown>) =>
    request(`/api/employees/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteEmployee: (id: string) =>
    request(`/api/employees/${id}`, { method: "DELETE" }),

  // Attendance
  getAttendance: (params?: string) =>
    request(`/api/attendance${params ? `?${params}` : ""}`),
  syncAttendance: (fromDate: string, toDate: string) =>
    request("/api/attendance/sync", {
      method: "POST",
      body: JSON.stringify({ fromDate, toDate }),
    }),

  // Regularization
  getRegularizations: (params?: string) =>
    request(`/api/regularization${params ? `?${params}` : ""}`),
  createRegularization: (data: Record<string, unknown>) =>
    request("/api/regularization", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  approveRegularization: (
    id: string,
    action: string,
    note?: string
  ) =>
    request(`/api/regularization/${id}`, {
      method: "PUT",
      body: JSON.stringify({ action, note }),
    }),

  // Leaves
  getLeaves: (params?: string) =>
    request(`/api/leaves${params ? `?${params}` : ""}`),
  createLeave: (data: Record<string, unknown>) =>
    request("/api/leaves", { method: "POST", body: JSON.stringify(data) }),
  approveLeave: (id: string, action: string, note?: string) =>
    request(`/api/leaves/${id}`, {
      method: "PUT",
      body: JSON.stringify({ action, note }),
    }),
  getLeaveBalance: (params?: string) =>
    request(`/api/leaves/balance${params ? `?${params}` : ""}`),

  // Notifications
  getNotifications: () => request("/api/notifications"),
  markNotificationRead: (id?: string, markAll?: boolean) =>
    request("/api/notifications", {
      method: "PUT",
      body: JSON.stringify({ id, markAll }),
    }),

  // Reports
  getAttendanceReport: (params: string) =>
    request(`/api/reports/attendance?${params}`),
  getLeaveReport: (params: string) =>
    request(`/api/reports/leaves?${params}`),

  // Seed
  seed: () => request("/api/seed", { method: "POST" }),
};
