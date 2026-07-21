"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, X, Minus, Plus, Trash2, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { RepairItem } from "./OrderNewClient";
import { InlineSvg } from "@/components/ui/inline-svg";
import { createClient } from "@/lib/supabase/client";
import { MeasureGuideAccordion } from "@/components/guide/MeasureGuideAccordion";
import { MeasureGuideSideWidget } from "@/components/guide/MeasureGuideSideWidget";
import { resolveMeasureGuideId } from "@/lib/measure-guide";

interface RepairType {
  id: string;
  name: string;
  sub_type?: string;
  price: number;
  price_range?: string;
  description?: string;
  icon_name?: string;
  category_id?: string;
  requires_measurement: boolean;
  has_sub_parts: boolean;
  allow_multiple_sub_parts: boolean;
  show_all_option: boolean;
  all_option_price?: number | null;
  sub_parts_title?: string;
  requires_multiple_inputs: boolean;
  // DB?ì„œ string ?ëŠ” string[] ëª¨ë‘ ê°€??
  input_labels?: string | string[];
  input_count?: number;
  measure_guide_key?: string | null;
}

interface SubPart {
  id: string;
  name: string;
  price: number;
  icon_name?: string;
}

interface SelectedItem {
  id: string;
  name: string;
  price: number;
  priceRange: string;
  quantity: number;
  detail: string;
}

interface RepairTypeStepProps {
  clothingType: string;
  clothingCategoryId?: string;
  onNext: (items: RepairItem[]) => void;
  onBack: () => void;
  childBackRef?: React.MutableRefObject<(() => boolean) | null>;
}

