"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Card, Button } from "@/components/ui";
import { Bell, CheckCheck } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.getNotifications();
      setNotifications(res.data.notifications);
    } catch {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const markAllRead = async () => {
    try {
      await api.markNotificationRead(undefined, true);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to update");
    }
  };

  const markRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch {
      // silent
    }
  };

  const typeColors: Record<string, string> = {
    LEAVE: "bg-purple-100 text-purple-700",
    REGULARIZATION: "bg-blue-100 text-blue-700",
    ATTENDANCE: "bg-green-100 text-green-700",
    SYSTEM: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <Button variant="secondary" size="sm" onClick={markAllRead}>
          <CheckCheck className="h-4 w-4" />
          Mark all read
        </Button>
      </div>

      <Card>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="h-12 w-12 text-gray-300 mx-auto" />
            <p className="text-gray-400 mt-3">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors ${
                  !notif.isRead ? "bg-blue-50/50" : ""
                }`}
                onClick={() => !notif.isRead && markRead(notif.id)}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {!notif.isRead && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${typeColors[notif.type] || typeColors.SYSTEM}`}>
                      {notif.type}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(notif.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {notif.title}
                  </h3>
                  <p className="text-sm text-gray-600 mt-0.5">{notif.message}</p>
                  {notif.link && (
                    <Link
                      href={notif.link}
                      className="text-sm text-blue-600 hover:text-blue-700 mt-1 inline-block"
                    >
                      View details &rarr;
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
