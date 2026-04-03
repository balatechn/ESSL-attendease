"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Card, Button, Input, StatusBadge, Modal } from "@/components/ui";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";

interface Regularization {
  id: string;
  date: string;
  reason: string;
  requestedIn: string | null;
  requestedOut: string | null;
  status: string;
  managerNote: string | null;
  hrNote: string | null;
  createdAt: string;
  user: { id: string; name: string; department: string };
}

export default function RegularizationPage() {
  const [records, setRecords] = useState<Regularization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date: "",
    reason: "",
    requestedIn: "",
    requestedOut: "",
  });

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.getRegularizations();
      setRecords(res.data);
    } catch {
      toast.error("Failed to load regularizations");
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
      const data: Record<string, unknown> = {
        date: form.date,
        reason: form.reason,
      };
      if (form.requestedIn) {
        data.requestedIn = `${form.date}T${form.requestedIn}:00`;
      }
      if (form.requestedOut) {
        data.requestedOut = `${form.date}T${form.requestedOut}:00`;
      }
      await api.createRegularization(data);
      toast.success("Regularization request submitted");
      setShowModal(false);
      setForm({ date: "", reason: "", requestedIn: "", requestedOut: "" });
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Regularization</h1>
          <p className="text-sm text-gray-500 mt-1">
            Request attendance regularization for missed punches (max 3/month)
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4" />
          New Request
        </Button>
      </div>

      <Card>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Date</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Reason</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Requested In</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Requested Out</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Status</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Manager Note</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">HR Note</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec) => (
                  <tr key={rec.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-2 font-medium text-gray-900">
                      {new Date(rec.date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3 px-2 text-gray-600 max-w-[200px] truncate">
                      {rec.reason}
                    </td>
                    <td className="py-3 px-2 text-gray-600">
                      {rec.requestedIn
                        ? new Date(rec.requestedIn).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                    <td className="py-3 px-2 text-gray-600">
                      {rec.requestedOut
                        ? new Date(rec.requestedOut).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                    <td className="py-3 px-2">
                      <StatusBadge status={rec.status} />
                    </td>
                    <td className="py-3 px-2 text-gray-500 text-xs">
                      {rec.managerNote || "—"}
                    </td>
                    <td className="py-3 px-2 text-gray-500 text-xs">
                      {rec.hrNote || "—"}
                    </td>
                    <td className="py-3 px-2 text-gray-400 text-xs">
                      {new Date(rec.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {records.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-400">
                      No regularization requests
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="New Regularization Request"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Date"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Requested In Time"
              type="time"
              value={form.requestedIn}
              onChange={(e) => setForm({ ...form, requestedIn: e.target.value })}
            />
            <Input
              label="Requested Out Time"
              type="time"
              value={form.requestedOut}
              onChange={(e) => setForm({ ...form, requestedOut: e.target.value })}
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
              placeholder="Explain why regularization is needed..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Submit Request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
