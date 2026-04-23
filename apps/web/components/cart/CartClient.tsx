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
import {
  fetchCartItems,
  removeCartItem,
  CartDraftItem,
} from "@/lib/cart";
import { cn } from "@/lib/utils";

// 폴백 — 실제 사용 시 GET /api/shipping-settings 로 교체됨
const FALLBACK_BASE_SHIPPING = 7000;

interface PendingOrder {
  id: string;
  item_name?: string;
  clothing_type?: string;
  total_price?: number;
  shipping_fee?: number;
  shipping_discount_amount?: number;
  remote_area_fee?: number;
  created_at?: string;
  status: string;
}

/** 주문의 수선비만 추출 (total_price - 실제배송비 - 도서산간) */
function getRepairCost(order: PendingOrder, baseShipping: number): number {
  const shippingFee = order.shipping_fee ?? baseShipping;
  const discount = order.shipping_discount_amount ?? 0;
  const remoteAreaFee = order.remote_area_fee ?? 0;
  const actualShipping = Math.max(0, shippingFee - discount) + remoteAreaFee;
  return Math.max(0, (order.total_price ?? 0) - actualShipping);
}

export function CartClient() {
  const router = useRouter();
  const [draftItems, setDraftItems] = useState<CartDraftItem[]>([]);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [baseShipping, setBaseShipping] = useState<number>(FALLBACK_BASE_SHIPPING);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/shipping-settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.baseShippingFee != null) setBaseShipping(data.baseShippingFee);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    restoreBatchSession().then(async () => {
      // 서버 우선, fallback: localStorage 캐시
      const items = await fetchCartItems();
      setDraftItems(items);
      await loadPendingOrders();
    });

    // 같은 탭 내 cart 변경 이벤트 수신
    const onCartUpdate = () => {
      fetchCartItems().then(setDraftItems);
    };
    window.addEventListener("modu_cart_update", onCartUpdate);
    return () => window.removeEventListener("modu_cart_update", onCartUpdate);
  }, []);

  /** 결제 안 하고 돌아온 경우 대표 주문 total 원복 */
  async function restoreBatchSession() {
    try {
      const raw = sessionStorage.getItem("batch_checkout_session");
      if (!raw) return;
      const session = JSON.parse(raw) as {
        primaryOrderId: string;
        originalPrimaryTotal: number;
      };
      sessionStorage.removeItem("batch_checkout_session");
      const supabase = createClient();
      await supabase
        .from("orders")
        .update({ total_price: session.originalPrimaryTotal })
        .eq("id", session.primaryOrderId)
        .eq("status", "PENDING_PAYMENT");
    } catch { /* ignore */ }
  }

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
        .select("id, item_name, clothing_type, total_price, shipping_fee, shipping_discount_amount, remote_area_fee, created_at, status")
        .eq("user_id", userRow.id)
        .eq("status", "PENDING_PAYMENT")
        .order("created_at", { ascending: false });
      setPendingOrders(data ?? []);
    } catch { /* ignore */ } finally {
      setIsLoading(false);
    }
  }

  async function handleRemoveDraft(id: string) {
    // 먼저 UI 에서 제거 (낙관적 업데이트)
    setDraftItems((prev) => prev.filter((i) => i.id !== id));
    await removeCartItem(id);
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

  // ── 금액 계산 (배송비 이중 청구 방지) ──
  const selectedOrders = pendingOrders.filter((o) => selectedIds.has(o.id));

  // 선택된 수선비 합산 (배송비 제외)
  const selectedRepairTotal = selectedOrders.reduce((sum, o) => sum + getRepairCost(o, baseShipping), 0);

  // 선택 결제 금액 = 수선비 합 + 왕복배송비 1회
  const selectedPayTotal = selectedRepairTotal + baseShipping;

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

  /** 공통: batch-checkout 호출 후 세션 저장 + 결제 페이지 이동 */
  async function doBatchCheckout(ids: string[]) {
    setMergeError(null);
    setIsMerging(true);
    try {
      const res = await fetch("/api/orders/batch-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds: ids }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMergeError(`합포장 결제 준비 실패: ${data?.error ?? "오류"}`);
        return;
      }
      // 세션에 원본 정보 저장 (결제 미완료 시 복원용)
      if (data.batchMode) {
        sessionStorage.setItem("batch_checkout_session", JSON.stringify({
          primaryOrderId: data.orderId,
          otherOrderIds: data.otherOrderIds,
          originalPrimaryTotal: data.originalPrimaryTotal,
        }));
      }
      router.push(`/payment?orderId=${data.orderId}${data.otherOrderIds?.length ? `&batchIds=${data.otherOrderIds.join(",")}` : ""}`);
    } catch {
      setMergeError("합포장 결제 준비 중 오류가 발생했습니다.");
    } finally {
      setIsMerging(false);
    }
  }

  // ── 선택결제 ──
  async function handlePaySelected() {
    if (selectedOrders.length === 0) return;
    if (selectedOrders.length === 1) {
      router.push(`/payment?orderId=${selectedOrders[0].id}`);
      return;
    }
    await doBatchCheckout(selectedOrders.map((o) => o.id));
  }

  // ── 전체결제 ──
  async function handlePayAll() {
    if (pendingOrders.length === 0) return;
    if (pendingOrders.length === 1) {
      router.push(`/payment?orderId=${pendingOrders[0].id}`);
      return;
    }
    await doBatchCheckout(pendingOrders.map((o) => o.id));
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
    <div className={cn("pb-8", selectedIds.size > 0 && "pb-36")}>

      {/* ── 결제 대기 주문 ── */}
      {pendingOrders.length > 0 && (
        <section className="mt-4">
          {/* 섹션 헤더 */}
          <div className="px-4 mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-orange-500" />
              <p className="text-sm font-bold text-gray-800">
                결제 대기
                <span className="ml-1 text-xs font-normal text-gray-400">({pendingOrders.length}건)</span>
              </p>
            </div>
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
                disabled={isMerging}
                className="text-xs font-bold text-white bg-orange-500 px-3 py-1 rounded-lg active:brightness-95 disabled:opacity-60"
              >
                {isMerging ? "처리 중..." : `전체결제`}
              </button>
            </div>
          </div>

          {/* 오류 메시지 */}
          {(mergeError || deleteError) && (
            <div className="mx-4 mb-2 flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {mergeError || deleteError}
            </div>
          )}

          {/* 주문 카드 목록 */}
          <div className="space-y-3 px-4">
            {pendingOrders.map((order) => {
              const isSelected = selectedIds.has(order.id);
              const repairCost = getRepairCost(order, baseShipping);
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
                        {/* 수선비만 표시 (배송비 별도 청구이므로 합산 미포함) */}
                        {repairCost > 0 && (
                          <p className="text-sm font-bold text-orange-700 mt-1">
                            수선비 {formatPrice(repairCost)}~
                          </p>
                        )}
                      </div>

                      <ChevronRight className="w-4 h-4 text-orange-300 shrink-0 mt-1" />
                    </div>
                  </div>

                  {/* 단건 결제 버튼 */}
                  <Link
                    href={`/payment?orderId=${order.id}`}
                    className="block w-full py-2.5 bg-orange-500 text-white text-xs font-bold text-center active:brightness-90"
                  >
                    이 건만 결제 →
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── 저장된 수거신청 항목 ── */}
      {draftItems.length > 0 && (
        <section className="mt-5">
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
              const repairItems = d.repairItems ?? [];
              const repairTotal = repairItems.reduce(
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
                          {d.clothingType
                            ? `${d.clothingType} · ${d.repairItems.map((r) => r.name).join(", ")}`
                            : d.repairItems.map((r) => r.name).join(", ")}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {repairItems.length}개 수선 항목
                          {repairTotal > 0 && (
                            <span className="ml-2 font-semibold text-[#00C896]">
                              수선비 {formatPrice(repairTotal)}~
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
                      {repairItems.slice(0, 4).map((r, i) => (
                        <span
                          key={i}
                          className="text-[11px] bg-[#00C896]/8 text-[#00C896] px-2 py-0.5 rounded-full border border-[#00C896]/20"
                        >
                          {r.name}
                        </span>
                      ))}
                      {repairItems.length > 4 && (
                        <span className="text-[11px] text-gray-400 px-2 py-0.5">
                          +{repairItems.length - 4}개
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

      <div className="mx-4 mt-3 p-3.5 bg-gray-50 rounded-xl">
        <p className="text-xs text-gray-400 leading-relaxed">
          💡 장바구니는 모든 기기에서 동기화됩니다. &apos;이어서 수거신청&apos;을 눌러 중단된 곳부터 계속할 수 있습니다.
        </p>
      </div>

      {/* ── 선택 시 하단 액션바 ── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 px-4 py-3 shadow-2xl">
          <div className="max-w-md mx-auto">
            {/* 선택 금액 분해 */}
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>수선비 합계</span>
              <span className="font-semibold text-gray-700">{formatPrice(selectedRepairTotal)}~</span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span>왕복배송비 (1회)</span>
              <span className="font-semibold text-gray-700">{formatPrice(baseShipping)}</span>
            </div>
            <div className="flex items-center justify-between text-sm font-bold text-gray-800 mb-2">
              <span>{selectedIds.size}건 합계</span>
              <span className="text-orange-600">{formatPrice(selectedPayTotal)}~</span>
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
                disabled={isMerging}
                className="flex-[2] py-3 bg-orange-500 text-white text-sm font-bold rounded-xl active:brightness-90 disabled:opacity-60"
              >
                {isMerging
                  ? "처리 중..."
                  : `${selectedIds.size}건 합포장 결제`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
