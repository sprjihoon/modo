
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, AlertTriangle, CreditCard } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useParams } from "next/navigation";

export default function CustomerPaymentPage() {
  const params = useParams();
  const [request, setRequest] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

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
            customer_name
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

  const handleResponse = async (action: "ACCEPTED" | "REJECTED") => {
    if (!confirm(action === "ACCEPTED" ? "추가 비용을 결제하시겠습니까?" : "추가 작업을 거절하시겠습니까?")) return;

    setIsProcessing(true);
    try {
      const res = await fetch(`/api/pay/${params.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) throw new Error("Processing failed");

      setIsCompleted(true);
      loadRequest(); // Reload to show updated status
    } catch (error) {
      console.error("Error:", error);
      alert("처리 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center">로딩 중...</div>;
  if (!request) return <div className="p-8 text-center">요청을 찾을 수 없습니다.</div>;

  const isPaid = request.status === "PAID";
  const isRejected = request.status === "REJECTED";
  const isPending = request.status === "REVIEWED"; // REVIEWED status means waiting for customer

  if (!isPending && !isCompleted) {
    // Already processed state
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-gray-100">
              {isPaid ? <CheckCircle className="text-green-600" /> : <XCircle className="text-red-600" />}
            </div>
            <CardTitle>{isPaid ? "결제 완료" : "요청 거절됨"}</CardTitle>
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

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>추가 결제 요청</CardTitle>
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
            
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-orange-800 mb-1">추가 비용 발생 사유</p>
                  <p className="text-sm text-orange-700">{request.worker_reason}</p>
                  {request.admin_note && (
                    <p className="text-sm text-orange-700 mt-2 border-t border-orange-200 pt-2">
                      <span className="font-semibold">담당자 안내:</span> {request.admin_note}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center p-4 bg-gray-900 text-white rounded-lg">
              <span>결제 금액</span>
              <span className="text-xl font-bold">{request.amount?.toLocaleString()}원</span>
            </div>
          </div>

          <div className="space-y-3">
            <Button 
              className="w-full h-12 text-lg bg-green-600 hover:bg-green-700" 
              onClick={() => handleResponse("ACCEPTED")}
              disabled={isProcessing}
            >
              <CreditCard className="mr-2 h-5 w-5" />
              결제하고 진행하기
            </Button>
            <Button 
              variant="outline" 
              className="w-full h-12 text-gray-600"
              onClick={() => handleResponse("REJECTED")}
              disabled={isProcessing}
            >
              추가작업 제외 후 진행
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

