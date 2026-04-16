"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Script from "next/script";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/utils";
import { Scissors, MapPin, CreditCard, AlertCircle, FlaskConical, Truck, CheckCircle2 } from "lucide-react";

interface TossPaymentInstance {
  requestPayment: (params: {
    method: string;
    amount: { currency: string; value: number };
    orderId: string;
    orderName: string;
    successUrl: string;
    failUrl: string;
    customerName?: string;
    customerEmail?: string;
    customerMobilePhone?: string;
  }) => Promise<void>;
}

interface TossPaymentsConstructor {
  (clientKey: string): {
    payment: (options: { customerKey: string }) => TossPaymentInstance;
  };
}

interface OrderInfo {
  id: string;
  item_name?: string;
  clothing_type?: string;
  total_price: number;
  pickup_address?: string;
  pickup_phone?: string;
  pickup_zipcode?: string;
  delivery_address?: string;
  delivery_phone?: string;
  delivery_zipcode?: string;
  notes?: string;
  repair_parts?: Array<{ name: string; price: number; quantity: number }>;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
}

const CLIENT_KEY = (
  process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ||
  "test_ck_Z61JOxRQVEE40z1ooEkwVW0X9bAq"
).trim();

type PaymentMethod = "CARD" | "TRANSFER" | "VIRTUAL_ACCOUNT";

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: string }[] = [
  { id: "CARD", label: "신용·체크카드", icon: "💳" },
  { id: "TRANSFER", label: "계좌이체", icon: "🏦" },
  { id: "VIRTUAL_ACCOUNT", label: "가상계좌", icon: "📄" },
];

