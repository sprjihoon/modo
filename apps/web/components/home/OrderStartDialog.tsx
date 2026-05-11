"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";

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
          <div className="w-48 h-48 bg-gray-50 rounded-2xl border-2 border-gray-200 flex items-center justify-center">
            <svg
              className="w-24 h-24 text-[#00C896]/30"
              viewBox="0 -960 960 960"
              fill="currentColor"
            >
              <path d="M240-240h480L480-420 240-240Zm185-444q-5 11-14.5 18t-22.5 7q-17 0-28.5-11.5T348-699q0-5 .5-8.5t2.5-7.5q17-38 52-61.5t77-23.5q58 0 99 40.5t41 98.5q0 47-27.5 84T520-526v36l344 258q8 5 12 13.5t4 18.5q0 17-11.5 28.5T840-160H120q-17 0-28.5-11.5T80-200q0-10 4-18.5T96-232l344-258v-70q0-17 12-28.5t29-11.5q25 0 42-18t17-43q0-25-17.5-42T480-720q-18 0-33 9.5T425-684Z" />
            </svg>
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
