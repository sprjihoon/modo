"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/utils";

export function PaymentSuccessClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const paymentKey = searchParams.get("paymentKey") ?? "";
  const tossOrderId = searchParams.get("orderId") ?? "";
  const amount = Number(searchParams.get("amount") ?? "0");
  // orderId query param (우리 DB의 주문 UUID) - payment page가 successUrl에 추가한 것
  const dbOrderId = searchParams.get("orderId") ?? tossOrderId;

  const [status, setStatus] = useState<"confirming" | "success" | "error">("confirming");
  const [error, setError] = useState<string | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<{
    method?: string;
    totalAmount?: number;
    approvedAt?: string;
  } | null>(null);

  useEffect(() => {
    if (!paymentKey || !tossOrderId || !amount) {
      setError("결제 정보가 올바르지 않습니다.");
      setStatus("error");
      return;
    }
    confirmPayment();
  }, []);

  async function confirmPayment() {
    try {
      const supabase = createClient();
      const { data, error: fnError } = await supabase.functions.invoke(
        "payments-confirm-toss",
        {
          body: {
            payment_key: paymentKey,
            order_id: dbOrderId,
            amount: amount,
            is_extra_charge: false,
          },
        }
      );

      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error ?? "결제 승인에 실패했습니다.");

      setPaymentInfo(data.data);
      setStatus("success");

      // 3초 후 주문 상세로 이동
      setTimeout(() => {
        router.replace(`/orders/${dbOrderId}?paid=true`);
      }, 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "결제 승인 중 오류가 발생했습니다.");
      setStatus("error");
    }
  }

  if (status === "confirming") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <div className="w-16 h-16 border-4 border-[#00C896]/20 border-t-[#00C896] rounded-full animate-spin" />
        <p className="text-sm font-semibold text-gray-700">결제를 확인하는 중입니다...</p>
        <p className="text-xs text-gray-400">잠시만 기다려주세요</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">
        <AlertCircle className="w-14 h-14 text-red-400" />
        <p className="text-base font-bold text-gray-800">결제 승인 실패</p>
        <p className="text-sm text-gray-500">{error}</p>
        <div className="flex gap-3 mt-2">
          <button
            onClick={() => router.replace(`/orders/${dbOrderId}`)}
            className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600"
          >
            주문 확인
          </button>
          <button
            onClick={() => router.replace(`/payment?orderId=${dbOrderId}`)}
            className="px-5 py-2.5 bg-[#00C896] text-white rounded-xl text-sm font-bold"
          >
            다시 결제
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 px-6 text-center">
      <div className="w-20 h-20 bg-[#00C896]/10 rounded-full flex items-center justify-center">
        <CheckCircle className="w-10 h-10 text-[#00C896]" />
      </div>
      <div>
        <p className="text-xl font-bold text-gray-900 mb-1">결제가 완료되었습니다!</p>
        {paymentInfo?.totalAmount && (
          <p className="text-2xl font-bold text-[#00C896]">
            {formatPrice(paymentInfo.totalAmount)}
          </p>
        )}
        {paymentInfo?.method && (
          <p className="text-sm text-gray-400 mt-1">{paymentInfo.method}</p>
        )}
      </div>
      <div className="w-full p-4 bg-blue-50 rounded-2xl text-left">
        <p className="text-sm font-semibold text-blue-800 mb-1">이제부터 수선이 시작됩니다</p>
        <p className="text-xs text-blue-600 leading-relaxed">
          택배 수거 → 입고 확인 → 수선 작업 → 배송 완료
          <br />약 5영업일 내로 완료됩니다.
        </p>
      </div>
      <p className="text-xs text-gray-400">잠시 후 주문 상세 페이지로 이동합니다...</p>
    </div>
  );
}
