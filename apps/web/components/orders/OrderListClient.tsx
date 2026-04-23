"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Package, ShoppingCart } from "lucide-react";
import { RecentOrderCard } from "@/components/home/RecentOrderCard";

interface Order {
  id: string;
  status: string;
  extra_charge_status?: string;
  item_name?: string;
  clothing_type?: string;
  total_price?: number;
  created_at?: string;
  pickup_date?: string;
  payment_status?: string;
  cancelled_at?: string | null;
  canceled_at?: string | null;
}

const PENDING_STATUSES = new Set(["PENDING", "PENDING_PAYMENT"]);
const BLOCKED_PAYMENT_STATUSES = new Set([
  "CANCELED",
  "CANCELLED",
  "REFUNDED",
  "PAID",
]);

function isOpenPendingPayment(order: Order): boolean {
  if (!PENDING_STATUSES.has(order.status)) return false;
  if (order.cancelled_at || order.canceled_at) return false;
  const ps = (order.payment_status ?? "").toUpperCase();
  if (BLOCKED_PAYMENT_STATUSES.has(ps)) return false;
  return true;
}

const STATUS_TABS = [
  { label: "전체", value: "" },
  { label: "진행중", value: "active" },
  { label: "완료", value: "DELIVERED" },
  { label: "취소", value: "CANCELLED" },
];

export function OrderListClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filtered, setFiltered] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    // 결제 대기(미결제) 주문만 장바구니로 이동 처리 → 주문목록에서 제외 (취소된 건은 그대로 노출)
    const nonPending = orders.filter((o) => !isOpenPendingPayment(o));
    if (activeTab === "") {
      setFiltered(nonPending);
    } else if (activeTab === "active") {
      setFiltered(
        nonPending.filter((o) => !["DELIVERED", "CANCELLED"].includes(o.status))
      );
    } else {
      setFiltered(nonPending.filter((o) => o.status === activeTab));
    }
  }, [activeTab, orders]);

  async function loadOrders() {
    setHasError(false);
    try {
      const res = await fetch("/api/orders");
      if (!res.ok) { setHasError(true); return; }
      const json = await res.json();
      setOrders(json.orders ?? []);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }

  const pendingCount = orders.filter(isOpenPendingPayment).length;

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 px-6 text-center">
        <Package className="w-12 h-12 text-gray-200" />
        <p className="text-sm font-bold text-gray-500">주문 목록을 불러오지 못했습니다</p>
        <button
          onClick={loadOrders}
          className="text-xs text-[#00C896] font-semibold underline underline-offset-2"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* 결제 대기 안내 배너 */}
      {pendingCount > 0 && (
        <Link
          href="/cart"
          className="flex items-center gap-3 mx-4 mt-3 p-3.5 bg-orange-50 border border-orange-200 rounded-2xl active:brightness-95"
        >
          <ShoppingCart className="w-5 h-5 text-orange-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-orange-800">
              장바구니에 결제할 건 {pendingCount}건이 있어요
            </p>
            <p className="text-xs text-orange-600 mt-0.5">장바구니에서 결제를 완료해주세요</p>
          </div>
          <span className="text-xs font-bold text-orange-500">보기 →</span>
        </Link>
      )}

      {/* 상태 탭 */}
      <div className="flex border-b border-gray-100 sticky top-14 bg-white z-10">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? "text-[#00C896] border-b-2 border-[#00C896]"
                : "text-gray-400"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 목록 */}
      <div className="px-4 py-3 space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-24 bg-gray-100 rounded-2xl animate-pulse"
            />
          ))
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">주문 내역이 없습니다</p>
            <Link
              href="/"
              className="inline-block mt-4 text-sm font-semibold text-[#00C896] underline"
            >
              수거신청 하기
            </Link>
          </div>
        ) : (
          filtered.map((order) => (
            <RecentOrderCard key={order.id} order={order} />
          ))
        )}
      </div>
    </div>
  );
}
