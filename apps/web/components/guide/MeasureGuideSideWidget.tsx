"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MeasureGuideClient } from "@/components/guide/MeasureGuideClient";

interface MeasureGuideSideWidgetProps {
  initialTypeId?: string | null;
}

/**
 * 치수 입력 화면 PC 전용: 중앙 앱(600px) 왼쪽 여백에 가이드를 상시 표시.
 * body 포털로 렌더해 레이아웃 overflow/relative의 영향을 받지 않음.
 * 왼쪽 여백이 충분한 화면(≥1100px)에서만 표시. 모바일은 하단 시트 링크 사용.
 */
export function MeasureGuideSideWidget({
  initialTypeId,
}: MeasureGuideSideWidgetProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <aside
      className="pointer-events-none fixed z-40 hidden min-[1100px]:flex flex-col"
      style={{
        top: 16,
        bottom: 16,
        // 앱 컨테이너 왼쪽 끝(50% - 300px) 바로 왼쪽에 배치
        left: "max(8px, calc(50% - 300px - 12px - min(340px, calc(50% - 300px - 20px))))",
        width: "min(340px, calc(50% - 300px - 20px))",
      }}
      aria-label="치수 재는 방법"
    >
      <div className="pointer-events-auto flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
        <div className="shrink-0 border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-bold text-gray-900">치수 재는 방법</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            치수 입력과 함께 참고하세요
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <MeasureGuideClient
            initialTypeId={initialTypeId}
            lockType={!!initialTypeId}
          />
        </div>
      </div>
    </aside>,
    document.body
  );
}
