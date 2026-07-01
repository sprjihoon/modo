import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "모두의수선 — 비대면 의류 수선 서비스",
  description: "옷을 맡기면 수선 후 배달해드립니다. 바지·청바지 기장, 아우터 소매, 지퍼 교체 등 전문 수선 서비스.",
};

const SERVICES = [
  {
    id: "pants-hem",
    badge: "바지",
    name: "바지 기장 줄임",
    desc: "일반 바지 · 기본형 밑단 처리",
    price: 10000,
  },
  {
    id: "jeans-hem",
    badge: "청바지",
    name: "청바지 기장 줄임",
    desc: "청바지 · 기본형 밑단 처리",
    price: 12000,
  },
  {
    id: "outer-sleeve",
    badge: "아우터",
    name: "아우터 소매기장 줄임",
    desc: "코트 · 점퍼 · 재킷 · 기본형",
    price: 15000,
  },
  {
    id: "zipper",
    badge: "부속품",
    name: "지퍼 교체",
    desc: "상의 · 하의 공통 지퍼 교체",
    price: 18000,
  },
] as const;

function formatPrice(p: number) {
  return p.toLocaleString("ko-KR") + "원";
}

export default function ShopPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-2">
          <span className="text-2xl">✂️</span>
          <div>
            <h1 className="text-lg font-bold text-gray-900">모두의수선</h1>
            <p className="text-xs text-gray-500">비대면 의류 수선 서비스</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* 서비스 소개 */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 mb-2">✂️ 모두의수선 서비스</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            고객의 의류를 직접 수거하여 전문 수선 후 다시 배송해드리는 비대면 의류 수선 서비스입니다.
            집에서 편하게 신청하고 수선된 옷을 받아보세요.
          </p>
          <div className="mt-3 p-3 bg-amber-50 rounded-xl">
            <p className="text-xs text-amber-700">
              ⏱️ 수거 후 평균 3~5 영업일 내 수선 완료 후 발송됩니다.
            </p>
          </div>
        </div>

        {/* 서비스 목록 */}
        <div className="space-y-3">
          {SERVICES.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="inline-block text-xs font-semibold text-[#00C896] bg-[#00C896]/10 px-2 py-0.5 rounded-full mb-1.5">
                    {s.badge}
                  </span>
                  <h3 className="text-base font-bold text-gray-900">{s.name}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{s.desc}</p>
                </div>
                <p className="text-lg font-bold text-gray-900 shrink-0 ml-4">
                  {formatPrice(s.price)}
                </p>
              </div>
              <Link
                href={`/shop/checkout?item=${encodeURIComponent(s.name)}&price=${s.price}`}
                className="block w-full py-3 bg-[#00C896] text-white text-sm font-bold rounded-xl text-center active:opacity-80 transition-opacity"
              >
                수선 신청
              </Link>
            </div>
          ))}
        </div>

        {/* 서비스 포함 내용 */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3">서비스 포함 내용</h3>
          <ul className="space-y-2">
            {[
              "전문 수선기사 1:1 배정",
              "방문 수거 및 수선 완료 후 배송",
              "수거~수선~배송 전 과정 사진 제공",
              "수선 품질 보증 (불량 시 무상 재작업)",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-[#00C896] font-bold shrink-0">✅</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* 이용 절차 */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-4">📋 이용 절차 및 처리 기간</h3>
          <ol className="space-y-4">
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-[#00C896] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
              <div>
                <p className="text-sm font-semibold text-gray-800">서비스 선택 및 결제</p>
                <p className="text-xs text-gray-500 mt-0.5">원하는 수선 항목 선택 후 즉시 결제</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-[#00C896] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
              <div>
                <p className="text-sm font-semibold text-gray-800">우체국 방문 수거</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  결제 후 담당자가 연락하여 수거 날짜를 협의합니다.
                  고객님이 원하는 날짜에 <strong className="text-gray-600">우체국 집배원이 직접 방문</strong>하여 수거합니다.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-[#00C896] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
              <div>
                <p className="text-sm font-semibold text-gray-800">수선 전·후 사진 제공 및 전문 수선 (3~5 영업일)</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  수거 후 <strong className="text-gray-600">수선 전 상태 사진</strong>을 먼저 전달해 드립니다.
                  이후 전문 수선기사가 작업을 완료하면 <strong className="text-gray-600">수선 후 사진</strong>도 제공해 드립니다.
                  총 처리 기간은 수거 완료 후 <strong className="text-gray-600">3~5 영업일</strong>입니다. (주말·공휴일 제외)
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-[#00C896] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
              <div>
                <p className="text-sm font-semibold text-gray-800">수선 완료 후 배송</p>
                <p className="text-xs text-gray-500 mt-0.5">수선 완료 즉시 고객님 주소로 배송 발송</p>
              </div>
            </li>
          </ol>
          <div className="mt-4 p-3 bg-blue-50 rounded-xl">
            <p className="text-xs text-blue-700 leading-relaxed">
              💡 <strong>수거 안내:</strong> 우체국 방문 수거 서비스를 이용합니다. 결제 후 담당자 연락을 통해 고객님이 원하는 날짜에 우체국 집배원이 방문하여 수거합니다.
            </p>
          </div>
        </div>

        {/* 배송비 안내 */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-2">🚚 수거 · 배송 안내</h3>
          <ul className="space-y-1.5 text-sm text-gray-600">
            <li>· <strong className="text-gray-700">왕복 배송비 7,000원</strong>이 수선 요금과 별도로 청구됩니다.</li>
            <li>· 결제 완료 후 담당자가 수거 일정 안내 연락을 드립니다.</li>
          </ul>
        </div>

        {/* 결제·환불 정책 */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3">📋 결제 · 교환 · 환불 정책</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>· 배송기간: 결제 완료 후 수거 1~2 영업일, 수선·발송까지 총 3~5 영업일</li>
            <li>· 교환: 서비스 특성상 수선 완료 후 교환 불가. 단, 불량 발생 시 무상 재작업 제공</li>
            <li>· 환불 — 수거 전: 전액 환불 가능</li>
            <li>· 환불 — 수선 작업 시작 후: 취소 불가</li>
            <li>· 환불 — 회사 귀책사유 (불량, 의뢰 내용 상이 등): 전액 환불 또는 재작업</li>
            <li>· 환불 처리 기간: 결제 취소 후 카드사 기준 3~7 영업일</li>
          </ul>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="border-t border-gray-200 bg-white mt-4 px-4 py-6">
        <div className="max-w-lg mx-auto space-y-1.5 text-xs text-gray-500">
          <p className="font-semibold text-gray-700 text-sm">모두의수선</p>
          <p>상호명 틸리언 | 대표자 장지훈</p>
          <p>사업자등록번호 766-55-00323</p>
          <p>통신판매업신고 제 2022-대구동구-1034 호</p>
          <p>주소 대구시 동구 안심로188 2층, 3층</p>
          <p>고객센터 010-2723-9490 | 이메일 info@tillion.kr</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 pt-2">
            <a href="/terms" className="underline underline-offset-2 hover:text-gray-700">이용약관</a>
            <a href="/privacy-policy" className="underline underline-offset-2 hover:text-gray-700">개인정보처리방침</a>
            <a href="/refund-policy" className="underline underline-offset-2 hover:text-gray-700">환불정책</a>
          </div>
          <p className="pt-1">© 2026 틸리언. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
