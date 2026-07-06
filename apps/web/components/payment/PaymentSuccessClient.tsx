"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/utils";
import { Analytics } from "@/lib/analytics";

export function PaymentSuccessClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // PortOne V2: paymentId (= intent.id UUID 하이픈 제거 버전)
  const paymentId = searchParams.get("paymentId") ?? "";
  const portonePaymentId = paymentId;

  // 테스트 우회 결제 여부 (skip-payment API 경유)
  const isTest = searchParams.get("test") === "1";
  // 실제 우체국 API 호출 여부
  const isRealEpost = searchParams.get("realEpost") === "1";
  // skip-payment에서 받은 송장번호
  const urlTrackingNo = searchParams.get("trackingNo") ?? "";
  // skip-payment에서 받은 우체국 에러 메시지
  const epostError = searchParams.get("epostError") ?? "";

  // 테스트 우회 결제 시 orderId는 별도 파라미터
  const testOrderId = searchParams.get("orderId") ?? "";

  // 추가결제 여부 및 실제 DB 주문 UUID
  const isExtraCharge = searchParams.get("isExtraCharge") === "true";
  const originalOrderId = searchParams.get("originalOrderId") ?? "";

  // dbOrderId: 추가결제면 originalOrderId, 일반결제면 테스트 시 testOrderId (테스트 전용)
  const dbOrderId = isExtraCharge ? originalOrderId : (isTest ? testOrderId : "");

  const [status, setStatus] = useState<"confirming" | "success" | "error">("confirming");
  const [error, setError] = useState<string | null>(null);
  const [isCouponOrder, setIsCouponOrder] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<{
    method?: string;
    totalAmount?: number;
    approvedAt?: string;
  } | null>(null);

  // 이중 승인 방지: Strict Mode 등에서 두 번 실행되지 않도록 ref로 가드
  const confirmCalledRef = useRef(false);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (confirmCalledRef.current) return;
    confirmCalledRef.current = true;

    // 테스트 우회 결제
    if (isTest) {
      if (!testOrderId) {
        setError("주문 정보가 올바르지 않습니다.");
        setStatus("error");
        return;
      }
      handleTestSuccess();
      return;
    }

    if (!portonePaymentId) {
      setError("결제 정보가 올바르지 않습니다.");
      setStatus("error");
      return;
    }
    if (isExtraCharge && !originalOrderId) {
      setError("추가결제 주문 정보가 올바르지 않습니다.");
      setStatus("error");
      return;
    }
    confirmPayment();

    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleTestSuccess() {
    try {
      const supabase = createClient();
      const { data: order } = await supabase
        .from("orders")
        .select("id, total_price, promotion_code_id, promotion_discount_amount")
        .eq("id", testOrderId)
        .single();

      const hasCoupon =
        !!order?.promotion_code_id || (order?.promotion_discount_amount ?? 0) > 0;
      setIsCouponOrder(hasCoupon);

      setPaymentInfo({
        method: hasCoupon ? "쿠폰 할인" : "테스트 결제",
        totalAmount: order?.total_price ?? 0,
      });
      setStatus("success");

      redirectTimerRef.current = setTimeout(() => {
        router.replace(`/orders/${testOrderId}?paid=true`);
      }, 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "주문 정보를 불러올 수 없습니다.");
      setStatus("error");
    }
  }

  async function confirmPayment() {
    try {
      const supabase = createClient();
      const body: Record<string, unknown> = {
        payment_id: portonePaymentId,
        order_id: portonePaymentId, // intent_id == paymentId (UUID 하이픈 제거)
        is_extra_charge: isExtraCharge,
      };
      if (isExtraCharge && originalOrderId) {
        body.original_order_id = originalOrderId;
      } else {
        body.pickup_payload = { __from_intent: true };
      }

      const { data, error: fnError } = await supabase.functions.invoke(
        "payments-confirm",
        { body }
      );

      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error ?? "결제 검증에 실패했습니다.");

      setPaymentInfo(data.data);
      setStatus("success");

      const newOrderId = (data.data?.orderId as string | undefined) ?? dbOrderId;
      Analytics.paymentSuccess(newOrderId, data.data?.totalAmount ?? 0, data.data?.method);

      redirectTimerRef.current = setTimeout(() => {
        const target = isExtraCharge ? dbOrderId : newOrderId;
        router.replace(`/orders/${target}${isExtraCharge ? "" : "?paid=true"}`);
      }, 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "결제 검증 중 오류가 발생했습니다.");
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
          {dbOrderId && (
            <button
              onClick={() => router.replace(`/orders/${dbOrderId}`)}
              className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600"
            >
              주문 확인
            </button>
          )}
          {!isExtraCharge && portonePaymentId && (
            <button
              onClick={() => router.replace(`/payment?intentId=${portonePaymentId}`)}
              className="px-5 py-2.5 bg-[#00C896] text-white rounded-xl text-sm font-bold"
            >
              다시 결제
            </button>
          )}
        </div>
      </div>
    );
  }

  const successTitle = isTest
    ? isCouponOrder
      ? "쿠폰으로 주문이 처리되었습니다!"
      : isRealEpost
      ? "수거 예약이 완료되었습니다!"
      : "테스트 모드로 주문이 처리되었습니다!"
    : isExtraCharge
    ? "추가 결제가 완료되었습니다!"
    : "결제가 완료되었습니다!";

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 px-6 text-center">
      <div
        className={`w-20 h-20 rounded-full flex items-center justify-center ${
          isTest
            ? isCouponOrder
              ? "bg-purple-50"
              : isRealEpost
              ? "bg-[#00C896]/10"
              : "bg-yellow-50"
            : "bg-[#00C896]/10"
        }`}
      >
        <CheckCircle
          className={`w-10 h-10 ${
            isTest
              ? isCouponOrder
                ? "text-purple-500"
                : isRealEpost
                ? "text-[#00C896]"
                : "text-yellow-500"
              : "text-[#00C896]"
          }`}
        />
      </div>
      <div>
        <p className="text-xl font-bold text-gray-900 mb-1">{successTitle}</p>
        {(paymentInfo?.totalAmount ?? 0) > 0 && (
          <p
            className={`text-2xl font-bold ${
              isTest
                ? isCouponOrder
                  ? "text-purple-500"
                  : isRealEpost
                  ? "text-[#00C896]"
                  : "text-yellow-500"
                : "text-[#00C896]"
            }`}
          >
            {formatPrice(paymentInfo!.totalAmount!)}
          </p>
        )}
        {paymentInfo?.method && (
          <p className="text-sm text-gray-400 mt-1">{paymentInfo.method}</p>
        )}
      </div>
      {isTest ? (
        isRealEpost ? (
          <div className="w-full p-4 bg-[#00C896]/10 rounded-2xl text-left">
            <p className="text-sm font-semibold text-[#00875A] mb-1">📦 실제 우체국 수거 예약 완료</p>
            {urlTrackingNo ? (
              <p className="text-xs text-gray-700 leading-relaxed">
                송장번호: <span className="font-bold text-gray-900">{urlTrackingNo}</span>
              </p>
            ) : epostError ? (
              <p className="text-xs text-red-600 leading-relaxed">
                ⚠️ 우체국 수거예약 실패: {epostError}
              </p>
            ) : (
              <p className="text-xs text-gray-600 leading-relaxed">
                우체국 수거 예약이 진행 중입니다. 주문 상세에서 송장번호를 확인하세요.
              </p>
            )}
          </div>
        ) : (
        <div
          className={`w-full p-4 rounded-2xl text-left ${
            isCouponOrder ? "bg-purple-50" : "bg-yellow-50"
          }`}
        >
          <p
            className={`text-sm font-semibold mb-1 ${
              isCouponOrder ? "text-purple-800" : "text-yellow-800"
            }`}
          >
            {isCouponOrder ? "🎟 쿠폰 적용 주문 완료" : "🧪 테스트 주문 완료"}
          </p>
          <p
            className={`text-xs leading-relaxed ${
              isCouponOrder ? "text-purple-600" : "text-yellow-700"
            }`}
          >
            {isCouponOrder
              ? "쿠폰 할인이 적용되어 주문이 처리되었습니다. 수선 작업을 진행합니다."
              : "테스트 결제로 주문이 생성되었습니다."}
          </p>
        </div>
        )
      ) : isExtraCharge ? (
        <div className="w-full p-4 bg-orange-50 rounded-2xl text-left">
          <p className="text-sm font-semibold text-orange-800 mb-1">✅ 추가 결제 완료</p>
          <p className="text-xs text-orange-600 leading-relaxed">
            추가 결제가 완료되었습니다. 수선 작업을 계속 진행합니다.
          </p>
        </div>
      ) : (
        <div className="w-full p-4 bg-blue-50 rounded-2xl text-left">
          <p className="text-sm font-semibold text-blue-800 mb-1">이제부터 수선이 시작됩니다</p>
          <p className="text-xs text-blue-600 leading-relaxed">
            택배 수거 → 입고 확인 → 수선 작업 → 배송 완료
            <br />약 5영업일 내로 완료됩니다.
          </p>
        </div>
      )}
      <p className="text-xs text-gray-400">잠시 후 주문 상세 페이지로 이동합니다...</p>
    </div>
  );
}
