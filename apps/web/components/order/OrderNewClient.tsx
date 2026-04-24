"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShoppingCart, CreditCard, X, ChevronLeft } from "lucide-react";
import { ClothingTypeStep } from "./ClothingTypeStep";
import { RepairTypeStep } from "./RepairTypeStep";
import { ImagePinStep } from "./ImagePinStep";
import { PickupStep } from "./PickupStep";
import { ItemsListPanel } from "./ItemsListPanel";
import { addCartItem, removeCartItem } from "@/lib/cart";

export interface ImageWithPins {
  imageUrl: string;
  pins: Array<{
    id: string;
    relative_x: number;
    relative_y: number;
    memo: string;
  }>;
}

export interface RepairItem {
  name: string;
  price: number;
  priceRange: string;
  quantity: number;
  detail?: string;
}

export interface ClothingItem {
  clothingType: string;
  clothingCategoryId?: string;
  repairItems: RepairItem[];
  imagesWithPins: ImageWithPins[];
}

export interface OrderDraft {
  items: ClothingItem[];
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

type Mode = "list" | "addClothing" | "addRepair" | "addPhoto" | "pickup";

/** 옛 단일 형식 → 신규 items[] 형식 변환 */
function normalizeDraft(raw: unknown): OrderDraft {
  const d = (raw ?? {}) as Record<string, unknown>;
  if (Array.isArray(d.items)) {
    return d as unknown as OrderDraft;
  }
  // 옛 단일 형식: 최상위에 clothingType / repairItems / imagesWithPins
  const single: ClothingItem = {
    clothingType: (d.clothingType as string) ?? "",
    clothingCategoryId: d.clothingCategoryId as string | undefined,
    repairItems: Array.isArray(d.repairItems)
      ? (d.repairItems as RepairItem[])
      : [],
    imagesWithPins: Array.isArray(d.imagesWithPins)
      ? (d.imagesWithPins as ImageWithPins[])
      : [],
  };
  const draft: OrderDraft = {
    items: single.clothingType || single.repairItems.length > 0 ? [single] : [],
    pickupAddress: d.pickupAddress as string | undefined,
    pickupAddressDetail: d.pickupAddressDetail as string | undefined,
    pickupZipcode: d.pickupZipcode as string | undefined,
    pickupDate: d.pickupDate as string | undefined,
    notes: d.notes as string | undefined,
    deliveryAddress: d.deliveryAddress as string | undefined,
    deliveryAddressDetail: d.deliveryAddressDetail as string | undefined,
    deliveryZipcode: d.deliveryZipcode as string | undefined,
    agreedToExtraCharge: d.agreedToExtraCharge as boolean | undefined,
    remoteAreaFee: d.remoteAreaFee as number | undefined,
  };
  return draft;
}

export function OrderNewClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<Mode>("list");
  const [draft, setDraft] = useState<OrderDraft>({ items: [] });
  // 장바구니에서 이어서 진행 중일 경우 원본 cart_drafts.id (완료시 삭제)
  const [resumingCartId, setResumingCartId] = useState<string | null>(null);

  // 새 의류 추가 sub-flow: 단계별 임시 상태
  const [stagingClothingType, setStagingClothingType] = useState<string>("");
  const [stagingClothingCategoryId, setStagingClothingCategoryId] = useState<
    string | undefined
  >(undefined);
  const [stagingRepairItems, setStagingRepairItems] = useState<RepairItem[]>(
    []
  );

  // 이탈 방지 다이얼로그
  const [showExitDialog, setShowExitDialog] = useState(false);
  const pendingExitRef = useRef<(() => void) | null>(null);

  // 결제/장바구니 선택 모달
  const [showPaymentChoice, setShowPaymentChoice] = useState(false);
  const [pendingPickupData, setPendingPickupData] =
    useState<Partial<OrderDraft> | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const draftRef = useRef(draft);
  draftRef.current = draft;
  const stagingRef = useRef({ stagingClothingType, stagingRepairItems });
  stagingRef.current = { stagingClothingType, stagingRepairItems };

  const popstateHandlerRef = useRef<(() => void) | null>(null);

  // 작업 진행 중 여부 (이탈 가드 기준)
  function hasUnsavedWork(): boolean {
    const d = draftRef.current;
    const s = stagingRef.current;
    return (
      d.items.length > 0 ||
      !!s.stagingClothingType ||
      s.stagingRepairItems.length > 0
    );
  }

