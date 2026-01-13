"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, Loader2 } from "lucide-react";

// 에러 코드별 메시지 매핑
const ERROR_MESSAGES: Record<string, string> = {
  PAY_PROCESS_CANCELED: "결제가 취소되었습니다.",
  PAY_PROCESS_ABORTED: "결제 처리 중 문제가 발생했습니다.",
  REJECT_CARD_COMPANY: "카드사에서 결제를 거절했습니다. 다른 카드로 시도해주세요.",
  NOT_FOUND_PAYMENT_SESSION: "결제 시간이 만료되었습니다. 다시 시도해주세요.",
  INVALID_CARD_NUMBER: "유효하지 않은 카드 번호입니다.",
  INVALID_CARD_EXPIRATION: "카드 유효기간이 올바르지 않습니다.",
  EXCEED_MAX_DAILY_PAYMENT_COUNT: "일일 결제 횟수를 초과했습니다.",
  EXCEED_MAX_PAYMENT_AMOUNT: "결제 한도를 초과했습니다.",
  NOT_AVAILABLE_BANK: "현재 이용할 수 없는 은행입니다.",
  INVALID_BANK_ACCOUNT_NUMBER: "유효하지 않은 계좌번호입니다.",
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