function formatPrice(price: number) {
  return `${price.toLocaleString("ko-KR")}??;
}


function getIconSrc(iconName?: string): string | null {
  if (!iconName) return null;
  if (iconName.startsWith("http")) return iconName;
  return `/icons/${iconName.toLowerCase().replace(/\.svg$/, "")}.svg`;
}

export function RepairTypeStep({
  clothingType,
  clothingCategoryId,
  onNext,
  onBack,
  childBackRef,
}: RepairTypeStepProps) {
  const [repairTypes, setRepairTypes] = useState<RepairType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [subPartsLoading, setSubPartsLoading] = useState(false);
  const [categoryIconName, setCategoryIconName] = useState<string | null>(null);
  const [categoryMeasureGuideKey, setCategoryMeasureGuideKey] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(false);

  // ?¸ë? ë¶€???¸ë¼??ë·??íƒœ (ëª¨ë‹¬ ?€???”ë©´ ?„í™˜)
  const [subPartsView, setSubPartsView] = useState<{
    repairType: RepairType;
    subParts: SubPart[];
    selectedMode: "all" | "specific";
    selectedIds: Set<string>;
  } | null>(null);
  // ?ë™?¼ë¡œ ?´ë¦° ê²½ìš° (repair type???˜ë‚˜ë¿ì¼ ?? ?¤ë¡œê°€ê¸°ì‹œ ?´ì „ ?¨ê³„ë¡?
  const [autoOpenedSubParts, setAutoOpenedSubParts] = useState(false);

  // ì¹˜ìˆ˜ ?…ë ¥ ë·?(?¸ë¼???€?˜ì´ì§€)
  const [measureView, setMeasureView] = useState<{
    repairType: RepairType;
    chosenParts?: SubPart[];
    overridePrice?: number;
  } | null>(null);
  const [measureValues, setMeasureValues] = useState<string[]>([]);

  function openMeasureView(repairType: RepairType, chosenParts?: SubPart[], overridePrice?: number) {
    const labels = getInputLabels(repairType);
    const groups = chosenParts && chosenParts.length > 0 ? chosenParts.length : 1;
    setMeasureValues(Array.from({ length: labels.length * groups }, () => ""));
    setMeasureView({ repairType, chosenParts, overridePrice });
  }

  const scrollRef = useRef<HTMLDivElement>(null);

  // ë¶€ëª¨ì—ê²??´ë? ?¤ë¡œê°€ê¸??¸ë“¤???±ë¡
  useEffect(() => {
    if (!childBackRef) return;
    childBackRef.current = () => {
      if (measureView) {
        setMeasureView(null);
        // ?¸ë? ë¶€???”ë©´???¨ì•„ ?ˆìœ¼ë©?ê·¸ìª½?¼ë¡œ ë³µê?
        if (subPartsView) return true;
        // ?˜ì„  ??ª©??1ê°œë¿?´ë©´ ?˜ë? ?†ëŠ” ê·¸ë¦¬???€???´ì „ ?¨ê³„ë¡?
        if (repairTypes.length <= 1) return false;
        return true;
      }
      if (subPartsView) {
        if (autoOpenedSubParts) {
          // ?ë™?¼ë¡œ ?´ë¦° ê²½ìš° ???´ì „ ?¨ê³„ë¡??Œì•„ê°€ê¸?(ë¶€ëª¨ì˜ popMode ?¸ì¶œ)
          return false;
        }
        setSubPartsView(null);
        return true;
      }
      // ?˜ì„  ??ª© 1ê°œë§Œ ?ˆëŠ” ê·¸ë¦¬?œëŠ” ê±´ë„ˆ?°ê³  ?´ì „ ?¨ê³„ë¡?
      if (repairTypes.length <= 1) return false;
      return false;
    };
    return () => { childBackRef.current = null; };
  });

  // ?˜ì„  ??ª©??1ê°œë¿?´ê³  ? íƒ ?„ë£Œ ???ë™?¼ë¡œ ?¤ìŒ ?¨ê³„ ì§„í–‰
  const autoProceededRef = useRef(false);
  useEffect(() => {
    if (
      repairTypes.length === 1 &&
      selectedItems.length > 0 &&
      !measureView &&
      !subPartsView &&
      !isLoading &&
      !autoProceededRef.current
    ) {
      autoProceededRef.current = true;
      onNext(
        selectedItems.map((i) => ({
          name: i.name,
          price: i.price,
          priceRange: i.priceRange,
          quantity: i.quantity,
          detail: i.detail,
        }))
      );
    }
  }, [selectedItems, repairTypes, measureView, subPartsView, isLoading, onNext]);

  useEffect(() => {
    loadRepairTypes();
    loadCategoryIcon();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clothingType, clothingCategoryId]);

  async function loadCategoryIcon() {
    if (!clothingCategoryId) {
      setCategoryIconName(null);
      setCategoryMeasureGuideKey(null);
      return;
    }
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("repair_categories")
        .select("icon_name, measure_guide_key")
        .eq("id", clothingCategoryId)
        .single();
      setCategoryIconName(data?.icon_name ?? null);
      setCategoryMeasureGuideKey((data as { measure_guide_key?: string | null } | null)?.measure_guide_key ?? null);
    } catch {
      setCategoryIconName(null);
      setCategoryMeasureGuideKey(null);
    }
  }

  async function loadRepairTypes() {
    try {
      setIsLoading(true);
      setLoadError(false);

      const params = new URLSearchParams();
      if (clothingCategoryId) params.set("category_id", clothingCategoryId);

      const res = await fetch(`/api/repair-types?${params.toString()}`);
      const json = await res.json();

      const items: RepairType[] = json.data ?? [];

      const mapped = items.map((d) => ({
        id: d.id,
        name: d.name,
        sub_type: d.sub_type ?? undefined,
        price: d.price ?? 0,
        price_range: d.price_range ?? (d.price ? formatPrice(d.price) : ""),
        description: d.description ?? undefined,
        icon_name: d.icon_name ?? undefined,
        category_id: d.category_id,
        requires_measurement: d.requires_measurement ?? false,
        has_sub_parts: d.has_sub_parts ?? false,
        allow_multiple_sub_parts: d.allow_multiple_sub_parts ?? true,
        show_all_option: d.show_all_option !== false,
        all_option_price: d.all_option_price ?? null,
        sub_parts_title: d.sub_parts_title ?? undefined,
        requires_multiple_inputs: d.requires_multiple_inputs ?? false,
        input_labels: d.input_labels ?? "ì¹˜ìˆ˜ (cm)",
        input_count: d.input_count ?? 1,
        measure_guide_key: d.measure_guide_key ?? null,
      }));

      // has_sub_parts????ª©???˜ë‚˜ë¿ì´ë©?ë°”ë¡œ ?¸ë? ë¶€??ë·°ë¡œ ì§„ì… (ì¤‘ê°„ ëª©ë¡ ?ëµ)
      const subPartsTypes = mapped.filter((t) => t.has_sub_parts);
      setRepairTypes(mapped);

      if (subPartsTypes.length === 1 && mapped.length === 1) {
        setAutoOpenedSubParts(true);
        await openSubPartsView(subPartsTypes[0]);
        setIsLoading(false);
      } else if (mapped.length === 1 && !mapped[0].has_sub_parts) {
        // ?˜ì„  ??ª©??1ê°œë¿?´ë©´ ?ë™ ? íƒ ??ë°”ë¡œ ?¤ìŒ ?¨ê³„ë¡?
        const single = mapped[0];
        if (single.requires_measurement) {
          setAutoOpenedSubParts(false);
          setIsLoading(false);
          handleTapRepairType(single);
        } else {
          addSimpleItem(single);
          setIsLoading(false);
          onNext([{
            name: single.sub_type ? `${single.name} (${single.sub_type})` : single.name,
            price: single.price,
            priceRange: single.price_range || formatPrice(single.price),
            quantity: 1,
            detail: "",
          }]);
        }
      } else {
        setAutoOpenedSubParts(false);
        setIsLoading(false);
      }
    } catch {
      setLoadError(true);
      setIsLoading(false);
    }
  }

  // input_labelsë¥?string[] ë¡??•ê·œ??
  function getInputLabels(type: RepairType): string[] {
    const count = type.input_count ?? 1;
    if (Array.isArray(type.input_labels)) return type.input_labels;
    if (typeof type.input_labels === "string" && type.input_labels) {
      if (count <= 1) return [type.input_labels];
      const parts = type.input_labels.split(/(?<=\))\s+(?=\S)/);
      if (parts.length >= count) return parts.slice(0, count);
      return Array.from({ length: count }, (_, i) => `ì¹˜ìˆ˜ ${i + 1} (cm)`);
    }
    return Array.from({ length: count }, () => "ì¹˜ìˆ˜ (cm)");
  }

  // ??ª© ????ë¶„ê¸° ì²˜ë¦¬
  async function handleTapRepairType(type: RepairType) {
    // ?´ë? ? íƒ??ê²½ìš° ??? íƒ ?´ì œ
    if (selectedItems.some((i) => i.id === type.id || i.id.startsWith(`${type.id}_`))) {
      setSelectedItems((prev) =>
        prev.filter((i) => i.id !== type.id && !i.id.startsWith(`${type.id}_`))
      );
      return;
    }

    if (type.has_sub_parts) {
      await openSubPartsView(type);
    } else if (type.requires_measurement) {
      openMeasureView(type);
    } else {
      addSimpleItem(type);
    }
  }

  function addSimpleItem(type: RepairType, detail?: string, overridePrice?: number) {
    const effectivePrice = overridePrice ?? type.price;
    setSelectedItems((prev) => [
      ...prev,
      {
        id: type.id,
        name: type.sub_type ? `${type.name} (${type.sub_type})` : type.name,
        price: effectivePrice,
        priceRange: type.price_range || formatPrice(effectivePrice),
        quantity: 1,
        detail: detail ?? "",
      },
    ]);
  }

  async function openSubPartsView(type: RepairType) {
    setSubPartsLoading(true);
    try {
      const res = await fetch(`/api/repair-sub-parts?repair_type_id=${type.id}`);
      const json = await res.json();
      const subParts: SubPart[] = json.data ?? [];

      if (subParts.length === 0) {
        if (type.requires_measurement) {
          openMeasureView(type);
        } else {
          addSimpleItem(type);
        }
        return;
      }

      setSubPartsView({
        repairType: type,
        subParts,
        selectedMode: type.show_all_option ? "all" : "specific",
        selectedIds: new Set(),
      });
    } catch {
      addSimpleItem(type);
    } finally {
      setSubPartsLoading(false);
    }
  }

  function toggleSubPartInView(subPartId: string) {
    if (!subPartsView) return;
    const { allow_multiple_sub_parts } = subPartsView.repairType;

    setSubPartsView((prev) => {
      if (!prev) return prev;
      const next = new Set(prev.selectedIds);
      if (allow_multiple_sub_parts) {
        next.has(subPartId) ? next.delete(subPartId) : next.add(subPartId);
      } else {
        next.clear();
        next.add(subPartId);
      }
      return { ...prev, selectedIds: next };
    });
  }

  // ?¸ë¼???¸ë? ë¶€??ë·?"?•ì¸" ì²˜ë¦¬
  function confirmInlineSubParts() {
    if (!subPartsView) return;
    const { repairType, subParts, selectedMode, selectedIds } = subPartsView;

    if (selectedMode === "all") {
      const allPrice = repairType.all_option_price ?? repairType.price;
      if (repairType.requires_measurement) {
        // ì¹˜ìˆ˜ ?…ë ¥?¼ë¡œ ?´ë™ ???¤ë¡œê°€ê¸????¸ë? ë¶€???”ë©´?¼ë¡œ ë³µê??˜ë„ë¡?subPartsView ? ì?
        openMeasureView(repairType, [], allPrice);
      } else {
        setSubPartsView(null);
        addSimpleItem(repairType, undefined, allPrice);
      }
      return;
    }

    // ?¹ì • ë¶€??? íƒ
    const chosenParts = subParts.filter((p) => selectedIds.has(p.id));
    if (chosenParts.length === 0) return;

    if (repairType.requires_measurement) {
      // ì¹˜ìˆ˜ ?…ë ¥?¼ë¡œ ?´ë™ ???¤ë¡œê°€ê¸????¸ë? ë¶€???”ë©´?¼ë¡œ ë³µê??˜ë„ë¡?subPartsView ? ì?
      openMeasureView(repairType, chosenParts);
      return;
    }

    setSubPartsView(null);
    const newItems: SelectedItem[] = chosenParts.map((part) => ({
      id: `${repairType.id}_${part.id}`,
      name: `${repairType.name} - ${part.name}`,
      price: part.price > 0 ? part.price : repairType.price,
      priceRange: formatPrice(part.price > 0 ? part.price : repairType.price),
      quantity: 1,
      detail: "",
    }));
    setSelectedItems((prev) => [...prev, ...newItems]);
  }

  function confirmMeasurement(values: string[]) {
    if (!measureView) return;
    const { repairType, chosenParts, overridePrice } = measureView;
    const labels = getInputLabels(repairType);

    if (!chosenParts || chosenParts.length === 0) {
      const detail = labels
        .map((label, i) => `${label}: ${values[i] || "-"}`)
        .join(", ");
      addSimpleItem(repairType, detail, overridePrice);
      setMeasureView(null);
      setSubPartsView(null);
      return;
    }

    const newItems: SelectedItem[] = chosenParts.map((part, partIdx) => {
      const detail = labels
        .map((label, i) => {
          const v = values[partIdx * labels.length + i];
          return `${label}: ${v || "-"}`;
        })
        .join(", ");
      return {
        id: `${repairType.id}_${part.id}`,
        name: `${repairType.name} - ${part.name}`,
        price: part.price > 0 ? part.price : repairType.price,
        priceRange: formatPrice(part.price > 0 ? part.price : repairType.price),
        quantity: 1,
        detail,
      };
    });
    setSelectedItems((prev) => [...prev, ...newItems]);
    setMeasureView(null);
    setSubPartsView(null);
  }

  function updateQuantity(id: string, delta: number) {
    setSelectedItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i
      )
    );
  }

  function updateDetail(id: string, detail: string) {
    setSelectedItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, detail } : i))
    );
  }

  function removeItem(id: string) {
    setSelectedItems((prev) => prev.filter((i) => i.id !== id));
  }

  function isRepairTypeActive(type: RepairType) {
    return selectedItems.some(
      (i) => i.id === type.id || i.id.startsWith(`${type.id}_`)
    );
  }

  // ?€?€ ?¸ë? ë¶€???¸ë¼??ë·?(ì¹˜ìˆ˜ ?…ë ¥???´ë ¤ ?ˆìœ¼ë©?ì¹˜ìˆ˜ ?”ë©´ ?°ì„ ) ?€?€?€?€?€?€?€?€?€
  if (subPartsView && !measureView) {
    const { repairType, subParts, selectedMode, selectedIds } = subPartsView;
    const rtIconSrc = getIconSrc(repairType.icon_name);
    const selectionLabel =
      repairType.sub_parts_title || "?¸ë? ë¶€?„ë? ? íƒ?´ì£¼?¸ìš”";
    const canConfirm =
      selectedMode === "all" || (selectedMode === "specific" && selectedIds.size > 0);

    return (
      <div className="flex flex-col min-h-0">
        {/* ?¤ë” */}
        <div className="px-4 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {selectionLabel}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {/* ? íƒ???˜ì„  ??ª© ì¹´ë“œ - ?Œì¹´?Œê³ ë¦??´ë¦„/?„ì´ì½??°ì„  ?œì‹œ */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
            {(() => {
              const iconSrc = getIconSrc(categoryIconName ?? undefined) || rtIconSrc;
              if (iconSrc) {
                return (
                  <div className="w-10 h-10 rounded-xl bg-[#00C896]/10 flex items-center justify-center shrink-0">
                    {iconSrc.startsWith("http") ? (
                      <img src={iconSrc} alt={clothingType || repairType.name} className="w-7 h-7 object-contain" />
                    ) : (
                      <InlineSvg
                        src={iconSrc}
                        className="w-7 h-7 flex items-center justify-center text-[#00C896] [&>svg]:w-full [&>svg]:h-full"
                      />
                    )}
                  </div>
                );
              }
              return null;
            })()}
            <span className="text-sm font-semibold text-gray-800">
              {clothingType || (repairType.sub_type
                ? `${repairType.name} (${repairType.sub_type})`
                : repairType.name)}
            </span>
          </div>

          {/* ?„ì²´ / ?¹ì • ë¶€??? íƒ ?¼ë””??*/}
          <div>
            {repairType.show_all_option && (
              <p className="text-sm font-semibold text-gray-700 mb-3">
                ?˜ì„  ë²”ìœ„ë¥?? íƒ?´ì£¼?¸ìš”
              </p>
            )}
            {repairType.show_all_option ? (
              <div className="flex gap-3">
                <button
                  onClick={() =>
                    setSubPartsView((prev) =>
                      prev ? { ...prev, selectedMode: "all", selectedIds: new Set() } : prev
                    )
                  }
                  className={cn(
                    "flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all",
                    selectedMode === "all"
                      ? "border-[#00C896] bg-[#00C896]/5 text-[#00C896]"
                      : "border-gray-200 text-gray-600"
                  )}
                >
                  <div
                    className={cn(
                      "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                      selectedMode === "all"
                        ? "border-[#00C896]"
                        : "border-gray-400"
                    )}
                  >
                    {selectedMode === "all" && (
                      <div className="w-2 h-2 rounded-full bg-[#00C896]" />
                    )}
                  </div>
                  ?„ì²´
                </button>
                <button
                  onClick={() =>
                    setSubPartsView((prev) =>
                      prev ? { ...prev, selectedMode: "specific" } : prev
                    )
                  }
                  className={cn(
                    "flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all",
                    selectedMode === "specific"
                      ? "border-[#00C896] bg-[#00C896]/5 text-[#00C896]"
                      : "border-gray-200 text-gray-600"
                  )}
                >
                  <div
                    className={cn(
                      "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                      selectedMode === "specific"
                        ? "border-[#00C896]"
                        : "border-gray-400"
                    )}
                  >
                    {selectedMode === "specific" && (
                      <div className="w-2 h-2 rounded-full bg-[#00C896]" />
                    )}
                  </div>
                  ?¹ì • ë¶€??? íƒ
                </button>
              </div>
            ) : null}
          </div>

          {/* ?¸ë? ë¶€??ì¹´ë“œ ê·¸ë¦¬??(?¹ì • ë¶€??? íƒ ?? */}
          {selectedMode === "specific" && (
            <div>
              {repairType.show_all_option && (
                <p className="text-xs text-gray-500 mb-3">
                  {selectionLabel}
                  {repairType.allow_multiple_sub_parts ? " (?¤ì¤‘ ? íƒ ê°€??" : ""}
                </p>
              )}
              {!repairType.show_all_option && repairType.allow_multiple_sub_parts && (
                <p className="text-xs text-gray-500 mb-3">ë³µìˆ˜ ? íƒ ê°€??/p>
              )}
              <div className="grid grid-cols-3 gap-3">
                {subParts.map((part) => {
                  const isSelected = selectedIds.has(part.id);
                  const partIconSrc = getIconSrc(part.icon_name);
                  return (
                    <button
                      key={part.id}
                      onClick={() => toggleSubPartInView(part.id)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                        isSelected
                          ? "border-[#00C896] bg-[#00C896]/5"
                          : "border-gray-100 bg-gray-50"
                      )}
                    >
                      <div
                        className={cn(
                          "w-24 h-24 rounded-lg flex items-center justify-center overflow-hidden",
                          isSelected ? "bg-[#00C896]" : "bg-[#00C896]/10"
                        )}
                      >
                        {isSelected ? (
                          <svg
                            className="w-8 h-8 text-white"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <path
                              d="M5 13l4 4L19 7"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ) : partIconSrc ? (
                          partIconSrc.startsWith("http") ? (
                            <img src={partIconSrc} alt={part.name} className="w-full h-full object-contain p-1" />
                          ) : (
                            <InlineSvg
                              src={partIconSrc}
                              className="w-full h-full flex items-center justify-center text-[#00C896] p-1 [&>svg]:w-full [&>svg]:h-full"
                            />
                          )
                        ) : null}
                      </div>
                      <p
                        className={cn(
                          "text-xs font-semibold text-center leading-tight",
                          isSelected ? "text-[#00C896]" : "text-gray-700"
                        )}
                      >
                        {part.name}
                      </p>
                      {part.price > 0 && (
                        <p className="text-xs text-gray-400">
                          {formatPrice(part.price)}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ?¤ëª… ?¸íŠ¸ */}
          {repairType.description && (
            <p className="text-xs text-gray-500 leading-relaxed">
              * {repairType.description}
            </p>
          )}
        </div>

        {/* ?˜ë‹¨ ?•ì¸ ë²„íŠ¼ */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-3 flex gap-2">
          <button
            onClick={confirmInlineSubParts}
            disabled={!canConfirm}
            className={cn(
              "touch-target flex-1 py-4 rounded-xl text-sm font-bold transition-colors",
              canConfirm
                ? "bg-[#00C896] text-white"
                : "bg-gray-100 text-gray-400"
            )}
          >
            {selectedMode === "all"
              ? "?„ì²´ ? íƒ?¼ë¡œ ?•ì¸"
              : selectedIds.size > 0
              ? `${selectedIds.size}ê°?? íƒ ?•ì¸`
              : "ë¶€?„ë? ? íƒ?´ì£¼?¸ìš”"}
          </button>
        </div>
      </div>
    );
  }

  // ?€?€ ì¹˜ìˆ˜ ?…ë ¥ ?¸ë¼??ë·??€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
  if (measureView) {
    const { repairType, chosenParts } = measureView;
    const labels = getInputLabels(repairType);
    const effectiveGroups = chosenParts && chosenParts.length > 0
      ? chosenParts.map((p) => ({ key: p.id, title: p.name }))
      : [{ key: "_single", title: "" }];
    const hasAnyValue = measureValues.some((v) => v.trim() !== "");
    const guideTypeId = resolveMeasureGuideId(
      [
        clothingType,
        repairType.name,
        repairType.sub_type,
        ...(chosenParts?.map((p) => p.name) ?? []),
      ]
        .filter(Boolean)
        .join(" "),
      {
        measureGuideKey:
          repairType.measure_guide_key || categoryMeasureGuideKey,
        clothingHint: clothingType,
      }
    );

    return (
      <div className="flex flex-col min-h-0">
        {/* PC: ?¼ìª½ ?¬ì´???„ì ¯ */}
        <MeasureGuideSideWidget initialTypeId={guideTypeId} />

        <div className="px-4 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">ì¹˜ìˆ˜ë¥??…ë ¥?´ì£¼?¸ìš”</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {/* ? íƒ????ª© ì¹´ë“œ - ?Œì¹´?Œê³ ë¦??´ë¦„/?„ì´ì½??°ì„  ?œì‹œ */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-[#00C896]/10 flex items-center justify-center shrink-0">
              {(() => {
                const iconSrc = getIconSrc(categoryIconName ?? undefined) || getIconSrc(repairType.icon_name);
                if (iconSrc) {
                  return iconSrc.startsWith("http") ? (
                    <img src={iconSrc} alt={clothingType || repairType.name} className="w-7 h-7 object-contain" />
                  ) : (
                    <InlineSvg
                      src={iconSrc}
                      className="w-7 h-7 flex items-center justify-center text-[#00C896] [&>svg]:w-full [&>svg]:h-full"
                    />
                  );
                }
                const displayName = clothingType || repairType.name;
                return (
                  <span className="text-[#00C896] text-lg font-bold">
                    {displayName.charAt(0)}
                  </span>
                );
              })()}
            </div>
            <div className="flex-1">
              <span className="text-sm font-semibold text-gray-800">
                {clothingType || (repairType.sub_type
                  ? `${repairType.name} (${repairType.sub_type})`
                  : repairType.name)}
              </span>
              {(measureView.overridePrice ?? repairType.price) > 0 && (
                <p className="text-xs text-[#00C896]">{formatPrice(measureView.overridePrice ?? repairType.price)}</p>
              )}
            </div>
          </div>

          {/* ?…ë ¥ ?„ë“œ */}
          {effectiveGroups.map((group, gIdx) => (
            <div key={group.key} className="space-y-3">
              {group.title && (
                <p className="text-xs font-bold text-[#00C896]">{group.title}</p>
              )}
              {labels.map((label, lIdx) => {
                const idx = gIdx * labels.length + lIdx;
                return (
                  <div key={lIdx}>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      {label}
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="?? 30"
                      value={measureValues[idx] || ""}
                      onChange={(e) => {
                        const next = [...measureValues];
                        next[idx] = e.target.value;
                        setMeasureValues(next);
                      }}
                      className="w-full px-4 py-3.5 border-2 border-gray-100 rounded-xl text-base outline-none focus:border-[#00C896] transition-colors"
                    />
                  </div>
                );
              })}
            </div>
          ))}

          {/* ëª¨ë°”???œë¸”ë¦? ?”ë©´ ???„ì½”?”ì–¸ (PC???¬ì´???„ì ¯) */}
          <div className="lg:hidden">
            <MeasureGuideAccordion initialTypeId={guideTypeId} defaultOpen />
          </div>
        </div>

        {/* ?˜ë‹¨ ë²„íŠ¼ */}
        <div className="px-4 py-4 border-t border-gray-50 flex gap-3">
          <button
            onClick={() => {
              setMeasureView(null);
              // ?¸ë? ë¶€?„ê? ?†ìœ¼ë©? ??ª© 1ê°œì§œë¦?ê·¸ë¦¬???€???´ì „ ?¨ê³„ë¡?
              if (!subPartsView && repairTypes.length <= 1) {
                onBack();
              }
            }}
            className="touch-target flex-1 py-3.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500"
          >
            ?´ì „
          </button>
          <button
            onClick={() => confirmMeasurement(measureValues)}
            disabled={!hasAnyValue}
            className="touch-target flex-[2] py-3.5 rounded-xl bg-[#00C896] text-white text-sm font-bold disabled:opacity-40 transition-opacity"
          >
            ?•ì¸
          </button>
        </div>
      </div>
    );
  }

  // ?€?€ ë©”ì¸ ê·¸ë¦¬??ë·??€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
  return (
    <div className="relative">
      {/* ?¤ë” */}
      <div className="px-4 py-4 border-b border-gray-100">
        {clothingType && (
          <div className="flex items-center gap-2 mb-3">
            <div className="inline-flex items-center gap-2 px-5 py-3 bg-[#00C896]/10 rounded-2xl border border-[#00C896]/20">
              {categoryIconName && (() => {
                const src = getIconSrc(categoryIconName);
                return src ? (
                  src.startsWith("http") ? (
                    <img src={src} alt={clothingType} className="w-7 h-7 object-contain" />
                  ) : (
                    <InlineSvg
                      src={src}
                      className="w-7 h-7 flex items-center justify-center text-[#00C896] [&>svg]:w-full [&>svg]:h-full"
                    />
                  )
                ) : null;
              })()}
              <span className="text-lg font-bold text-[#00C896]">
                {clothingType}
              </span>
            </div>
          </div>
        )}
        <h2 className="text-lg font-bold text-gray-900">
          {clothingType ? "?ì„¸ ?˜ì„  ë¶€?„ë? ? íƒ?´ì£¼?¸ìš”" : "?˜ì„  ??ª©??? íƒ?´ì£¼?¸ìš”"}
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">ë³µìˆ˜ ? íƒ ê°€??/p>
      </div>

      {/* ? íƒ????ª© */}
      {selectedItems.length > 0 && (
        <div className="px-4 py-3 bg-[#00C896]/5 border-b border-[#00C896]/10">
          <p className="text-xs font-bold text-[#00C896] mb-2">? íƒ????ª©</p>
          <div className="space-y-2">
            {selectedItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl p-3 border border-[#00C896]/20"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-800 flex-1 mr-2">
                    {item.name}
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center"
                    >
                      <Minus className="w-3 h-3 text-gray-600" />
                    </button>
                    <span className="text-sm font-bold w-5 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center"
                    >
                      <Plus className="w-3 h-3 text-gray-600" />
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="ml-1 text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {item.priceRange && (
                  <p className="text-xs text-gray-400 mt-0.5">{item.priceRange}</p>
                )}
                {item.detail && (
                  <p className="text-xs text-[#00C896] mt-0.5">{item.detail}</p>
                )}
                <input
                  type="text"
                  placeholder="?ì„¸ ?”ì²­?¬í•­ (? íƒ)"
                  value={item.detail}
                  onChange={(e) => updateDetail(item.id, e.target.value)}
                  className="mt-2 w-full text-xs border border-gray-100 rounded-lg px-2.5 py-2 outline-none focus:border-[#00C896]"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ?˜ì„  ì¢…ë¥˜ ê·¸ë¦¬??*/}
      <div className="px-4 py-3">
        {isLoading ? (
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : loadError ? (
          <div className="text-center py-10">
            <p className="text-sm text-gray-400 mb-3">?˜ì„  ??ª©??ë¶ˆëŸ¬?¤ì? ëª»í–ˆ?µë‹ˆ??/p>
            <button
              onClick={loadRepairTypes}
              className="text-sm text-[#00C896] font-semibold"
            >
              ?¤ì‹œ ?œë„
            </button>
          </div>
        ) : repairTypes.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">?˜ì„  ??ª©???†ìŠµ?ˆë‹¤</p>
        ) : selectedItems.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowGrid(true)}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-[#00C896] text-[#00C896] rounded-2xl text-sm font-bold active:bg-[#00C896]/5",
              showGrid && "hidden"
            )}
          >
            <Plus className="w-4 h-4" />
            ?˜ì„  ??ª© ì¶”ê?
          </button>
        ) : null}

        {!isLoading && !loadError && repairTypes.length > 0 && (selectedItems.length === 0 || showGrid) && (
          <>
            {selectedItems.length > 0 && (
              <p className="text-xs text-gray-500 mb-3">ì¶”ê?????ª©??? íƒ?´ì£¼?¸ìš”</p>
            )}
            <div className="grid grid-cols-3 gap-3">
              {repairTypes.map((type) => {
                const active = isRepairTypeActive(type);
                const displayName = type.sub_type
                  ? `${type.name} (${type.sub_type})`
                  : type.name;

                return (
                  <button
                    key={type.id}
                    onClick={() => handleTapRepairType(type)}
                    disabled={subPartsLoading}
                    className={cn(
                      "relative flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border-2 transition-all text-center min-h-[110px]",
                      active
                        ? "border-[#00C896] bg-[#00C896]/5"
                        : "border-gray-100 bg-white"
                    )}
                  >
                    {/* ?´ë¦„ */}
                    <p
                      className={cn(
                        "text-sm font-bold leading-tight",
                        active ? "text-[#00C896]" : "text-gray-800"
                      )}
                    >
                      {displayName}
                    </p>

                    {/* ?¸ë???ª©/ì¹˜ìˆ˜ ?ˆìŒ ?œì‹œ */}
                    {(type.has_sub_parts || type.requires_measurement) && !active && (
                      <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    )}

                    {/* ? íƒ ?„ë£Œ ì²´í¬ */}
                    {active && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#00C896] flex items-center justify-center">
                        <svg
                          className="w-3 h-3 text-white"
                          viewBox="0 0 12 12"
                          fill="currentColor"
                        >
                          <path
                            d="M2 6l3 3 5-5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            fill="none"
                          />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ?˜ë‹¨ ë²„íŠ¼ */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-3">
        <button
          onClick={() =>
            onNext(
              selectedItems.map((i) => ({
                name: i.name,
                price: i.price,
                priceRange: i.priceRange,
                quantity: i.quantity,
                detail: i.detail,
              }))
            )
          }
          disabled={selectedItems.length === 0}
          className="btn-brand w-full py-4"
        >
          {selectedItems.length > 0
            ? `${selectedItems.length}ê°?? íƒ ???¤ìŒ`
            : "?˜ì„  ??ª©??? íƒ?´ì£¼?¸ìš”"}
        </button>
      </div>

    </div>
  );
}
