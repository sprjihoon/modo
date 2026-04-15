"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";

const STEPS = [
  {
    step: 1,
    emoji: "📱",
    title: "수선 접수",
    desc: "앱에서 의류 종류와 수선 항목을 선택하고, 수선 부위를 사진으로 찍어 핀으로 표시해 주세요.",
    color: "#00C896",
  },
  {
    step: 2,
    emoji: "📦",
    title: "결제 & 수거 예약",
    desc: "수선 금액을 확인하고 결제합니다. 수거 주소와 날짜를 입력하면 택배 기사님이 방문합니다.",
    color: "#6366F1",
  },
  {
    step: 3,
    emoji: "✂️",
    title: "수선 진행",
    desc: "전문 수선사가 꼼꼼하게 수선합니다. 입고 영상으로 의류 상태를 투명하게 확인할 수 있어요.",
    color: "#F59E0B",
  },
  {
    step: 4,
    emoji: "🚚",
    title: "배송 완료",
    desc: "수선 완료 후 고객님 주소로 배송됩니다. 출고 영상과 배송 추적으로 실시간 확인 가능합니다.",
    color: "#EC4899",
  },
];

const FAQ = [
  {
    q: "수거 가능한 지역은 어디인가요?",
    a: "전국 어디서나 수거 가능합니다. (제주·도서 지역 제외)",
  },
  {
    q: "수선 완료까지 얼마나 걸리나요?",
    a: "수거 후 보통 5~7 영업일이 소요됩니다.",
  },
  {
    q: "사진 핀은 왜 찍나요?",
    a: "수선 부위를 정확하게 표시해 실수를 줄이고 원하는 수선이 가능하도록 돕습니다.",
  },
  {
    q: "결제는 언제 하나요?",
    a: "수선 접수 시 예상 금액으로 먼저 결제합니다. 추가 비용 발생 시 별도 안내합니다.",
  },
];

export default function EasyGuidePage() {
  const router = useRouter();

  return (
    <PageLayout showTabBar={false} showAppBanner={false}>
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 flex items-center h-14 px-4 gap-2">
        <button onClick={() => router.back()} className="p-1 -ml-1 active:opacity-60">
          <ChevronLeft className="w-6 h-6 text-gray-800" />
        </button>
        <h1 className="flex-1 text-base font-bold text-gray-900">쉬운 가이드</h1>
      </header>

      <div className="px-4 py-6">
        {/* 히어로 */}
        <div className="text-center mb-8">
          <p className="text-3xl mb-3">🧵</p>
          <h2 className="text-xl font-extrabold text-gray-900 mb-1">4단계로 끝나는 수선</h2>
          <p className="text-sm text-gray-500">집에서 편리하게, 전문가에게 맡기세요</p>
        </div>

        {/* 스텝 카드 */}
        <div className="space-y-4 mb-8">
          {STEPS.map((s, idx) => (
            <div key={s.step} className="flex gap-4 items-start">
              {/* 번호 + 연결선 */}
              <div className="flex flex-col items-center">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ backgroundColor: s.color }}
                >
                  {s.step}
                </div>
                {idx < STEPS.length - 1 && (
                  <div className="w-0.5 h-8 bg-gray-100 mt-1" />
                )}
              </div>

              {/* 카드 */}
              <div className="flex-1 pb-4">
                <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{s.emoji}</span>
                    <p className="text-sm font-bold text-gray-900">{s.title}</p>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="mb-8">
          <h3 className="text-sm font-bold text-gray-800 mb-3">자주 묻는 질문</h3>
          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                <p className="text-sm font-semibold text-gray-800 mb-1">Q. {item.q}</p>
                <p className="text-xs text-gray-500 leading-relaxed">A. {item.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA 버튼 */}
        <button
          onClick={() => router.push("/order/new")}
          className="w-full flex items-center justify-center gap-2 py-4 bg-[#00C896] text-white text-sm font-bold rounded-xl active:brightness-95 transition-all"
        >
          지금 수거신청 시작하기
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          onClick={() => router.push("/guide/price")}
          className="w-full mt-2 py-4 border border-gray-200 text-sm font-medium text-gray-600 rounded-xl active:bg-gray-50 transition-all"
        >
          가격표 보기
        </button>
      </div>
    </PageLayout>
  );
}
