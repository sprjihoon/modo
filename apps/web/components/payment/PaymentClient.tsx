"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Script from "next/script";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/utils";
import { Scissors, MapPin, CreditCard, AlertCircle, X } from "lucide-react";

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

interface IntentPayload {
  itemName: string;
  clothingType: string;
  pickupAddress: string;
  pickupAddressDetail?: string | null;
  pickupPhone?: string | null;

  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;

  basePrice: number;
  shippingFee: number;
  shippingDiscountAmount: number;
  remoteAreaFee: number;
  promotionDiscountAmount: number;

  repairParts: Array<{ name: string; price?: number; quantity?: number }> | null;
}

interface PaymentIntent {
  id: string;
  total_price: number;
  payload: IntentPayload;
  expires_at: string;
  consumed_at: string | null;
}

const CLIENT_KEY = (() => {
  const fromEnv = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_TOSS_CLIENT_KEY 환경변수가 설정되지 않았습니다. (운영 환경)"
    );
  }
  return "test_ck_Z61JOxRQVEE40z1ooEkwVW0X9bAq";
})();

export function PaymentClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  // 신규 흐름: intentId 만 사용 (PENDING_PAYMENT 폐지)
  const intentId = searchParams.get("intentId") ?? "";

  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 이탈 가드: 결제 직전 → "결제 안 끝내고 나가실래요?" 확인
  const [showExitDialog, setShowExitDialog] = useState(false);
  const pendingExitRef = useRef<(() => void) | null>(null);
  const popstateHandlerRef = useRef<(() => void) | null>(null);
  const isPaymentInProgressRef = useRef(false);

  useEffect(() => {
    if (!intentId) {
      setError("결제 정보가 올바르지 않습니다. 주문을 다시 시작해주세요.");
      setIsLoading(false);
      return;
    }
    loadIntent();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intentId]);

  // ── 이탈 방지 ──────────────────────────────────────────────────────────
  // OrderNewClient 와 동일한 패턴: modu_before_navigate / popstate / beforeunload
  // 결제 위젯 호출 직전에 isPaymentInProgressRef = true 로 두어 가드 비활성화.
  useEffect(() => {
    const handler = (e: Event) => {
      if (isPaymentInProgressRef.current) return;
      if (!intent) return;
      e.preventDefault();
      const type = (e as CustomEvent).detail?.type as "back" | "home";
      pendingExitRef.current = () => {
        if (type === "home") router.push("/");
        else router.back();
      };
      setShowExitDialog(true);
    };
    window.addEventListener("modu_before_navigate", handler);
    return () => window.removeEventListener("modu_before_navigate", handler);
  }, [intent, router]);

  useEffect(() => {
    if (!intent) return;
    window.history.pushState({ paymentFlowGuard: true }, "");

    const handler = () => {
      if (isPaymentInProgressRef.current) return;
      window.history.pushState({ paymentFlowGuard: true }, "");
      pendingExitRef.current = () => {
        if (popstateHandlerRef.current) {
          window.removeEventListener("popstate", popstateHandlerRef.current);
          popstateHandlerRef.current = null;
        }
        window.history.back();
      };
      setShowExitDialog(true);
    };
    popstateHandlerRef.current = handler;
    window.addEventListener("popstate", handler);
    return () => {
      if (popstateHandlerRef.current) {
        window.removeEventListener("popstate", popstateHandlerRef.current);
      }
    };
  }, [intent]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isPaymentInProgressRef.current) return;
      if (!intent) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [intent]);

  async function loadIntent() {
    try {
      const supabase = createClient();
      const { data, error: e1 } = await supabase
        .from("payment_intents")
        .select("id, total_price, payload, expires_at, consumed_at")
        .eq("id", intentId)
        .maybeSingle();

      if (e1 || !data) {
        throw new Error("결제 정보를 찾을 수 없습니다. 주문을 다시 시작해주세요.");
      }
      if (data.consumed_at) {
        throw new Error("이미 결제가 완료된 요청입니다.");
      }
      if (new Date(data.expires_at).getTime() < Date.now()) {
        throw new Error("결제 시간이 만료되었습니다. 주문을 다시 시작해주세요.");
      }
      setIntent(data as PaymentIntent);
    } catch (e) {
      setError(e instanceof Error ? e.message : "주문 정보를 불러올 수 없습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePayment() {
    if (!intent) return;
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
      const intAmount = Math.max(1, Math.round(intent.total_price));

      // Toss 위젯 호출 직전 — 이탈 가드 비활성화 (Toss 가 자체 navigate 함)
      isPaymentInProgressRef.current = true;

      const p = intent.payload;
      await payment.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: intAmount },
        orderId: intent.id, // intent_id 를 Toss orderId 로 사용
        orderName: p.itemName ?? "모두의수선 수선 서비스",
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
        ...(p.customerName ? { customerName: p.customerName } : {}),
        ...(p.customerEmail ? { customerEmail: p.customerEmail } : {}),
        ...(p.customerPhone ? { customerMobilePhone: p.customerPhone.replace(/-/g, "") } : {}),
      });
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (err?.code !== "USER_CANCEL") {
        console.error("[결제] 오류:", err?.code, err?.message);
        setError(err?.message ?? "결제 요청 중 오류가 발생했습니다.");
      }
      isPaymentInProgressRef.current = false;
      setIsRequesting(false);
    }
  }

  function handleExitConfirm() {
    setShowExitDialog(false);
    pendingExitRef.current?.();
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

  if (error || !intent) {
    return (
      <div className="m-4 p-6 bg-white border border-gray-100 rounded-2xl text-center shadow-sm">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-sm font-bold text-gray-800 mb-1">결제 정보를 불러올 수 없습니다</p>
        <p className="text-xs text-gray-500 mb-4 whitespace-pre-line">{error}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => router.push("/order/new")}
            className="text-sm text-white bg-[#00C896] font-semibold px-4 py-2 rounded-lg"
          >
            주문 다시 시작
          </button>
          <button
            onClick={() => router.push("/")}
            className="text-sm text-gray-500 font-semibold px-4 py-2 rounded-lg border border-gray-200"
          >
            홈으로
          </button>
        </div>
      </div>
    );
  }

  const p = intent.payload;
  const repairItems = Array.isArray(p.repairParts) ? p.repairParts : [];
  const shippingFeeDisplay = p.shippingFee ?? 7000;
  const shippingDiscount = p.shippingDiscountAmount ?? 0;
  const actualShipping = shippingFeeDisplay - shippingDiscount;
  const remoteAreaFee = p.remoteAreaFee ?? 0;
  const repairTotal = (p.basePrice ?? 0) - (p.promotionDiscountAmount ?? 0);

  return (
    <>
      <Script src="https://js.tosspayments.com/v2/standard" strategy="afterInteractive" />
      <div className="pb-36">
        <div className="mx-4 mt-4 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Scissors className="w-4 h-4 text-[#00C896]" />
            <p className="text-sm font-bold text-gray-800">주문 정보</p>
          </div>
          {p.clothingType && (
            <p className="text-xs text-gray-400 mb-2">{p.clothingType}</p>
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
                  {(item.price ?? 0) > 0 && (
                    <span className="text-gray-600 font-medium">
                      {formatPrice((item.price ?? 0) * (item.quantity ?? 1))}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-700">{p.itemName}</p>
          )}
          {p.pickupAddress && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
              <p className="text-xs text-gray-500">{p.pickupAddress}</p>
            </div>
          )}
        </div>

        <div className="mx-4 mt-3 p-5 bg-[#00C896]/5 border border-[#00C896]/20 rounded-2xl">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4 text-[#00C896]" />
            <p className="text-sm font-bold text-[#00C896]">결제 금액</p>
          </div>
          <div className="space-y-1.5 mb-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">수선비</span>
              <span className="text-gray-700 font-medium">{formatPrice(repairTotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">왕복배송비</span>
              <div className="flex items-center gap-1.5">
                {shippingDiscount > 0 && (
                  <span className="text-xs text-gray-400 line-through">
                    {formatPrice(shippingFeeDisplay)}
                  </span>
                )}
                <span className="text-gray-700 font-medium">
                  {actualShipping === 0 ? "무료" : formatPrice(actualShipping)}
                </span>
              </div>
            </div>
            {shippingDiscount > 0 && (
              <div className="flex items-center justify-between text-xs text-[#00C896] font-semibold">
                <span>🎉 배송비 할인 적용</span>
                <span>-{formatPrice(shippingDiscount)}</span>
              </div>
            )}
            {remoteAreaFee > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-orange-600 font-medium flex items-center gap-1">
                  🏝 도서산간 추가 배송비
                </span>
                <span className="text-orange-600 font-bold">+{formatPrice(remoteAreaFee)}</span>
              </div>
            )}
            <div className="border-t border-[#00C896]/20 pt-2 mt-1" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatPrice(intent.total_price)}
          </p>
        </div>

        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 pb-6 pt-3 bg-white border-t border-gray-100">
          <button
            onClick={handlePayment}
            disabled={isRequesting}
            className="w-full py-4 bg-[#00C896] text-white text-base font-bold rounded-xl disabled:opacity-50 active:brightness-95 transition-all"
          >
            {isRequesting ? "결제 진행 중..." : `${formatPrice(intent.total_price)} 결제하기`}
          </button>
        </div>
      </div>

      {showExitDialog && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowExitDialog(false)}
          />
          <div className="relative w-full max-w-[430px] bg-white rounded-t-2xl px-5 pt-5 pb-8 shadow-2xl">
            <button
              onClick={() => setShowExitDialog(false)}
              className="absolute top-4 right-4 p-1 text-gray-400 active:opacity-60"
            >
              <X className="w-5 h-5" />
            </button>
            <p className="text-base font-bold text-gray-900 mb-1">결제를 중단하시겠어요?</p>
            <p className="text-sm text-gray-500 mb-5">
              결제를 완료하지 않으면 주문이 생성되지 않습니다.
              <br />계속 결제할지, 그냥 나갈지 선택해주세요.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowExitDialog(false)}
                className="w-full py-3.5 bg-[#00C896] text-white text-sm font-bold rounded-xl active:opacity-80"
              >
                계속 결제하기
              </button>
              <button
                onClick={handleExitConfirm}
                className="w-full py-3.5 border border-gray-200 text-gray-500 text-sm font-bold rounded-xl active:bg-gray-50"
              >
                나가기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
