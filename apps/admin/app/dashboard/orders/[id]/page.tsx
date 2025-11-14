"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OrderTimeline } from "@/components/orders/order-timeline";
import { VideoUpload } from "@/components/orders/video-upload";
import { StatusChangeDialog } from "@/components/orders/status-change-dialog";
import { PaymentRefundDialog } from "@/components/orders/payment-refund-dialog";
import { Package, Truck, User, CreditCard, History } from "lucide-react";

interface OrderDetailPageProps {
  params: {
    id: string;
  };
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  const router = useRouter();
  
  // TODO: Fetch order data from Supabase
  const order = {
    id: params.id,
    customerName: "홍길동",
    customerEmail: "customer@example.com",
    customerPhone: "010-1234-5678",
    item: "청바지 기장 수선",
    description: "기장을 3cm 줄여주세요",
    trackingNo: "MOCK1706174400123",
    labelUrl: "https://mock.epost.go.kr/label/MOCK1706174400123.pdf",
    status: "PROCESSING",
    amount: 15000,
    paymentMethod: "신용카드",
    paymentId: "PAY-2024-0001",
    paymentStatus: "COMPLETED",
    createdAt: "2024.01.15 14:30",
    pickupAddress: "서울시 강남구 테헤란로 123",
    deliveryAddress: "서울시 강남구 테헤란로 123",
  };

  // Mock payment history
  const paymentHistory = [
    {
      id: "PAY-2024-0001",
      type: "결제",
      amount: 15000,
      status: "완료",
      date: "2024.01.15 14:30",
    },
  ];

  // if (!order) {
  //   router.push('/dashboard/orders');
  //   return null;
  // }

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">주문 상세</h1>
          <div className="flex items-center gap-3 mt-2">
            <p className="text-muted-foreground">{order.id}</p>
            {order.trackingNo && (
              <Badge variant="outline" className="font-mono text-sm">
                송장: {order.trackingNo}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {order.labelUrl && (
            <Button variant="outline" onClick={() => window.open(order.labelUrl, '_blank')}>
              송장 출력
            </Button>
          )}
          <StatusChangeDialog
            orderId={order.id}
            trackingNo={order.trackingNo}
            currentStatus={order.status}
            onStatusChanged={() => window.location.reload()}
          />
        </div>
      </div>

      {/* Timeline */}
      <OrderTimeline status={order.status} />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Order Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              주문 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">수선 항목</p>
              <p className="font-medium">{order.item}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">상세 설명</p>
              <p className="font-medium">{order.description}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">주문 일시</p>
              <p className="font-medium">{order.createdAt}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">상태</p>
              <Badge>수선중</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              고객 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">고객명</p>
              <p className="font-medium">{order.customerName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">이메일</p>
              <p className="font-medium">{order.customerEmail}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">연락처</p>
              <p className="font-medium">{order.customerPhone}</p>
            </div>
          </CardContent>
        </Card>

        {/* Payment Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                결제 정보
              </CardTitle>
              {order.paymentStatus === "COMPLETED" && (
                <PaymentRefundDialog
                  orderId={order.id}
                  paymentId={order.paymentId}
                  originalAmount={order.amount}
                  paymentMethod={order.paymentMethod}
                  onRefunded={() => window.location.reload()}
                />
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">결제 금액</p>
              <p className="text-2xl font-bold">₩{order.amount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">결제 방법</p>
              <p className="font-medium">{order.paymentMethod}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">결제 상태</p>
              <Badge
                variant={
                  order.paymentStatus === "COMPLETED"
                    ? "default"
                    : order.paymentStatus === "PENDING"
                    ? "secondary"
                    : "destructive"
                }
              >
                {order.paymentStatus === "COMPLETED"
                  ? "결제 완료"
                  : order.paymentStatus === "PENDING"
                  ? "결제 대기"
                  : "결제 실패"}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">결제 ID</p>
              <p className="font-medium font-mono text-sm">{order.paymentId}</p>
            </div>
          </CardContent>
        </Card>

        {/* Shipping Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              배송 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">송장번호</p>
              <div className="flex items-center gap-2">
                <p className="font-medium font-mono">{order.trackingNo}</p>
                {order.trackingNo && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigator.clipboard.writeText(order.trackingNo)}
                  >
                    복사
                  </Button>
                )}
              </div>
            </div>
            {order.labelUrl && (
              <div>
                <p className="text-sm text-muted-foreground">송장 라벨</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(order.labelUrl, '_blank')}
                  className="mt-1"
                >
                  PDF 다운로드
                </Button>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">택배사</p>
              <p className="font-medium">우체국 택배</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">수거지</p>
              <p className="font-medium">{order.pickupAddress}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">배송지</p>
              <p className="font-medium">{order.deliveryAddress}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            결제 이력
          </CardTitle>
          <CardDescription>결제 및 환불 내역입니다</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {paymentHistory.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <p className="font-medium">{payment.type}</p>
                  <p className="text-sm text-muted-foreground">
                    {payment.id} • {payment.date}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`font-medium ${
                      payment.type.includes("환불") || payment.type.includes("취소")
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    {payment.type.includes("환불") || payment.type.includes("취소") ? "-" : "+"}
                    ₩{payment.amount.toLocaleString()}
                  </p>
                  <Badge
                    variant={
                      payment.status === "완료"
                        ? "default"
                        : payment.status === "대기"
                        ? "secondary"
                        : "destructive"
                    }
                    className="mt-1"
                  >
                    {payment.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Video Upload */}
      <VideoUpload orderId={order.id} trackingNo={order.trackingNo} />
    </div>
  );
}

