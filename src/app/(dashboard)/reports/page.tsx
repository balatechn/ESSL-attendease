"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { Card, Button, Select, Input } from "@/components/ui";
import { Download, FileText, BarChart3 } from "lucide-react";
import toast from "react-hot-toast";

export default function ReportsPage() {
  const now = new Date();
  const [reportType, setReportType] = useState<"attendance" | "leaves">("attendance");
  const [attendanceType, setAttendanceType] = useState("daily");
  const [date, setDate] = useState(now.toISOString().split("T")[0]);
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    records?: unknown[];
    summary?: Record<string, number>;
    leaves?: unknown[];
    balances?: unknown[];
  } | null>(null);

  const generateReport = async () => {
    setLoading(true);
    try {
      let params = "";
      if (reportType === "attendance") {
        params = `type=${attendanceType}`;
        if (attendanceType === "daily") {
          params += `&date=${date}`;
        } else {
          params += `&month=${month}&year=${year}`;
        }
        const res = await api.getAttendanceReport(params);
        setData(res.data);
      } else {
        params = `year=${year}`;
        const res = await api.getLeaveReport(params);
        setData(res.data);
      }
      toast.success("Report generated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    let url = "";
    if (reportType === "attendance") {
      url = `/api/reports/attendance?format=csv&type=${attendanceType}`;
      if (attendanceType === "daily") {
        url += `&date=${date}`;
      } else {
        url += `&month=${month}&year=${year}`;
      }
    } else {
      url = `/api/reports/leaves?format=csv&year=${year}`;
    }
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Reports</h1>

      {/* Report Config */}
      <Card>
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => { setReportType("attendance"); setData(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                reportType === "attendance"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <BarChart3 className="h-4 w-4 inline mr-2" />
              Attendance Report
            </button>
            <button
              onClick={() => { setReportType("leaves"); setData(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                reportType === "leaves"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <FileText className="h-4 w-4 inline mr-2" />
              Leave Report
            </button>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            {reportType === "attendance" && (
              <Select
                label="Report Type"
                value={attendanceType}
                onChange={(e) => setAttendanceType(e.target.value)}
                options={[
                  { value: "daily", label: "Daily" },
                  { value: "monthly", label: "Monthly" },
                ]}
              />
            )}

            {reportType === "attendance" && attendanceType === "daily" && (
              <Input
                label="Date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            )}

            {(reportType === "leaves" ||
              (reportType === "attendance" && attendanceType === "monthly")) && (
              <>
                <Select
                  label="Month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  options={Array.from({ length: 12 }, (_, i) => ({
                    value: String(i + 1),
                    label: new Date(2000, i).toLocaleDateString("en-US", {
                      month: "long",
                    }),
                  }))}
                />
                <Select
                  label="Year"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  options={Array.from({ length: 5 }, (_, i) => {
                    const y = String(now.getFullYear() - 2 + i);
                    return { value: y, label: y };
                  })}
                />
              </>
            )}

            <Button onClick={generateReport} loading={loading}>
              Generate
            </Button>

            {data && (
              <Button variant="secondary" onClick={exportCSV}>
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Results */}
      {data && reportType === "attendance" && data.summary && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {Object.entries(data.summary).map(([key, val]) => (
              <div key={key} className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{val}</p>
                <p className="text-xs text-gray-500 mt-1 capitalize">{key}</p>
              </div>
            ))}
          </div>
          <Card title="Attendance Records">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Name</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Department</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Date</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">In</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Out</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Hours</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.records as Array<Record<string, unknown>>)?.map((rec: Record<string, unknown>, i: number) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-2 px-2">{(rec.user as Record<string, string>)?.name}</td>
                      <td className="py-2 px-2 text-gray-500">{(rec.user as Record<string, string>)?.department || "—"}</td>
                      <td className="py-2 px-2">{new Date(rec.date as string).toLocaleDateString()}</td>
                      <td className="py-2 px-2">
                        {rec.firstIn ? new Date(rec.firstIn as string).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                      <td className="py-2 px-2">
                        {rec.lastOut ? new Date(rec.lastOut as string).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                      <td className="py-2 px-2">{rec.totalHours ? `${(rec.totalHours as number).toFixed(1)}h` : "—"}</td>
                      <td className="py-2 px-2">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          rec.status === "PRESENT" ? "bg-green-100 text-green-800" :
                          rec.status === "ABSENT" ? "bg-red-100 text-red-800" :
                          "bg-gray-100 text-gray-800"
                        }`}>
                          {rec.status as string}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {data && reportType === "leaves" && (
        <Card title="Leave Report">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Name</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Department</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Type</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">From</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">To</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Days</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Reason</th>
                </tr>
              </thead>
              <tbody>
                {(data.leaves as Array<Record<string, unknown>>)?.map((leave: Record<string, unknown>, i: number) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-2 px-2">{(leave.user as Record<string, string>)?.name}</td>
                    <td className="py-2 px-2 text-gray-500">{(leave.user as Record<string, string>)?.department || "—"}</td>
                    <td className="py-2 px-2">
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">
                        {leave.leaveType as string}
                      </span>
                    </td>
                    <td className="py-2 px-2">{new Date(leave.startDate as string).toLocaleDateString()}</td>
                    <td className="py-2 px-2">{new Date(leave.endDate as string).toLocaleDateString()}</td>
                    <td className="py-2 px-2 font-medium">{leave.totalDays as number}</td>
                    <td className="py-2 px-2 text-gray-500 max-w-[200px] truncate">{leave.reason as string}</td>
                  </tr>
                ))}
                {(!data.leaves || (data.leaves as unknown[]).length === 0) && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">
                      No leave records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
