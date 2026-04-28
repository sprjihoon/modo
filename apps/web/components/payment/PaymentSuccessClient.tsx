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

  const paymentKey = searchParams.get("paymentKey") ?? "";
  // Toss가 추가하는 orderId (requestPayment 시 전달한 orderId)
  const tossOrderId = searchParams.get("orderId") ?? "";
  const amountRaw = searchParams.get("amount") ?? "0";
  const amount = Number(amountRaw);

  // 테스트 우회 결제 여부 (skip-payment API 경유)
  const isTest = searchParams.get("test") === "1";

  // 추가결제 여부 및 실제 DB 주문 UUID
  const isExtraCharge = searchParams.get("isExtraCharge") === "true";
  const originalOrderId = searchParams.get("originalOrderId") ?? "";

  // 일반 결제: tossOrderId == DB UUID (PaymentClient에서 orderId: order.id로 설정)
  // 추가결제: tossOrderId == EXTRA_xxx_timestamp, originalOrderId == DB UUID
  const dbOrderId = isExtraCharge ? originalOrderId : tossOrderId;

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

    // 테스트 우회 결제: Toss 파라미터 없이 orderId만 있음
    if (isTest) {
      if (!tossOrderId) {
        setError("주문 정보가 올바르지 않습니다.");
        setStatus("error");
        return;
      }
      handleTestSuccess();
      return;
    }

    if (!paymentKey || !tossOrderId || isNaN(amount) || amount <= 0) {
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
        .eq("id", tossOrderId)
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
        router.replace(`/orders/${tossOrderId}?paid=true`);
      }, 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "주문 정보를 불러올 수 없습니다.");
      setStatus("error");
    }
  }

  async function confirmPayment() {
    try {
      const supabase = createClient();
      // 신규 흐름: 일반 결제는 tossOrderId === payment_intents.id
      //   payments-confirm-toss 가 intent_id 로 인텐트 조회 → orders insert (PAID)
      //   추가결제는 기존과 동일 (extra_charge_data 업데이트)
      const body: Record<string, unknown> = {
        payment_key: paymentKey,
        order_id: tossOrderId,
        amount: amount,
        is_extra_charge: isExtraCharge,
      };
      if (isExtraCharge && originalOrderId) {
        body.original_order_id = originalOrderId;
      } else {
        // 신규 흐름 트리거 — edge function 이 isCreateOrderFlow 분기 타도록
        // (pickup_payload 가 있으면 신규 흐름으로 인식)
        body.pickup_payload = { __from_intent: true };
      }

      const { data, error: fnError } = await supabase.functions.invoke(
        "payments-confirm-toss",
        { body }
      );

      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error ?? "결제 승인에 실패했습니다.");

      setPaymentInfo(data.data);
      setStatus("success");

      // 결제 성공 이벤트 추적
      const newOrderId = (data.data?.orderId as string | undefined) ?? dbOrderId;
      Analytics.paymentSuccess(newOrderId, amount, data.data?.method);

      // 결제 후 수거 예약 (오류 무시)
      if (!isExtraCharge && newOrderId) {
        await bookShipmentAfterPayment(supabase, newOrderId);
      }

      // 3초 후 주문 상세로 이동
      redirectTimerRef.current = setTimeout(() => {
        const target = isExtraCharge ? dbOrderId : newOrderId;
        router.replace(`/orders/${target}${isExtraCharge ? "" : "?paid=true"}`);
      }, 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "결제 승인 중 오류가 발생했습니다.");
      setStatus("error");
    }
  }

  async function bookShipmentAfterPayment(
    supabase: ReturnType<typeof createClient>,
    orderId: string
  ) {
    try {
      // 주문 정보 로드 (모바일의 _orderData에 해당)
      const { data: order } = await supabase
        .from("orders")
        .select(
          "customer_name, pickup_address, pickup_address_detail, pickup_zipcode, pickup_phone, delivery_address, delivery_address_detail, delivery_zipcode, delivery_phone, notes"
        )
        .eq("id", orderId)
        .single();

      if (!order?.pickup_address || !order?.customer_name) {
        console.warn("⚠️ 수거 예약 스킵: 주소 또는 고객 정보 없음");
        return;
      }

      const { data, error } = await supabase.functions.invoke("shipments-book", {
        body: {
          order_id: orderId,
          customer_name: order.customer_name,
          pickup_address: order.pickup_address,
          pickup_phone: order.pickup_phone ?? "",
          pickup_zipcode: order.pickup_zipcode ?? "",
          delivery_address: order.delivery_address ?? order.pickup_address,
          delivery_phone: order.delivery_phone ?? order.pickup_phone ?? "",
          delivery_zipcode: order.delivery_zipcode ?? order.pickup_zipcode ?? "",
          delivery_message: order.notes ?? "",
          test_mode: false,
        },
      });

      if (error) {
        console.error("❌ 수거 예약 실패:", error);
      } else {
        const trackingNo = data?.data?.tracking_no ?? data?.data?.pickup_tracking_no;
        console.log("✅ 수거 예약 완료. 송장번호:", trackingNo);
      }
    } catch (e) {
      console.error("❌ 수거 예약 오류 (무시):", e);
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
          {!isExtraCharge && tossOrderId && (
            <button
              onClick={() => router.replace(`/payment?intentId=${tossOrderId}`)}
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
              : "bg-yellow-50"
            : "bg-[#00C896]/10"
        }`}
      >
        <CheckCircle
          className={`w-10 h-10 ${
            isTest
              ? isCouponOrder
                ? "text-purple-500"
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
              : "테스트 모드로 주문이 생성되었습니다. 실제 결제는 이루어지지 않았습니다."}
          </p>
        </div>
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
