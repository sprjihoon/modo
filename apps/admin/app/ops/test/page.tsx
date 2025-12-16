"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { Loader2, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";

export default function TestScenarioPage() {
  const [customerName, setCustomerName] = useState("테스트고객");
  const [itemName, setItemName] = useState("수선자켓");
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  
  const [orderInfo, setOrderInfo] = useState<{
    id: string;
    pickupTrackingNo: string;
    outboundTrackingNo?: string;
  } | null>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  // 1. 테스트 주문 생성
  const handleCreateOrder = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      
      // 임의의 송장번호 생성
      const pickupTrackingNo = `TEST${Date.now()}`;
      
      // 1. orders 생성
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_name: customerName,
          item_name: itemName,
          status: "BOOKED",
          repair_parts: ["소매수선", "지퍼교체"], // 2개 아이템
          pickup_zipcode: "12345",
          pickup_address: "서울시 강남구 테스트동",
          delivery_zipcode: "12345",
          delivery_address: "서울시 강남구 테스트동",
          phone: "010-0000-0000"
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. shipments 생성 (입고 송장)
      const { error: shipmentError } = await supabase
        .from("shipments")
        .insert({
          order_id: order.id,
          pickup_tracking_no: pickupTrackingNo,
          tracking_no: pickupTrackingNo, // 초기엔 같음
          status: "BOOKED"
        });

      if (shipmentError) throw shipmentError;

      setOrderInfo({
        id: order.id,
        pickupTrackingNo,
      });
      addLog(`✅ 주문 생성 완료: ${order.id} (송장: ${pickupTrackingNo})`);

    } catch (error: any) {
      addLog(`❌ 주문 생성 실패: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. 입고 처리 시뮬레이션
  const handleSimulateInbound = async () => {
    if (!orderInfo) return;
    setIsLoading(true);
    try {
      addLog("🚀 입고 처리 API 호출 중...");
      
      const res = await fetch("/api/ops/inbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingNo: orderInfo.pickupTrackingNo }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "입고 처리 실패");

      addLog(`✅ 입고 처리 성공!`);
      if (data.outboundTrackingNo) {
        setOrderInfo(prev => prev ? ({ ...prev, outboundTrackingNo: data.outboundTrackingNo }) : null);
        addLog(`📦 생성된 출고 송장: ${data.outboundTrackingNo}`);
      }
    } catch (error: any) {
      addLog(`❌ 입고 처리 실패: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. 작업 시작 시뮬레이션
  const handleSimulateWorkStart = async () => {
    if (!orderInfo) return;
    setIsLoading(true);
    try {
      // 0번, 1번 아이템 순차 시작
      for (let i = 0; i < 2; i++) {
        const res = await fetch("/api/ops/work-items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: orderInfo.id,
            itemIndex: i,
            itemName: i === 0 ? "소매수선" : "지퍼교체"
          }),
        });
        
        if (!res.ok) throw new Error(`${i}번 아이템 시작 실패`);
        addLog(`🛠️ ${i}번 아이템 작업 시작`);
        await new Promise(r => setTimeout(r, 500)); // 딜레이
      }
    } catch (error: any) {
      addLog(`❌ 작업 시작 실패: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 4. 작업 완료 시뮬레이션
  const handleSimulateWorkComplete = async () => {
    if (!orderInfo) return;
    setIsLoading(true);
    try {
      for (let i = 0; i < 2; i++) {
        const res = await fetch("/api/ops/work-items", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: orderInfo.id,
            itemIndex: i,
            action: "complete"
          }),
        });
        
        if (!res.ok) throw new Error(`${i}번 아이템 완료 실패`);
        addLog(`✅ ${i}번 아이템 작업 완료`);
        await new Promise(r => setTimeout(r, 500));
      }
      addLog("🎉 모든 작업 완료됨");
    } catch (error: any) {
      addLog(`❌ 작업 완료 실패: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 5. 출고 처리 시뮬레이션
  const handleSimulateOutbound = async () => {
    if (!orderInfo) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/ops/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          orderId: orderInfo.id, 
          status: "SHIPPED" 
        }),
      });

      if (!res.ok) throw new Error("출고 처리 실패");
      
      addLog("🚚 출고 처리(SHIPPED) 완료!");
    } catch (error: any) {
      addLog(`❌ 출고 처리 실패: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">시스템 통합 테스트</h1>
        <Button variant="outline" onClick={() => setLogs([])}>로그 지우기</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 테스트 컨트롤 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>1. 테스트 데이터 생성</CardTitle>
              <CardDescription>새로운 주문과 입고 송장을 생성합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>고객명</Label>
                  <Input value={customerName} onChange={e => setCustomerName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>상품명</Label>
                  <Input value={itemName} onChange={e => setItemName(e.target.value)} />
                </div>
              </div>
              <Button className="w-full" onClick={handleCreateOrder} disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin mr-2" /> : null}
                주문 생성
              </Button>
            </CardContent>
          </Card>

          {orderInfo && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <div className="space-y-1 text-sm">
                  <p><strong>Order ID:</strong> {orderInfo.id}</p>
                  <p><strong>Pickup Tracking:</strong> {orderInfo.pickupTrackingNo}</p>
                  <p><strong>Outbound Tracking:</strong> {orderInfo.outboundTrackingNo || "(아직 없음)"}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>2. 프로세스 시뮬레이션</CardTitle>
              <CardDescription>순서대로 버튼을 눌러보세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                className="w-full justify-between" 
                variant="secondary"
                onClick={handleSimulateInbound}
                disabled={!orderInfo || isLoading}
              >
                <span>① 입고 스캔 (Manager)</span>
                <ArrowRight className="h-4 w-4" />
              </Button>

              <Button 
                className="w-full justify-between"
                variant="secondary" 
                onClick={handleSimulateWorkStart}
                disabled={!orderInfo || isLoading}
              >
                <span>② 작업 시작 (Worker)</span>
                <ArrowRight className="h-4 w-4" />
              </Button>

              <Button 
                className="w-full justify-between"
                variant="secondary"
                onClick={handleSimulateWorkComplete}
                disabled={!orderInfo || isLoading}
              >
                <span>③ 작업 완료 (Worker)</span>
                <ArrowRight className="h-4 w-4" />
              </Button>

              <Button 
                className="w-full justify-between"
                variant="secondary"
                onClick={handleSimulateOutbound}
                disabled={!orderInfo || isLoading}
              >
                <span>④ 출고 처리 (Manager)</span>
                <CheckCircle className="h-4 w-4" />
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
