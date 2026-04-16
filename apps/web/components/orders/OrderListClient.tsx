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

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    // PENDING_PAYMENT 주문은 장바구니에서 처리 → 주문목록에서 제외
    const nonPending = orders.filter((o) => o.status !== "PENDING_PAYMENT");
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
    try {
      const res = await fetch("/api/orders");
      if (!res.ok) { setIsLoading(false); return; }
      const json = await res.json();
      setOrders(json.orders ?? []);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }

  const pendingCount = orders.filter((o) => o.status === "PENDING_PAYMENT").length;

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
              결제 대기 {pendingCount}건이 있습니다
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
