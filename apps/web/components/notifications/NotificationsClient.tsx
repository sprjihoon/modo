"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";

interface Notification {
  id: string;
  title?: string;
  message?: string;
  is_read: boolean;
  created_at?: string;
  order_id?: string;
}

export function NotificationsClient() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userRow } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", user.id)
        .maybeSingle();
      if (!userRow) return;

      const { data } = await supabase
        .from("notifications")
        .select("id, title, message, is_read, created_at, order_id")
        .eq("user_id", userRow.id)
        .order("created_at", { ascending: false })
        .limit(50);

      setNotifications(data ?? []);

      // 읽음 처리
      if (data && data.some((n) => !n.is_read)) {
        await supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("user_id", userRow.id)
          .eq("is_read", false);
      }
    } catch {
      // 에러 무시
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="py-20 text-center">
        <Bell className="w-12 h-12 text-gray-200 mx-auto mb-3" />
        <p className="text-sm text-gray-400">알림이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-50">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`px-5 py-4 ${!n.is_read ? "bg-[#00C896]/5" : "bg-white"}`}
        >
          {n.order_id ? (
            <Link href={`/orders/${n.order_id}`} className="block active:opacity-80">
              <NotificationItem notification={n} />
            </Link>
          ) : (
            <NotificationItem notification={n} />
          )}
        </div>
      ))}
    </div>
  );
}

function NotificationItem({ notification }: { notification: Notification }) {
  return (
    <>
      <div className="flex items-start gap-3">
        <div
          className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
            !notification.is_read ? "bg-[#00C896]" : "bg-gray-200"
          }`}
        />
        <div className="flex-1 min-w-0">
          {notification.title && (
            <p className="text-sm font-bold text-gray-900 mb-0.5">
              {notification.title}
            </p>
          )}
          <p className="text-sm text-gray-600 leading-snug">
            {notification.message}
          </p>
          {notification.created_at && (
            <p className="text-xs text-gray-400 mt-1">
              {formatDate(notification.created_at)}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
