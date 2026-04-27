"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ChevronLeft, CreditCard, AlertCircle, CheckCircle,
  AlertTriangle, ArrowRight, RotateCcw,
} from "lucide-react";
import Script from "next/script";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/utils";
import { PageLayout } from "@/components/layout/PageLayout";

interface TossPaymentInstance {
  requestPayment: (params: {
    method: string;
    amount: { currency: string; value: number };
    orderId: string;
    orderName: string;
    successUrl: string;
    failUrl: string;
    customerName?: string;
  }) => Promise<void>;
}

interface TossPaymentsConstructor {
  (clientKey: string): {
    payment: (options: { customerKey: string }) => TossPaymentInstance;
  };
}

interface ExtraChargeData {
  managerPrice?: number;
  managerNote?: string;
  workerMemo?: string;
}

interface OrderData {
  id: string;
  item_name?: string;
  clothing_type?: string;
  extra_charge_status?: string;
  extra_charge_data?: ExtraChargeData;
}

function getClientKey(): string {
  const fromEnv = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_TOSS_CLIENT_KEY 환경변수가 설정되지 않았습니다. (운영 환경)"
    );
  }
  return "test_ck_Z61JOxRQVEE40z1ooEkwVW0X9bAq";
}

export default function ExtraChargePage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "success" | "skip" | "return">("idle");

  useEffect(() => {
    loadOrder();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  async function loadOrder() {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("orders")
        .select("id, item_name, clothing_type, extra_charge_status, extra_charge_data")
        .eq("id", orderId)
        .single();

      if (!data) throw new Error("주문을 찾을 수 없습니다.");

      if (data.extra_charge_status === "COMPLETED") {
        setStatus("success");
        setOrder(data);
        setIsLoading(false);
        return;
      }

      if (data.extra_charge_status !== "PENDING_CUSTOMER") {
        setError("추가 결제가 필요하지 않은 주문입니다.");
        setIsLoading(false);
        return;
      }

      setOrder(data);
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

      const tossPayments = TossPayments(getClientKey());
      const payment = tossPayments.payment({ customerKey });
      const extraData = order.extra_charge_data as ExtraChargeData | undefined;
      const amount = Math.max(1, Math.round(extraData?.managerPrice ?? 0));
      const tossOrderId = `EXTRA_${order.id}_${Date.now()}`;
      const successUrl = `${window.location.origin}/payment/success?originalOrderId=${order.id}&isExtraCharge=true`;
      const failUrl = `${window.location.origin}/payment/fail?orderId=${order.id}`;

      await payment.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: amount },
        orderId: tossOrderId,
        orderName: `${order.item_name ?? "수선 서비스"} 추가 결제`,
        successUrl,
        failUrl,
      });
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (err?.code !== "USER_CANCEL") {
        console.error("[추가결제] 오류:", e);
        setError(err?.message ?? "결제 요청 중 오류가 발생했습니다.");
      }
      setIsRequesting(false);
    }
  }

  async function handleDecision(action: "SKIP" | "RETURN") {
    const msg =
      action === "SKIP"
        ? "추가 작업 없이 원안대로 진행하시겠습니까?"
        : "반송 처리하시겠습니까?\n왕복 배송비 6,000원이 차감됩니다.";
    if (!confirm(msg)) return;
    setIsActionLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { alert("로그인이 필요합니다."); return; }
      const { data: userRow } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", user.id)
        .maybeSingle();
      if (!userRow) { alert("사용자 정보를 찾을 수 없습니다."); return; }
      const { error: rpcError } = await supabase.rpc("process_customer_decision", {
        p_order_id: orderId,
        p_action: action,
        p_customer_id: userRow.id,
      });
      if (rpcError) throw rpcError;
      setStatus(action === "SKIP" ? "skip" : "return");
    } catch (e) {
      alert("처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      console.error(e);
    } finally {
      setIsActionLoading(false);
    }
  }

  const extraData = order?.extra_charge_data as ExtraChargeData | undefined;
  const amount = extraData?.managerPrice ?? 0;

  if (isLoading) {
    return (
      <PageLayout showAppBanner={false}>
        <Header onBack={() => router.back()} />
        <div className="p-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </PageLayout>
    );
  }

  if (status === "success") {
    return (
      <PageLayout showAppBanner={false}>
        <Header onBack={() => router.back()} />
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 px-6 text-center">
          <div className="w-20 h-20 bg-[#00C896]/10 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-[#00C896]" />
          </div>
          <p className="text-xl font-bold text-gray-900">추가 결제 완료</p>
          <p className="text-sm text-gray-500">추가 결제가 완료되었습니다. 수선이 계속 진행됩니다.</p>
          <button
            onClick={() => router.replace(`/orders/${orderId}`)}
            className="px-8 py-3 bg-[#00C896] text-white text-sm font-bold rounded-xl active:brightness-95"
          >
            주문 상세 보기
          </button>
        </div>
      </PageLayout>
    );
  }

  if (status === "skip") {
    return (
      <PageLayout showAppBanner={false}>
        <Header onBack={() => router.back()} />
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 px-6 text-center">
          <div className="w-20 h-20 bg-[#00C896]/10 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-[#00C896]" />
          </div>
          <p className="text-xl font-bold text-gray-900">원안대로 진행합니다</p>
          <p className="text-sm text-gray-500">추가 작업 없이 기존 내용대로 수선이 진행됩니다.</p>
          <button
            onClick={() => router.replace(`/orders/${orderId}`)}
            className="px-8 py-3 bg-[#00C896] text-white text-sm font-bold rounded-xl active:brightness-95"
          >
            주문 상세 보기
          </button>
        </div>
      </PageLayout>
    );
  }

  if (status === "return") {
    return (
      <PageLayout showAppBanner={false}>
        <Header onBack={() => router.back()} />
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 px-6 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <RotateCcw className="w-10 h-10 text-red-500" />
          </div>
          <p className="text-xl font-bold text-gray-900">반송 요청 완료</p>
          <p className="text-sm text-gray-500">반송 처리가 요청되었습니다. 왕복 배송비 6,000원이 차감됩니다.</p>
          <button
            onClick={() => router.replace(`/orders/${orderId}`)}
            className="px-8 py-3 bg-[#00C896] text-white text-sm font-bold rounded-xl active:brightness-95"
          >
            주문 상세 보기
          </button>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout showAppBanner={false}>
        <Header onBack={() => router.back()} />
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">
          <AlertCircle className="w-14 h-14 text-red-400" />
          <p className="text-base font-bold text-gray-800">오류가 발생했습니다</p>
          <p className="text-sm text-gray-500">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 border border-gray-200 rounded-xl text-sm text-gray-600"
          >
            돌아가기
          </button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout showAppBanner={false}>
      <Script src="https://js.tosspayments.com/v2/standard" strategy="afterInteractive" />
      <Header onBack={() => router.back()} />

      <div className="pb-56">
        {/* 주문 정보 */}
        <div className="mx-4 mt-4 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
          <p className="text-xs font-semibold text-gray-400 mb-2">주문 정보</p>
          {order?.clothing_type && (
            <p className="text-xs text-gray-400 mb-1">{order.clothing_type}</p>
          )}
          <p className="text-sm font-semibold text-gray-800">{order?.item_name ?? "수선 서비스"}</p>
        </div>

        {/* 추가 결제 안내 카드 */}
        <div className="mx-4 mt-3 p-5 bg-orange-50 border-2 border-orange-300 rounded-2xl">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <p className="text-sm font-bold text-orange-900">💳 추가 결제 안내</p>
          </div>
          {extraData?.managerNote && (
            <div className="bg-white rounded-xl p-3 mb-3">
              <p className="text-sm text-gray-700 leading-relaxed">{extraData.managerNote}</p>
            </div>
          )}
          {extraData?.workerMemo && (
            <p className="text-xs text-gray-500 leading-relaxed mb-3">
              현장 메모: {extraData.workerMemo}
            </p>
          )}
          <div className="bg-orange-100 rounded-xl p-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-orange-800">추가 청구 금액</span>
            <span className="text-xl font-extrabold text-orange-900">{formatPrice(amount)}</span>
          </div>
        </div>

        {/* 안내 */}
        <div className="mx-4 mt-3 p-3 bg-gray-50 rounded-xl">
          <p className="text-xs text-gray-500 leading-relaxed whitespace-pre-line">
            {"• 결제하기: 추가 금액을 결제 후 수선을 진행합니다\n• 그냥 진행: 추가 작업 없이 원안대로 진행합니다\n• 반송: 왕복 배송비 6,000원이 차감됩니다"}
          </p>
        </div>
      </div>

      {/* 하단 버튼 고정 */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 pb-6 pt-3 bg-white border-t border-gray-100 space-y-2">
        {/* 결제하기 */}
        <button
          onClick={handlePayment}
          disabled={isRequesting || isActionLoading || amount === 0}
          className="w-full py-4 bg-blue-600 text-white text-base font-bold rounded-xl disabled:opacity-50 active:brightness-95 transition-all flex items-center justify-center gap-2"
        >
          <CreditCard className="w-5 h-5" />
          {isRequesting ? "결제 진행 중..." : `${formatPrice(amount)} 결제하기`}
        </button>

        {/* 그냥 진행 / 반송하기 */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleDecision("SKIP")}
            disabled={isActionLoading || isRequesting}
            className="py-3 border border-[#00C896] text-[#00C896] text-sm font-semibold rounded-xl active:bg-[#00C896]/10 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <ArrowRight className="w-4 h-4" />
            그냥 진행
          </button>
          <button
            onClick={() => handleDecision("RETURN")}
            disabled={isActionLoading || isRequesting}
            className="py-3 border border-red-400 text-red-500 text-sm font-semibold rounded-xl active:bg-red-50 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            반송하기
          </button>
        </div>
      </div>
    </PageLayout>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 flex items-center h-14 px-4 gap-2">
      <button onClick={onBack} className="p-1 -ml-1 active:opacity-60">
        <ChevronLeft className="w-6 h-6 text-gray-800" />
      </button>
      <h1 className="flex-1 text-base font-bold text-gray-900">추가 결제</h1>
    </header>
  );
}
