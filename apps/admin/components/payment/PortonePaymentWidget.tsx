"use client";

import { useState } from "react";

function getStoreId(): string {
  const id = process.env.NEXT_PUBLIC_PORTONE_STORE_ID;
  if (!id) throw new Error("NEXT_PUBLIC_PORTONE_STORE_ID 환경변수가 설정되지 않았습니다.");
  return id;
}

function getChannelKey(): string {
  const key = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY;
  if (!key) throw new Error("NEXT_PUBLIC_PORTONE_CHANNEL_KEY 환경변수가 설정되지 않았습니다.");
  return key;
}

interface PortonePaymentWidgetProps {
  paymentId: string;
  orderName: string;
  amount: number;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  redirectUrl: string;
  onReady?: () => void;
  onError?: (error: Error) => void;
}

export default function PortonePaymentWidget({
  paymentId,
  orderName,
  amount,
  customerName,
  customerEmail,
  customerPhone,
  redirectUrl,
  onReady,
  onError,
}: PortonePaymentWidgetProps) {
  const [isRequesting, setIsRequesting] = useState(false);

  const handlePayment = async () => {
    setIsRequesting(true);
    try {
      // PortOne V1 (IMP) SDK 동적 로드
      await new Promise<void>((resolve, reject) => {
        if ((window as any).IMP) { resolve(); return; }
        const script = document.createElement("script");
        script.src = "https://cdn.iamport.kr/v1/iamport.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("IMP SDK 로드 실패"));
        document.head.appendChild(script);
      });

      const IMP = (window as any).IMP;
      const impCode = process.env.NEXT_PUBLIC_IMP_CODE;
      if (!impCode) throw new Error("NEXT_PUBLIC_IMP_CODE 환경변수가 설정되지 않았습니다.");
      IMP.init(impCode);
      onReady?.();

      IMP.request_pay(
        {
          pg: "kcp",
          pay_method: "card",
          merchant_uid: paymentId.replace(/-/g, ""), // KCP: 영문·숫자만 허용, 하이픈 제거
          name: orderName,
          amount: Math.max(1, Math.round(amount)),
          buyer_name: customerName || undefined,
          buyer_email: customerEmail || undefined,
          buyer_tel: customerPhone || undefined,
          m_redirect_url: redirectUrl,
        },
        (response: any) => {
          if (response.success) {
            // 팝업(PC) 성공 → redirectUrl에 imp_uid, merchant_uid 붙여서 이동
            const url = new URL(redirectUrl);
            url.searchParams.set("imp_uid", response.imp_uid);
            url.searchParams.set("merchant_uid", response.merchant_uid);
            window.location.href = url.toString();
          } else {
            if (response.error_code !== "F0000") {
              onError?.(new Error(response.error_msg ?? "결제 실패"));
            }
            setIsRequesting(false);
          }
        }
      );
    } catch (error: unknown) {
      const err = error as { message?: string };
      onError?.(new Error(err?.message ?? "결제 오류"));
      setIsRequesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 p-4 bg-gray-50 text-sm text-gray-600">
        <div className="flex justify-between mb-1">
          <span>결제 수단</span>
          <span>카드 결제</span>
        </div>
        <div className="flex justify-between font-semibold text-base text-gray-900">
          <span>결제 금액</span>
          <span>{amount.toLocaleString()}원</span>
        </div>
      </div>

      <button
        onClick={handlePayment}
        disabled={isRequesting}
        className={`w-full py-4 text-lg font-semibold rounded-lg transition-colors
          ${isRequesting
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
          }`}
      >
        {isRequesting ? "결제 진행 중..." : `${amount.toLocaleString()}원 결제하기`}
      </button>
    </div>
  );
}
