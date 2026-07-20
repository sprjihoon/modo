"use client";

import { MeasureGuideClient } from "@/components/guide/MeasureGuideClient";

interface MeasureGuideSideWidgetProps {
  initialTypeId?: string | null;
}

/**
 * PC 전용: 앱 컨테이너 왼쪽 여백에 치수 가이드를 상시 표시.
 * xl(1280px)+ 에서만 보이며, 모바일은 하단 시트 링크를 사용.
 */
export function MeasureGuideSideWidget({
  initialTypeId,
}: MeasureGuideSideWidgetProps) {
  return (
    <aside
      className="pointer-events-none fixed inset-y-0 left-0 z-30 hidden xl:flex"
      style={{ width: "calc(50% - 300px)" }}
      aria-label="치수 재는 방법"
    >
      <div className="pointer-events-auto my-4 ml-auto mr-3 flex w-full max-w-[360px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
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
    </aside>
  );
}