  // ── 장바구니에서 이어서 신청 시 draft 복원 ──────────────────────────────
  useEffect(() => {
    if (searchParams.get("from") === "cart") {
      try {
        const saved = sessionStorage.getItem("cart_resume_draft");
        const resumeId = sessionStorage.getItem("cart_resume_id");
        if (saved) {
          const restored = normalizeDraft(JSON.parse(saved));
          sessionStorage.removeItem("cart_resume_draft");
          sessionStorage.removeItem("cart_resume_id");
          setDraft(restored);
          if (resumeId) setResumingCartId(resumeId);
          // 사용자가 의류 목록을 다시 확인하고 추가/수정할 수 있도록 항상 list 모드로 진입.
          setMode("list");
        }
      } catch {
        /* ignore */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 이탈 방지: modu_before_navigate ─────────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      if (!hasUnsavedWork()) return;
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

  // ── 이탈 방지: popstate ─────────────────────────────────────────────────
  useEffect(() => {
    window.history.pushState({ orderFlowGuard: true }, "");

    const handler = () => {
      if (!hasUnsavedWork()) return;
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

  // ── 이탈 방지: beforeunload ─────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!hasUnsavedWork()) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // ── 이탈 다이얼로그 핸들러 ──────────────────────────────────────────────
  async function handleExitSaveToCart() {
    const d = draftRef.current;
    if (d.items.length > 0) {
      await addCartItem(d);
      // 이어서 진행 중이던 cart 항목이 있으면 새 항목으로 대체 (중복 방지)
      if (resumingCartId) {
        try { await removeCartItem(resumingCartId); } catch { /* ignore */ }
      }
    }
    setShowExitDialog(false);
    pendingExitRef.current?.();
  }

  function handleExitWithoutSaving() {
    setShowExitDialog(false);
    pendingExitRef.current?.();
  }

  // ── 의류 추가 sub-flow ──────────────────────────────────────────────────
  function startAddClothing() {
    setStagingClothingType("");
    setStagingClothingCategoryId(undefined);
    setStagingRepairItems([]);
    setMode("addClothing");
  }

  function handleClothingDone(type: string, categoryId?: string) {
    setStagingClothingType(type);
    setStagingClothingCategoryId(categoryId);
    setMode("addRepair");
  }

  function handleRepairDone(items: RepairItem[]) {
    setStagingRepairItems(items);
    setMode("addPhoto");
  }

  function handlePhotoDone(imagesWithPins: ImageWithPins[]) {
    const newItem: ClothingItem = {
      clothingType: stagingClothingType,
      clothingCategoryId: stagingClothingCategoryId,
      repairItems: stagingRepairItems,
      imagesWithPins,
    };
    setDraft((prev) => ({ ...prev, items: [...prev.items, newItem] }));
    setStagingClothingType("");
    setStagingClothingCategoryId(undefined);
    setStagingRepairItems([]);
    setMode("list");
  }

  function cancelAddClothing() {
    setStagingClothingType("");
    setStagingClothingCategoryId(undefined);
    setStagingRepairItems([]);
    setMode("list");
  }

  // ── 의류 카드 삭제 ──────────────────────────────────────────────────────
  function handleRemoveItem(index: number) {
    setDraft((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }

  // ── 메인 → 수거정보 ─────────────────────────────────────────────────────
  function handleProceedToPickup() {
    if (draft.items.length === 0) return;
    setMode("pickup");
  }

  // ── 메인 → 담기 (수거정보 없이) ────────────────────────────────────────
  const [isSavingToCart, setIsSavingToCart] = useState(false);
  async function handleSaveToCartFromList() {
    if (draft.items.length === 0 || isSavingToCart) return;
    setIsSavingToCart(true);
    try {
      await addCartItem(draft);
      if (resumingCartId) {
        try { await removeCartItem(resumingCartId); } catch { /* ignore */ }
      }
      if (popstateHandlerRef.current) {
        window.removeEventListener("popstate", popstateHandlerRef.current);
        popstateHandlerRef.current = null;
      }
      router.push("/cart");
    } catch {
      setIsSavingToCart(false);
    }
  }

  // ── 수거정보 완료 → 결제/장바구니 선택 모달 ─────────────────────────────
  async function handlePickupDone(pickupData: Partial<OrderDraft>) {
    setPendingPickupData(pickupData);
    setShowPaymentChoice(true);
  }

  // ── 바로 결제 ──────────────────────────────────────────────────────────
  const handlePayNow = useCallback(async () => {
    if (!pendingPickupData) return;
    setIsProcessing(true);
    const finalDraft: OrderDraft = { ...draft, ...pendingPickupData };
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalDraft),
      });
      if (res.ok) {
        const { orderId, totalPrice } = await res.json();
        // 결제 진입 전, 이어서 진행하던 cart 항목 정리 (주문 확정시 중복 제거)
        if (resumingCartId) {
          try { await removeCartItem(resumingCartId); } catch { /* ignore */ }
        }
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
  }, [draft, pendingPickupData, router, resumingCartId]);

  // ── 장바구니에 담기 (수거정보 포함) ────────────────────────────────────
  const handleSaveToCartFromPickup = useCallback(async () => {
    if (!pendingPickupData) return;
    setIsProcessing(true);
    try {
      const finalDraft: OrderDraft = { ...draft, ...pendingPickupData };
      await addCartItem(finalDraft);
      if (resumingCartId) {
        try { await removeCartItem(resumingCartId); } catch { /* ignore */ }
      }
      if (popstateHandlerRef.current) {
        window.removeEventListener("popstate", popstateHandlerRef.current);
        popstateHandlerRef.current = null;
      }
      router.push("/cart");
    } finally {
      setIsProcessing(false);
    }
  }, [draft, pendingPickupData, router, resumingCartId]);

  // ── 헤더 표시 (sub-flow 인 경우) ───────────────────────────────────────
  // pickup 모드는 PickupStep 내부에 자체 헤더와 "이전" 버튼이 있어 별도 표시 안 함.
  const showSubHeader =
    mode === "addClothing" ||
    mode === "addRepair" ||
    mode === "addPhoto";

  function subHeaderTitle(): string {
    switch (mode) {
      case "addClothing":
        return `의류 ${draft.items.length + 1}벌째 · 종류 선택`;
      case "addRepair":
        return `의류 ${draft.items.length + 1}벌째 · 수선 선택`;
      case "addPhoto":
        return `의류 ${draft.items.length + 1}벌째 · 사진 첨부`;
      default:
        return "";
    }
  }

  function subHeaderBack() {
    if (mode === "addClothing") {
      cancelAddClothing();
    } else if (mode === "addRepair") {
      setMode("addClothing");
    } else if (mode === "addPhoto") {
      setMode("addRepair");
    }
  }

  return (
    <div>
      {showSubHeader && (
        <div className="flex items-center px-3 py-2.5 border-b border-gray-100 gap-2">
          <button
            type="button"
            onClick={subHeaderBack}
            className="p-1.5 text-gray-500 active:opacity-60"
            aria-label="뒤로"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <p className="text-sm font-bold text-gray-800">{subHeaderTitle()}</p>
        </div>
      )}

      <div>
        {mode === "list" && (
          <ItemsListPanel
            items={draft.items}
            onAddItem={startAddClothing}
            onRemoveItem={handleRemoveItem}
            onProceedToPickup={handleProceedToPickup}
            onSaveToCart={handleSaveToCartFromList}
          />
        )}

        {mode === "addClothing" && (
          <ClothingTypeStep onNext={handleClothingDone} />
        )}

        {mode === "addRepair" && (
          <RepairTypeStep
            clothingType={stagingClothingType}
            clothingCategoryId={stagingClothingCategoryId}
            onNext={(items) => handleRepairDone(items)}
            onBack={() => setMode("addClothing")}
          />
        )}

        {mode === "addPhoto" && (
          <ImagePinStep
            clothingType={stagingClothingType}
            initialImages={[]}
            onNext={handlePhotoDone}
            onBack={() => setMode("addRepair")}
          />
        )}

        {mode === "pickup" && (
          <PickupStep
            draft={draft}
            onNext={handlePickupDone}
            onBack={() => setMode("list")}
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
            <p className="text-base font-bold text-gray-900 mb-1">
              신청을 중단하시겠어요?
            </p>
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
                disabled={draft.items.length === 0}
                className="w-full py-3.5 border border-[#00C896] text-[#00C896] text-sm font-bold rounded-xl active:bg-[#00C896]/5 disabled:opacity-40"
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

      {/* ── 결제/장바구니 선택 모달 ── */}
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
            <p className="text-base font-bold text-gray-900 mb-1">
              어떻게 하시겠어요?
            </p>
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
