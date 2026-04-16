"use client";

import Link from "next/link";
import { ChevronRight, Shirt, CreditCard } from "lucide-react";
import { formatDate, formatPrice, ORDER_STATUS_MAP } from "@/lib/utils";
import { cn } from "@/lib/utils";

const PROGRESS_STEPS = ["BOOKED", "INBOUND", "PROCESSING", "READY_TO_SHIP", "DELIVERED"];

interface RecentOrderCardProps {
  order: {
    id: string;
    status: string;
    extra_charge_status?: string;
    item_name?: string;
    clothing_type?: string;
    total_price?: number;
    created_at?: string;
    pickup_date?: string;
  };
  compact?: boolean;
}

export function RecentOrderCard({ order, compact = false }: RecentOrderCardProps) {
  const statusInfo = ORDER_STATUS_MAP[order.status] ?? ORDER_STATUS_MAP["BOOKED"];
  const isPendingCustomer = order.extra_charge_status === "PENDING_CUSTOMER";
  const isPendingPayment = order.status === "PENDING_PAYMENT";
  const isCancelled = order.status === "CANCELLED";
  const dateStr = order.created_at ? formatDate(order.created_at) : "";

  const currentStepIdx = PROGRESS_STEPS.indexOf(order.status);
  const showProgress = !isCancelled && !isPendingPayment && currentStepIdx >= 0;

  return (
    <Link
      href={`/orders/${order.id}`}
      className={cn(
        "block rounded-2xl border transition-all active:opacity-80",
        isPendingPayment
          ? "border-[#00C896]/30 bg-[#00C896]/5"
          : isPendingCustomer
          ? "border-orange-200 bg-orange-50/40"
          : isCancelled
          ? "border-gray-100 bg-gray-50"
          : "border-gray-100 bg-white shadow-sm"
      )}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* 아이콘 */}
          <div className="relative shrink-0">
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                isPendingPayment
                  ? "bg-[#00C896]/15"
                  : isPendingCustomer
                  ? "bg-orange-100"
                  : isCancelled
                  ? "bg-gray-100"
                  : "bg-[#00C896]/10"
              )}
            >
              {isPendingPayment || isPendingCustomer ? (
                <CreditCard className={cn("w-6 h-6", isPendingPayment ? "text-[#00C896]" : "text-orange-500")} />
              ) : (
                <Shirt className={cn("w-6 h-6", isCancelled ? "text-gray-300" : "text-[#00C896]")} />
              )}
            </div>
            {(isPendingCustomer || isPendingPayment) && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold border-2 border-white">
                !
              </span>
            )}
          </div>

          {/* 정보 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              {isPendingPayment && (
                <span className="text-[11px] font-bold text-[#00C896] bg-[#00C896]/10 px-1.5 py-0.5 rounded">
                  결제필요
                </span>
              )}
              {isPendingCustomer && (
                <span className="text-[11px] font-bold text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded">
                  추가결제
                </span>
              )}
              <span
                className={cn(
                  "text-[11px] font-bold px-1.5 py-0.5 rounded",
                  statusInfo.color,
                  statusInfo.bgColor
                )}
              >
                {statusInfo.label}
              </span>
              {dateStr && (
                <span className="text-[11px] text-gray-400">{dateStr}</span>
              )}
            </div>

            <p className={cn("text-sm font-bold truncate", isCancelled ? "text-gray-400" : "text-gray-900")}>
              {order.item_name || "수선 항목"}
            </p>

            <div className="flex items-center gap-2 mt-0.5">
              {order.clothing_type && (
                <span className="text-xs text-gray-400">{order.clothing_type}</span>
              )}
              {order.total_price != null && order.total_price > 0 && (
                <>
                  {order.clothing_type && <span className="text-gray-200">·</span>}
                  <span className="text-xs font-semibold text-gray-500">
                    {formatPrice(order.total_price)}
                  </span>
                </>
              )}
            </div>

            {order.pickup_date && order.status === "BOOKED" && (
              <p className="text-xs text-[#00C896] font-medium mt-1">
                수거 예정: {formatDate(order.pickup_date)}
              </p>
            )}
          </div>

          <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 mt-1" />
        </div>

        {/* 미니 진행 바 */}
        {showProgress && !compact && (
          <div className="mt-3 pt-3 border-t border-gray-50">
            <div className="flex items-center gap-0.5">
              {PROGRESS_STEPS.map((step, idx) => (
                <div
                  key={step}
                  className={cn(
                    "flex-1 h-1 rounded-full transition-colors",
                    idx <= currentStepIdx ? "bg-[#00C896]" : "bg-gray-100"
                  )}
                />
              ))}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-gray-400">수거예약</span>
              <span className="text-[10px] text-[#00C896] font-semibold">{statusInfo.label}</span>
              <span className="text-[10px] text-gray-400">배송완료</span>
            </div>
          </div>
        )}

        {/* 결제 필요 CTA */}
        {isPendingPayment && (
          <div className="mt-2.5 pt-2.5 border-t border-[#00C896]/15 flex items-center justify-between">
            <span className="text-xs text-[#00C896]">결제 완료 후 수거 예약이 진행됩니다</span>
            <span className="text-xs font-bold text-[#00C896]">상세 보기 →</span>
          </div>
        )}

        {/* 추가결제 금액 표시 */}
        {isPendingCustomer && (
          <div className="mt-2.5 pt-2.5 border-t border-orange-100 flex items-center justify-between">
            <span className="text-xs text-orange-600">추가 결제 요청됨</span>
            <span className="text-xs font-bold text-orange-700">탭하여 확인 →</span>
          </div>
        )}
      </div>
    </Link>
  );
}
