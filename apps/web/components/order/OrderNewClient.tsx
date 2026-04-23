"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Check, ShoppingCart, CreditCard, X } from "lucide-react";
import { ClothingTypeStep } from "./ClothingTypeStep";
import { RepairTypeStep } from "./RepairTypeStep";
import { ImagePinStep } from "./ImagePinStep";
import { PickupStep } from "./PickupStep";
import { addCartItem } from "@/lib/cart";

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
  pickupZipcode?: string;
  pickupDate?: string;
  notes?: string;
  deliveryAddress?: string;
  deliveryAddressDetail?: string;
  deliveryZipcode?: string;
  agreedToExtraCharge?: boolean;
  remoteAreaFee?: number;
}

const STEPS: { key: OrderStep; label: string }[] = [
  { key: "clothing", label: "의류 선택" },
  { key: "repair", label: "수선 선택" },
  { key: "photo", label: "사진 첨부" },
  { key: "pickup", label: "수거 신청" },
];

export function OrderNewClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<OrderStep>("clothing");
  const [draft, setDraft] = useState<OrderDraft>({
    clothingType: "",
    repairItems: [],
    imageUrls: [],
    imagesWithPins: [],
  });

  // 이탈 방지 다이얼로그
  const [showExitDialog, setShowExitDialog] = useState(false);
  const pendingExitRef = useRef<(() => void) | null>(null);

  // 수거정보 완료 후 결제/장바구니 선택 모달
  const [showPaymentChoice, setShowPaymentChoice] = useState(false);
  const [pendingPickupData, setPendingPickupData] = useState<Partial<OrderDraft> | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // 최신 draft를 ref로 유지 (이벤트 핸들러에서 사용)
  const draftRef = useRef(draft);
  draftRef.current = draft;

  // popstate 핸들러 ref (cleanup용)
  const popstateHandlerRef = useRef<(() => void) | null>(null);

  // ── 장바구니에서 이어서 신청 시 draft 복원 ──────────────────────────────
  useEffect(() => {
    if (searchParams.get("from") === "cart") {
      try {
        const saved = sessionStorage.getItem("cart_resume_draft");
        if (saved) {
          const restored = JSON.parse(saved) as OrderDraft;
          sessionStorage.removeItem("cart_resume_draft");
          setDraft(restored);
          if (restored.imagesWithPins?.length > 0) {
            setStep("pickup");
          } else if (restored.repairItems?.length > 0) {
            setStep("photo");
          } else if (restored.clothingType) {
            setStep("repair");
          }
        }
      } catch { /* ignore */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 이탈 방지: modu_before_navigate 이벤트 (헤더 뒤로/홈 버튼) ──────────
  useEffect(() => {
    const handler = (e: Event) => {
      const { clothingType, repairItems } = draftRef.current;
      if (!clothingType && repairItems.length === 0) return;
      e.preventDefault();
      const type = (e as CustomEvent).detail?.type as "back" | "home";
      pendingExitRef.current = () => {
        if (type === "home") router.push("/");
        else router.back();
      };
      setShowExitDialog(true);
    };
    window.addEventListener("modu_before_navigate", handler);
    return () => window.removeEventListener("modu_before_navigate", handler);
  }, [router]);

  // ── 이탈 방지: 브라우저 네이티브 뒤로가기(popstate) ─────────────────────
  useEffect(() => {
    window.history.pushState({ orderFlowGuard: true }, "");

    const handler = () => {
      const { clothingType, repairItems } = draftRef.current;
      if (!clothingType && repairItems.length === 0) return;

      // 상태를 다시 밀어 다음 뒤로가기도 감지
      window.history.pushState({ orderFlowGuard: true }, "");
      pendingExitRef.current = () => {
        if (popstateHandlerRef.current) {
          window.removeEventListener("popstate", popstateHandlerRef.current);
          popstateHandlerRef.current = null;
        }
        window.history.back();
      };
      setShowExitDialog(true);
    };

    popstateHandlerRef.current = handler;
    window.addEventListener("popstate", handler);
    return () => {
      if (popstateHandlerRef.current) {
        window.removeEventListener("popstate", popstateHandlerRef.current);
      }
    };
  }, []);

  // ── 이탈 방지: 브라우저 닫기/새로고침 ────────────────────────────────────
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      const { clothingType, repairItems } = draftRef.current;
      if (!clothingType && repairItems.length === 0) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // ── 이탈 다이얼로그 핸들러 ───────────────────────────────────────────────
  async function handleExitSaveToCart() {
    const d = draftRef.current;
    if (d.clothingType || d.repairItems.length > 0) {
      await addCartItem(d);
    }
    setShowExitDialog(false);
    pendingExitRef.current?.();
  }

  function handleExitWithoutSaving() {
    setShowExitDialog(false);
    pendingExitRef.current?.();
  }

  // ── 수거정보 완료 → 결제/장바구니 선택 모달 표시 ─────────────────────────
  async function handlePickupDone(pickupData: Partial<OrderDraft>) {
    setPendingPickupData(pickupData);
    setShowPaymentChoice(true);
  }

  // ── 바로 결제하기 ────────────────────────────────────────────────────────
  const handlePayNow = useCallback(async () => {
    if (!pendingPickupData) return;
    setIsProcessing(true);
    const finalDraft = { ...draft, ...pendingPickupData };
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalDraft),
      });
      if (res.ok) {
        const { orderId, totalPrice } = await res.json();
        // 결제 성공 후에는 이탈 방지 해제
        if (popstateHandlerRef.current) {
          window.removeEventListener("popstate", popstateHandlerRef.current);
          popstateHandlerRef.current = null;
        }
        if (totalPrice > 0) {
          router.push(`/payment?orderId=${orderId}`);
        } else {
          router.push(`/orders/${orderId}?new=true`);
        }
      } else {
        alert("주문 생성 중 오류가 발생했습니다. 다시 시도해주세요.");
        setShowPaymentChoice(false);
      }
    } catch {
      alert("주문 생성 중 오류가 발생했습니다. 다시 시도해주세요.");
      setShowPaymentChoice(false);
    } finally {
      setIsProcessing(false);
    }
  }, [draft, pendingPickupData, router]);

  // ── 장바구니에 담기 (수거정보 포함) ─────────────────────────────────────
  const handleSaveToCartFromPickup = useCallback(async () => {
    if (!pendingPickupData) return;
    setIsProcessing(true);
    try {
      const finalDraft = { ...draft, ...pendingPickupData };
      await addCartItem(finalDraft);
      if (popstateHandlerRef.current) {
        window.removeEventListener("popstate", popstateHandlerRef.current);
        popstateHandlerRef.current = null;
      }
      router.push("/cart");
    } finally {
      setIsProcessing(false);
    }
  }, [draft, pendingPickupData, router]);

  // ── 스텝 내부 "담기" 버튼 ───────────────────────────────────────────────
  const canSaveToCart =
    step !== "clothing" &&
    draft.clothingType !== "" &&
    draft.repairItems.length > 0;

  async function handleSaveToCart() {
    if (!canSaveToCart) return;
    await addCartItem(draft);
    if (popstateHandlerRef.current) {
      window.removeEventListener("popstate", popstateHandlerRef.current);
      popstateHandlerRef.current = null;
    }
    router.push("/cart");
  }

  const currentStepIndex = STEPS.findIndex((s) => s.key === step);

  function handleClothingDone(type: string, categoryId?: string) {
    setDraft((prev) => ({ ...prev, clothingType: type, clothingCategoryId: categoryId }));
    setStep("repair");
  }

  function handleRepairDone(items: OrderDraft["repairItems"], imageUrls: string[]) {
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

  return (
    <div>
      {/* 스텝 인디케이터 */}
      <div className="flex items-center px-4 py-3 border-b border-gray-100 gap-2">
        <div className="flex items-center flex-1">
          {STEPS.map((s, idx) => {
            const isDone = idx < currentStepIndex;
            const isActive = idx === currentStepIndex;
            return (
              <div key={s.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      isDone || isActive
                        ? "bg-[#00C896] text-white"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {isDone ? <Check className="w-4 h-4" /> : idx + 1}
                  </div>
                  <p className={`text-[10px] mt-1 font-medium ${isActive ? "text-[#00C896]" : "text-gray-400"}`}>
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

        {/* 장바구니 담기 버튼 (중간 이탈 시 명시적 저장) */}
        {canSaveToCart && step !== "pickup" && (
          <button
            onClick={handleSaveToCart}
            className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 border border-[#00C896] text-[#00C896] rounded-lg text-xs font-semibold active:bg-[#00C896]/10 whitespace-nowrap"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            담기
          </button>
        )}
      </div>

      {/* 스텝 컨텐츠 */}
      <div>
        {step === "clothing" && <ClothingTypeStep onNext={handleClothingDone} />}
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

      {/* ── 이탈 방지 다이얼로그 ── */}
      {showExitDialog && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowExitDialog(false)}
          />
          <div className="relative w-full max-w-[430px] bg-white rounded-t-2xl px-5 pt-5 pb-8 shadow-2xl">
            <button
              onClick={() => setShowExitDialog(false)}
              className="absolute top-4 right-4 p-1 text-gray-400 active:opacity-60"
            >
              <X className="w-5 h-5" />
            </button>
            <p className="text-base font-bold text-gray-900 mb-1">신청을 중단하시겠어요?</p>
            <p className="text-sm text-gray-500 mb-5">
              지금까지 입력한 내용을 장바구니에 저장할 수 있습니다.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowExitDialog(false)}
                className="w-full py-3.5 bg-[#00C896] text-white text-sm font-bold rounded-xl active:opacity-80"
              >
                계속 신청하기
              </button>
              <button
                onClick={handleExitSaveToCart}
                className="w-full py-3.5 border border-[#00C896] text-[#00C896] text-sm font-bold rounded-xl active:bg-[#00C896]/5"
              >
                장바구니에 담고 나가기
              </button>
              <button
                onClick={handleExitWithoutSaving}
                className="w-full py-3 text-gray-400 text-sm font-medium active:opacity-70"
              >
                저장 없이 나가기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 수거정보 완료 후 결제/장바구니 선택 모달 ── */}
      {showPaymentChoice && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !isProcessing && setShowPaymentChoice(false)}
          />
          <div className="relative w-full max-w-[430px] bg-white rounded-t-2xl px-5 pt-5 pb-8 shadow-2xl">
            {!isProcessing && (
              <button
                onClick={() => setShowPaymentChoice(false)}
                className="absolute top-4 right-4 p-1 text-gray-400 active:opacity-60"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            <p className="text-base font-bold text-gray-900 mb-1">어떻게 하시겠어요?</p>
            <p className="text-sm text-gray-500 mb-5">
              바로 결제하거나 장바구니에 담아두고 나중에 결제할 수 있습니다.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={handlePayNow}
                disabled={isProcessing}
                className="w-full py-3.5 bg-[#00C896] text-white text-sm font-bold rounded-xl active:opacity-80 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                {isProcessing ? "처리 중..." : "바로 결제하기"}
              </button>
              <button
                onClick={handleSaveToCartFromPickup}
                disabled={isProcessing}
                className="w-full py-3.5 border border-[#00C896] text-[#00C896] text-sm font-bold rounded-xl active:bg-[#00C896]/5 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                장바구니에 담기
              </button>
              <button
                onClick={() => !isProcessing && setShowPaymentChoice(false)}
                disabled={isProcessing}
                className="w-full py-3 text-gray-400 text-sm font-medium active:opacity-70 disabled:opacity-50"
              >
                취소 (수거정보 다시 확인)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
