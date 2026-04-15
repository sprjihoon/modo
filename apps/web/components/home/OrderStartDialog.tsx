"use client";

import { useRouter } from "next/navigation";
import { X, Shirt } from "lucide-react";

interface OrderStartDialogProps {
  open: boolean;
  onClose: () => void;
}

export function OrderStartDialog({ open, onClose }: OrderStartDialogProps) {
  const router = useRouter();

  if (!open) return null;

  function handleConfirm() {
    onClose();
    router.push("/order/new");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      {/* 딤 */}
      <div className="absolute inset-0 bg-black/40 animate-fade-in" />

      {/* 시트 */}
      <div
        className="relative bg-white w-full max-w-[430px] rounded-t-3xl px-6 pt-5 pb-10 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 핸들 */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

        {/* 닫기 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 active:opacity-60"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>

        {/* 타이틀 */}
        <div className="text-center mb-6">
          <p className="text-gray-600 text-base font-medium">
            다음 단계 진행을 위해
          </p>
          <p className="text-gray-800 text-xl font-bold mt-1">
            수선의류를{" "}
            <span className="text-[#00C896]">미리 준비</span>
            해주세요
          </p>
        </div>

        {/* 아이콘 */}
        <div className="flex justify-center mb-8">
          <div className="w-40 h-40 bg-gray-50 rounded-2xl border-2 border-gray-100 flex items-center justify-center">
            <Shirt className="w-20 h-20 text-[#00C896]/30" />
          </div>
        </div>

        {/* 버튼 */}
        <button
          onClick={handleConfirm}
          className="btn-brand w-full text-base py-4"
        >
          확인
        </button>
      </div>
    </div>
  );
}
