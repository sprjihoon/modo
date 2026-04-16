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
  // Toss가 추가하는 orderId (requestPayment 시 전달한 orderId)
  const tossOrderId = searchParams.get("orderId") ?? "";
  const amount = Number(searchParams.get("amount") ?? "0");

  // 추가결제 여부 및 실제 DB 주문 UUID
  const isExtraCharge = searchParams.get("isExtraCharge") === "true";
  const originalOrderId = searchParams.get("originalOrderId") ?? "";

  // 일반 결제: tossOrderId == DB UUID (PaymentClient에서 orderId: order.id로 설정)
  // 추가결제: tossOrderId == EXTRA_xxx_timestamp, originalOrderId == DB UUID
  const dbOrderId = isExtraCharge ? originalOrderId : tossOrderId;

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
    if (isExtraCharge && !originalOrderId) {
      setError("추가결제 주문 정보가 올바르지 않습니다.");
      setStatus("error");
      return;
    }
    confirmPayment();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function confirmPayment() {
    try {
      const supabase = createClient();
      const body: Record<string, unknown> = {
        payment_key: paymentKey,
        order_id: tossOrderId,
        amount: amount,
        is_extra_charge: isExtraCharge,
      };
      if (isExtraCharge && originalOrderId) {
        body.original_order_id = originalOrderId;
      }

      const { data, error: fnError } = await supabase.functions.invoke(
        "payments-confirm-toss",
        { body }
      );

      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error ?? "결제 승인에 실패했습니다.");

      setPaymentInfo(data.data);
      setStatus("success");

      // 일반 결제인 경우 수거 예약 호출 (모바일 앱의 _processAfterPayment와 동일한 방식)
      if (!isExtraCharge && dbOrderId) {
        bookShipmentAfterPayment(supabase, dbOrderId);
      }

      // 3초 후 주문 상세로 이동
      setTimeout(() => {
        router.replace(`/orders/${dbOrderId}${isExtraCharge ? "" : "?paid=true"}`);
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
          {!isExtraCharge && dbOrderId && (
            <button
              onClick={() => router.replace(`/payment?orderId=${dbOrderId}`)}
              className="px-5 py-2.5 bg-[#00C896] text-white rounded-xl text-sm font-bold"
            >
              다시 결제
            </button>
          )}
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
        <p className="text-xl font-bold text-gray-900 mb-1">
          {isExtraCharge ? "추가 결제가 완료되었습니다!" : "결제가 완료되었습니다!"}
        </p>
        {paymentInfo?.totalAmount && (
          <p className="text-2xl font-bold text-[#00C896]">
            {formatPrice(paymentInfo.totalAmount)}
          </p>
        )}
        {paymentInfo?.method && (
          <p className="text-sm text-gray-400 mt-1">{paymentInfo.method}</p>
        )}
      </div>
      {isExtraCharge ? (
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
