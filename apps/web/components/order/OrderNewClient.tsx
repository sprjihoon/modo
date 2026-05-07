"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShoppingCart, X, ChevronLeft } from "lucide-react";
import { ClothingTypeStep } from "./ClothingTypeStep";
import { SubCategoryStep, SubCategorySelection } from "./SubCategoryStep";
import { RepairTypeStep } from "./RepairTypeStep";
import { MeasurementStep, MeasurementConfig } from "./MeasurementStep";
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
  pickupPhone?: string;
  pickupDate?: string;
  notes?: string;
  deliveryAddress?: string;
  deliveryAddressDetail?: string;
  deliveryZipcode?: string;
  deliveryPhone?: string;
  agreedToExtraCharge?: boolean;
  remoteAreaFee?: number;
}

type Mode = "list" | "addClothing" | "addPhoto" | "addSubCategory" | "addMeasurement" | "addRepair" | "pickup";

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
    pickupPhone: d.pickupPhone as string | undefined,
    pickupDate: d.pickupDate as string | undefined,
    notes: d.notes as string | undefined,
    deliveryAddress: d.deliveryAddress as string | undefined,
    deliveryAddressDetail: d.deliveryAddressDetail as string | undefined,
    deliveryZipcode: d.deliveryZipcode as string | undefined,
    deliveryPhone: d.deliveryPhone as string | undefined,
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

  // 이탈 다이얼로그 (pickup 단계에서 뒤로가기 시)
  const [showExitDialog, setShowExitDialog] = useState(false);
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

  // 모드 히스토리 스택 (뒤로가기 단순화)
  const modeHistoryRef = useRef<Mode[]>([]);

  // 자식 컴포넌트 내부 뒤로가기 핸들러 (subPartsView 등 내부 뷰가 열려있을 때)
  const childBackRef = useRef<(() => boolean) | null>(null);

  function pushMode(next: Mode) {
    modeHistoryRef.current.push(mode);
    setMode(next);
  }

  function popMode() {
    // 자식 컴포넌트에 내부 뒤로가기 상태가 있으면 먼저 처리
    if (childBackRef.current && childBackRef.current()) {
      return;
    }
    if (modeRef.current === "addClothing") {
      cancelAddClothing();
      return;
    }
    if (modeRef.current === "addMeasurement") {
      setMeasurementConfig(null);
    }
    const prev = modeHistoryRef.current.pop();
    if (prev != null) {
      if (prev === "addSubCategory") {
        setSubCategoryDirection("backward");
      }
      setMode(prev);
    } else {
      setMode("list");
    }
  }

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

  // ── 뒤로가기 처리: modu_before_navigate ─────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const currentMode = modeRef.current;

      if (currentMode === "pickup") {
        e.preventDefault();
        setShowExitDialog(true);
      } else if (currentMode === "list") {
        // list에서는 그냥 이전 페이지로 (가드 없음)
      } else {
        e.preventDefault();
        popMode();
      }
    };
    window.addEventListener("modu_before_navigate", handler);
    return () => window.removeEventListener("modu_before_navigate", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // ── 뒤로가기 처리: popstate ─────────────────────────────────────────────
  useEffect(() => {
    window.history.pushState({ orderFlowGuard: true }, "");

    const handler = () => {
      const currentMode = modeRef.current;

      if (currentMode === "pickup") {
        window.history.pushState({ orderFlowGuard: true }, "");
        setShowExitDialog(true);
      } else if (currentMode === "list") {
        // list에서는 브라우저 기본 동작 (이전 페이지로)
        if (popstateHandlerRef.current) {
          window.removeEventListener("popstate", popstateHandlerRef.current);
          popstateHandlerRef.current = null;
        }
      } else {
        window.history.pushState({ orderFlowGuard: true }, "");
        popMode();
      }
    };

    popstateHandlerRef.current = handler;
    window.addEventListener("popstate", handler);
    return () => {
      if (popstateHandlerRef.current) {
        window.removeEventListener("popstate", popstateHandlerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if (resumingCartId) {
        try { await removeCartItem(resumingCartId); } catch { /* ignore */ }
      }
    }
    setShowExitDialog(false);
    if (popstateHandlerRef.current) {
      window.removeEventListener("popstate", popstateHandlerRef.current);
      popstateHandlerRef.current = null;
    }
    router.push("/cart");
  }

  function handleExitWithoutSaving() {
    setShowExitDialog(false);
    if (popstateHandlerRef.current) {
      window.removeEventListener("popstate", popstateHandlerRef.current);
      popstateHandlerRef.current = null;
    }
    router.push("/");
  }

  // ── 의류 추가 sub-flow ──────────────────────────────────────────────────
  // 순서: 대카 → 소카(SubCategoryStep pre-photo) → 사진 →
  //       세부항목(SubCategoryStep post-photo) → 수선항목(RepairTypeStep)
  // 'pre': 사진 촬영 전 소카테고리 선택, 'post': 사진 촬영 후 세부항목 선택
  const [subCategoryPhase, setSubCategoryPhase] = useState<"pre" | "post">("pre");
  const [subCategoryDirection, setSubCategoryDirection] = useState<"forward" | "backward">("forward");

  function startAddClothing() {
    setStagingClothingType("");
    setStagingClothingCategoryId(undefined);
    setStagingImagesWithPins([]);
    setStagingRepairItems([]);
    setSubCategoryPhase("pre");
    setSubCategoryDirection("forward");
    modeHistoryRef.current = [];
    pushMode("addClothing");
  }

  function handleClothingDone(type: string, categoryId?: string) {
    setStagingClothingType(type);
    setStagingClothingCategoryId(categoryId);
    setSubCategoryPhase("pre");
    setSubCategoryDirection("forward");
    pushMode("addSubCategory");
  }

  function handlePhotoDone(imagesWithPins: ImageWithPins[]) {
    setStagingImagesWithPins(imagesWithPins);

    // 직접가격 카테고리인 경우 → POST SubCategoryStep 건너뛰고 바로 처리
    if (prePhaseSelection?.directPrice != null && prePhaseSelection.directPrice > 0) {
      if (prePhaseSelection.requiresMeasurement) {
        const labels: string[] = Array.isArray(prePhaseSelection.inputLabels)
          ? prePhaseSelection.inputLabels
          : ["치수 (cm)"];
        setMeasurementConfig({
          itemName: prePhaseSelection.name,
          labels,
          price: prePhaseSelection.directPrice,
          iconName: prePhaseSelection.iconName ?? undefined,
        });
        pushMode("addMeasurement");
      } else {
        const price = prePhaseSelection.directPrice;
        const priceRange = prePhaseSelection.priceRange || `${price.toLocaleString("ko-KR")}원`;
        const repairItem: RepairItem = {
          name: prePhaseSelection.name,
          price,
          priceRange,
          quantity: 1,
          detail: "",
        };
        handleRepairDone([repairItem]);
      }
      return;
    }

    // 일반 카테고리 → 세부항목 선택(SubCategoryStep post-photo)으로
    setSubCategoryPhase("post");
    setSubCategoryDirection("forward");
    pushMode("addSubCategory");
  }

  // PRE-photo 단계에서 선택한 카테고리 정보 (직접가격 leaf일 때 사용)
  const [prePhaseSelection, setPrePhaseSelection] = useState<SubCategorySelection | null>(null);

  // 치수 입력 단계 설정
  const [measurementConfig, setMeasurementConfig] = useState<MeasurementConfig | null>(null);

  function handleSubCategoryDone(type: string, categoryId?: string, selection?: SubCategorySelection) {
    if (type && categoryId) {
      setStagingClothingType(type);
      setStagingClothingCategoryId(categoryId);
    }

    if (subCategoryPhase === "pre") {
      setPrePhaseSelection(selection || null);
      pushMode("addPhoto");
    } else {
      const effectiveSelection = selection || ((!type && !categoryId) ? prePhaseSelection : null);

      if (effectiveSelection?.directPrice != null && effectiveSelection.directPrice > 0) {
        if (effectiveSelection.requiresMeasurement) {
          const labels: string[] = Array.isArray(effectiveSelection.inputLabels)
            ? effectiveSelection.inputLabels
            : ["치수 (cm)"];
          setMeasurementConfig({
            itemName: effectiveSelection.name,
            labels,
            price: effectiveSelection.directPrice,
            iconName: effectiveSelection.iconName ?? undefined,
          });
          pushMode("addMeasurement");
        } else {
          const price = effectiveSelection.directPrice;
          const priceRange = effectiveSelection.priceRange || `${price.toLocaleString("ko-KR")}원`;
          const repairItem: RepairItem = {
            name: effectiveSelection.name,
            price,
            priceRange,
            quantity: 1,
            detail: "",
          };
          handleRepairDone([repairItem]);
        }
      } else {
        pushMode("addRepair");
      }
    }
  }

  function handleMeasurementDone(values: string[]) {
    if (!measurementConfig) return;
    const sel = prePhaseSelection;
    const price = measurementConfig.price || sel?.directPrice || 0;
    const priceRange = sel?.priceRange || `${price.toLocaleString("ko-KR")}원`;
    const detail = measurementConfig.labels
      .map((label, i) => `${label}: ${values[i] || "-"}`)
      .join(", ");
    const repairItem: RepairItem = {
      name: measurementConfig.itemName,
      price,
      priceRange,
      quantity: 1,
      detail,
    };
    setMeasurementConfig(null);
    handleRepairDone([repairItem]);
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
    modeHistoryRef.current = [];
    setMode("list");
  }

  function cancelAddClothing() {
    setStagingClothingType("");
    setStagingClothingCategoryId(undefined);
    setStagingImagesWithPins([]);
    setStagingRepairItems([]);
    setSubCategoryPhase("pre");
    modeHistoryRef.current = [];
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
    pushMode("pickup");
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

  // ── 수거정보 완료 → 바로 결제 진행 ─────────────────────────────────────
  async function handlePickupDone(pickupData: Partial<OrderDraft>) {
    setIsProcessing(true);
    const finalDraft: OrderDraft = { ...draft, ...pickupData };
    try {
      const quoteRes = await fetch("/api/orders/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalDraft),
      });
      if (!quoteRes.ok) {
        const err = await quoteRes.json().catch(() => ({}));
        alert((err as { error?: string }).error || "주문 가격 계산에 실패했습니다.");
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
          return;
        }
        const { orderId } = await freeRes.json() as { orderId: string };
        router.push(`/orders/${orderId}?new=true`);
        return;
      }

      // 결제 페이지에서 장바구니 담기 옵션을 위해 draft 저장
      try { sessionStorage.setItem("payment_draft", JSON.stringify(finalDraft)); } catch { /* ignore */ }
      router.push(`/payment?intentId=${quote.intentId}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[결제] handlePickupDone 오류:", e);
      alert(`주문 처리 중 오류가 발생했습니다.\n${msg}`);
    } finally {
      setIsProcessing(false);
    }
  }


  // ── 헤더 표시 (sub-flow 인 경우) ───────────────────────────────────────
  // pickup 모드는 PickupStep 내부에 자체 헤더와 "이전" 버튼이 있어 별도 표시 안 함.
  const showSubHeader =
    mode === "addClothing" ||
    mode === "addPhoto" ||
    mode === "addSubCategory" ||
    mode === "addRepair" ||
    mode === "addMeasurement";


  return (
    <div>
      {showSubHeader && (
        <div className="flex items-center px-3 py-2 border-b border-gray-100">
          <button
            type="button"
            onClick={popMode}
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

        {mode === "addSubCategory" && (
          <SubCategoryStep
            parentCategoryId={stagingClothingCategoryId}
            parentCategoryName={stagingClothingType}
            onNext={handleSubCategoryDone}
            direction={subCategoryDirection}
            onBack={popMode}
          />
        )}

        {mode === "addPhoto" && (
          <ImagePinStep
            clothingType={stagingClothingType}
            initialImages={stagingImagesWithPins}
            onNext={handlePhotoDone}
            onBack={popMode}
          />
        )}

        {mode === "addMeasurement" && measurementConfig && (
          <MeasurementStep
            config={measurementConfig}
            onConfirm={handleMeasurementDone}
            onBack={popMode}
          />
        )}

        {mode === "addRepair" && (
          <RepairTypeStep
            clothingType={stagingClothingType}
            clothingCategoryId={stagingClothingCategoryId}
            onNext={(items) => handleRepairDone(items)}
            onBack={popMode}
            childBackRef={childBackRef}
          />
        )}

        {mode === "pickup" && (
          <PickupStep
            draft={draft}
            onNext={handlePickupDone}
            onBack={() => setShowExitDialog(true)}
          />
        )}
      </div>


      {/* ── 이탈 다이얼로그 (결제 직전 뒤로가기 시) ── */}
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
              결제를 중단하시겠어요?
            </p>
            <p className="text-sm text-gray-500 mb-5">
              장바구니에 담아두면 나중에 이어서 결제할 수 있습니다.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowExitDialog(false)}
                className="w-full py-3.5 bg-[#00C896] text-white text-sm font-bold rounded-xl active:opacity-80"
              >
                계속 결제하기
              </button>
              <button
                onClick={handleExitSaveToCart}
                disabled={draft.items.length === 0}
                className="w-full py-3.5 border border-[#00C896] text-[#00C896] text-sm font-bold rounded-xl active:bg-[#00C896]/5 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                장바구니에 담기
              </button>
              <button
                onClick={handleExitWithoutSaving}
                className="w-full py-3 text-gray-400 text-sm font-medium active:opacity-70"
              >
                홈으로 나가기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
