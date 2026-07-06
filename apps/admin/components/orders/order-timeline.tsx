"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface OrderTimelineProps {
  status: string;
}

const steps = [
  { id: "PAID",          label: "결제완료" },
  { id: "BOOKED",        label: "수거예약" },
  { id: "INBOUND",       label: "입고완료" },
  { id: "PROCESSING",    label: "수선중" },
  { id: "READY_TO_SHIP", label: "출고완료" },
  { id: "DELIVERED",     label: "배송완료" },
];

const specialStateMap: Record<string, { label: string; color: string; description: string }> = {
  CANCELLED:       { label: "주문 취소", color: "bg-red-100 text-red-700 border-red-300", description: "결제가 취소되었습니다." },
  RETURN_PENDING:  { label: "반송 대기", color: "bg-amber-100 text-amber-700 border-amber-300", description: "반송 송장 발급 대기 중입니다." },
  RETURN_SHIPPING: { label: "반송 배송중", color: "bg-orange-100 text-orange-700 border-orange-300", description: "반송 배송이 진행 중입니다." },
  RETURN_DONE:     { label: "반송 완료", color: "bg-stone-100 text-stone-700 border-stone-300", description: "반송 처리가 완료되었습니다." },
};

export function OrderTimeline({ status }: OrderTimelineProps) {
  const specialState = specialStateMap[status];

  if (specialState) {
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

  const currentIndex = steps.findIndex((step) => step.id === status);

  return (
    <Card>
      <CardHeader>
        <CardTitle>진행 상황</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between overflow-x-auto">
          {steps.map((step, index) => (
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
              {index < steps.length - 1 && (
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
