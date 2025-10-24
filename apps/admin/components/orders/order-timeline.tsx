"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface OrderTimelineProps {
  status: string;
}

const steps = [
  { id: "BOOKED", label: "수거예약" },
  { id: "INBOUND", label: "입고완료" },
  { id: "PROCESSING", label: "수선중" },
  { id: "READY_TO_SHIP", label: "출고완료" },
  { id: "DELIVERED", label: "배송완료" },
];

export function OrderTimeline({ status }: OrderTimelineProps) {
  const currentIndex = steps.findIndex((step) => step.id === status);

  return (
    <Card>
      <CardHeader>
        <CardTitle>진행 상황</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-medium",
                    index <= currentIndex
                      ? "bg-primary text-primary-foreground"
                      : "bg-gray-200 text-gray-500"
                  )}
                >
                  {index + 1}
                </div>
                <p
                  className={cn(
                    "mt-2 text-sm font-medium",
                    index <= currentIndex ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </p>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "w-24 h-1 mx-2 mb-6",
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

