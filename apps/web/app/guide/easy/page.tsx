"use client";

import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";

const STEPS = [
  {
    step: 1,
    emoji: "📦",
    title: "수선 접수",
    desc: "앱에서 의류 종류와 수선 항목을 선택하고 수거 신청합니다.",
  },
  {
    step: 2,
    emoji: "🚚",
    title: "택배 수거",
    desc: "지정하신 날짜에 택배 기사님이 의류를 수거합니다.",
  },
  {
    step: 3,
    emoji: "✂️",
    title: "수선 작업",
    desc: "전문 수선사가 꼼꼼하게 수선합니다.",
  },
  {
    step: 4,
    emoji: "📬",
    title: "배송 완료",
    desc: "수선이 완료된 의류를 택배로 배송해드립니다.",
  },
];

export default function EasyGuidePage() {
  const router = useRouter();

  return (
    <PageLayout title="이용 방법" showBack showAppBanner={false}>
      <div className="px-4 py-6 space-y-4">
        {STEPS.map((s) => (
          <div
            key={s.step}
            className="flex items-start gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm"
          >
            <div className="w-10 h-10 bg-[#00C896]/10 rounded-full flex items-center justify-center text-xl shrink-0">
              {s.emoji}
            </div>
            <div>
              <p className="text-xs text-[#00C896] font-semibold mb-0.5">STEP {s.step}</p>
              <p className="text-sm font-bold text-gray-800">{s.title}</p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 pb-8">
        <button
          onClick={() => router.push("/order/new")}
          className="w-full py-4 bg-[#00C896] text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 active:brightness-95 transition-all"
        >
          지금 수거 신청하기
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </PageLayout>
  );
}
