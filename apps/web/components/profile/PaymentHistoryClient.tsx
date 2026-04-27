"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Receipt, CreditCard, ShoppingCart } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatPrice } from "@/lib/utils";
import { fetchCartItems } from "@/lib/cart";

interface Payment {
  id: string;
  item_name?: string;
  clothing_type?: string;
  total_price?: number;
  payment_method?: string;
  payment_status?: string;
  status?: string;
  canceled_at?: string;
  created_at?: string;
}

const METHOD_LABEL: Record<string, string> = {
  CARD: "신용카드", VIRTUAL_ACCOUNT: "가상계좌", TRANSFER: "계좌이체",
  MOBILE: "휴대폰결제", TOSS: "토스페이", NAVERPAY: "네이버페이",
  KAKAOPAY: "카카오페이", BILLING: "정기결제",
};

export function PaymentHistoryClient() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPayments();
  }, []);

  async function loadPayments() {
    setIsLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) { setIsLoading(false); return; }

      const cols = "id, item_name, clothing_type, total_price, payment_method, payment_status, status, canceled_at, created_at";

      const { data: userRow } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", user.id)
        .maybeSingle();

      let rows: Payment[] = [];

      const PAID_STATUSES = ["PAID", "paid", "CANCELED", "PARTIAL_CANCELED"];

      // 1차: 내부 user_id (결제완료 + 취소/환불 주문)
      if (userRow?.id) {
        const { data, error: e } = await supabase
          .from("orders")
          .select(cols)
          .eq("user_id", userRow.id)
          .in("payment_status", PAID_STATUSES)
          .order("created_at", { ascending: false });
        if (e) console.error("[결제내역] 1차 조회 오류:", e.message);
        rows = data ?? [];
      }

      // 2차: auth.uid() 직접 (구버전 데이터)
      if (rows.length === 0) {
        const { data: data2, error: e2 } = await supabase
          .from("orders")
          .select(cols)
          .eq("user_id", user.id)
          .in("payment_status", PAID_STATUSES)
          .order("created_at", { ascending: false });
        if (e2) console.error("[결제내역] 2차 조회 오류:", e2.message);
        rows = data2 ?? [];
      }

      setPayments(rows);

      // 장바구니 카운트 (서버 cart_drafts 기반)
      const cartItems = await fetchCartItems();
      setPendingCount(cartItems.length);
    } catch (e) {
      console.error("[결제내역] 예상치 못한 오류:", e);
      setError("결제 내역을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  const PendingBanner = () =>
    pendingCount > 0 ? (
      <Link
        href="/cart"
        className="flex items-center gap-3 mx-4 mt-3 p-3.5 bg-orange-50 border border-orange-200 rounded-2xl active:brightness-95"
      >
        <ShoppingCart className="w-5 h-5 text-orange-500 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-bold text-orange-800">
            장바구니에 결제할 건 {pendingCount}건이 있어요
          </p>
          <p className="text-xs text-orange-600 mt-0.5">
            장바구니에서 결제를 완료해주세요
          </p>
        </div>
        <span className="text-xs font-bold text-orange-500">보기 →</span>
      </Link>
    ) : null;

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PendingBanner />
        <div className="py-20 text-center">
          <Receipt className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400 mb-3">{error}</p>
          <button
            onClick={loadPayments}
            className="text-sm font-semibold text-[#00C896] underline"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div>
        <PendingBanner />
        <div className="py-20 text-center">
          <Receipt className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">결제 내역이 없습니다</p>
        </div>
      </div>
    );
  }

  function getStatusBadge(p: Payment) {
    const ps = p.payment_status?.toUpperCase();
    if (ps === "CANCELED") return { label: "환불완료", cls: "text-red-600 bg-red-50" };
    if (ps === "PARTIAL_CANCELED") return { label: "부분환불", cls: "text-orange-600 bg-orange-50" };
    return { label: "결제완료", cls: "text-green-600 bg-green-50" };
  }

  return (
    <div>
      <PendingBanner />
      <div className="px-4 py-3 space-y-3">
      {payments.map((p) => {
        const badge = getStatusBadge(p);
        const isCancelled = p.payment_status === "CANCELED" || p.payment_status === "PARTIAL_CANCELED";
        return (
          <Link key={p.id} href={`/orders/${p.id}`}>
          <div
            className={`bg-white border rounded-2xl p-4 shadow-sm ${isCancelled ? "border-gray-200 opacity-80" : "border-gray-100"}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CreditCard className={`w-4 h-4 ${isCancelled ? "text-gray-300" : "text-gray-400"}`} />
                <span className="text-xs text-gray-400">
                  {p.payment_method
                    ? METHOD_LABEL[p.payment_method.toUpperCase()] ?? p.payment_method
                    : "카드"}
                </span>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>
                {badge.label}
              </span>
            </div>
            <p className={`text-sm font-bold ${isCancelled ? "text-gray-400 line-through" : "text-gray-900"}`}>
              {p.item_name || "수선 주문"}
            </p>
            {p.clothing_type && (
              <p className="text-xs text-gray-400 mt-0.5">{p.clothing_type}</p>
            )}
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-400">
                {isCancelled && p.canceled_at
                  ? `취소: ${formatDate(p.canceled_at)}`
                  : p.created_at ? formatDate(p.created_at) : ""}
              </p>
              <p className={`text-base font-extrabold ${isCancelled ? "text-gray-400 line-through" : "text-[#00C896]"}`}>
                {formatPrice(p.total_price ?? 0)}
              </p>
            </div>
          </div>
          </Link>
        );
      })}
      </div>
    </div>
  );
}
