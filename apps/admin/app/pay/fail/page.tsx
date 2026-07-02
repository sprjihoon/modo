"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, Loader2 } from "lucide-react";

// PortOne V2 에러 코드별 메시지 매핑
const ERROR_MESSAGES: Record<string, string> = {
  FAILURE_TYPE_PG: "PG사에서 결제를 거절했습니다. 다른 카드나 결제 수단을 시도해주세요.",
  FAILURE_TYPE_TIMEOUT: "결제 처리 시간이 초과되었습니다. 다시 시도해주세요.",
  USER_CANCEL: "결제가 취소되었습니다.",
  INVALID_PAYMENT_ID: "유효하지 않은 결제 ID입니다.",
  PAYMENT_ALREADY_PAID: "이미 결제 완료된 건입니다.",
  PAYMENT_CANCELLED: "결제가 취소된 상태입니다.",
  REJECT_CARD_COMPANY: "카드사에서 결제를 거절했습니다. 다른 카드로 시도해주세요.",
  EXCEED_MAX_PAYMENT_AMOUNT: "결제 한도를 초과했습니다.",
  NOT_AVAILABLE_BANK: "현재 이용할 수 없는 은행입니다.",
};

function PaymentFailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const errorCode = searchParams.get("code") || "UNKNOWN_ERROR";
  const errorMessage = searchParams.get("message") || "결제 중 오류가 발생했습니다.";
  const orderId = searchParams.get("orderId");

  // 에러 코드에 따른 친화적인 메시지 표시
  const displayMessage = ERROR_MESSAGES[errorCode] || errorMessage;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-red-600">결제 실패</CardTitle>
          <CardDescription className="text-gray-600 mt-2">
            {displayMessage}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">에러 코드</span>
              <span className="font-mono text-gray-700">{errorCode}</span>
            </div>
            {orderId && (
              <div className="flex justify-between">
                <span className="text-gray-500">주문번호</span>
                <span className="font-mono text-gray-700">{orderId}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Button 
              className="w-full"
              onClick={() => router.back()}
            >
              다시 시도하기
            </Button>
            <Button 
              className="w-full"
              variant="outline"
              onClick={() => window.close()}
            >
              닫기
            </Button>
          </div>

          <p className="text-xs text-center text-gray-400 mt-4">
            문제가 계속되면 고객센터로 문의해주세요.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentFailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
            </div>
            <CardTitle>로딩 중...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    }>
      <PaymentFailContent />
    </Suspense>
  );
}

