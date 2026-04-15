"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Package } from "lucide-react";
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
    if (activeTab === "") {
      setFiltered(orders);
    } else if (activeTab === "active") {
      setFiltered(
        orders.filter(
          (o) => !["DELIVERED", "CANCELLED"].includes(o.status)
        )
      );
    } else {
      setFiltered(orders.filter((o) => o.status === activeTab));
    }
  }, [activeTab, orders]);

  async function loadOrders() {
    try {
      const res = await fetch("/api/orders");
      if (!res.ok) { setIsLoading(false); return; }
      const json = await res.json();
      setOrders(json.orders ?? []);
    } catch {
      // 에러 무시
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
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
