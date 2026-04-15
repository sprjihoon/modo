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

  useEffect(() => {
    loadPayments();
  }, []);

  async function loadPayments() {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      const cols = "id, item_name, clothing_type, total_price, payment_method, payment_status, created_at";

      const { data: userRow } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", user.id)
        .maybeSingle();

      let rows: Payment[] = [];

      // 1차: 내부 user_id (결제완료 주문)
      if (userRow?.id) {
        const { data } = await supabase
          .from("orders")
          .select(cols)
          .eq("user_id", userRow.id)
          .in("payment_status", ["PAID", "paid"])
          .order("created_at", { ascending: false });
        rows = data ?? [];
      }

      // 2차: auth.uid() 직접
      if (rows.length === 0) {
        const { data: data2 } = await supabase
          .from("orders")
          .select(cols)
          .eq("user_id", user.id)
          .in("payment_status", ["PAID", "paid"])
          .order("created_at", { ascending: false });
        rows = data2 ?? [];
      }

      // 3차: RLS 의존 (payment_status=PAID만)
      if (rows.length === 0 && userRow?.id) {
        const { data: data3 } = await supabase
          .from("orders")
          .select(cols)
          .in("payment_status", ["PAID", "paid"])
          .order("created_at", { ascending: false })
          .limit(100);
        rows = data3 ?? [];
      }

      setPayments(rows);
    } catch {
      // 에러 무시
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
