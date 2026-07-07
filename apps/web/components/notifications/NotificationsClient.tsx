"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Play, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";

interface NotificationMetadata {
  video_url?: string;
  video_id?: string;
  video_type?: string;
  video_label?: string;
  [key: string]: string | undefined;
}

interface Notification {
  id: string;
  type?: string;
  title?: string;
  body?: string;
  is_read: boolean;
  created_at?: string;
  order_id?: string;
  metadata?: NotificationMetadata;
}

export function NotificationsClient() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [playingVideo, setPlayingVideo] = useState<{ url: string; label: string } | null>(null);

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
        .select("id, type, title, body, is_read, created_at, order_id, metadata")
        .eq("user_id", userRow.id)
        .order("created_at", { ascending: false })
        .limit(50);

      setNotifications(data ?? []);

      // 읽음 처리
      if (data && data.some((n) => !n.is_read)) {
        await supabase
          .from("notifications")
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq("user_id", userRow.id)
          .eq("is_read", false);

        window.dispatchEvent(new Event("modu_notifications_read"));
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
    <>
      <div className="divide-y divide-gray-50">
        {notifications.map((n) => {
          const isVideoNotif = n.type === "CS_VIDEO_SHARED" && n.metadata?.video_url;

          return (
            <div
              key={n.id}
              className={`px-5 py-4 ${!n.is_read ? "bg-[#00C896]/5" : "bg-white"}`}
            >
              {isVideoNotif ? (
                <div>
                  <NotificationItem notification={n} />
                  <button
                    className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#00C896] text-white text-sm font-semibold active:opacity-80"
                    onClick={() =>
                      setPlayingVideo({
                        url: n.metadata!.video_url!,
                        label: n.metadata?.video_label || "CS 영상",
                      })
                    }
                  >
                    <Play className="w-4 h-4 fill-white" />
                    영상 보기
                  </button>
                </div>
              ) : n.order_id ? (
                <Link href={`/orders/${n.order_id}`} className="block active:opacity-80">
                  <NotificationItem notification={n} />
                </Link>
              ) : (
                <NotificationItem notification={n} />
              )}
            </div>
          );
        })}
      </div>

      {/* 영상 플레이어 모달 */}
      {playingVideo && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex flex-col"
          onClick={() => setPlayingVideo(null)}
        >
          <div
            className="flex items-center justify-between px-4 py-3 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-semibold">{playingVideo.label}</p>
            <button
              onClick={() => setPlayingVideo(null)}
              className="p-1 rounded-full bg-white/10 active:bg-white/20"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div
            className="flex-1 flex items-center justify-center px-4 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              src={playingVideo.url}
              className="w-full aspect-video rounded-xl"
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </>
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
            {notification.body}
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
