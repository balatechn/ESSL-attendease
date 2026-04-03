"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Card, Button, Input, Select, StatusBadge, Modal } from "@/components/ui";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";

interface LeaveApplication {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: string;
  managerNote: string | null;
  hrNote: string | null;
  createdAt: string;
  user: { id: string; name: string; department: string };
}

interface LeaveBalance {
  leaveType: string;
  total: number;
  used: number;
  remaining: number;
}

const leaveTypes = [
  { value: "CL", label: "Casual Leave (CL)" },
  { value: "SL", label: "Sick Leave (SL)" },
  { value: "EL", label: "Earned Leave (EL)" },
];

export default function LeavesPage() {
  const [leaves, setLeaves] = useState<LeaveApplication[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    leaveType: "CL",
    startDate: "",
    endDate: "",
    reason: "",
  });

  const load = async () => {
    try {
      setLoading(true);
      const [leavesRes, balanceRes] = await Promise.all([
        api.getLeaves(),
        api.getLeaveBalance(),
      ]);
      setLeaves(leavesRes.data);
      setBalances(balanceRes.data);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createLeave(form);
      toast.success("Leave application submitted");
      setShowModal(false);
      setForm({ leaveType: "CL", startDate: "", endDate: "", reason: "" });
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to apply");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4" />
          Apply Leave
        </Button>
      </div>

      {/* Leave Balances */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {balances.map((bal) => (
          <div
            key={bal.leaveType}
            className="bg-white rounded-xl border border-gray-200 p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-500">
                {bal.leaveType === "CL"
                  ? "Casual Leave"
                  : bal.leaveType === "SL"
                  ? "Sick Leave"
                  : "Earned Leave"}
              </h3>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                {bal.leaveType}
              </span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold text-gray-900">{bal.remaining}</p>
                <p className="text-xs text-gray-400">remaining</p>
              </div>
              <div className="text-right text-xs text-gray-500">
                <p>Total: {bal.total}</p>
                <p>Used: {bal.used}</p>
              </div>
            </div>
            <div className="mt-3 w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all"
                style={{ width: `${(bal.remaining / bal.total) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Leave History */}
      <Card title="Leave History">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Type</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">From</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">To</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Days</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Reason</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Status</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Applied</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((leave) => (
                  <tr key={leave.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {leave.leaveType}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-gray-600">
                      {new Date(leave.startDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </td>
                    <td className="py-3 px-2 text-gray-600">
                      {new Date(leave.endDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </td>
                    <td className="py-3 px-2 text-gray-900 font-medium">{leave.totalDays}</td>
                    <td className="py-3 px-2 text-gray-600 max-w-[200px] truncate">
                      {leave.reason}
                    </td>
                    <td className="py-3 px-2">
                      <StatusBadge status={leave.status} />
                    </td>
                    <td className="py-3 px-2 text-gray-400 text-xs">
                      {new Date(leave.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {leaves.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">
                      No leave applications
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Apply Leave Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Apply for Leave"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Leave Type"
            value={form.leaveType}
            onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
            options={leaveTypes}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="From Date"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              required
            />
            <Input
              label="To Date"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason
            </label>
            <textarea
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              required
              placeholder="Reason for leave..."
            />
          </div>

          {/* Show available balance */}
          {balances.find((b) => b.leaveType === form.leaveType) && (
            <div className="bg-blue-50 p-3 rounded-lg text-sm">
              <span className="text-blue-700">
                Available{" "}
                {form.leaveType === "CL"
                  ? "Casual"
                  : form.leaveType === "SL"
                  ? "Sick"
                  : "Earned"}{" "}
                Leave:{" "}
                <strong>
                  {balances.find((b) => b.leaveType === form.leaveType)?.remaining || 0} days
                </strong>
              </span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Apply
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
