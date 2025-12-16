"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { Loader2, ArrowRight, CheckCircle, AlertTriangle, CreditCard, Link as LinkIcon, UserCog } from "lucide-react";
import Link from "next/link";

export default function ExtraChargeTestPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [testData, setTestData] = useState<{
    orderId?: string;
    workerId?: string;
    adminId?: string;
    requestId?: string;
    requestUrl?: string;
  }>({});

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  // 1. 테스트 환경 설정 (주문 및 유저 생성)
  const handleSetup = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        addLog("❌ 로그인 필요: 먼저 로그인해주세요.");
        return;
      }

      // 현재 유저를 Worker이자 Admin으로 가정 (테스트용)
      // 실제로는 role이 맞아야 하지만, RLS 정책에 따라 동작 여부가 결정됨
      
      // 1. 주문 생성
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_name: "추가비용 테스트 고객",
          item_name: "고급 정장 자켓",
          status: "IN_REPAIR",
          repair_parts: ["안감 교체"],
          user_id: session.user.id // 나 자신을 고객으로 설정하여 알림 수신
        })
        .select()
        .single();

      if (orderError) throw orderError;

      setTestData(prev => ({ 
        ...prev, 
        orderId: order.id,
        workerId: session.user.id,
        adminId: session.user.id 
      }));
      
      addLog(`✅ 테스트 주문 생성 완료: ${order.id}`);
      addLog(`ℹ️ 현재 로그인된 유저(${session.user.email})를 작업자/관리자/고객으로 모두 사용합니다.`);

    } catch (error: any) {
      addLog(`❌ 설정 실패: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. 작업자: 추가 비용 요청
  const handleWorkerRequest = async () => {
    if (!testData.orderId) return;
    setIsLoading(true);
    try {
      addLog("👷 [Worker] 추가 비용 요청 중...");
      
      const res = await fetch("/api/ops/extra-charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: testData.orderId,
          reason: "특수 원단 안감 교체로 인한 자재비 추가 발생",
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setTestData(prev => ({ ...prev, requestId: json.data.id }));
      addLog(`✅ [Worker] 요청 성공! Request ID: ${json.data.id}`);
      addLog(`📝 사유: ${json.data.worker_reason}`);

    } catch (error: any) {
      addLog(`❌ [Worker] 요청 실패: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. 관리자: 검토 및 청구 (승인)
  const handleAdminReview = async () => {
    if (!testData.orderId || !testData.requestId) return;
    setIsLoading(true);
    try {
      addLog("👮 [Admin] 요청 검토 및 청구 중...");

      const res = await fetch(`/api/orders/${testData.orderId}/extra-charge`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: testData.requestId,
          action: "APPROVE",
          amount: 15000,
          adminNote: "최고급 실크 안감으로 교체합니다."
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      const url = `/pay/${testData.requestId}`;
      setTestData(prev => ({ ...prev, requestUrl: url }));
      
      addLog(`✅ [Admin] 승인 완료! 청구금액: 15,000원`);
      addLog(`🔗 고객 결제 링크 생성됨: ${url}`);

    } catch (error: any) {
      addLog(`❌ [Admin] 처리 실패: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 4. 고객: 결제 페이지 확인 (링크 이동)
  // 버튼 클릭 시 새 탭으로 이동

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="h-6 w-6" />
          추가 결제 프로세스 테스트
        </h1>
        <Button variant="outline" onClick={() => setLogs([])}>로그 지우기</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 테스트 컨트롤 */}
        <div className="space-y-6">
          {/* Step 1: Setup */}
          <Card className={testData.orderId ? "border-green-200 bg-green-50" : ""}>
            <CardHeader>
              <CardTitle className="text-base">1. 환경 설정</CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                onClick={handleSetup} 
                disabled={isLoading || !!testData.orderId}
              >
                {testData.orderId ? "설정 완료" : "테스트 데이터 생성"}
              </Button>
              {testData.orderId && (
                <p className="text-xs text-green-600 mt-2">Order ID: {testData.orderId}</p>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Worker */}
          <Card className={testData.requestId ? "border-green-200 bg-green-50" : ""}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <UserCog className="h-4 w-4" /> 2. 작업자 (Worker)
              </CardTitle>
              <CardDescription>추가 비용 발생 사유 입력 및 요청</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                variant="secondary"
                onClick={handleWorkerRequest} 
                disabled={isLoading || !testData.orderId || !!testData.requestId}
              >
                {testData.requestId ? "요청 완료됨" : "추가 비용 요청하기"}
              </Button>
            </CardContent>
          </Card>

          {/* Step 3: Admin */}
          <Card className={testData.requestUrl ? "border-green-200 bg-green-50" : ""}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> 3. 관리자 (Admin)
              </CardTitle>
              <CardDescription>요청 검토, 금액 책정 및 고객 청구</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                variant="secondary"
                onClick={handleAdminReview} 
                disabled={isLoading || !testData.requestId || !!testData.requestUrl}
              >
                {testData.requestUrl ? "승인 완료됨" : "승인 및 15,000원 청구"}
              </Button>
            </CardContent>
          </Card>

          {/* Step 4: Customer */}
          <Card className={!testData.requestUrl ? "opacity-50" : "border-blue-200 bg-blue-50"}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> 4. 고객 (Customer)
              </CardTitle>
              <CardDescription>결제 페이지에서 수락/거절</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                variant="default"
                disabled={!testData.requestUrl}
                asChild
              >
                <Link href={testData.requestUrl || "#"} target="_blank">
                  <LinkIcon className="h-4 w-4 mr-2" />
                  고객 결제 페이지 열기
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 로그 뷰어 */}
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle>실행 로그</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 bg-black text-green-400 font-mono text-xs p-4 overflow-auto rounded-b-lg min-h-[400px]">
            {logs.length === 0 ? (
              <span className="opacity-50">대기 중...</span>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="mb-1 border-b border-gray-800 pb-1 last:border-0">
                  {log}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

