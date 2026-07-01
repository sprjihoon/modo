"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AddressSearchButton } from "@/components/ui/AddressSearchButton";

function formatPrice(p: number) {
  return p.toLocaleString("ko-KR") + "원";
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const item = searchParams.get("item") ?? "수선 서비스";
  const price = Number(searchParams.get("price") ?? "10000");
  const SHIPPING_FEE = 7000;
  const totalAmount = price + SHIPPING_FEE;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [zipcode, setZipcode] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [note, setNote] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePayment() {
    if (!name.trim()) { alert("이름을 입력해주세요."); return; }
    if (!phone.trim()) { alert("연락처를 입력해주세요."); return; }
    if (!address.trim()) { alert("수거 주소를 검색해주세요."); return; }

    setIsRequesting(true);
    setError(null);

    try {
      const PortOne = await import("@portone/browser-sdk/v2");
      const paymentId = `shop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const storeId =
        process.env.NEXT_PUBLIC_PORTONE_STORE_ID?.trim() ||
        "store-869df247-ae7f-4504-962a-299e69a6e255";
      const channelKey =
        process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY?.trim() || "";

      const response = await PortOne.requestPayment({
        storeId,
        channelKey,
        paymentId,
        orderName: item,
        totalAmount: totalAmount,
        currency: "CURRENCY_KRW",
        payMethod: "CARD",
        redirectUrl: `${window.location.origin}/shop/complete`,
        customer: {
          fullName: name,
          phoneNumber: phone.replace(/-/g, ""),
        },
        customData: {
          address: `${zipcode ? `(${zipcode}) ` : ""}${address}${addressDetail ? ` ${addressDetail}` : ""}`,
          note,
        },
      });

      // PC 팝업 방식은 response 반환
      if (response && "code" in response) {
        if (response.code !== "FAILURE_TYPE_PG") {
          setError(response.message ?? "결제 요청 중 오류가 발생했습니다.");
        }
        // 사용자 취소는 에러 표시 안 함
      } else if (response && "paymentId" in response) {
        // 팝업 성공
        router.push(
          `/shop/complete?paymentId=${encodeURIComponent(paymentId)}&item=${encodeURIComponent(item)}&amount=${totalAmount}`
        );
      }
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (err?.code !== "USER_CANCEL") {
        setError(err?.message ?? "결제 요청 중 오류가 발생했습니다.");
      }
    } finally {
      setIsRequesting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link
          href="/shop"
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
        >
          ←
        </Link>
        <div>
          <h1 className="text-base font-bold text-gray-900">수선 신청</h1>
          <p className="text-xs text-gray-400">모두의수선</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4 pb-10">
        {/* 선택한 서비스 */}
        <div className="bg-[#00C896]/5 border border-[#00C896]/20 rounded-2xl p-4">
          <p className="text-xs text-[#00C896] font-semibold mb-1">선택한 서비스</p>
          <div className="flex justify-between items-center">
            <p className="text-base font-bold text-gray-900">{item}</p>
            <p className="text-base font-bold text-[#00C896]">{formatPrice(price)}</p>
          </div>
        </div>

        {/* 서비스 안내 */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 mb-4">📋 서비스 이용 안내</h2>
          <ol className="space-y-4">
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-[#00C896] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
              <div>
                <p className="text-sm font-semibold text-gray-800">결제 후 수거 일정 안내</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  결제 완료 후 담당자가 연락드려 <strong className="text-gray-700">우체국 방문 수거 날짜</strong>를 협의합니다.
                  고객님이 원하는 날짜에 우체국 집배원이 직접 방문하여 수거합니다.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-[#00C896] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
              <div>
                <p className="text-sm font-semibold text-gray-800">수선 전 상태 사진 제공</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  의류가 수거된 후 수선 작업 시작 전, <strong className="text-gray-700">현재 상태를 촬영한 사진</strong>을 고객님께 전달해 드립니다.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-[#00C896] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
              <div>
                <p className="text-sm font-semibold text-gray-800">전문 수선 작업 (3~5 영업일)</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  수거 완료 후 <strong className="text-gray-700">3~5 영업일 이내</strong>에 전문 수선기사가 작업을 완료합니다.
                  (주말·공휴일 제외)
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-[#00C896] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
              <div>
                <p className="text-sm font-semibold text-gray-800">수선 후 사진 제공 및 배송</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  수선 완료 후 <strong className="text-gray-700">수선 결과 사진</strong>을 전달해 드리고,
                  즉시 고객님 주소로 배송을 시작합니다.
                </p>
              </div>
            </li>
          </ol>
          <div className="mt-4 p-3 bg-blue-50 rounded-xl">
            <p className="text-xs text-blue-700 leading-relaxed">
              💡 수거는 우체국 방문 수거 서비스를 이용합니다. 결제 후 담당자가 수거 가능한 날짜를 확인하여 연락드리며, 고객님이 원하는 날짜에 우체국 집배원이 방문합니다.
            </p>
          </div>
        </div>

        {/* 신청자 정보 */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-gray-900">신청자 정보</h2>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
              이름 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#00C896] transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
              연락처 <span className="text-red-400">*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-0000-0000"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#00C896] transition-colors"
            />
            <p className="text-xs text-gray-400 mt-1">수거 기사가 이 번호로 연락드립니다.</p>
          </div>
        </div>

        {/* 수거 주소 */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-gray-900">
            수거 주소 <span className="text-red-400 font-normal">*</span>
          </h2>

          <div className="flex gap-2">
            <input
              type="text"
              value={address ? `${zipcode ? `(${zipcode}) ` : ""}${address}` : ""}
              readOnly
              placeholder="주소를 검색해주세요"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 text-gray-700 min-w-0"
            />
            <AddressSearchButton
              onSelect={(z, a) => {
                setZipcode(z);
                setAddress(a);
              }}
              label="검색"
            />
          </div>

          <input
            type="text"
            value={addressDetail}
            onChange={(e) => setAddressDetail(e.target.value)}
            placeholder="상세 주소 (동, 호수 등)"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#00C896] transition-colors"
          />
        </div>

        {/* 수선 요청사항 */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 mb-2">
            수선 요청사항{" "}
            <span className="text-gray-400 font-normal text-xs">(선택)</span>
          </h2>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="수선 부위나 원하시는 사항을 입력해주세요&#10;예) 바지 밑단을 2cm 줄여주세요"
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#00C896] transition-colors resize-none"
          />
        </div>

        {/* 오류 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* 결제 */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm text-gray-500">수선 요금</p>
            <p className="text-sm text-gray-700">{formatPrice(price)}</p>
          </div>
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100">
            <p className="text-sm text-gray-500">왕복 배송비</p>
            <p className="text-sm text-gray-700">{formatPrice(SHIPPING_FEE)}</p>
          </div>
          <div className="flex justify-between items-center mb-5">
            <p className="text-base font-bold text-gray-900">총 결제 금액</p>
            <p className="text-xl font-bold text-gray-900">{formatPrice(totalAmount)}</p>
          </div>
          <button
            type="button"
            onClick={handlePayment}
            disabled={isRequesting}
            className="w-full py-4 bg-[#00C896] text-white text-base font-bold rounded-xl disabled:opacity-60 active:opacity-80 transition-opacity"
          >
            {isRequesting ? "결제 요청 중..." : `${formatPrice(totalAmount)} 결제하기`}
          </button>
          <p className="text-xs text-gray-400 text-center mt-2">
            토스페이먼츠 · 신용/체크카드 · 간편결제
          </p>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="border-t border-gray-200 bg-white px-4 py-5">
        <div className="max-w-lg mx-auto space-y-1 text-xs text-gray-400">
          <p className="font-medium text-gray-500">모두의수선 | 틸리언</p>
          <p>사업자등록번호 766-55-00323 | 대표 장지훈</p>
          <p>통신판매업신고 제 2022-대구동구-1034 호</p>
          <p>고객센터 010-2723-9490</p>
          <div className="flex gap-3 pt-1">
            <a href="/terms" className="underline underline-offset-2">이용약관</a>
            <a href="/privacy-policy" className="underline underline-offset-2">개인정보처리방침</a>
            <a href="/refund-policy" className="underline underline-offset-2">환불정책</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <p className="text-sm text-gray-400">로딩 중...</p>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
