"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { MeasureGuideClient } from "@/components/guide/MeasureGuideClient";

interface MeasureGuideSideWidgetProps {
  initialTypeId?: string | null;
}

const STORAGE_KEY = "measure_guide_widget_open";

/**
 * 치수 입력 화면 PC 전용: 중앙 앱(600px) 왼쪽 여백에 가이드를 상시 표시.
 * 헤더 클릭으로 아코디언처럼 접고 펼 수 있음.
 */
export function MeasureGuideSideWidget({
  initialTypeId,
}: MeasureGuideSideWidgetProps) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved === "0") setOpen(false);
      if (saved === "1") setOpen(true);
    } catch {
      /* ignore */
    }
  }, []);

  function toggleOpen() {
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

  if (!mounted) return null;

  return createPortal(
    <aside
      className="pointer-events-none fixed z-40 hidden lg:flex flex-col"
      style={{
        top: 16,
        bottom: open ? 16 : "auto",
        // 중앙 앱(600px) 왼쪽 여백에 배치
        left: "max(8px, calc(50% - 300px - 12px - min(360px, calc(50% - 300px - 20px))))",
        width: "min(360px, calc(50% - 300px - 20px))",
      }}
      aria-label="치수 재는 방법"
    >
      <div
        className={`pointer-events-auto flex w-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg ${
          open ? "h-full min-h-0" : ""
        }`}
      >
        <button
          type="button"
          onClick={toggleOpen}
          aria-expanded={open}
          className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-gray-100 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-gray-900">치수 재는 방법</h2>
            {open && (
              <p className="mt-0.5 text-xs text-gray-500">
                치수 입력과 함께 참고하세요
              </p>
            )}
          </div>
          <ChevronDown
            className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

        <div
          className={`min-h-0 overflow-hidden transition-[flex,opacity] duration-200 ${
            open ? "flex-1 opacity-100" : "h-0 flex-none opacity-0"
          }`}
          aria-hidden={!open}
        >
          {open && (
            <div className="h-full overflow-y-auto">
              <MeasureGuideClient
                key={initialTypeId || "default"}
                initialTypeId={initialTypeId}
                lockType={!!initialTypeId}
              />
            </div>
          )}
        </div>
      </div>
    </aside>,
    document.body
  );
}
