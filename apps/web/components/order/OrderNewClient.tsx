"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Check } from "lucide-react";
import { ClothingTypeStep } from "./ClothingTypeStep";
import { RepairTypeStep } from "./RepairTypeStep";
import { ImagePinStep } from "./ImagePinStep";
import { PickupStep } from "./PickupStep";

export type OrderStep = "clothing" | "repair" | "photo" | "pickup";

export interface ImageWithPins {
  imageUrl: string;
  pins: Array<{
    id: string;
    relative_x: number;
    relative_y: number;
    memo: string;
  }>;
}

export interface OrderDraft {
  clothingType: string;
  clothingCategoryId?: string;
  repairItems: Array<{
    name: string;
    price: number;
    priceRange: string;
    quantity: number;
    detail?: string;
  }>;
  imageUrls: string[];
  imagesWithPins: ImageWithPins[];
  pickupAddress?: string;
  pickupAddressDetail?: string;
  pickupDate?: string;
  notes?: string;
  deliveryAddress?: string;
  deliveryAddressDetail?: string;
  agreedToExtraCharge?: boolean;
}

const STEPS: { key: OrderStep; label: string }[] = [
  { key: "clothing", label: "의류 선택" },
  { key: "repair", label: "수선 선택" },
  { key: "photo", label: "사진 첨부" },
  { key: "pickup", label: "수거 신청" },
];

export function OrderNewClient() {
  const router = useRouter();
  const [step, setStep] = useState<OrderStep>("clothing");
  const [draft, setDraft] = useState<OrderDraft>({
    clothingType: "",
    repairItems: [],
    imageUrls: [],
    imagesWithPins: [],
  });

  const currentStepIndex = STEPS.findIndex((s) => s.key === step);

  function handleClothingDone(type: string, categoryId?: string) {
    setDraft((prev) => ({
      ...prev,
      clothingType: type,
      clothingCategoryId: categoryId,
    }));
    setStep("repair");
  }

  function handleRepairDone(
    items: OrderDraft["repairItems"],
    imageUrls: string[]
  ) {
    setDraft((prev) => ({ ...prev, repairItems: items, imageUrls }));
    setStep("photo");
  }

  function handlePhotoDone(imagesWithPins: OrderDraft["imagesWithPins"]) {
    setDraft((prev) => ({
      ...prev,
      imagesWithPins,
      imageUrls: imagesWithPins.map((i) => i.imageUrl),
    }));
    setStep("pickup");
  }

  async function handlePickupDone(pickupData: Partial<OrderDraft>) {
    const finalDraft = { ...draft, ...pickupData };

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalDraft),
      });

      if (res.ok) {
        const { orderId, totalPrice } = await res.json();
        if (totalPrice > 0) {
          router.push(`/payment?orderId=${orderId}`);
        } else {
          router.push(`/orders/${orderId}?new=true`);
        }
      } else {
        alert("주문 생성 중 오류가 발생했습니다. 다시 시도해주세요.");
      }
    } catch {
      alert("주문 생성 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
  }

  return (
    <div>
      {/* 스텝 인디케이터 */}
      <div className="flex items-center px-4 py-3 border-b border-gray-100">
        {STEPS.map((s, idx) => {
          const isDone = idx < currentStepIndex;
          const isActive = idx === currentStepIndex;
          return (
            <div key={s.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    isDone
                      ? "bg-[#00C896] text-white"
                      : isActive
                      ? "bg-[#00C896] text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {isDone ? <Check className="w-4 h-4" /> : idx + 1}
                </div>
                <p
                  className={`text-[10px] mt-1 font-medium ${
                    isActive ? "text-[#00C896]" : "text-gray-400"
                  }`}
                >
                  {s.label}
                </p>
              </div>
              {idx < STEPS.length - 1 && (
                <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0 mx-1" />
              )}
            </div>
          );
        })}
      </div>

      {/* 스텝 컨텐츠 */}
      <div>
        {step === "clothing" && (
          <ClothingTypeStep onNext={handleClothingDone} />
        )}
        {step === "repair" && (
          <RepairTypeStep
            clothingType={draft.clothingType}
            clothingCategoryId={draft.clothingCategoryId}
            onNext={handleRepairDone}
            onBack={() => setStep("clothing")}
          />
        )}
        {step === "photo" && (
          <ImagePinStep
            clothingType={draft.clothingType}
            initialImages={draft.imagesWithPins}
            onNext={handlePhotoDone}
            onBack={() => setStep("repair")}
          />
        )}
        {step === "pickup" && (
          <PickupStep
            draft={draft}
            onNext={handlePickupDone}
            onBack={() => setStep("photo")}
          />
        )}
      </div>
    </div>
  );
}
