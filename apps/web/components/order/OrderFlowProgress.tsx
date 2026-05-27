"use client";

import { cn } from "@/lib/utils";

export const ORDER_FLOW_STEPS = [
  "의류 선택",
  "사진 촬영",
  "수선 항목",
  "수거 정보",
] as const;

export type OrderFlowMode =
  | "list"
  | "addClothing"
  | "addPhoto"
  | "addSubCategory"
  | "addMeasurement"
  | "addRepair"
  | "pickup";

export function getOrderFlowStepIndex(
  mode: OrderFlowMode,
  subCategoryPhase: "pre" | "post" = "pre"
): number {
  switch (mode) {
    case "addClothing":
      return 0;
    case "addSubCategory":
      return subCategoryPhase === "pre" ? 0 : 2;
    case "addPhoto":
      return 1;
    case "addMeasurement":
    case "addRepair":
      return 2;
    case "list":
      return 2;
    case "pickup":
      return 3;
    default:
      return 0;
  }
}

interface OrderFlowProgressProps {
  currentStep: number;
  className?: string;
}

export function OrderFlowProgress({
  currentStep,
  className,
}: OrderFlowProgressProps) {
  const clampedStep = Math.max(
    0,
    Math.min(currentStep, ORDER_FLOW_STEPS.length - 1)
  );

  return (
    <div
      className={cn(
        "px-4 py-3 bg-white border-b border-gray-100",
        className
      )}
      aria-label={`수거신청 ${clampedStep + 1}단계: ${ORDER_FLOW_STEPS[clampedStep]}`}
    >
      <div className="flex items-center gap-1 mb-2">
        {ORDER_FLOW_STEPS.map((_, idx) => (
          <div
            key={idx}
            className={cn(
              "flex-1 h-1.5 rounded-full transition-colors duration-300",
              idx <= clampedStep ? "bg-[#00C896]" : "bg-gray-100"
            )}
          />
        ))}
      </div>
      <div className="flex justify-between gap-0.5">
        {ORDER_FLOW_STEPS.map((label, idx) => (
          <span
            key={label}
            className={cn(
              "flex-1 text-center text-xs leading-tight transition-colors",
              idx === clampedStep
                ? "text-[#00C896] font-bold"
                : idx < clampedStep
                ? "text-gray-500"
                : "text-gray-300"
            )}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
