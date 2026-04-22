"use client";

import { useEffect, useState } from "react";
import { Receipt, CreditCard } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatPrice } from "@/lib/utils";

interface Payment {
  id: string;
  item_name?: string;
  clothing_type?: string;
  total_price?: number;
  payment_method?: string;
  payment_status?: string;
  created_at?: string;
}

const METHOD_LABEL: Record<string, string> = {
  CARD: "신용카드", VIRTUAL_ACCOUNT: "가상계좌", TRANSFER: "계좌이체",
  MOBILE: "휴대폰결제", TOSS: "토스페이", NAVERPAY: "네이버페이",
  KAKAOPAY: "카카오페이", BILLING: "정기결제",
};

export function PaymentHistoryClient() {
  const [payments, setPayments] = useState<Payment[]>([]);
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

      const cols = "id, item_name, clothing_type, total_price, payment_method, payment_status, created_at";

      const { data: userRow } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", user.id)
        .maybeSingle();

      let rows: Payment[] = [];

      // 1차: 내부 user_id (결제완료 주문)
      if (userRow?.id) {
        const { data, error: e } = await supabase
          .from("orders")
          .select(cols)
          .eq("user_id", userRow.id)
          .eq("payment_status", "PAID")
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
          .eq("payment_status", "PAID")
          .order("created_at", { ascending: false });
        if (e2) console.error("[결제내역] 2차 조회 오류:", e2.message);
        rows = data2 ?? [];
      }

      setPayments(rows);
    } catch (e) {
      console.error("[결제내역] 예상치 못한 오류:", e);
      setError("결제 내역을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

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
    );
  }

  if (payments.length === 0) {
    return (
      <div className="py-20 text-center">
        <Receipt className="w-12 h-12 text-gray-200 mx-auto mb-3" />
        <p className="text-sm text-gray-400">결제 내역이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 space-y-3">
      {payments.map((p) => (
        <div
          key={p.id}
          className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-400">
                {p.payment_method
                  ? METHOD_LABEL[p.payment_method.toUpperCase()] ?? p.payment_method
                  : "카드"}
              </span>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full text-green-600 bg-green-50">
              결제완료
            </span>
          </div>
          <p className="text-sm font-bold text-gray-900">
            {p.item_name || "수선 주문"}
          </p>
          {p.clothing_type && (
            <p className="text-xs text-gray-400 mt-0.5">{p.clothing_type}</p>
          )}
          <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-gray-400">
                {p.created_at ? formatDate(p.created_at) : ""}
              </p>
            <p className="text-base font-extrabold text-[#00C896]">
              {formatPrice(p.total_price ?? 0)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
