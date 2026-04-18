"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShoppingCart, Trash2, ChevronRight, CreditCard,
  Package, Scissors, RefreshCw, CheckSquare, Square,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatPrice } from "@/lib/utils";
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
    sessionStorage.setItem("cart_resume_draft", JSON.stringify(item.draft));
    router.push("/order/new?from=cart");
  }

  // ── 선택 관련 ──
  const allSelected =
    pendingOrders.length > 0 && pendingOrders.every((o) => selectedIds.has(o.id));

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingOrders.map((o) => o.id)));
    }
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ── 선택된 주문 목록 ──
  const selectedOrders = pendingOrders.filter((o) => selectedIds.has(o.id));
  const selectedTotal = selectedOrders.reduce(
    (sum, o) => sum + (o.total_price ?? 0),
    0
  );
  const allTotal = pendingOrders.reduce(
    (sum, o) => sum + (o.total_price ?? 0),
    0
  );

  // ── 선택삭제 ──
  const handleDeleteSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setDeleteError(null);
    setIsDeleting(true);
    try {
      const results = await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/orders/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "CANCELLED" }),
          })
        )
      );
      const failed = results.filter((r) => !r.ok);
      if (failed.length > 0) {
        setDeleteError(`${failed.length}건 취소에 실패했습니다.`);
      }
      // 성공한 항목 제거
      const successIds = new Set(
        Array.from(selectedIds).filter((_, i) => results[i].ok)
      );
      setPendingOrders((prev) => prev.filter((o) => !successIds.has(o.id)));
      setSelectedIds(new Set());
    } catch {
      setDeleteError("취소 중 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
    }
  }, [selectedIds]);

  // ── 선택결제 (선택된 첫 번째 주문부터 결제) ──
  function handlePaySelected() {
    if (selectedOrders.length === 0) return;
    router.push(`/payment?orderId=${selectedOrders[0].id}`);
  }

  // ── 전체결제 (전체 선택 후 첫 번째부터) ──
  function handlePayAll() {
    if (pendingOrders.length === 0) return;
    router.push(`/payment?orderId=${pendingOrders[0].id}`);
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
    <div className={cn("pb-8", selectedIds.size > 0 && "pb-32")}>
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
              const SHIPPING_FEE = 7000;
              const repairTotal = d.repairItems.reduce(
                (s, r) => s + r.price * (r.quantity ?? 1),
                0
              );
              const totalPrice = repairTotal + SHIPPING_FEE;
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
                          {repairTotal > 0 && (
                            <span className="ml-2 font-semibold text-gray-600">
                              수선비 {formatPrice(repairTotal)}~ + 왕복배송비 {formatPrice(SHIPPING_FEE)} = <span className="text-[#00C896]">{formatPrice(totalPrice)}~</span>
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
          {/* 섹션 헤더 */}
          <div className="px-4 mb-2 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-orange-500" />
            <p className="text-sm font-bold text-gray-800 flex-1">
              결제 대기
              <span className="ml-1 text-xs font-normal text-gray-400">({pendingOrders.length}건)</span>
            </p>
            <span className="text-[10px] text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-full border border-orange-100">
              결제 후 수거 예약 진행
            </span>
          </div>

          {/* 전체선택 + 전체결제 바 */}
          <div className="mx-4 mb-2 flex items-center justify-between bg-orange-50 border border-orange-100 rounded-xl px-3 py-2">
            <button
              onClick={toggleAll}
              className="flex items-center gap-1.5 text-sm font-medium text-orange-700 active:opacity-70"
            >
              {allSelected ? (
                <CheckSquare className="w-4 h-4 text-orange-500" />
              ) : (
                <Square className="w-4 h-4 text-orange-300" />
              )}
              전체선택
            </button>
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  disabled={isDeleting}
                  className="text-xs font-bold text-red-500 bg-red-50 border border-red-100 px-2.5 py-1 rounded-lg active:brightness-95 disabled:opacity-50"
                >
                  {isDeleting ? "취소 중..." : "선택삭제"}
                </button>
              )}
              <button
                onClick={handlePayAll}
                className="text-xs font-bold text-white bg-orange-500 px-3 py-1 rounded-lg active:brightness-95"
              >
                전체결제 {allTotal > 0 && formatPrice(allTotal)}
              </button>
            </div>
          </div>

          {/* 오류 메시지 */}
          {deleteError && (
            <div className="mx-4 mb-2 flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {deleteError}
            </div>
          )}

          <div className="space-y-3 px-4">
            {pendingOrders.map((order) => {
              const isSelected = selectedIds.has(order.id);
              return (
                <div
                  key={order.id}
                  className={cn(
                    "bg-orange-50 border rounded-2xl overflow-hidden transition-all",
                    isSelected ? "border-orange-400 shadow-md" : "border-orange-200"
                  )}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {/* 체크박스 */}
                      <button
                        onClick={() => toggleOne(order.id)}
                        className="mt-0.5 shrink-0 active:scale-95 transition-transform"
                        aria-label="선택"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-orange-500" />
                        ) : (
                          <Square className="w-5 h-5 text-orange-300" />
                        )}
                      </button>

                      <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
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
                  </div>

                  {/* 결제하기 버튼 */}
                  <Link
                    href={`/payment?orderId=${order.id}`}
                    className="block w-full py-2.5 bg-orange-500 text-white text-xs font-bold text-center active:brightness-90"
                  >
                    결제하기 →
                  </Link>
                </div>
              );
            })}
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

      {/* 왕복배송비 절약 안내 */}
      <div className="mx-4 mt-4 p-4 bg-[#00C896]/8 border border-[#00C896]/20 rounded-xl">
        <p className="text-xs font-bold text-[#00C896] mb-1">🚚 왕복배송비를 아끼는 방법</p>
        <p className="text-xs text-gray-600 leading-relaxed">
          왕복배송비(7,000원)는 주문 수량과 관계없이 <span className="font-bold">1회당 동일</span>하게 부과됩니다.
          여러 벌을 <span className="font-bold">한 번에 맡기시면</span> 배송비를 절약할 수 있어 더 경제적입니다!
        </p>
      </div>

      <div className="mx-4 mt-3 p-3.5 bg-gray-50 rounded-xl">
        <p className="text-xs text-gray-400 leading-relaxed">
          💡 저장된 수거신청은 이 기기에만 보관됩니다. &apos;이어서 수거신청&apos;을 눌러 중단된 곳부터 계속할 수 있습니다.
        </p>
      </div>

      {/* ── 선택 시 하단 액션바 ── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 px-4 py-3 shadow-2xl">
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500">
                <span className="font-bold text-gray-800">{selectedIds.size}건</span> 선택
                {selectedTotal > 0 && (
                  <span className="ml-1">
                    · 합계 <span className="font-bold text-orange-600">{formatPrice(selectedTotal)}</span>
                  </span>
                )}
              </p>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-xs text-gray-400 active:text-gray-600"
              >
                선택 해제
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="flex-1 py-3 border border-red-200 text-red-500 text-sm font-bold rounded-xl active:bg-red-50 disabled:opacity-50"
              >
                {isDeleting ? "취소 중..." : "선택삭제"}
              </button>
              <button
                onClick={handlePaySelected}
                className="flex-[2] py-3 bg-orange-500 text-white text-sm font-bold rounded-xl active:brightness-90"
              >
                선택결제 {selectedTotal > 0 && `(${formatPrice(selectedTotal)})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
