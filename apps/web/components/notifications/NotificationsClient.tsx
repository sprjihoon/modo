"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Bell, Play, X } from "lucide-react";
import { AnnouncementsClient } from "@/components/announcements/AnnouncementsClient";
import { createClient } from "@/lib/supabase/client";
import { formatNotificationBody } from "@/lib/notification-format";
import { cn, formatDate } from "@/lib/utils";
import { Analytics } from "@/lib/analytics";

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

type TabKey = "mine" | "announcements";

export function NotificationsClient() {
  const searchParams = useSearchParams();
  const initialTab: TabKey =
    searchParams.get("tab") === "announcements" ? "announcements" : "mine";
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [playingVideo, setPlayingVideo] = useState<{
    url: string;
    label: string;
  } | null>(null);

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    const next: TabKey =
      searchParams.get("tab") === "announcements" ? "announcements" : "mine";
    setTab(next);
  }, [searchParams]);

  async function loadNotifications() {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setNotifications([]);
        return;
      }

      const { data: userRow } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", user.id)
        .maybeSingle();
      if (!userRow) {
        setNotifications([]);
        return;
      }

      // 읽지 않은 알림만 표시 (읽음 처리된 항목은 목록에서 제외)
      const { data } = await supabase
        .from("notifications")
        .select("id, type, title, body, is_read, created_at, order_id, metadata")
        .eq("user_id", userRow.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(50);

      setNotifications(data ?? []);
    } catch {
      // 에러 무시
    } finally {
      setIsLoading(false);
    }
  }

  async function dismissNotification(id: string) {
    try {
      const supabase = createClient();
      await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", id);

      setNotifications((prev) => prev.filter((n) => n.id !== id));
      window.dispatchEvent(new Event("modu_notifications_read"));
    } catch {
      // 에러 무시
    }
  }

  async function dismissAll() {
    if (notifications.length === 0) return;
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

      await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("user_id", userRow.id)
        .eq("is_read", false);

      setNotifications([]);
      window.dispatchEvent(new Event("modu_notifications_read"));
    } catch {
      // 에러 무시
    }
  }

  const unreadCount = notifications.length;

  return (
    <>
      <div className="flex border-b border-gray-100 sticky top-0 bg-white z-10">
        <button
          type="button"
          onClick={() => setTab("mine")}
          className={cn(
            "flex-1 py-3 text-sm font-semibold relative",
            tab === "mine" ? "text-[#00C896]" : "text-gray-400"
          )}
        >
          <span className="inline-flex items-center justify-center gap-1.5">
            내 알림
            {unreadCount > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-[18px]">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </span>
          {tab === "mine" && (
            <span className="absolute left-0 right-0 bottom-0 h-0.5 bg-[#00C896]" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab("announcements")}
          className={cn(
            "flex-1 py-3 text-sm font-semibold relative",
            tab === "announcements" ? "text-[#00C896]" : "text-gray-400"
          )}
        >
          공지사항
          {tab === "announcements" && (
            <span className="absolute left-0 right-0 bottom-0 h-0.5 bg-[#00C896]" />
          )}
        </button>
      </div>

      {tab === "announcements" ? (
        <AnnouncementsClient />
      ) : isLoading ? (
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="py-20 text-center">
          <Bell className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">새 알림이 없습니다</p>
          <p className="text-xs text-gray-300 mt-1">읽은 알림은 목록에서 제외됩니다</p>
        </div>
      ) : (
        <>
          <div className="px-4 py-2 flex justify-end border-b border-gray-50">
            <button
              type="button"
              onClick={dismissAll}
              className="text-xs font-semibold text-gray-500 active:text-gray-700"
            >
              모두 닫기
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {notifications.map((n) => {
              const isVideoNotif =
                n.type === "CS_VIDEO_SHARED" && n.metadata?.video_url;

              return (
                <div key={n.id} className="px-5 py-4 bg-[#00C896]/5 flex gap-2">
                  <div className="flex-1 min-w-0">
                    {isVideoNotif ? (
                      <div>
                        <NotificationItem notification={n} />
                        <button
                          className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#00C896] text-white text-sm font-semibold active:opacity-80"
                          onClick={() => {
                            void Analytics.notificationClick(n.id, n.type, n.order_id);
                            setPlayingVideo({
                              url: n.metadata!.video_url!,
                              label: n.metadata?.video_label || "CS 영상",
                            });
                          }}
                        >
                          <Play className="w-4 h-4 fill-white" />
                          영상 보기
                        </button>
                      </div>
                    ) : n.order_id ? (
                      <Link
                        href={`/orders/${n.order_id}`}
                        className="block active:opacity-80"
                        onClick={() => {
                          void Analytics.notificationClick(n.id, n.type, n.order_id);
                          void dismissNotification(n.id);
                        }}
                      >
                        <NotificationItem notification={n} />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="w-full text-left active:opacity-80"
                        onClick={() => {
                          void Analytics.notificationClick(n.id, n.type, n.order_id);
                          void dismissNotification(n.id);
                        }}
                      >
                        <NotificationItem notification={n} />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    aria-label="알림 닫기"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void dismissNotification(n.id);
                    }}
                    className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-white/80 active:bg-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

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
  const body = formatNotificationBody(notification.body);

  return (
    <div className="flex items-start gap-3">
      <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-[#00C896]" />
      <div className="flex-1 min-w-0">
        {notification.title && (
          <p className="text-sm font-bold text-gray-900 mb-0.5">
            {notification.title}
          </p>
        )}
        {body && (
          <p className="text-sm text-gray-600 leading-snug">{body}</p>
        )}
        {notification.created_at && (
          <p className="text-xs text-gray-400 mt-1">
            {formatDate(notification.created_at)}
          </p>
        )}
      </div>
    </div>
  );
}
