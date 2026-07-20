"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { MeasureGuideClient } from "@/components/guide/MeasureGuideClient";

interface MeasureGuideAccordionProps {
  initialTypeId?: string | null;
  /** 기본 펼침 여부 (미지정 시 펼침) */
  defaultOpen?: boolean;
}

const STORAGE_KEY = "measure_guide_accordion_open";

/**
 * 치수 입력 화면용 아코디언 위젯 — 접었다 펼 수 있음.
 */
export function MeasureGuideAccordion({
  initialTypeId,
  defaultOpen = true,
}: MeasureGuideAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved === "0") setOpen(false);
      else if (saved === "1") setOpen(true);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  function toggle() {
    setOpen((prev) => {
      const next = !prev;
      try {
        sessionStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-4 py-3.5 text-left hover:bg-gray-50 active:bg-gray-50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900">치수 재는 방법</p>
          {!open && (
            <p className="mt-0.5 text-xs text-gray-500">눌러서 가이드 보기</p>
          )}
        </div>
        <ChevronDown
          className={`w-5 h-5 text-[#00C896] shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        className={`overflow-hidden transition-[max-height] duration-300 ease-out ${
          open ? "max-h-[2000px]" : "max-h-0"
        }`}
        aria-hidden={!open}
      >
        {hydrated && open && (
          <div className="border-t border-gray-100 max-h-[55vh] overflow-y-auto overscroll-contain">
            <MeasureGuideClient
              key={initialTypeId || "default"}
              initialTypeId={initialTypeId}
              lockType={!!initialTypeId}
            />
          </div>
        )}
      </div>
    </div>
  );
}
