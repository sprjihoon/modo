"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { XCircle } from "lucide-react";

export function PaymentFailClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const orderId = searchParams.get("orderId") ?? "";
  const errorCode = searchParams.get("code") ?? "";
  const errorMessage = searchParams.get("message") ?? "결제가 취소되었거나 오류가 발생했습니다.";

  const isCancel = errorCode === "PAY_PROCESS_CANCELED";

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 px-6 text-center">
      <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center">
        <XCircle className="w-10 h-10 text-red-400" />
      </div>
      <div>
        <p className="text-xl font-bold text-gray-900 mb-1">
          {isCancel ? "결제가 취소되었습니다" : "결제에 실패했습니다"}
        </p>
        {!isCancel && errorMessage && (
          <p className="text-sm text-gray-500 mt-1">{errorMessage}</p>
        )}
        {errorCode && !isCancel && (
          <p className="text-xs text-gray-400 mt-1">오류 코드: {errorCode}</p>
        )}
      </div>
      <div className="flex gap-3 w-full max-w-xs">
        <button
          onClick={() => router.replace("/orders")}
          className="flex-1 py-3.5 border border-gray-200 rounded-xl text-sm text-gray-600 font-medium"
        >
          주문 목록
        </button>
        {orderId && (
          <button
            onClick={() => router.replace(`/payment?orderId=${orderId}`)}
            className="flex-1 py-3.5 bg-[#00C896] text-white rounded-xl text-sm font-bold"
          >
            다시 결제
          </button>
        )}
      </div>
    </div>
  );
}
