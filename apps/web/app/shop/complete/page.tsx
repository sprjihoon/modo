"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function CompleteContent() {
  const searchParams = useSearchParams();

  const paymentId =
    searchParams.get("paymentId") ??
    searchParams.get("orderId") ??
    searchParams.get("payment_id");
  const item = searchParams.get("item") ?? searchParams.get("orderName");
  const amountRaw =
    searchParams.get("amount") ??
    searchParams.get("totalAmount") ??
    searchParams.get("total_amount");
  const amount = amountRaw ? Number(amountRaw) : null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm border border-gray-100 p-8 text-center">
          {/* 아이콘 */}
          <div className="w-20 h-20 rounded-full bg-[#00C896]/10 flex items-center justify-center mx-auto mb-5">
            <span className="text-4xl">✅</span>
          </div>

          <h1 className="text-xl font-bold text-gray-900 mb-2">
            주문이 완료되었습니다
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            감사합니다.
            <br />
            수거 일정은 담당자가 연락드릴 예정입니다.
          </p>

          {/* 주문 정보 */}
          {(item || amount !== null || paymentId) && (
            <div className="mt-5 p-4 bg-gray-50 rounded-2xl text-left space-y-2.5">
              {item && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">서비스</span>
                  <span className="font-semibold text-gray-800">{item}</span>
                </div>
              )}
              {amount !== null && !isNaN(amount) && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">결제 금액</span>
                  <span className="font-bold text-[#00C896]">
                    {amount.toLocaleString("ko-KR")}원
                  </span>
                </div>
              )}
              {paymentId && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">주문번호</span>
                  <span className="font-mono text-xs text-gray-400 break-all text-right max-w-[180px]">
                    {paymentId}
                  </span>
                </div>
              )}
            </div>
          )}

          <Link
            href="/shop"
            className="mt-6 block w-full py-3.5 bg-[#00C896] text-white text-sm font-bold rounded-xl text-center active:opacity-80 transition-opacity"
          >
            처음으로 돌아가기
          </Link>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="border-t border-gray-200 bg-white px-4 py-5">
        <div className="max-w-lg mx-auto text-xs text-gray-400 text-center space-y-1">
          <p>모두의수선 · 틸리언 · 고객센터 010-2723-9490</p>
          <div className="flex justify-center gap-3">
            <a href="/terms" className="underline underline-offset-2">이용약관</a>
            <a href="/privacy-policy" className="underline underline-offset-2">개인정보처리방침</a>
          </div>
          <p>© 2026 틸리언. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default function CompletePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <p className="text-sm text-gray-400">로딩 중...</p>
        </div>
      }
    >
      <CompleteContent />
    </Suspense>
  );
}
