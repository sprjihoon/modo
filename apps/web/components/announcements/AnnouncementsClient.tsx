"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Megaphone } from "lucide-react";
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
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  async function loadAnnouncements() {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("announcements")
        .select("id, title, content, created_at")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      setAnnouncements(data ?? []);
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
    <div className="divide-y divide-gray-100">
      {announcements.map((a) => (
        <div key={a.id}>
          <button
            className="w-full text-left px-5 py-4 flex items-start justify-between gap-3 bg-white active:bg-gray-50"
            onClick={() => setExpanded(expanded === a.id ? null : a.id)}
          >
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">{a.title}</p>
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
          {expanded === a.id && a.content && (
            <div className="px-5 py-4 bg-gray-50 text-sm text-gray-600 leading-relaxed whitespace-pre-wrap border-t border-gray-100">
              {a.content}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
