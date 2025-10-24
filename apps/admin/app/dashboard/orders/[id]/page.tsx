import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OrderTimeline } from "@/components/orders/order-timeline";
import { VideoUpload } from "@/components/orders/video-upload";
import { Package, Truck, User, CreditCard } from "lucide-react";

interface OrderDetailPageProps {
  params: {
    id: string;
  };
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  // TODO: Fetch order data from Supabase
  const order = {
    id: params.id,
    customerName: "홍길동",
    customerEmail: "customer@example.com",
    customerPhone: "010-1234-5678",
    item: "청바지 기장 수선",
    description: "기장을 3cm 줄여주세요",
    trackingNo: "1234567890",
    status: "PROCESSING",
    amount: 15000,
    paymentMethod: "신용카드",
    createdAt: "2024.01.15 14:30",
    pickupAddress: "서울시 강남구 테헤란로 123",
    deliveryAddress: "서울시 강남구 테헤란로 123",
  };

  if (!order) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">주문 상세</h1>
          <p className="text-muted-foreground">{order.id}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">송장 출력</Button>
          <Button>상태 변경</Button>
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
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              결제 정보
            </CardTitle>
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
              <p className="font-medium font-mono">{order.trackingNo}</p>
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

      {/* Video Upload */}
      <VideoUpload orderId={order.id} trackingNo={order.trackingNo} />
    </div>
  );
}

