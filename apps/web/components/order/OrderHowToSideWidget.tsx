"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  CalendarCheck,
  Package,
  Scissors,
  Truck,
} from "lucide-react";

const STEPS = [
  {
    icon: Package,
    title: "수선 접수",
    desc: "의류·수선 항목을 선택하고 사진을 올립니다.",
  },
  {
    icon: CalendarCheck,
    title: "수거 일정",
    desc: "원하시는 날짜를 지정하면 우체국택배가 방문 수거합니다.",
  },
  {
    icon: Scissors,
    title: "수선 작업",
    desc: "전문 수선사가 꼼꼼하게 수선합니다.",
  },
  {
    icon: Truck,
    title: "배송 완료",
    desc: "수선이 끝난 의류를 택배로 보내드립니다.",
  },
] as const;

/**
 * 수거신청 PC 전용: 중앙 앱(600px) 오른쪽 여백에 이용 방법을 상시 표시.
 */
export function OrderHowToSideWidget() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <aside
      className="pointer-events-none fixed z-40 hidden lg:flex flex-col"
      style={{
        top: 16,
        bottom: 16,
        right:
          "max(8px, calc(50% - 300px - 12px - min(360px, calc(50% - 300px - 20px))))",
        width: "min(360px, calc(50% - 300px - 20px))",
      }}
      aria-label="이용 방법"
    >
      <div className="pointer-events-auto flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
        <div className="shrink-0 px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">이용 방법</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            문 앞에서 맡기는 비대면 수선
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div className="rounded-2xl border border-[#00C896]/30 bg-[#00C896]/5 px-4 py-3.5">
            <p className="text-[11px] font-bold tracking-wide text-[#00C896] uppercase">
              핵심 안내
            </p>
            <p className="mt-1.5 text-sm font-bold text-gray-900 leading-snug">
              수거신청 후{" "}
              <span className="text-[#00C896]">원하는 날짜</span>에
              <br />
              <span className="text-[#00C896]">우체국택배</span>가 방문
              수거합니다
            </p>
            <p className="mt-2 text-xs text-gray-600 leading-relaxed">
              결제가 완료되면 선택하신 수거 희망일로 우체국 방문 수거가
              접수됩니다. 문 앞에 두기만 하면 됩니다.
            </p>
          </div>

          <ol className="space-y-3">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className="flex gap-3">
                  <div className="shrink-0 w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-[#00C896]" />
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-sm font-bold text-gray-900">
                      <span className="text-[#00C896] mr-1">{i + 1}.</span>
                      {step.title}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>

          <p className="text-[11px] text-gray-400 leading-relaxed pt-1 border-t border-gray-50">
            토·일요일 및 공휴일은 수거가 불가할 수 있으며, 실제 방문은
            우체국 일정에 따라 조정될 수 있습니다.
          </p>
        </div>
      </div>
    </aside>,
    document.body
  );
}
