"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Card, Button, StatusBadge } from "@/components/ui";
import { useAuthStore } from "@/store/auth";
import { Check, X as XIcon } from "lucide-react";
import toast from "react-hot-toast";

interface ApprovalItem {
  id: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  reason: string;
  status: string;
  leaveType?: string;
  totalDays?: number;
  requestedIn?: string;
  requestedOut?: string;
  user: { id: string; name: string; department: string };
  createdAt: string;
}

export default function ApprovalsPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<"leaves" | "regularizations">("leaves");
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isHR = user?.role === "HR" || user?.role === "ADMIN";
  const isManager = user?.role === "MANAGER" || user?.role === "ADMIN";

  const load = async () => {
    try {
      setLoading(true);
      const type = isHR ? "pending-hr" : "pending-manager";
      if (tab === "leaves") {
        const res = await api.getLeaves(`type=${type}`);
        setItems(res.data);
      } else {
        const res = await api.getRegularizations(`type=${type}`);
        setItems(res.data);
      }
    } catch {
      toast.error("Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [tab]);

  const handleAction = async (id: string, action: "approve" | "reject") => {
    const note = action === "reject" ? prompt("Rejection reason:") : null;
    if (action === "reject" && note === null) return;

    setActionLoading(id);
    try {
      if (tab === "leaves") {
        await api.approveLeave(id, action, note || undefined);
      } else {
        await api.approveRegularization(id, action, note || undefined);
      }
      toast.success(`${action === "approve" ? "Approved" : "Rejected"} successfully`);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Approvals</h1>

      <div className="flex gap-2">
        <button
          onClick={() => setTab("leaves")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "leaves"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          Leave Requests
        </button>
        <button
          onClick={() => setTab("regularizations")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "regularizations"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          Regularization Requests
        </button>
      </div>

      <Card>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg">No pending approvals</p>
            <p className="text-sm mt-1">All caught up!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">
                        {item.user.name}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {item.user.department}
                      </span>
                      <StatusBadge status={item.status} />
                    </div>

                    {tab === "leaves" ? (
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>
                          <span className="font-medium">{item.leaveType}</span>{" "}
                          &middot; {item.totalDays} day(s)
                        </p>
                        <p>
                          {new Date(item.startDate!).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}{" "}
                          to{" "}
                          {new Date(item.endDate!).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                        <p className="text-gray-500">{item.reason}</p>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>
                          Date:{" "}
                          {new Date(item.date!).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                        {item.requestedIn && (
                          <p>
                            Requested In:{" "}
                            {new Date(item.requestedIn).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        )}
                        {item.requestedOut && (
                          <p>
                            Requested Out:{" "}
                            {new Date(item.requestedOut).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        )}
                        <p className="text-gray-500">{item.reason}</p>
                      </div>
                    )}

                    <p className="text-xs text-gray-400 mt-2">
                      Applied: {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      onClick={() => handleAction(item.id, "approve")}
                      loading={actionLoading === item.id}
                      disabled={actionLoading !== null}
                    >
                      <Check className="h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleAction(item.id, "reject")}
                      disabled={actionLoading !== null}
                    >
                      <XIcon className="h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
