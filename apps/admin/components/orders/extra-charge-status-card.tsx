"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  SkipForward,
  Package,
  Truck,
  AlertCircle,
  Printer,
} from "lucide-react";
import { LabelPrintDialog } from "@/components/orders/label-print-dialog";

interface ExtraChargeStatusCardProps {
  status: string;
  data: any;
  orderId: string;
  deliveryTrackingNo?: string | null;
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
  deliveryTrackingNo,
  onReturnShipmentCreated: _onReturnShipmentCreated,
}: ExtraChargeStatusCardProps) {
  const config = statusConfig[status];
  if (!config) return null;

  const managerPrice = data?.managerPrice || 0;
  const managerNote = data?.managerNote || "";
  const workerMemo = data?.workerMemo || "";
  const customerAction = data?.customerAction || "";
  const completedAt = data?.completedAt;
  const returnFee = data?.returnFee || 6000;

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

          {/* 반송 요청인 경우 출고 송장 재출력 안내 */}
          {status === "RETURN_REQUESTED" && (
            <div className="pt-4 border-t border-dashed space-y-3">
              <div>
                <p className="font-medium text-red-700">반송 처리</p>
                <p className="text-sm text-muted-foreground">
                  입고 시 발급된 출고 송장을 재출력하여 상품에 부착한 뒤 발송하세요.
                </p>
              </div>

              {deliveryTrackingNo ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-3 bg-white rounded-lg border">
                    <Truck className="h-5 w-5 text-blue-600 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">출고 송장번호 (반송에 사용)</p>
                      <p className="font-mono font-bold text-sm">{deliveryTrackingNo}</p>
                    </div>
                  </div>
                  <LabelPrintDialog
                    trackingNo={deliveryTrackingNo}
                    type="delivery"
                    orderId={orderId}
                    buttonLabel="출고 송장 재출력"
                    buttonClassName="w-full"
                    buttonVariant="outline"
                    buttonSize="default"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  출고 송장번호를 찾을 수 없습니다. 주문 상세의 배송 정보를 확인해 주세요.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

    </>
  );
}

