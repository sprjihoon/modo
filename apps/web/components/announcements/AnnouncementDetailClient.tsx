"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";

interface Announcement {
  id: string;
  title: string;
  content?: string;
  created_at?: string;
  sent_at?: string;
}

export function AnnouncementDetailClient({ id }: { id: string }) {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("announcements")
          .select("id, title, content, created_at, sent_at")
          .eq("id", id)
          .eq("status", "sent")
          .maybeSingle();
        if (!cancelled) setAnnouncement(data);
      } catch {
        if (!cancelled) setAnnouncement(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (isLoading) {
    return <div className="p-5 h-40 bg-gray-100 rounded-xl animate-pulse" />;
  }

  if (!announcement) {
    return (
      <div className="py-20 text-center">
        <Megaphone className="w-12 h-12 text-gray-200 mx-auto mb-3" />
        <p className="text-sm text-gray-400">공지사항을 찾을 수 없습니다</p>
        <Link
          href="/notifications?tab=announcements"
          className="inline-block mt-4 text-sm font-semibold text-[#00C896]"
        >
          공지 목록으로
        </Link>
      </div>
    );
  }

  return (
    <article className="px-5 py-6">
      <p className="text-lg font-bold text-gray-900">{announcement.title}</p>
      {(announcement.sent_at || announcement.created_at) && (
        <p className="text-xs text-gray-400 mt-1">
          {formatDate(announcement.sent_at || announcement.created_at || "")}
        </p>
      )}
      {announcement.content && (
        <div className="mt-5 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
          {announcement.content}
        </div>
      )}
    </article>
  );
}
