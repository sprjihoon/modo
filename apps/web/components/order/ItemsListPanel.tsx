"use client";

import { Plus, ChevronRight, ShoppingCart } from "lucide-react";
import type { ClothingItem } from "./OrderNewClient";
import { ClothingItemCard } from "./ClothingItemCard";

interface Props {
  items: ClothingItem[];
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onProceedToPickup: () => void;
  onSaveToCart: () => void;
}

function formatPrice(n: number) {
  return `${n.toLocaleString("ko-KR")}원`;
}

export function ItemsListPanel({
  items,
  onAddItem,
  onRemoveItem,
  onProceedToPickup,
  onSaveToCart,
}: Props) {
  const totalRepairItems = items.reduce(
    (sum, it) => sum + it.repairItems.length,
    0
  );
  const totalRepairPrice = items.reduce(
    (sum, it) =>
      sum +
      it.repairItems.reduce(
        (s, r) => s + (r.price ?? 0) * (r.quantity ?? 1),
        0
      ),
    0
  );

  return (
    <div>
      <div className="px-4 py-4 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-900">수선할 의류를 담아주세요</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          여러 벌을 한 번에 신청할 수 있습니다.
        </p>
      </div>

      <div className="px-4 py-4 space-y-3">
        {items.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-2xl py-10 px-4 text-center">
            <p className="text-sm text-gray-500">
              아직 의류가 추가되지 않았어요.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              아래 <span className="font-semibold text-[#00C896]">+ 의류 추가</span>{" "}
              버튼으로 시작하세요.
            </p>
          </div>
        ) : (
          items.map((it, idx) => (
            <ClothingItemCard
              key={idx}
              index={idx}
              item={it}
              onRemove={() => onRemoveItem(idx)}
            />
          ))
        )}

        <button
          type="button"
          onClick={onAddItem}
          className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-[#00C896] text-[#00C896] rounded-2xl text-sm font-bold active:bg-[#00C896]/5"
        >
          <Plus className="w-4 h-4" />
          {items.length === 0 ? "의류 추가하기" : "의류 추가"}
        </button>
      </div>

      {items.length > 0 && (
        <>
          <div className="mx-4 mt-2 p-4 bg-[#00C896]/5 border border-[#00C896]/20 rounded-2xl space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">총 의류</span>
              <span className="font-semibold text-gray-800">{items.length}벌</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">총 수선 항목</span>
              <span className="font-semibold text-gray-800">
                {totalRepairItems}개
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-[#00C896]/20 pt-1.5 mt-1.5">
              <span className="text-sm font-bold text-gray-700">예상 수선비</span>
              <span className="text-base font-extrabold text-[#00C896]">
                {formatPrice(totalRepairPrice)}~
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              배송비는 다음 단계에서 추가됩니다.
            </p>
          </div>

          <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-3 flex gap-2 mt-4">
            <button
              type="button"
              onClick={onSaveToCart}
              className="flex items-center justify-center gap-1 px-4 py-4 border border-[#00C896] text-[#00C896] rounded-xl text-sm font-bold active:bg-[#00C896]/5"
            >
              <ShoppingCart className="w-4 h-4" />
              담기
            </button>
            <button
              type="button"
              onClick={onProceedToPickup}
              className="flex-1 py-4 bg-[#00C896] text-white text-sm font-bold rounded-xl active:opacity-80 flex items-center justify-center gap-1"
            >
              수거 정보 입력
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
