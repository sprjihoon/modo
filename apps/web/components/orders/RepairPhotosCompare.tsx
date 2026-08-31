import { Clock, Scissors } from "lucide-react";
import type { RepairPhotoItem } from "@/lib/repair-photos";

export function RepairPhotosCompare({ items }: { items: RepairPhotoItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="mx-4 mt-3 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Scissors className="w-4 h-4 text-[#00C896]" />
        <p className="text-sm font-bold text-gray-800">수선 전 · 후 사진</p>
        <span className="ml-auto text-xs text-gray-400">{items.length}개 항목</span>
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.sequence}>
            <p className="text-xs font-medium text-gray-500 mb-2">
              #{item.sequence} {item.label}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <p className="text-xs text-center font-medium text-orange-500">수선 전</p>
                <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 border border-orange-100">
                  {item.before ? (
                    <img
                      src={item.before}
                      alt={`${item.label} 수선 전`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                      <Scissors className="w-6 h-6 text-gray-300" />
                      <span className="text-xs text-gray-400">사진 없음</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-center font-medium text-[#00C896]">수선 후</p>
                <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 border border-[#00C896]/20">
                  {item.after ? (
                    <img
                      src={item.after}
                      alt={`${item.label} 수선 후`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                      <Clock className="w-6 h-6 text-gray-300" />
                      <span className="text-xs text-gray-400">수선 완료 후</span>
                      <span className="text-xs text-gray-400">등록됩니다</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
