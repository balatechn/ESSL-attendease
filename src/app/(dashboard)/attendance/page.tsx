"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Card, Button, StatusBadge, Select } from "@/components/ui";
import { useAuthStore } from "@/store/auth";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

interface AttendanceRecord {
  id: string;
  date: string;
  firstIn: string | null;
  lastOut: string | null;
  totalHours: number | null;
  status: string;
  isLate: boolean;
  lateMinutes: number;
  source: string;
  user: { id: string; name: string; department: string };
}

const months = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

export default function AttendancePage() {
  const { user } = useAuthStore();
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [view, setView] = useState<"list" | "calendar">("list");

  const isAdminOrHR = user?.role === "ADMIN" || user?.role === "HR";

  const loadAttendance = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ month, year });
      const res = await api.getAttendance(params.toString());
      setRecords(res.data);
    } catch {
      toast.error("Failed to load attendance");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, [month, year]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const fromDate = `${year}-${month.padStart(2, "0")}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const toDate = `${year}-${month.padStart(2, "0")}-${lastDay}`;
      const res = await api.syncAttendance(fromDate, toDate);
      toast.success(res.data.message);
      loadAttendance();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const navigateMonth = (dir: number) => {
    let m = parseInt(month) + dir;
    let y = parseInt(year);
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setMonth(String(m));
    setYear(String(y));
  };

  // Calendar view helpers
  const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
  const firstDayOfWeek = new Date(parseInt(year), parseInt(month) - 1, 1).getDay();
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const recordsByDate = new Map(
    records.map((r) => [new Date(r.date).getDate(), r])
  );

  const statusColors: Record<string, string> = {
    PRESENT: "bg-green-100 text-green-800 border-green-200",
    ABSENT: "bg-red-50 text-red-700 border-red-200",
    HALF_DAY: "bg-orange-50 text-orange-700 border-orange-200",
    ON_LEAVE: "bg-purple-50 text-purple-700 border-purple-200",
    WEEKEND: "bg-gray-50 text-gray-500 border-gray-200",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <div className="flex gap-2">
          <div className="flex items-center bg-white border border-gray-200 rounded-lg">
            <button
              onClick={() => setView("list")}
              className={`px-3 py-1.5 text-sm rounded-l-lg ${view === "list" ? "bg-blue-50 text-blue-700" : "text-gray-600"}`}
            >
              List
            </button>
            <button
              onClick={() => setView("calendar")}
              className={`px-3 py-1.5 text-sm rounded-r-lg ${view === "calendar" ? "bg-blue-50 text-blue-700" : "text-gray-600"}`}
            >
              Calendar
            </button>
          </div>
          {isAdminOrHR && (
            <Button onClick={handleSync} loading={syncing} variant="secondary">
              <RefreshCw className="h-4 w-4" />
              Sync Biometric
            </Button>
          )}
        </div>
      </div>

      {/* Month Navigator */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigateMonth(-1)} className="p-2 rounded-lg hover:bg-gray-100">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex gap-2">
          <Select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            options={months}
          />
          <Select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            options={Array.from({ length: 5 }, (_, i) => {
              const y = String(now.getFullYear() - 2 + i);
              return { value: y, label: y };
            })}
          />
        </div>
        <button onClick={() => navigateMonth(1)} className="p-2 rounded-lg hover:bg-gray-100">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : view === "list" ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Date</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Day</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">First In</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Last Out</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Hours</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Status</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Late</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Source</th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec) => {
                  const date = new Date(rec.date);
                  return (
                    <tr key={rec.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2 font-medium text-gray-900">
                        {date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      </td>
                      <td className="py-3 px-2 text-gray-600">
                        {date.toLocaleDateString("en-US", { weekday: "short" })}
                      </td>
                      <td className="py-3 px-2 text-gray-600">
                        {rec.firstIn
                          ? new Date(rec.firstIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : "—"}
                      </td>
                      <td className="py-3 px-2 text-gray-600">
                        {rec.lastOut
                          ? new Date(rec.lastOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : "—"}
                      </td>
                      <td className="py-3 px-2 text-gray-600">
                        {rec.totalHours ? `${rec.totalHours.toFixed(1)}h` : "—"}
                      </td>
                      <td className="py-3 px-2">
                        <StatusBadge status={rec.status} />
                      </td>
                      <td className="py-3 px-2">
                        {rec.isLate ? (
                          <span className="text-red-600 text-xs font-medium">
                            {rec.lateMinutes}min
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <span className="text-xs text-gray-400">{rec.source}</span>
                      </td>
                    </tr>
                  );
                })}
                {records.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-400">
                      No attendance records for this month
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* Calendar View */
        <Card>
          <div className="grid grid-cols-7 gap-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">
                {d}
              </div>
            ))}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="h-20" />
            ))}
            {calendarDays.map((day) => {
              const record = recordsByDate.get(day);
              const dateObj = new Date(parseInt(year), parseInt(month) - 1, day);
              const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
              const isToday =
                dateObj.toDateString() === new Date().toDateString();

              return (
                <div
                  key={day}
                  className={`h-20 p-1.5 rounded-lg border text-xs ${
                    isToday ? "border-blue-400 bg-blue-50" : "border-gray-100"
                  } ${record ? statusColors[record.status] || "bg-white" : isWeekend ? "bg-gray-50" : "bg-white"}`}
                >
                  <div className="font-semibold">{day}</div>
                  {record && (
                    <div className="mt-1 space-y-0.5">
                      <div className="truncate">{record.status}</div>
                      {record.firstIn && (
                        <div className="text-[10px] opacity-75">
                          {new Date(record.firstIn).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Monthly Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: "Present", count: records.filter((r) => r.status === "PRESENT").length, color: "text-green-600" },
          { label: "Absent", count: records.filter((r) => r.status === "ABSENT").length, color: "text-red-600" },
          { label: "Half Day", count: records.filter((r) => r.status === "HALF_DAY").length, color: "text-orange-600" },
          { label: "On Leave", count: records.filter((r) => r.status === "ON_LEAVE").length, color: "text-purple-600" },
          { label: "Late", count: records.filter((r) => r.isLate).length, color: "text-yellow-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
