"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface PopupItem {
  title: string;
  description: string;
}

interface Popup {
  id: string;
  subtitle: string | null;
  title: string;
  highlight_text: string | null;
  items: PopupItem[] | null;
  cta_text: string;
  dismiss_label: string;
  dismiss_hours: number;
}

function storageKey(id: string) {
  return `popup_hidden_until_${id}`;
}

function renderTitle(title: string, highlight: string | null) {
  if (!highlight || !title.includes(highlight)) {
    return <span className="whitespace-pre-line">{title}</span>;
  }
  const parts = title.split(highlight);
  return (
    <span className="whitespace-pre-line">
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && (
            <span className="text-[#00C896]">{highlight}</span>
          )}
        </span>
      ))}
    </span>
  );
}

export function LaunchAnnouncementPopup() {
  const [popup, setPopup] = useState<Popup | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("popups")
          .select(
            "id, subtitle, title, highlight_text, items, cta_text, dismiss_label, dismiss_hours"
          )
          .eq("is_active", true)
          .order("display_priority", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled || !data) return;

        const hiddenUntil = localStorage.getItem(storageKey(data.id));
        if (hiddenUntil && Date.now() < parseInt(hiddenUntil, 10)) {
          return;
        }

        setPopup(data as Popup);
        setOpen(true);
      } catch {
        // 팝업 로드 실패 시 표시하지 않음
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function dismiss() {
    if (!popup) {
      setOpen(false);
      return;
    }
    const hours = popup.dismiss_hours ?? 24;
    localStorage.setItem(
      storageKey(popup.id),
      String(Date.now() + hours * 60 * 60 * 1000)
    );
    setOpen(false);
  }

  if (!open || !popup) return null;

  const items = Array.isArray(popup.items) ? popup.items : [];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-5"
      onClick={dismiss}
    >
      <div className="absolute inset-0 bg-black/40 animate-fade-in" />

      <div
        className="relative bg-white w-full max-w-[340px] rounded-2xl px-6 pt-6 pb-5 animate-fade-in shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 p-1 active:opacity-60"
          aria-label="닫기"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>

        <div className="text-center mb-5">
          {popup.subtitle && (
            <p className="text-xs font-semibold tracking-wide text-[#00C896] mb-2">
              {popup.subtitle}
            </p>
          )}
          <h2 className="text-xl font-bold text-gray-900 leading-snug">
            {renderTitle(popup.title, popup.highlight_text)}
          </h2>
        </div>

        {items.length > 0 && (
          <div className="space-y-3 mb-6">
            {items.map((item, i) => (
              <div
                key={i}
                className="rounded-xl bg-gray-50 px-4 py-3.5"
              >
                <p className="text-sm font-bold text-gray-900">{item.title}</p>
                <p className="text-sm text-gray-600 mt-0.5">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        )}

        <button onClick={dismiss} className="btn-brand w-full text-base py-3.5">
          {popup.cta_text || "확인"}
        </button>

        <button
          onClick={dismiss}
          className="w-full mt-2 py-2 text-sm text-gray-400 active:text-gray-600"
        >
          {popup.dismiss_label || "오늘 하루 보지 않기"}
        </button>
      </div>
    </div>
  );
}