export function PaymentClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("orderId") ?? "";

  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("CARD");
  // TODO: 출시 전 false로 변경하거나 ops_center_settings DB 설정으로 제어
  const [showTestButtons, setShowTestButtons] = useState(true);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTestLoading, setIsTestLoading] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setError("주문 정보를 찾을 수 없습니다.");
      setIsLoading(false);
      return;
    }
    loadOrder();
    loadTestButtonsSetting();
  }, [orderId]);

  async function loadTestButtonsSetting() {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("ops_center_settings")
        .select("show_test_buttons")
        .limit(1)
        .maybeSingle();
      if (data) setShowTestButtons(data.show_test_buttons ?? false);
    } catch {
      // 설정 로드 실패 시 테스트 버튼 미표시
    }
  }

  async function loadOrder() {
    try {
      const supabase = createClient();
      const { data: d1, error: e1 } = await supabase
        .from("orders")
        .select(
          "id, item_name, clothing_type, total_price, pickup_address, pickup_phone, pickup_zipcode, delivery_address, delivery_phone, delivery_zipcode, notes, repair_parts, customer_name, customer_email, customer_phone"
        )
        .eq("id", orderId)
        .single();

      if (e1) {
        // 컬럼 없는 구버전 fallback
        const { data: d2 } = await supabase
          .from("orders")
          .select("id, item_name, clothing_type, total_price, pickup_address, customer_name")
          .eq("id", orderId)
          .single();
        if (!d2) throw new Error("주문 정보를 찾을 수 없습니다.");
        setOrder(d2 as OrderInfo);
      } else {
        if (!d1) throw new Error("주문 정보를 찾을 수 없습니다.");
        setOrder(d1 as OrderInfo);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "주문 정보를 불러올 수 없습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePayment() {
    if (!order) return;
    setIsRequesting(true);
    setError(null);
    try {
      const TossPayments = (
        window as unknown as { TossPayments?: TossPaymentsConstructor }
      ).TossPayments;

      if (!TossPayments) {
        throw new Error("결제 모듈이 아직 로드되지 않았습니다. 잠시 후 다시 시도해주세요.");
      }

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const customerKey = user?.id ?? `anon_${Date.now()}`;

      const tossPayments = TossPayments(CLIENT_KEY);

      const payment = tossPayments.payment({ customerKey });
      const intAmount = Math.max(1, Math.round(order.total_price));

      await payment.requestPayment({
        method: selectedMethod,
        amount: { currency: "KRW", value: intAmount },
        orderId: order.id,
        orderName: order.item_name ?? "모두의수선 수선 서비스",
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
        ...(order.customer_name && { customerName: order.customer_name }),
        ...(order.customer_email && { customerEmail: order.customer_email }),
        ...(order.customer_phone && { customerMobilePhone: order.customer_phone.replace(/-/g, "") }),
      });
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (err?.code !== "USER_CANCEL") {
        console.error("[결제] 오류:", err?.code, err?.message);
        setError(err?.message ?? "결제 요청 중 오류가 발생했습니다.");
      }
      setIsRequesting(false);
    }
  }

  async function handleTestShipment(testMode: boolean) {
    if (!order) return;
    setIsTestLoading(true);
    setTestResult(null);
    try {
      const supabase = createClient();
      await supabase
        .from("orders")
        .update({ payment_status: "PAID" })
        .eq("id", order.id);

      setTestResult(testMode ? "🧪 Mock 모드로 수거예약 시작..." : "🚚 실제 우체국 API로 수거예약 시작...");

      const body: Record<string, unknown> = {
        order_id: order.id,
        pickup_address: order.pickup_address ?? "테스트 주소",
        pickup_phone: order.pickup_phone ?? "010-1234-5678",
        delivery_address: order.delivery_address ?? order.pickup_address ?? "테스트 주소",
        delivery_phone: order.delivery_phone ?? order.pickup_phone ?? "010-1234-5678",
        customer_name: order.customer_name ?? "테스트 고객",
        test_mode: testMode,
      };
      if (order.pickup_zipcode) body.pickup_zipcode = order.pickup_zipcode;
      if (order.delivery_zipcode) body.delivery_zipcode = order.delivery_zipcode;
      if (order.notes) body.delivery_message = order.notes;

      const { data, error: fnError } = await supabase.functions.invoke("shipments-book", { body });
      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error ?? "수거예약 실패");

      const trackingNo = data.data?.tracking_no ?? data.data?.pickup_tracking_no;
      setTestResult(
        testMode
          ? `✅ Mock 수거예약 완료!\n송장번호: ${trackingNo}`
          : `🎉 실제 우체국 수거예약 완료!\n송장번호: ${trackingNo}`
      );
      setTimeout(() => router.push("/orders"), 3000);
    } catch (e) {
      setTestResult(`❌ 오류: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsTestLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="m-4 p-6 bg-white border border-gray-100 rounded-2xl text-center shadow-sm">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-sm font-bold text-gray-800 mb-1">결제 오류가 발생했습니다</p>
        <p className="text-xs text-gray-500 mb-4 whitespace-pre-line">{error}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => { setError(null); }}
            className="text-sm text-white bg-[#00C896] font-semibold px-4 py-2 rounded-lg"
          >
            다시 시도
          </button>
          <button onClick={() => router.back()} className="text-sm text-gray-500 font-semibold px-4 py-2 rounded-lg border border-gray-200">
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  const repairItems = Array.isArray(order?.repair_parts) ? order!.repair_parts! : [];

  return (
    <>
    <Script src="https://js.tosspayments.com/v2/standard" strategy="afterInteractive" />
    <div className="pb-36">
      {/* 주문 요약 */}
      <div className="mx-4 mt-4 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Scissors className="w-4 h-4 text-[#00C896]" />
          <p className="text-sm font-bold text-gray-800">주문 정보</p>
        </div>
        {order?.clothing_type && (
          <p className="text-xs text-gray-400 mb-2">{order.clothing_type}</p>
        )}
        {repairItems.length > 0 ? (
          <div className="space-y-1.5">
            {repairItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">
                  {item.name}
                  {(item.quantity ?? 1) > 1 && (
                    <span className="text-gray-400 ml-1">×{item.quantity}</span>
                  )}
                </span>
                {item.price > 0 && (
                  <span className="text-gray-600 font-medium">
                    {formatPrice(item.price * (item.quantity ?? 1))}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-700">{order?.item_name}</p>
        )}
        {order?.pickup_address && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-start gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
            <p className="text-xs text-gray-500">{order.pickup_address}</p>
          </div>
        )}
      </div>

      {/* 결제 금액 */}
      <div className="mx-4 mt-3 p-5 bg-[#00C896]/5 border border-[#00C896]/20 rounded-2xl">
        <div className="flex items-center gap-2 mb-1">
          <CreditCard className="w-4 h-4 text-[#00C896]" />
          <p className="text-sm font-bold text-[#00C896]">결제 금액</p>
        </div>
        <p className="text-2xl font-bold text-gray-900 mt-1">
          {formatPrice(order?.total_price ?? 0)}
        </p>
      </div>

      {/* 결제 수단 선택 */}
      <div className="mx-4 mt-3">
        <p className="text-sm font-bold text-gray-800 mb-2">결제 수단</p>
        <div className="grid grid-cols-3 gap-2">
          {PAYMENT_METHODS.map((m) => {
            const selected = selectedMethod === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setSelectedMethod(m.id)}
                className={`relative flex flex-col items-center gap-1.5 py-3.5 rounded-xl border-2 transition-all ${
                  selected
                    ? "border-[#00C896] bg-[#00C896]/5"
                    : "border-gray-100 bg-white"
                }`}
              >
                {selected && (
                  <CheckCircle2 className="absolute top-2 right-2 w-4 h-4 text-[#00C896]" />
                )}
                <span className="text-xl">{m.icon}</span>
                <span className={`text-xs font-medium ${selected ? "text-[#00C896]" : "text-gray-600"}`}>
                  {m.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 결제하기 버튼 */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 pb-6 pt-3 bg-white border-t border-gray-100 space-y-2">
        {/* 우체국 테스트 버튼 - 결제하기 버튼 바로 위 */}
        {showTestButtons && (
          <div className="rounded-xl border border-dashed border-orange-300 bg-orange-50 p-3 space-y-2">
            <p className="text-[11px] font-bold text-orange-400 text-center tracking-wide">🔧 우체국 API 테스트 (출시 전 제거)</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleTestShipment(true)}
                disabled={isTestLoading || isRequesting}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold text-orange-600 bg-white border border-orange-200 rounded-lg disabled:opacity-50 active:brightness-95 transition-all"
              >
                <FlaskConical className="w-4 h-4" />
                Mock 수거예약
              </button>
              <button
                onClick={() => handleTestShipment(false)}
                disabled={isTestLoading || isRequesting}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold text-green-700 bg-white border border-green-300 rounded-lg disabled:opacity-50 active:brightness-95 transition-all"
              >
                <Truck className="w-4 h-4" />
                실제 우체국 API
              </button>
            </div>
            {isTestLoading && (
              <p className="text-xs text-center text-orange-400 animate-pulse">처리 중...</p>
            )}
            {testResult && (
              <p className="text-xs text-center whitespace-pre-line font-medium text-gray-700 bg-white rounded-lg px-3 py-2 border border-gray-100">
                {testResult}
              </p>
            )}
          </div>
        )}
        <button
          onClick={handlePayment}
          disabled={isRequesting}
          className="w-full py-4 bg-[#00C896] text-white text-base font-bold rounded-xl disabled:opacity-50 active:brightness-95 transition-all"
        >
          {isRequesting
            ? "결제 진행 중..."
            : `${formatPrice(order?.total_price ?? 0)} 결제하기`}
        </button>
      </div>
    </div>
    </>
  );
}
