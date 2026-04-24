"use client";

import Image from "next/image";
import { Trash2, Scissors } from "lucide-react";
import type { ClothingItem } from "./OrderNewClient";

interface Props {
  index: number;
  item: ClothingItem;
  onRemove: () => void;
}

function formatPrice(n: number) {
  return `${n.toLocaleString("ko-KR")}원`;
}

export function ClothingItemCard({ index, item, onRemove }: Props) {
  const thumb = item.imagesWithPins[0]?.imageUrl ?? null;
  const repairTotal = item.repairItems.reduce(
    (sum, r) => sum + (r.price ?? 0) * (r.quantity ?? 1),
    0
  );

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-3 flex items-start gap-3">
        <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden shrink-0 relative flex items-center justify-center">
          {thumb ? (
            <Image
              src={thumb}
              alt={item.clothingType}
              fill
              sizes="64px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <Scissors className="w-6 h-6 text-gray-300" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] bg-[#00C896]/10 text-[#00C896] font-bold px-1.5 py-0.5 rounded">
              의류 {index + 1}
            </span>
            <p className="text-sm font-bold text-gray-900 truncate">
              {item.clothingType || "의류"}
            </p>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            수선 {item.repairItems.length}개
            {repairTotal > 0 && (
              <span className="ml-2 font-semibold text-[#00C896]">
                {formatPrice(repairTotal)}~
              </span>
            )}
          </p>

          <div className="flex flex-wrap gap-1 mt-1.5">
            {item.repairItems.slice(0, 4).map((r, i) => (
              <span
                key={i}
                className="text-[10px] bg-[#00C896]/8 text-[#00C896] px-1.5 py-0.5 rounded-full border border-[#00C896]/20"
              >
                {r.name}
              </span>
            ))}
            {item.repairItems.length > 4 && (
              <span className="text-[10px] text-gray-400 px-1.5 py-0.5">
                +{item.repairItems.length - 4}개
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 text-gray-300 active:text-red-400"
          aria-label="삭제"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
