"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Megaphone, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";

interface Announcement {
  id: string;
  title: string;
  content?: string;
  created_at?: string;
}

export function AnnouncementsClient() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  async function loadAnnouncements() {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: userRow } = await supabase
          .from("users")
          .select("id")
          .eq("auth_id", user.id)
          .maybeSingle();

        if (userRow) {
          setUserId(userRow.id);
          const { data: reads } = await supabase
            .from("announcement_reads")
            .select("announcement_id")
            .eq("user_id", userRow.id);
          setReadIds(new Set((reads ?? []).map((r) => r.announcement_id)));
        }
      }

      const { data } = await supabase
        .from("announcements")
        .select("id, title, content, created_at")
        .eq("status", "sent")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      setAnnouncements(data ?? []);
    } catch {
      // 에러 무시
    } finally {
      setIsLoading(false);
    }
  }

  async function dismissAnnouncement(id: string) {
    try {
      if (userId) {
        const supabase = createClient();
        await supabase.from("announcement_reads").upsert(
          {
            announcement_id: id,
            user_id: userId,
            read_at: new Date().toISOString(),
          },
          { onConflict: "announcement_id,user_id" }
        );
      }
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      if (expanded === id) setExpanded(null);
    } catch {
      // 로그인 없이 닫기만 UI에서 처리
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      if (expanded === id) setExpanded(null);
    }
  }

  async function dismissAll() {
    if (announcements.length === 0) return;
    const ids = announcements.map((a) => a.id);
    try {
      if (userId) {
        const supabase = createClient();
        await supabase.from("announcement_reads").upsert(
          ids.map((announcement_id) => ({
            announcement_id,
            user_id: userId,
            read_at: new Date().toISOString(),
          })),
          { onConflict: "announcement_id,user_id" }
        );
      }
      setAnnouncements([]);
      setExpanded(null);
    } catch {
      setAnnouncements([]);
      setExpanded(null);
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <div className="py-20 text-center">
        <Megaphone className="w-12 h-12 text-gray-200 mx-auto mb-3" />
        <p className="text-sm text-gray-400">공지사항이 없습니다</p>
      </div>
    );
  }

  return (
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
      <div className="divide-y divide-gray-100">
        {announcements.map((a) => (
          <div key={a.id}>
            <div className="flex items-start gap-1 px-3 py-1 bg-white">
              <button
                className="flex-1 text-left px-2 py-3 flex items-start justify-between gap-3 active:bg-gray-50 rounded-lg"
                onClick={() =>
                  setExpanded(expanded === a.id ? null : a.id)
                }
              >
                <div className="flex-1">
                  <p
                    className={`text-sm font-semibold ${
                      readIds.has(a.id) ? "text-gray-500" : "text-gray-900"
                    }`}
                  >
                    {a.title}
                  </p>
                  {a.created_at && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDate(a.created_at)}
                    </p>
                  )}
                </div>
                {expanded === a.id ? (
                  <ChevronUp className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                )}
              </button>
              <button
                type="button"
                aria-label="공지 닫기"
                onClick={() => void dismissAnnouncement(a.id)}
                className="shrink-0 w-8 h-8 mt-2 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-50 active:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {expanded === a.id && a.content && (
              <div className="px-5 py-4 bg-gray-50 text-sm text-gray-600 leading-relaxed whitespace-pre-wrap border-t border-gray-100">
                {a.content}
                <button
                  type="button"
                  onClick={() => void dismissAnnouncement(a.id)}
                  className="mt-3 text-xs font-semibold text-[#00C896]"
                >
                  읽음 처리하고 닫기
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
