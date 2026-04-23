"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Check, ShoppingCart, CreditCard, X, Plus, Scissors } from "lucide-react";
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

/** 의류 단위 항목 (여러 벌을 한 수거신청에 묶을 때 사용) */
interface ClothingItem {
  clothingType: string;
  clothingCategoryId?: string;
  repairItems: OrderDraft["repairItems"];
  imagesWithPins: ImageWithPins[];
}

const STEPS: { key: OrderStep; label: string }[] = [
  { key: "clothing", label: "의류 선택" },
  { key: "repair", label: "수선 선택" },
  { key: "photo", label: "사진 첨부" },
  { key: "pickup", label: "수거 신청" },
];

const emptyDraft = (): OrderDraft => ({
  clothingType: "",
  repairItems: [],
  imageUrls: [],
  imagesWithPins: [],
});

export function OrderNewClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<OrderStep>("clothing");
  const [draft, setDraft] = useState<OrderDraft>(emptyDraft());

  // 여러 의류를 한 수거신청에 묶기 위해 완료된 항목 저장
  const [savedItems, setSavedItems] = useState<ClothingItem[]>([]);

  // 사진 단계 완료 후 "의류 추가 or 수거 진행" 선택 모달
  const [showAddMoreModal, setShowAddMoreModal] = useState(false);
  const pendingPhotoDataRef = useRef<ImageWithPins[]>([]);

  // 이탈 방지 다이얼로그
  const [showExitDialog, setShowExitDialog] = useState(false);
  const pendingExitRef = useRef<(() => void) | null>(null);

  // 수거정보 완료 후 결제/장바구니 선택 모달
  const [showPaymentChoice, setShowPaymentChoice] = useState(false);
  const [pendingPickupData, setPendingPickupData] = useState<Partial<OrderDraft> | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // 최신 draft/savedItems를 ref로 유지 (이벤트 핸들러에서 사용)
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const savedItemsRef = useRef(savedItems);
  savedItemsRef.current = savedItems;

  const popstateHandlerRef = useRef<(() => void) | null>(null);

  // 데이터가 있는지 여부 (이탈 방지 조건)
  const hasData = useCallback(() => {
    const { clothingType, repairItems } = draftRef.current;
    return savedItemsRef.current.length > 0 || !!clothingType || repairItems.length > 0;
  }, []);

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
      if (!hasData()) return;
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
  }, [router, hasData]);

  // ── 이탈 방지: 브라우저 네이티브 뒤로가기(popstate) ─────────────────────
  useEffect(() => {
    window.history.pushState({ orderFlowGuard: true }, "");
    const handler = () => {
      if (!hasData()) return;
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
  }, [hasData]);

  // ── 이탈 방지: 브라우저 닫기/새로고침 ────────────────────────────────────
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!hasData()) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasData]);

  // ── 현재 진행 중인 draft + savedItems를 합쳐 저장 ────────────────────────
  function buildFullDraft(extraPhoto?: ImageWithPins[]): OrderDraft {
    const currentImagesWithPins = extraPhoto ?? draftRef.current.imagesWithPins;
    const allItems: ClothingItem[] = [
      ...savedItemsRef.current,
      {
        clothingType: draftRef.current.clothingType,
        clothingCategoryId: draftRef.current.clothingCategoryId,
        repairItems: draftRef.current.repairItems,
        imagesWithPins: currentImagesWithPins,
      },
    ];
    const allRepairItems = allItems.flatMap((i) => i.repairItems);
    const allImagesWithPins = allItems.flatMap((i) => i.imagesWithPins);
    return {
      ...draftRef.current,
      imagesWithPins: allImagesWithPins,
      imageUrls: allImagesWithPins.map((i) => i.imageUrl),
      repairItems: allRepairItems,
      clothingType: allItems.map((i) => i.clothingType).filter(Boolean).join(", "),
    };
  }

  // ── 이탈 다이얼로그 핸들러 ───────────────────────────────────────────────
  async function handleExitSaveToCart() {
    if (hasData()) {
      await addCartItem(buildFullDraft());
    }
    setShowExitDialog(false);
    pendingExitRef.current?.();
  }

  function handleExitWithoutSaving() {
    setShowExitDialog(false);
    pendingExitRef.current?.();
  }

  // ── 사진 완료 → "의류 추가 or 수거 진행" 선택 ──────────────────────────
  function handlePhotoDone(imagesWithPins: ImageWithPins[]) {
    setDraft((prev) => ({
      ...prev,
      imagesWithPins,
      imageUrls: imagesWithPins.map((i) => i.imageUrl),
    }));
    pendingPhotoDataRef.current = imagesWithPins;
    setShowAddMoreModal(true);
  }

  // "의류 추가하기" → 현재 항목 저장 후 처음부터
  function handleAddAnotherClothing() {
    setSavedItems((prev) => [
      ...prev,
      {
        clothingType: draft.clothingType,
        clothingCategoryId: draft.clothingCategoryId,
        repairItems: draft.repairItems,
        imagesWithPins: pendingPhotoDataRef.current,
      },
    ]);
    setDraft(emptyDraft());
    setStep("clothing");
    setShowAddMoreModal(false);
  }

  // "수거 신청으로 이동" → 모든 항목 병합 후 pickup 단계
  function handleProceedToPickup() {
    const full = buildFullDraft(pendingPhotoDataRef.current);
    setDraft(full);
    setSavedItems([]);
    setStep("pickup");
    setShowAddMoreModal(false);
  }

  // ── 수거정보 완료 → 결제/장바구니 선택 모달 ──────────────────────────────
  async function handlePickupDone(pickupData: Partial<OrderDraft>) {
    setPendingPickupData(pickupData);
    setShowPaymentChoice(true);
  }

  function clearGuard() {
    if (popstateHandlerRef.current) {
      window.removeEventListener("popstate", popstateHandlerRef.current);
      popstateHandlerRef.current = null;
    }
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
        clearGuard();
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
      clearGuard();
      router.push("/cart");
    } finally {
      setIsProcessing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, pendingPickupData, router]);

  // ── 스텝 내부 "담기" 버튼 ───────────────────────────────────────────────
  const canSaveToCart =
    step !== "clothing" &&
    step !== "pickup" &&
    (savedItems.length > 0 || (draft.clothingType !== "" && draft.repairItems.length > 0));

  async function handleSaveToCart() {
    if (!canSaveToCart) return;
    await addCartItem(buildFullDraft());
    clearGuard();
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

  const totalItemCount = savedItems.length + (draft.repairItems.length > 0 || draft.clothingType ? 1 : 0);

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

        {/* 장바구니 담기 버튼 */}
        {canSaveToCart && (
          <button
            onClick={handleSaveToCart}
            className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 border border-[#00C896] text-[#00C896] rounded-lg text-xs font-semibold active:bg-[#00C896]/10 whitespace-nowrap"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            담기
          </button>
        )}
      </div>

      {/* 추가된 의류 항목 요약 배지 */}
      {savedItems.length > 0 && step !== "pickup" && (
        <div className="px-4 py-2 bg-[#00C896]/5 border-b border-[#00C896]/10 flex items-center gap-2 flex-wrap">
          {savedItems.map((item, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 text-[11px] bg-[#00C896]/10 text-[#00C896] px-2 py-0.5 rounded-full font-medium"
            >
              <Scissors className="w-3 h-3" />
              {item.clothingType || `의류 ${i + 1}`} · {item.repairItems.length}개
            </span>
          ))}
          <span className="text-[11px] text-gray-400 ml-auto">
            {totalItemCount}번째 의류 입력 중
          </span>
        </div>
      )}

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

      {/* ── 사진 완료 후: 의류 추가 or 수거 진행 선택 모달 ── */}
      {showAddMoreModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full max-w-[430px] bg-white rounded-t-2xl px-5 pt-5 pb-8 shadow-2xl">
            <p className="text-base font-bold text-gray-900 mb-1">
              {savedItems.length > 0
                ? `의류 ${savedItems.length + 1}번째 등록 완료`
                : "의류 등록 완료"}
            </p>
            <p className="text-sm text-gray-500 mb-5">
              다른 의류를 추가하거나 수거 신청을 진행할 수 있습니다.
            </p>

            {/* 현재까지 추가된 항목 요약 */}
            {savedItems.length > 0 && (
              <div className="mb-4 p-3 bg-gray-50 rounded-xl space-y-1.5">
                {savedItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                    <Scissors className="w-3.5 h-3.5 text-[#00C896] shrink-0" />
                    <span className="font-medium">{item.clothingType || `의류 ${i + 1}`}</span>
                    <span className="text-gray-400">· {item.repairItems.map((r) => r.name).join(", ")}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 text-xs text-[#00C896] font-medium pt-0.5 border-t border-gray-100">
                  <Scissors className="w-3.5 h-3.5 shrink-0" />
                  <span>{draft.clothingType || `의류 ${savedItems.length + 1}`}</span>
                  <span className="text-[#00C896]/70">· {draft.repairItems.map((r) => r.name).join(", ")}</span>
                  <span className="ml-auto text-[10px] bg-[#00C896]/10 px-1.5 py-0.5 rounded-full">방금 추가</span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button
                onClick={handleAddAnotherClothing}
                className="w-full py-3.5 border border-[#00C896] text-[#00C896] text-sm font-bold rounded-xl active:bg-[#00C896]/5 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                다른 의류 추가하기
              </button>
              <button
                onClick={handleProceedToPickup}
                className="w-full py-3.5 bg-[#00C896] text-white text-sm font-bold rounded-xl active:opacity-80"
              >
                수거 신청으로 이동 →
              </button>
            </div>
          </div>
        </div>
      )}

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
