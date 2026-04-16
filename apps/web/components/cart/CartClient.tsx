"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShoppingCart, Trash2, ChevronRight, CreditCard,
  Package, Clock, Scissors, RefreshCw,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatPrice, ORDER_STATUS_MAP } from "@/lib/utils";
import { getCartItems, removeCartItem, CartDraftItem } from "@/lib/cart";
import { cn } from "@/lib/utils";

interface PendingOrder {
  id: string;
  item_name?: string;
  clothing_type?: string;
  total_price?: number;
  created_at?: string;
  status: string;
}

export function CartClient() {
  const router = useRouter();
  const [draftItems, setDraftItems] = useState<CartDraftItem[]>([]);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setDraftItems(getCartItems());
    loadPendingOrders();
  }, []);

  async function loadPendingOrders() {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }
      const { data: userRow } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", user.id)
        .maybeSingle();
      if (!userRow) { setIsLoading(false); return; }
      const { data } = await supabase
        .from("orders")
        .select("id, item_name, clothing_type, total_price, created_at, status")
        .eq("user_id", userRow.id)
        .eq("status", "PENDING_PAYMENT")
        .order("created_at", { ascending: false });
      setPendingOrders(data ?? []);
    } catch { /* ignore */ } finally {
      setIsLoading(false);
    }
  }

  function handleRemoveDraft(id: string) {
    removeCartItem(id);
    setDraftItems((prev) => prev.filter((i) => i.id !== id));
  }

  function handleResumeDraft(item: CartDraftItem) {
    // 장바구니 항목을 sessionStorage에 임시 저장 후 수거신청 페이지로 이동
    sessionStorage.setItem("cart_resume_draft", JSON.stringify(item.draft));
    router.push("/order/new?from=cart");
  }

  const isEmpty = draftItems.length === 0 && pendingOrders.length === 0;

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
          <ShoppingCart className="w-10 h-10 text-gray-300" />
        </div>
        <p className="text-base font-bold text-gray-700">장바구니가 비어 있습니다</p>
        <p className="text-sm text-gray-400 leading-relaxed">
          수거신청 중 &apos;담기&apos; 버튼을 눌러<br />항목을 저장해보세요
        </p>
        <Link
          href="/order/new"
          className="mt-2 px-6 py-3 bg-[#00C896] text-white text-sm font-bold rounded-xl active:brightness-95"
        >
          수거신청 시작하기
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-8">
      {/* ── 저장된 수거신청 항목 ── */}
      {draftItems.length > 0 && (
        <section className="mt-4">
          <div className="px-4 mb-2 flex items-center gap-2">
            <Scissors className="w-4 h-4 text-[#00C896]" />
            <p className="text-sm font-bold text-gray-800">
              저장된 수거신청
              <span className="ml-1 text-xs font-normal text-gray-400">({draftItems.length}개)</span>
            </p>
          </div>

          <div className="space-y-3 px-4">
            {draftItems.map((item) => {
              const d = item.draft;
              const totalPrice = d.repairItems.reduce(
                (s, r) => s + r.price * (r.quantity ?? 1),
                0
              );
              return (
                <div
                  key={item.id}
                  className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl bg-[#00C896]/10 flex items-center justify-center shrink-0">
                        <Scissors className="w-5 h-5 text-[#00C896]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">
                          {d.clothingType} · {d.repairItems.map((r) => r.name).join(", ")}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {d.repairItems.length}개 수선 항목
                          {totalPrice > 0 && (
                            <span className="ml-2 font-semibold text-gray-600">
                              {formatPrice(totalPrice)}~
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-gray-300 mt-1">
                          {formatDate(item.savedAt)} 저장
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveDraft(item.id)}
                        className="p-1.5 text-gray-300 active:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* 수선 항목 태그 */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {d.repairItems.slice(0, 4).map((r, i) => (
                        <span
                          key={i}
                          className="text-[11px] bg-[#00C896]/8 text-[#00C896] px-2 py-0.5 rounded-full border border-[#00C896]/20"
                        >
                          {r.name}
                        </span>
                      ))}
                      {d.repairItems.length > 4 && (
                        <span className="text-[11px] text-gray-400 px-2 py-0.5">
                          +{d.repairItems.length - 4}개
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 이어서 신청하기 */}
                  <button
                    onClick={() => handleResumeDraft(item)}
                    className="w-full py-3 bg-[#00C896]/8 border-t border-[#00C896]/15 text-[#00C896] text-sm font-bold flex items-center justify-center gap-1.5 active:bg-[#00C896]/15"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    이어서 수거신청
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── 결제 대기 주문 ── */}
      {pendingOrders.length > 0 && (
        <section className="mt-5">
          <div className="px-4 mb-2 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-orange-500" />
            <p className="text-sm font-bold text-gray-800">
              결제 대기
              <span className="ml-1 text-xs font-normal text-gray-400">({pendingOrders.length}건)</span>
            </p>
            <span className="text-[10px] text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-full border border-orange-100">
              결제 후 수거 예약 진행
            </span>
          </div>

          <div className="space-y-3 px-4">
            {pendingOrders.map((order) => (
              <Link
                key={order.id}
                href={`/payment?orderId=${order.id}`}
                className="block bg-orange-50 border border-orange-200 rounded-2xl p-4 active:brightness-95"
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                    <CreditCard className="w-5 h-5 text-orange-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[11px] font-bold text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded">
                        결제필요
                      </span>
                      {order.created_at && (
                        <span className="text-[11px] text-gray-400">
                          {formatDate(order.created_at)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {order.item_name ?? "수선 서비스"}
                    </p>
                    {order.clothing_type && (
                      <p className="text-xs text-gray-400 mt-0.5">{order.clothing_type}</p>
                    )}
                    {order.total_price != null && order.total_price > 0 && (
                      <p className="text-sm font-bold text-orange-700 mt-1">
                        {formatPrice(order.total_price)}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-orange-300 shrink-0 mt-1" />
                </div>

                <div className="mt-3 pt-3 border-t border-orange-100 flex items-center justify-between">
                  <span className="text-xs text-orange-600">결제 완료 후 수거 예약이 진행됩니다</span>
                  <span className="text-xs font-bold text-orange-700">결제하기 →</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── 새 수거신청 ── */}
      <div className="px-4 mt-6">
        <Link
          href="/order/new"
          className="w-full flex items-center justify-center gap-2 py-4 bg-[#00C896] text-white text-sm font-bold rounded-2xl active:brightness-95"
        >
          <Package className="w-4 h-4" />
          새 수거신청 하기
        </Link>
      </div>

      {/* 안내 */}
      <div className="mx-4 mt-4 p-3.5 bg-gray-50 rounded-xl">
        <p className="text-xs text-gray-400 leading-relaxed">
          💡 저장된 수거신청은 이 기기에만 보관됩니다. &apos;이어서 수거신청&apos;을 눌러 중단된 곳부터 계속할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
