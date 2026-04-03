"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth";
import { Card, StatCard, StatusBadge } from "@/components/ui";
import {
  Clock,
  CalendarDays,
  AlertTriangle,
  Users,
  FileCheck,
  TrendingUp,
  CheckCircle,
  XCircle,
} from "lucide-react";
import Link from "next/link";

interface DashboardData {
  todayAttendance: {
    firstIn: string;
    lastOut: string;
    totalHours: number;
    status: string;
    isLate: boolean;
  } | null;
  monthlyStats: {
    presentDays: number;
    absentDays: number;
    lateDays: number;
    leaveDays: number;
    totalWorking: number;
  };
  pendingLeaves: number;
  pendingRegularizations: number;
  leaveBalances: {
    leaveType: string;
    total: number;
    used: number;
    remaining: number;
  }[];
  recentNotifications: {
    id: string;
    title: string;
    message: string;
    createdAt: string;
  }[];
  teamStats: { totalEmployees: number; presentToday: number } | null;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.getDashboard();
        setData(res.data);
      } catch {
        // handled
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!data) return <p className="text-gray-500">Failed to load dashboard</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.name?.split(" ")[0]}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/leaves"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Apply Leave
          </Link>
          <Link
            href="/regularization"
            className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Regularize
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Status"
          value={data.todayAttendance?.status || "Not Marked"}
          icon={<Clock className="h-6 w-6 text-blue-600" />}
          color="bg-blue-50"
          subtitle={
            data.todayAttendance?.firstIn
              ? `In: ${new Date(data.todayAttendance.firstIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
              : undefined
          }
        />
        <StatCard
          title="Present This Month"
          value={data.monthlyStats.presentDays}
          icon={<CheckCircle className="h-6 w-6 text-green-600" />}
          color="bg-green-50"
          subtitle={`of ${data.monthlyStats.totalWorking} working days`}
        />
        <StatCard
          title="Late Marks"
          value={data.monthlyStats.lateDays}
          icon={<AlertTriangle className="h-6 w-6 text-yellow-600" />}
          color="bg-yellow-50"
          subtitle="this month"
        />
        <StatCard
          title="Pending Approvals"
          value={data.pendingLeaves + data.pendingRegularizations}
          icon={<FileCheck className="h-6 w-6 text-purple-600" />}
          color="bg-purple-50"
          subtitle={`${data.pendingLeaves} leaves, ${data.pendingRegularizations} reg.`}
        />
      </div>

      {/* Team stats for managers */}
      {data.teamStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            title="Team Size"
            value={data.teamStats.totalEmployees}
            icon={<Users className="h-6 w-6 text-indigo-600" />}
            color="bg-indigo-50"
          />
          <StatCard
            title="Present Today"
            value={data.teamStats.presentToday}
            icon={<TrendingUp className="h-6 w-6 text-teal-600" />}
            color="bg-teal-50"
            subtitle={`of ${data.teamStats.totalEmployees} employees`}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leave Balances */}
        <Card title="Leave Balances">
          <div className="space-y-4">
            {data.leaveBalances.map((bal) => (
              <div key={bal.leaveType} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {bal.leaveType === "CL"
                      ? "Casual Leave"
                      : bal.leaveType === "SL"
                      ? "Sick Leave"
                      : "Earned Leave"}
                  </p>
                  <p className="text-xs text-gray-500">
                    Used {bal.used} of {bal.total}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{
                        width: `${(bal.remaining / bal.total) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 w-8 text-right">
                    {bal.remaining}
                  </span>
                </div>
              </div>
            ))}
            {data.leaveBalances.length === 0 && (
              <p className="text-sm text-gray-400">No leave balances found</p>
            )}
          </div>
        </Card>

        {/* Recent Notifications */}
        <Card
          title="Recent Notifications"
          action={
            <Link href="/notifications" className="text-sm text-blue-600 hover:text-blue-700">
              View all
            </Link>
          }
        >
          <div className="space-y-3">
            {data.recentNotifications.map((notif) => (
              <div
                key={notif.id}
                className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg"
              >
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {notif.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {notif.message}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(notif.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
            {data.recentNotifications.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">
                No new notifications
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Today's Attendance Detail */}
      {data.todayAttendance && (
        <Card title="Today's Attendance">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500">First In</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">
                {data.todayAttendance.firstIn
                  ? new Date(data.todayAttendance.firstIn).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Last Out</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">
                {data.todayAttendance.lastOut
                  ? new Date(data.todayAttendance.lastOut).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Hours</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">
                {data.todayAttendance.totalHours?.toFixed(1) || "0"} hrs
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Status</p>
              <div className="mt-1">
                <StatusBadge status={data.todayAttendance.status} />
                {data.todayAttendance.isLate && (
                  <span className="ml-2 text-xs text-red-600 font-medium">Late</span>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
