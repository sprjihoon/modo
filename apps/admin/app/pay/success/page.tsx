"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, XCircle } from "lucide-react";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [paymentInfo, setPaymentInfo] = useState<any>(null);

  useEffect(() => {
    const confirmPayment = async () => {
      // PortOne V2 리다이렉트 파라미터: paymentId (+ 커스텀으로 넘긴 orderId, amount)
      const paymentId = searchParams.get("paymentId");
      const orderId = searchParams.get("orderId") || paymentId;
      const amount = searchParams.get("amount");

      // PortOne이 실패로 리다이렉트하는 경우
      const code = searchParams.get("code");
      if (code) {
        setStatus("error");
        setErrorMessage(searchParams.get("message") || "결제에 실패했습니다.");
        return;
      }

      if (!paymentId || !orderId) {
        setStatus("error");
        setErrorMessage("결제 정보가 올바르지 않습니다.");
        return;
      }

      try {
        const response = await fetch("/api/pay/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentId,
            orderId,
            amount: amount ? Number(amount) : 0,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "결제 승인에 실패했습니다.");
        }

        setPaymentInfo(data);
        setStatus("success");
      } catch (error: unknown) {
        console.error("결제 승인 실패:", error);
        setStatus("error");
        setErrorMessage(
          (error as Error).message || "결제 처리 중 오류가 발생했습니다."
        );
      }
    };

    confirmPayment();
  }, [searchParams]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
            <CardTitle>결제 처리 중</CardTitle>
            <CardDescription>결제를 확인하고 있습니다. 잠시만 기다려주세요...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-red-600">결제 실패</CardTitle>
            <CardDescription className="text-red-500">{errorMessage}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline" onClick={() => router.back()}>
              다시 시도하기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-green-600">결제 완료</CardTitle>
          <CardDescription>결제가 성공적으로 완료되었습니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {paymentInfo && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">주문번호</span>
                <span className="font-medium">{paymentInfo.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">결제수단</span>
                <span className="font-medium">{paymentInfo.method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">결제금액</span>
                <span className="font-bold text-lg">
                  {paymentInfo.totalAmount?.toLocaleString()}원
                </span>
              </div>
              {paymentInfo.approvedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">결제일시</span>
                  <span className="font-medium">
                    {new Date(paymentInfo.approvedAt).toLocaleString("ko-KR")}
                  </span>
                </div>
              )}
            </div>
          )}

          <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => window.close()}>
            확인
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
              </div>
              <CardTitle>로딩 중...</CardTitle>
            </CardHeader>
          </Card>
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
