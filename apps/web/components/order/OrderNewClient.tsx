"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShoppingCart, CreditCard, X, ChevronLeft } from "lucide-react";
import { ClothingTypeStep } from "./ClothingTypeStep";
import { SubCategoryStep } from "./SubCategoryStep";
import { RepairTypeStep } from "./RepairTypeStep";
import { ImagePinStep } from "./ImagePinStep";
import { PickupStep } from "./PickupStep";
import { ItemsListPanel } from "./ItemsListPanel";
import { addCartItem, removeCartItem } from "@/lib/cart";
import { Analytics } from "@/lib/analytics";

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

type Mode = "list" | "addClothing" | "addPhoto" | "addSubCategory" | "addRepair" | "pickup";

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
  // 신규 흐름(앱과 동일): 의류 종류 → 사진+핀+메모 → 수선 항목 → 목록 합류
  const [stagingClothingType, setStagingClothingType] = useState<string>("");
  const [stagingClothingCategoryId, setStagingClothingCategoryId] = useState<
    string | undefined
  >(undefined);
  const [stagingImagesWithPins, setStagingImagesWithPins] = useState<
    ImageWithPins[]
  >([]);
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
  const stagingRef = useRef({
    stagingClothingType,
    stagingRepairItems,
    stagingImagesWithPins,
  });
  stagingRef.current = {
    stagingClothingType,
    stagingRepairItems,
    stagingImagesWithPins,
  };

  // 현재 mode를 이벤트 핸들러에서 stale 없이 읽기 위한 ref (매 렌더마다 동기화)
  const modeRef = useRef(mode);
  modeRef.current = mode;

  // 현재 단계에서 한 단계 뒤로 이동하는 함수 ref
  const stepBackRef = useRef<() => void>(() => {});

  const popstateHandlerRef = useRef<(() => void) | null>(null);

  // 작업 진행 중 여부 (이탈 가드 기준)
  function hasUnsavedWork(): boolean {
    const d = draftRef.current;
    const s = stagingRef.current;
    return (
      d.items.length > 0 ||
      !!s.stagingClothingType ||
      s.stagingImagesWithPins.length > 0 ||
      s.stagingRepairItems.length > 0
    );
  }

  // ── 주문 시작 추적 ───────────────────────────────────────────────────────
  useEffect(() => {
    Analytics.orderStart();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const type = (e as CustomEvent).detail?.type as "back" | "home";
      const currentMode = modeRef.current;

      // sub-flow 단계(list 제외)에서 뒤로가기 → 이탈 다이얼로그 없이 이전 단계로
      if (type === "back" && currentMode !== "list") {
        e.preventDefault();
        stepBackRef.current();
        return;
      }

      // 홈 버튼 또는 list 모드에서 뒤로가기 → 미저장 작업 있으면 이탈 다이얼로그
      if (!hasUnsavedWork()) return;
      e.preventDefault();
      pendingExitRef.current = () => router.push("/");
      setShowExitDialog(true);
    };
    window.addEventListener("modu_before_navigate", handler);
    return () => window.removeEventListener("modu_before_navigate", handler);
  }, [router]);

  // ── 이탈 방지: popstate ─────────────────────────────────────────────────
  useEffect(() => {
    window.history.pushState({ orderFlowGuard: true }, "");

    const handler = () => {
      const currentMode = modeRef.current;
      // 가드 엔트리를 다시 쌓아 페이지를 유지
      window.history.pushState({ orderFlowGuard: true }, "");

      // sub-flow 단계에서 브라우저 뒤로가기 → 이전 단계로 이동
      if (currentMode !== "list") {
        stepBackRef.current();
        return;
      }

      // list 모드에서 브라우저 뒤로가기 → 이탈 확인
      if (!hasUnsavedWork()) return;
      pendingExitRef.current = () => {
        if (popstateHandlerRef.current) {
          window.removeEventListener("popstate", popstateHandlerRef.current);
          popstateHandlerRef.current = null;
        }
        router.push("/");
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
  // 순서: 대카테고리 선택 → 사진+핀+메모 → 소카테고리 선택(있으면) → 수선 항목
  function startAddClothing() {
    setStagingClothingType("");
    setStagingClothingCategoryId(undefined);
    setStagingImagesWithPins([]);
    setStagingRepairItems([]);
    setMode("addClothing");
  }

  function handleClothingDone(type: string, categoryId?: string) {
    setStagingClothingType(type);
    setStagingClothingCategoryId(categoryId);
    // 대카테고리 선택 후 사진 촬영
    setMode("addPhoto");
  }

  function handlePhotoDone(imagesWithPins: ImageWithPins[]) {
    setStagingImagesWithPins(imagesWithPins);
    // 사진 후 소카테고리 확인 → ClothingTypeStep이 대카테고리만 처리하므로
    // 소카테고리가 있으면 SubCategoryStep으로, 없으면 바로 수선 항목으로
    setMode("addSubCategory");
  }

  function handleSubCategoryDone(type: string, categoryId?: string) {
    // 소카테고리가 있으면 해당 값으로 덮어쓰기, 없으면 대카테고리 유지
    if (type && categoryId) {
      setStagingClothingType(type);
      setStagingClothingCategoryId(categoryId);
    }
    setMode("addRepair");
  }

  function handleRepairDone(items: RepairItem[]) {
    const newItem: ClothingItem = {
      clothingType: stagingClothingType,
      clothingCategoryId: stagingClothingCategoryId,
      repairItems: items,
      imagesWithPins: stagingImagesWithPins,
    };
    setDraft((prev) => ({ ...prev, items: [...prev.items, newItem] }));
    setStagingClothingType("");
    setStagingClothingCategoryId(undefined);
    setStagingImagesWithPins([]);
    setStagingRepairItems([]);
    setMode("list");
  }

  function cancelAddClothing() {
    setStagingClothingType("");
    setStagingClothingCategoryId(undefined);
    setStagingImagesWithPins([]);
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
  // 흐름:
  //   1) /api/orders/quote 호출 → 서버 권위적 가격 + intent_id
  //   2) 0원이면 /api/orders/free 로 바로 PAID 주문 생성 + 수거 예약
  //   3) 그 외에는 /payment?intentId=... 로 이동 (PaymentClient 가 결제 진행)
  //   ※ DB 에는 결제 성공 전까지 orders row 가 절대 만들어지지 않음 (PENDING_PAYMENT 폐지)
  const handlePayNow = useCallback(async () => {
    if (!pendingPickupData) return;
    setIsProcessing(true);
    const finalDraft: OrderDraft = { ...draft, ...pendingPickupData };
    try {
      const quoteRes = await fetch("/api/orders/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalDraft),
      });
      if (!quoteRes.ok) {
        const err = await quoteRes.json().catch(() => ({}));
        alert((err as { error?: string }).error || "주문 가격 계산에 실패했습니다.");
        setShowPaymentChoice(false);
        return;
      }
      const quote = await quoteRes.json() as { intentId: string; totalPrice: number };

      if (resumingCartId) {
        try { await removeCartItem(resumingCartId); } catch { /* ignore */ }
      }
      if (popstateHandlerRef.current) {
        window.removeEventListener("popstate", popstateHandlerRef.current);
        popstateHandlerRef.current = null;
      }

      if (quote.totalPrice === 0) {
        const freeRes = await fetch("/api/orders/free", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(finalDraft),
        });
        if (!freeRes.ok) {
          const err = await freeRes.json().catch(() => ({}));
          alert((err as { error?: string }).error || "0원 주문 생성에 실패했습니다.");
          setShowPaymentChoice(false);
          return;
        }
        const { orderId } = await freeRes.json() as { orderId: string };
        router.push(`/orders/${orderId}?new=true`);
        return;
      }

      router.push(`/payment?intentId=${quote.intentId}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[결제] handlePayNow 오류:", e);
      alert(`주문 처리 중 오류가 발생했습니다.\n${msg}`);
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
    mode === "addPhoto" ||
    mode === "addSubCategory" ||
    mode === "addRepair";

  function subHeaderBack() {
    if (mode === "addClothing") {
      cancelAddClothing();
    } else if (mode === "addPhoto") {
      setMode("addClothing");
    } else if (mode === "addSubCategory") {
      setMode("addPhoto");
    } else if (mode === "addRepair") {
      // addSubCategory는 소카테고리 없을 때 자동 통과하므로 addPhoto로 이동
      setMode("addPhoto");
    } else if (mode === "pickup") {
      setMode("list");
    }
  }

  // stepBackRef를 항상 최신 subHeaderBack으로 동기화 (매 렌더마다)
  stepBackRef.current = subHeaderBack;

  return (
    <div>
      {showSubHeader && (
        <div className="flex items-center px-3 py-2 border-b border-gray-100">
          <button
            type="button"
            onClick={subHeaderBack}
            className="p-1.5 text-gray-500 active:opacity-60"
            aria-label="뒤로"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
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

        {mode === "addPhoto" && (
          <ImagePinStep
            clothingType={stagingClothingType}
            initialImages={stagingImagesWithPins}
            onNext={handlePhotoDone}
            onBack={() => setMode("addClothing")}
          />
        )}

        {mode === "addSubCategory" && (
          <SubCategoryStep
            parentCategoryId={stagingClothingCategoryId}
            parentCategoryName={stagingClothingType}
            onNext={handleSubCategoryDone}
            onBack={() => setMode("addPhoto")}
          />
        )}

        {mode === "addRepair" && (
          <RepairTypeStep
            clothingType={stagingClothingType}
            clothingCategoryId={stagingClothingCategoryId}
            onNext={(items) => handleRepairDone(items)}
            onBack={() => setMode("addPhoto")}
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
