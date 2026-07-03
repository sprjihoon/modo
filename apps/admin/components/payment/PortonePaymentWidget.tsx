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
      const PortOne = await import("@portone/browser-sdk/v2");
      onReady?.();

      // KCP는 paymentId에 특수문자(하이픈) 미지원 → UUID 하이픈 제거
      const kcpPaymentId = paymentId.replace(/-/g, "");

      // customer 객체: undefined/null 필드 완전 제외
      const customerObj: Record<string, string> = {};
      if (customerName) customerObj.fullName = customerName;
      if (customerEmail) customerObj.email = customerEmail;
      if (customerPhone) customerObj.phoneNumber = customerPhone.replace(/-/g, "");

      const response = await PortOne.requestPayment({
        storeId: getStoreId(),
        channelKey: getChannelKey(),
        paymentId: kcpPaymentId,
        orderName,
        totalAmount: Math.max(1, Math.round(amount)),
        currency: "CURRENCY_KRW",
        payMethod: "CARD",
        redirectUrl,
        ...(Object.keys(customerObj).length > 0 ? { customer: customerObj } : {}),
      });

      // 리다이렉트 방식이면 여기 도달 안 함
      if (response === null || response === undefined) return;
      if (response.code !== undefined) {
        if (response.code !== "FAILURE_TYPE_PG") {
          onError?.(new Error(response.message ?? "결제 실패"));
        }
      }
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err?.code !== "USER_CANCEL") {
        onError?.(new Error(err?.message ?? "결제 오류"));
      }
    } finally {
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
