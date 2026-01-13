"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertTriangle, CreditCard, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";

// 동적 임포트로 결제 위젯 컴포넌트 로드 (SSR 비활성화)
const TossPaymentWidget = dynamic(
  () => import("@/components/payment/TossPaymentWidget"),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">결제 모듈 로딩 중...</span>
      </div>
    ),
  }
);

export default function CustomerPaymentPage() {
  const params = useParams();
  const [request, setRequest] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentWidget, setShowPaymentWidget] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  useEffect(() => {
    loadRequest();
  }, []);

  const loadRequest = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("extra_charge_requests")
        .select(`
          *,
          orders (
            item_name,
            customer_name,
            customer_phone,
            customer_email
          )
        `)
        .eq("id", params.id)
        .single();

      if (error) throw error;
      setRequest(data);
    } catch (error) {
      console.error("Load failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!confirm("추가 작업을 거절하시겠습니까? 기존 내역대로 진행됩니다.")) return;

    setIsRejecting(true);
    try {
      const res = await fetch(`/api/pay/${params.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REJECTED" }),
      });

      if (!res.ok) throw new Error("Processing failed");
      loadRequest(); // Reload to show updated status
    } catch (error) {
      console.error("Error:", error);
      alert("처리 중 오류가 발생했습니다.");
    } finally {
      setIsRejecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-gray-100">
              <XCircle className="text-gray-600" />
            </div>
            <CardTitle>요청을 찾을 수 없습니다</CardTitle>
            <CardDescription>
              유효하지 않은 링크이거나 요청이 만료되었습니다.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isPaid = request.status === "PAID";
  const isRejected = request.status === "REJECTED";
  const isPending = request.status === "REVIEWED"; // REVIEWED status means waiting for customer

  // 이미 처리된 상태
  if (!isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardHeader className="text-center">
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isPaid ? "bg-green-100" : "bg-red-100"}`}>
              {isPaid ? (
                <CheckCircle className="h-8 w-8 text-green-600" />
              ) : (
                <XCircle className="h-8 w-8 text-red-600" />
              )}
            </div>
            <CardTitle className={isPaid ? "text-green-600" : "text-red-600"}>
              {isPaid ? "결제 완료" : "요청 거절됨"}
            </CardTitle>
            <CardDescription>
              {isPaid 
                ? "추가 비용 결제가 완료되었습니다. 작업을 진행합니다." 
                : "추가 요청을 거절하셨습니다. 기존 내역대로 진행합니다."}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // 결제 위젯 화면
  if (showPaymentWidget) {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <div className="max-w-lg mx-auto">
          {/* 뒤로가기 버튼 */}
          <button
            onClick={() => setShowPaymentWidget(false)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-1" />
            <span>이전으로</span>
          </button>

          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle>결제 수단 선택</CardTitle>
              <CardDescription>
                추가 비용 {request.amount?.toLocaleString()}원을 결제해주세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TossPaymentWidget
                orderId={String(params.id)}
                orderName={`추가 수선 비용 - ${request.orders?.item_name || "상품"}`}
                amount={request.amount}
                customerName={request.orders?.customer_name || "고객"}
                customerEmail={request.orders?.customer_email}
                customerPhone={request.orders?.customer_phone}
                successUrl={`${baseUrl}/pay/success`}
                failUrl={`${baseUrl}/pay/fail`}
                onReady={() => console.log("결제 위젯 준비 완료")}
                onError={(error) => console.error("결제 위젯 오류:", error)}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // 기본 화면 - 결제 정보 표시
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-blue-600" />
            추가 결제 요청
          </CardTitle>
          <CardDescription>
            {request.orders?.customer_name}님, 수선 작업 중 추가 비용이 발생했습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-500 mb-1">상품명</p>
              <p className="font-medium">{request.orders?.item_name}</p>
            </div>
            
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-800 mb-1">추가 비용 발생 사유</p>
                  <p className="text-sm text-amber-700">{request.worker_reason}</p>
                  {request.admin_note && (
                    <p className="text-sm text-amber-700 mt-2 border-t border-amber-200 pt-2">
                      <span className="font-semibold">담당자 안내:</span> {request.admin_note}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-lg">
              <span className="text-slate-300">결제 금액</span>
              <span className="text-2xl font-bold">{request.amount?.toLocaleString()}원</span>
            </div>
          </div>

          <div className="space-y-3">
            <Button 
              className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700 transition-colors" 
              onClick={() => setShowPaymentWidget(true)}
            >
              <CreditCard className="mr-2 h-5 w-5" />
              결제하고 진행하기
            </Button>
            <Button 
              variant="outline" 
              className="w-full h-12 text-gray-600 hover:bg-gray-50"
              onClick={handleReject}
              disabled={isRejecting}
            >
              {isRejecting ? "처리 중..." : "추가작업 제외 후 진행"}
            </Button>
          </div>

          <p className="text-xs text-center text-gray-400">
            토스페이먼츠로 안전하게 결제됩니다
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
