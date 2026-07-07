"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  getEffectiveOrderStatus,
  isActiveReturnFlow,
  isOrderFullyClosed,
  type OrderReturnContext,
} from "@/lib/order-return-flow";

interface OrderTimelineProps {
  status: string;
  order?: OrderReturnContext | null;
}

const repairSteps = [
  { id: "PAID", label: "결제완료" },
  { id: "BOOKED", label: "수거예약" },
  { id: "INBOUND", label: "입고완료" },
  { id: "PROCESSING", label: "수선중" },
  { id: "READY_TO_SHIP", label: "출고완료" },
  { id: "OUT_FOR_DELIVERY", label: "배송중" },
  { id: "DELIVERED", label: "배송완료" },
];

const returnSteps = [
  { id: "CANCEL_REFUND", label: "취소/환불" },
  { id: "RETURN_PENDING", label: "반송 대기" },
  { id: "RETURN_SHIPPING", label: "반송 배송" },
  { id: "RETURN_DONE", label: "반송 완료" },
];

const specialStateMap: Record<string, { label: string; color: string; description: string }> = {
  CANCELLED: {
    label: "주문 취소",
    color: "bg-red-100 text-red-700 border-red-300",
    description: "수거 전 취소로 처리가 완료되었습니다.",
  },
  RETURN_PENDING: {
    label: "취소 · 반송 대기",
    color: "bg-amber-100 text-amber-700 border-amber-300",
    description: "결제 취소(또는 환불)는 완료되었습니다. 반송 송장 발급 후 고객에게 발송해야 주문이 종료됩니다.",
  },
  RETURN_SHIPPING: {
    label: "취소 · 반송 배송중",
    color: "bg-orange-100 text-orange-700 border-orange-300",
    description: "반송 송장이 발급되어 배송 중입니다. 도착 확인 후 반송 완료 처리하면 주문이 종료됩니다.",
  },
  RETURN_DONE: {
    label: "반송 완료",
    color: "bg-green-100 text-green-700 border-green-300",
    description: "취소 및 반송 처리가 모두 완료되어 주문이 종료되었습니다.",
  },
};

function getReturnStepIndex(order: OrderReturnContext, effectiveStatus: string): number {
  if (effectiveStatus === "RETURN_DONE") return 3;
  if (effectiveStatus === "RETURN_SHIPPING" || order.extra_charge_data?.returnTrackingNo) return 2;
  if (effectiveStatus === "RETURN_PENDING") return 1;
  if (order.status === "CANCELLED" && order.canceled_at) return 1;
  return 0;
}

export function OrderTimeline({ status, order }: OrderTimelineProps) {
  const effectiveStatus = order ? getEffectiveOrderStatus(order) : status;
  const inReturnFlow = order ? isActiveReturnFlow(order) : ["RETURN_PENDING", "RETURN_SHIPPING"].includes(status);
  const isClosed = order ? isOrderFullyClosed(order) : status === "CANCELLED" || status === "RETURN_DONE" || status === "DELIVERED";

  if (inReturnFlow && !isClosed) {
    const currentIndex = order ? getReturnStepIndex(order, effectiveStatus) : returnSteps.findIndex((s) => s.id === effectiveStatus);

    return (
      <Card>
        <CardHeader>
          <CardTitle>진행 상황 — 취소 후 반송 처리</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            입고된 상품은 <strong>반송 완료</strong>까지 처리해야 주문이 종료됩니다.
          </p>
          <div className="flex items-center justify-between overflow-x-auto">
            {returnSteps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-medium shrink-0 text-sm",
                      index <= currentIndex
                        ? index === currentIndex
                          ? "bg-amber-500 text-white ring-2 ring-amber-300"
                          : "bg-primary text-primary-foreground"
                        : "bg-gray-200 text-gray-500"
                    )}
                  >
                    {index + 1}
                  </div>
                  <p
                    className={cn(
                      "mt-2 text-xs font-medium text-center max-w-[4.5rem]",
                      index <= currentIndex ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </p>
                </div>
                {index < returnSteps.length - 1 && (
                  <div
                    className={cn(
                      "w-12 h-1 mx-1 mb-6 shrink-0",
                      index < currentIndex ? "bg-primary" : "bg-gray-200"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const specialState = specialStateMap[effectiveStatus] ?? specialStateMap[status];

  if (specialState && (specialStateMap[effectiveStatus] || ["CANCELLED", "RETURN_PENDING", "RETURN_SHIPPING", "RETURN_DONE"].includes(status))) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>진행 상황</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={cn("px-4 py-3 rounded-lg border text-sm font-medium", specialState.color)}>
            {specialState.label} — {specialState.description}
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentIndex = repairSteps.findIndex((step) => step.id === status);

  return (
    <Card>
      <CardHeader>
        <CardTitle>진행 상황</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between overflow-x-auto">
          {repairSteps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-medium shrink-0",
                    index <= currentIndex
                      ? "bg-primary text-primary-foreground"
                      : "bg-gray-200 text-gray-500"
                  )}
                >
                  {index + 1}
                </div>
                <p
                  className={cn(
                    "mt-2 text-xs font-medium text-center",
                    index <= currentIndex ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </p>
              </div>
              {index < repairSteps.length - 1 && (
                <div
                  className={cn(
                    "w-16 h-1 mx-1 mb-6 shrink-0",
                    index < currentIndex ? "bg-primary" : "bg-gray-200"
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
