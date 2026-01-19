"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle, 
  XCircle, 
  SkipForward, 
  Package, 
  Printer,
  Truck,
  AlertCircle
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ExtraChargeStatusCardProps {
  status: string;
  data: any;
  orderId: string;
  onReturnShipmentCreated?: () => void;
}

const statusConfig: Record<string, {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  PENDING_CUSTOMER: {
    title: "추가 결제 대기중",
    description: "고객의 결제 또는 선택을 기다리고 있습니다",
    icon: <AlertCircle className="h-6 w-6" />,
    color: "text-orange-700",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
  },
  COMPLETED: {
    title: "추가 결제 완료",
    description: "고객이 추가 금액을 결제했습니다. 작업을 재개하세요.",
    icon: <CheckCircle className="h-6 w-6" />,
    color: "text-green-700",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  SKIPPED: {
    title: "기존 작업만 진행",
    description: "고객이 추가 작업 없이 기존 작업만 진행하기로 했습니다",
    icon: <SkipForward className="h-6 w-6" />,
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  RETURN_REQUESTED: {
    title: "반송 요청",
    description: "고객이 작업 취소 및 반송을 요청했습니다",
    icon: <Package className="h-6 w-6" />,
    color: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
};

export function ExtraChargeStatusCard({ 
  status, 
  data, 
  orderId,
  onReturnShipmentCreated 
}: ExtraChargeStatusCardProps) {
  const [isCreatingShipment, setIsCreatingShipment] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [returnTrackingNo, setReturnTrackingNo] = useState<string | null>(null);
  const [returnLabelUrl, setReturnLabelUrl] = useState<string | null>(null);

  const config = statusConfig[status];
  if (!config) return null;

  const managerPrice = data?.managerPrice || 0;
  const managerNote = data?.managerNote || "";
  const workerMemo = data?.workerMemo || "";
  const customerAction = data?.customerAction || "";
  const completedAt = data?.completedAt;
  const returnFee = data?.returnFee || 6000;

  // 반송 송장 생성
  const handleCreateReturnShipment = async () => {
    setIsCreatingShipment(true);
    try {
      const response = await fetch(`/api/orders/${orderId}/return-shipment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnFee }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "반송 송장 생성 실패");
      }

      setReturnTrackingNo(result.trackingNo);
      setReturnLabelUrl(result.labelUrl);
      setShowReturnDialog(true);
      onReturnShipmentCreated?.();
    } catch (error: any) {
      console.error("반송 송장 생성 실패:", error);
      alert(`반송 송장 생성 실패: ${error.message}`);
    } finally {
      setIsCreatingShipment(false);
    }
  };

  // 송장 출력
  const handlePrintLabel = () => {
    if (returnLabelUrl) {
      window.open(returnLabelUrl, "_blank");
    }
  };

  return (
    <>
      <Card className={`${config.bgColor} ${config.borderColor} border-2`}>
        <CardHeader className="pb-3">
          <CardTitle className={`flex items-center gap-3 ${config.color}`}>
            {config.icon}
            <div>
              <div className="text-lg">{config.title}</div>
              <div className="text-sm font-normal opacity-80">{config.description}</div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 요청 정보 */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-white rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">요청 금액</p>
              <p className="text-xl font-bold">₩{managerPrice.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">고객 선택</p>
              <Badge 
                variant="outline" 
                className={
                  customerAction === "PAY" ? "bg-green-100 text-green-800" :
                  customerAction === "SKIP" ? "bg-blue-100 text-blue-800" :
                  customerAction === "RETURN" ? "bg-red-100 text-red-800" :
                  "bg-gray-100 text-gray-800"
                }
              >
                {customerAction === "PAY" ? "💳 추가 결제" :
                 customerAction === "SKIP" ? "⏭️ 기존만 진행" :
                 customerAction === "RETURN" ? "📦 반송 요청" :
                 "⏳ 대기중"}
              </Badge>
            </div>
          </div>

          {/* 메모 */}
          {(managerNote || workerMemo) && (
            <div className="p-4 bg-white rounded-lg space-y-2">
              {managerNote && (
                <div>
                  <p className="text-xs text-muted-foreground">고객 안내 메시지</p>
                  <p className="text-sm">{managerNote}</p>
                </div>
              )}
              {workerMemo && (
                <div>
                  <p className="text-xs text-muted-foreground">작업자 메모</p>
                  <p className="text-sm">{workerMemo}</p>
                </div>
              )}
            </div>
          )}

          {/* 완료 시각 */}
          {completedAt && (
            <div className="text-sm text-muted-foreground">
              완료 시각: {new Date(completedAt).toLocaleString("ko-KR")}
            </div>
          )}

          {/* 반송 요청인 경우 송장 생성 버튼 */}
          {status === "RETURN_REQUESTED" && (
            <div className="pt-4 border-t border-dashed">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-red-700">반송 처리</p>
                  <p className="text-sm text-muted-foreground">
                    반송 배송비: ₩{returnFee.toLocaleString()} (고객 부담)
                  </p>
                </div>
              </div>
              
              {data?.returnTrackingNo ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-3 bg-white rounded-lg">
                    <Truck className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">반송 송장번호</p>
                      <p className="font-mono font-bold">{data.returnTrackingNo}</p>
                    </div>
                  </div>
                  {data?.returnLabelUrl && (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => window.open(data.returnLabelUrl, "_blank")}
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      송장 출력
                    </Button>
                  )}
                </div>
              ) : (
                <Button
                  className="w-full bg-red-600 hover:bg-red-700"
                  onClick={handleCreateReturnShipment}
                  disabled={isCreatingShipment}
                >
                  {isCreatingShipment ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      송장 생성중...
                    </>
                  ) : (
                    <>
                      <Package className="h-4 w-4 mr-2" />
                      반송 송장 생성
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 반송 송장 생성 완료 다이얼로그 */}
      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              반송 송장 생성 완료
            </DialogTitle>
            <DialogDescription>
              고객에게 반송할 송장이 생성되었습니다.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">송장번호</p>
              <p className="text-2xl font-mono font-bold">{returnTrackingNo}</p>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p>• 송장을 출력하여 상품에 부착해주세요</p>
              <p>• 우체국 택배 기사가 수거합니다</p>
              <p>• 반송 배송비 ₩{returnFee.toLocaleString()}은 고객에게 청구됩니다</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReturnDialog(false)}>
              닫기
            </Button>
            <Button onClick={handlePrintLabel} disabled={!returnLabelUrl}>
              <Printer className="h-4 w-4 mr-2" />
              송장 출력
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

