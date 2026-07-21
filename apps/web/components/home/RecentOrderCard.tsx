"use client";

import Link from "next/link";
import { ChevronRight, Shirt, CreditCard } from "lucide-react";
import { formatDate, formatPrice, ORDER_STATUS_MAP } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { InlineSvg } from "@/components/ui/inline-svg";

/** clothing_type ?çÏä§????/public/icons/*.svg ?åÏùºÎ™?Îß§Ìïë */
function getClothingIconSrc(clothingType?: string): string | null {
  if (!clothingType) return null;
  const t = clothingType.toLowerCase();
  if (t.includes("Ï≤?∞îÏßÄ") || t.includes("Ïß?)) return "/icons/jeans.svg";
  if (t.includes("Î∞îÏ?") || t.includes("?¨Ï∏†") || t.includes("?¨Îûô??)) return "/icons/pants.svg";
  if (t.includes("?êÌîº??) || t.includes("?úÎ†à??)) return "/icons/dress.svg";
  if (t.includes("ÏπòÎßà") || t.includes("?§Ïª§??)) return "/icons/skirt.svg";
  if (t.includes("?∞ÏÖîÏ∏?) || t.includes("Îß®Ìà¨Îß?) || t.includes("?ÑÎìú")) return "/icons/tshirt.svg";
  if (t.includes("?îÏ∏†") || t.includes("Î∏îÎùº?∞Ïä§")) return "/icons/shirt.svg";
  if (t.includes("?ÑÏö∞??) || t.includes("ÏΩîÌä∏") || t.includes("?êÏºì") || t.includes("?êÌçº") || t.includes("?®Îî©")) return "/icons/outer.svg";
  if (t.includes("?ïÏû•") || t.includes("?òÌä∏") || t.includes("?àÌä∏")) return "/icons/suit.svg";
  if (t.includes("?§Ïõ®??) || t.includes("?àÌä∏") || t.includes("Í∞Ä?îÍ±¥")) return "/icons/sweater.svg";
  if (t.includes("Í∞ÄÏ£?) || t.includes("?àÎçî")) return "/icons/leather.svg";
  return null;
}

const PROGRESS_STEPS = ["PAID", "BOOKED", "INBOUND", "PROCESSING", "READY_TO_SHIP", "OUT_FOR_DELIVERY", "DELIVERED"];

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
  const isCancelled = order.status === "CANCELLED";
  const dateStr = order.created_at ? formatDate(order.created_at) : "";
  const clothingIconSrc = getClothingIconSrc(order.clothing_type);

  const currentStepIdx = PROGRESS_STEPS.indexOf(order.status);
  const showProgress = !isCancelled && currentStepIdx >= 0;

  return (
    <Link
      href={`/orders/${order.id}`}
      className={cn(
        "block rounded-2xl border transition-all active:opacity-80",
        isPendingCustomer
          ? "border-orange-200 bg-orange-50/40"
          : isCancelled
          ? "border-gray-100 bg-gray-50"
          : "border-gray-100 bg-white shadow-sm"
      )}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* ?ÑÏù¥ÏΩ?*/}
          <div className="relative shrink-0">
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                isPendingCustomer
                  ? "bg-orange-100"
                  : isCancelled
                  ? "bg-gray-100"
                  : "bg-[#00C896]/10"
              )}
            >
              {isPendingCustomer ? (
                <CreditCard className="w-6 h-6 text-orange-500" />
              ) : clothingIconSrc && !isCancelled ? (
                <InlineSvg
                  src={clothingIconSrc}
                  className="w-7 h-7 flex items-center justify-center text-[#00C896] [&>svg]:w-full [&>svg]:h-full [&>svg]:fill-current"
                />
              ) : (
                <Shirt className={cn("w-6 h-6", isCancelled ? "text-gray-300" : "text-[#00C896]")} />
              )}
            </div>
            {isPendingCustomer && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white">
                !
              </span>
            )}
          </div>

          {/* ?ïÎ≥¥ */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              {isPendingCustomer && (
                <span className="text-xs font-bold text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded">
                  Ï∂îÍ?Í≤∞Ï†ú
                </span>
              )}
              <span
                className={cn(
                  "text-xs font-bold px-1.5 py-0.5 rounded",
                  statusInfo.color,
                  statusInfo.bgColor
                )}
              >
                {statusInfo.label}
              </span>
              {dateStr && (
                <span className="text-xs text-gray-400">{dateStr}</span>
              )}
            </div>

            <p className={cn("text-sm font-bold truncate", isCancelled ? "text-gray-400" : "text-gray-900")}>
              {order.item_name || "?òÏÑ† ??™©"}
            </p>

            <div className="flex items-center gap-2 mt-0.5">
              {order.clothing_type && (
                <span className="text-xs text-gray-400">{order.clothing_type}</span>
              )}
              {order.total_price != null && order.total_price > 0 && (
                <>
                  {order.clothing_type && <span className="text-gray-200">¬∑</span>}
                  <span className="text-xs font-semibold text-gray-500">
                    {formatPrice(order.total_price)}
                  </span>
                </>
              )}
            </div>

            {order.pickup_date && order.status === "BOOKED" && (
              <p className="text-xs text-[#00C896] font-medium mt-1">
                ?òÍ±∞ ?àÏ†ï: {formatDate(order.pickup_date)}
              </p>
            )}
          </div>

          <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 mt-1" />
        </div>

        {/* ÎØ∏Îãà ÏßÑÌñâ Î∞?*/}
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
              <span className="text-xs text-gray-400">?òÍ±∞?àÏïΩ</span>
              <span className="text-xs text-[#00C896] font-semibold">{statusInfo.label}</span>
              <span className="text-xs text-gray-400">Î∞∞ÏÜ°?ÑÎ£å</span>
            </div>
          </div>
        )}

        {/* Ï∂îÍ?Í≤∞Ï†ú Í∏àÏï° ?úÏãú */}
        {isPendingCustomer && (
          <div className="mt-2.5 pt-2.5 border-t border-orange-100 flex items-center justify-between">
            <span className="text-xs text-orange-600">Ï∂îÍ? Í≤∞Ï†ú ?îÏ≤≠??/span>
            <span className="text-xs font-bold text-orange-700">??ïò???ïÏù∏ ??/span>
          </div>
        )}
      </div>
    </Link>
  );
}
