"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { MeasureGuideClient } from "@/components/guide/MeasureGuideClient";

interface MeasureGuideBottomSheetProps {
  open: boolean;
  onClose: () => void;
  initialTypeId?: string | null;
}

/**
 * 모바일/태블릿: 치수 입력 화면에서 링크 클릭 시 하단에서 올라오는 가이드 시트.
 */
export function MeasureGuideBottomSheet({
  open,
  onClose,
  initialTypeId,
}: MeasureGuideBottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-end">
      <div
        className="absolute inset-0 bg-black/50 animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="치수 재는 방법"
        className="relative w-full max-w-[600px] bg-white rounded-t-2xl max-h-[88vh] flex flex-col shadow-xl animate-in slide-in-from-bottom duration-300"
      >
        <div className="flex justify-center pt-2 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-bold text-gray-900">치수 재는 방법</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100"
            aria-label="닫기"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 overscroll-contain">
          <MeasureGuideClient
            initialTypeId={initialTypeId}
            lockType={!!initialTypeId}
          />
        </div>
      </div>
    </div>
  );
}
