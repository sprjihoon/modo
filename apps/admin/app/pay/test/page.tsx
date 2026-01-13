"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CreditCard, 
  Search, 
  XCircle, 
  CheckCircle, 
  Loader2,
  AlertCircle,
  Receipt,
  RefreshCw
} from "lucide-react";
import dynamic from "next/dynamic";

// 동적 임포트로 결제 위젯 컴포넌트 로드
const TossPaymentWidget = dynamic(
  () => import("@/components/payment/TossPaymentWidget"),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">결제 모듈 로딩 중...</span>
      </div>
    ),
  }
);

export default function PaymentTestPage() {
  // 결제 테스트 상태
  const [testAmount, setTestAmount] = useState("1000");
  const [testOrderId, setTestOrderId] = useState(`test_${Date.now()}`);
  const [testOrderName, setTestOrderName] = useState("테스트 상품");
  const [testCustomerName, setTestCustomerName] = useState("홍길동");
  const [showWidget, setShowWidget] = useState(false);

  // 결제 조회 상태
  const [inquiryPaymentKey, setInquiryPaymentKey] = useState("");
  const [inquiryOrderId, setInquiryOrderId] = useState("");
  const [inquiryResult, setInquiryResult] = useState<any>(null);
  const [inquiryLoading, setInquiryLoading] = useState(false);
  const [inquiryError, setInquiryError] = useState("");

  // 결제 취소 상태
  const [cancelPaymentKey, setCancelPaymentKey] = useState("");
  const [cancelReason, setCancelReason] = useState("테스트 취소");
  const [cancelAmount, setCancelAmount] = useState("");
  const [cancelResult, setCancelResult] = useState<any>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState("");

  // 결제 조회 함수
  const handleInquiry = async () => {
    if (!inquiryPaymentKey && !inquiryOrderId) {
      setInquiryError("paymentKey 또는 orderId를 입력해주세요.");
      return;
    }

    setInquiryLoading(true);
    setInquiryError("");
    setInquiryResult(null);

    try {
      const params = new URLSearchParams();
      if (inquiryPaymentKey) params.append("paymentKey", inquiryPaymentKey);
      if (inquiryOrderId) params.append("orderId", inquiryOrderId);

      const response = await fetch(`/api/pay/inquiry?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "조회 실패");
      }

      setInquiryResult(data.payment);
    } catch (error: any) {
      setInquiryError(error.message);
    } finally {
      setInquiryLoading(false);
    }
  };

  // 결제 취소 함수
  const handleCancel = async () => {
    if (!cancelPaymentKey) {
      setCancelError("paymentKey를 입력해주세요.");
      return;
    }

    if (!confirm("정말 결제를 취소하시겠습니까?")) return;

    setCancelLoading(true);
    setCancelError("");
    setCancelResult(null);

    try {
      const response = await fetch("/api/pay/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentKey: cancelPaymentKey,
          cancelReason,
          cancelAmount: cancelAmount ? Number(cancelAmount) : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "취소 실패");
      }

      setCancelResult(data);
    } catch (error: any) {
      setCancelError(error.message);
    } finally {
      setCancelLoading(false);
    }
  };

  // 새 주문 ID 생성
  const generateNewOrderId = () => {
    setTestOrderId(`test_${Date.now()}`);
  };

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            💳 토스페이먼츠 테스트
          </h1>
          <p className="text-purple-200">
            결제 위젯, 조회, 취소 기능을 테스트해보세요
          </p>
        </div>

        <Tabs defaultValue="payment" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800/50">
            <TabsTrigger value="payment" className="data-[state=active]:bg-blue-600">
              <CreditCard className="h-4 w-4 mr-2" />
              결제 테스트
            </TabsTrigger>
            <TabsTrigger value="inquiry" className="data-[state=active]:bg-green-600">
              <Search className="h-4 w-4 mr-2" />
              결제 조회
            </TabsTrigger>
            <TabsTrigger value="cancel" className="data-[state=active]:bg-red-600">
              <XCircle className="h-4 w-4 mr-2" />
              결제 취소
            </TabsTrigger>
          </TabsList>

          {/* 결제 테스트 탭 */}
          <TabsContent value="payment">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-blue-400" />
                  결제 위젯 테스트
                </CardTitle>
                <CardDescription className="text-slate-400">
                  토스페이먼츠 결제 위젯을 테스트합니다. 테스트 환경에서는 실제 결제가 이루어지지 않습니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!showWidget ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-slate-200">주문 ID</Label>
                        <div className="flex gap-2">
                          <Input
                            value={testOrderId}
                            onChange={(e) => setTestOrderId(e.target.value)}
                            className="bg-slate-700 border-slate-600 text-white"
                          />
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={generateNewOrderId}
                            className="border-slate-600"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-200">결제 금액</Label>
                        <Input
                          type="number"
                          value={testAmount}
                          onChange={(e) => setTestAmount(e.target.value)}
                          className="bg-slate-700 border-slate-600 text-white"
                          min="100"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-slate-200">상품명</Label>
                        <Input
                          value={testOrderName}
                          onChange={(e) => setTestOrderName(e.target.value)}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-200">고객명</Label>
                        <Input
                          value={testCustomerName}
                          onChange={(e) => setTestCustomerName(e.target.value)}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </div>
                    </div>

                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg"
                      onClick={() => setShowWidget(true)}
                      disabled={!testAmount || Number(testAmount) < 100}
                    >
                      <CreditCard className="mr-2 h-5 w-5" />
                      결제 위젯 열기
                    </Button>

                    <div className="bg-slate-900/50 rounded-lg p-4 text-sm text-slate-400">
                      <p className="font-semibold text-slate-300 mb-2">💡 테스트 안내</p>
                      <ul className="space-y-1 list-disc list-inside">
                        <li>테스트 환경에서는 실제 결제가 이루어지지 않습니다</li>
                        <li>카드 결제 시 아무 카드 번호나 입력 가능합니다</li>
                        <li>테스트용 카드: 4242-4242-4242-4242</li>
                        <li>최소 결제 금액: 100원</li>
                      </ul>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowWidget(false)}
                      className="border-slate-600 text-slate-300"
                    >
                      ← 돌아가기
                    </Button>
                    
                    <div className="bg-white rounded-lg p-4">
                      <TossPaymentWidget
                        orderId={testOrderId}
                        orderName={testOrderName}
                        amount={Number(testAmount)}
                        customerName={testCustomerName}
                        successUrl={`${baseUrl}/pay/success`}
                        failUrl={`${baseUrl}/pay/fail`}
                        onReady={() => console.log("결제 위젯 준비 완료")}
                        onError={(error) => console.error("결제 위젯 오류:", error)}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 결제 조회 탭 */}
          <TabsContent value="inquiry">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Search className="h-5 w-5 text-green-400" />
                  결제 내역 조회
                </CardTitle>
                <CardDescription className="text-slate-400">
                  paymentKey 또는 orderId로 결제 내역을 조회합니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-200">Payment Key</Label>
                    <Input
                      value={inquiryPaymentKey}
                      onChange={(e) => setInquiryPaymentKey(e.target.value)}
                      placeholder="tgen_20240101..."
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-200">Order ID</Label>
                    <Input
                      value={inquiryOrderId}
                      onChange={(e) => setInquiryOrderId(e.target.value)}
                      placeholder="test_1234567890"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>

                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={handleInquiry}
                  disabled={inquiryLoading}
                >
                  {inquiryLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="mr-2 h-4 w-4" />
                  )}
                  조회하기
                </Button>

                {inquiryError && (
                  <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex items-center gap-2 text-red-300">
                    <AlertCircle className="h-5 w-5" />
                    {inquiryError}
                  </div>
                )}

                {inquiryResult && (
                  <div className="bg-slate-900/50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 text-green-400">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-semibold">조회 성공</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-400">상태</p>
                        <p className="text-white font-medium">{inquiryResult.status}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">결제수단</p>
                        <p className="text-white font-medium">{inquiryResult.method}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">결제 금액</p>
                        <p className="text-white font-medium">{inquiryResult.totalAmount?.toLocaleString()}원</p>
                      </div>
                      <div>
                        <p className="text-slate-400">승인 일시</p>
                        <p className="text-white font-medium">
                          {inquiryResult.approvedAt 
                            ? new Date(inquiryResult.approvedAt).toLocaleString("ko-KR")
                            : "-"}
                        </p>
                      </div>
                    </div>

                    {inquiryResult.receipt?.url && (
                      <a
                        href={inquiryResult.receipt.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300"
                      >
                        <Receipt className="h-4 w-4" />
                        영수증 보기
                      </a>
                    )}

                    <details className="mt-4">
                      <summary className="text-slate-400 cursor-pointer hover:text-slate-300">
                        전체 응답 보기
                      </summary>
                      <pre className="mt-2 p-2 bg-slate-950 rounded text-xs text-slate-300 overflow-auto max-h-60">
                        {JSON.stringify(inquiryResult, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 결제 취소 탭 */}
          <TabsContent value="cancel">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-400" />
                  결제 취소
                </CardTitle>
                <CardDescription className="text-slate-400">
                  결제를 전액 또는 부분 취소합니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-200">Payment Key *</Label>
                  <Input
                    value={cancelPaymentKey}
                    onChange={(e) => setCancelPaymentKey(e.target.value)}
                    placeholder="tgen_20240101..."
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-200">취소 사유 *</Label>
                  <Input
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="취소 사유를 입력하세요"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-200">취소 금액 (부분 취소 시)</Label>
                  <Input
                    type="number"
                    value={cancelAmount}
                    onChange={(e) => setCancelAmount(e.target.value)}
                    placeholder="전액 취소 시 비워두세요"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <Button
                  className="w-full bg-red-600 hover:bg-red-700"
                  onClick={handleCancel}
                  disabled={cancelLoading || !cancelPaymentKey}
                >
                  {cancelLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="mr-2 h-4 w-4" />
                  )}
                  결제 취소
                </Button>

                {cancelError && (
                  <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex items-center gap-2 text-red-300">
                    <AlertCircle className="h-5 w-5" />
                    {cancelError}
                  </div>
                )}

                {cancelResult && (
                  <div className="bg-slate-900/50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 text-green-400">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-semibold">취소 성공</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-400">취소 금액</p>
                        <p className="text-white font-medium">{cancelResult.canceledAmount?.toLocaleString()}원</p>
                      </div>
                      <div>
                        <p className="text-slate-400">남은 금액</p>
                        <p className="text-white font-medium">{cancelResult.balanceAmount?.toLocaleString()}원</p>
                      </div>
                      <div>
                        <p className="text-slate-400">취소 일시</p>
                        <p className="text-white font-medium">
                          {cancelResult.canceledAt 
                            ? new Date(cancelResult.canceledAt).toLocaleString("ko-KR")
                            : "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">취소 사유</p>
                        <p className="text-white font-medium">{cancelResult.cancelReason}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-amber-500/20 border border-amber-500/50 rounded-lg p-4 text-sm text-amber-200">
                  <p className="font-semibold mb-1">⚠️ 주의사항</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>취소된 결제는 복구할 수 없습니다</li>
                    <li>부분 취소는 남은 금액이 있을 때만 가능합니다</li>
                    <li>가상계좌 결제 취소 시 환불 계좌 정보가 필요합니다</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* API 정보 */}
        <Card className="mt-6 bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-lg">🔗 API 엔드포인트</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 text-sm">
              <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                <span className="text-slate-300">결제 승인</span>
                <code className="text-green-400 font-mono">POST /api/pay/confirm</code>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                <span className="text-slate-300">결제 조회</span>
                <code className="text-blue-400 font-mono">GET /api/pay/inquiry</code>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                <span className="text-slate-300">결제 취소</span>
                <code className="text-red-400 font-mono">POST /api/pay/cancel</code>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                <span className="text-slate-300">웹훅</span>
                <code className="text-purple-400 font-mono">POST /api/pay/webhook</code>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

