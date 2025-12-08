"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OrderTimeline } from "@/components/orders/order-timeline";
import { StatusChangeDialog } from "@/components/orders/status-change-dialog";
import { PaymentRefundDialog } from "@/components/orders/payment-refund-dialog";
import { TrackingManageDialog } from "@/components/orders/tracking-manage-dialog";
import { Package, Truck, User, CreditCard, History, ExternalLink, Video, Play, Printer, FileText, XCircle } from "lucide-react";

interface OrderDetailPageProps {
  params: {
    id: string;
  };
}

interface MediaVideo {
  id: string;
  final_waybill_no: string;
  type: string;
  provider: string;
  path: string;
  sequence?: number;
  created_at: string;
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  const router = useRouter();
  const [order, setOrder] = useState<any | null>(null);
  const [videos, setVideos] = useState<MediaVideo[]>([]);
  const [isLoadingOrder, setIsLoadingOrder] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<MediaVideo | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  
  // Load order data from API
  useEffect(() => {
    loadOrder();
  }, [params.id]);

  const loadOrder = async () => {
    setIsLoadingOrder(true);
    try {
      const response = await fetch(`/api/orders/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.order) {
          console.log('📦 주문 데이터 로드:', data.order);
          setOrder(data.order);
          setVideos(data.order.videos || []);
        }
      }
    } catch (error) {
      console.error('주문 로드 실패:', error);
    } finally {
      setIsLoadingOrder(false);
    }
  };

  const getVideoUrl = (video: MediaVideo) => {
    if (video.provider === 'cloudflare') {
      // Cloudflare Stream HLS URL (모바일 앱과 동일하게)
      return `https://customer-wn4smwc3lzqmm79i.cloudflarestream.com/${video.path}/manifest/video.m3u8`;
    }
    return video.path;
  };

  const getVideoTypeLabel = (type: string) => {
    if (type === 'inbound_video') return '입고';
    if (type === 'outbound_video') return '출고';
    return type;
  };

  const handleCancelShipment = async () => {
    if (!confirm('수거 예약을 취소하시겠습니까?\n\n우체국 전산에서 취소되며, 취소 후에는 되돌릴 수 없습니다.')) {
      return;
    }

    setIsCancelling(true);
    try {
      const response = await fetch(`/api/shipments/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_id: params.id,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert(`수거 취소가 완료되었습니다.\n\n${result.message || '수거 예약이 취소되었습니다.'}`);
        // 주문 정보 새로고침
        await loadOrder();
      } else {
        throw new Error(result.error || '수거 취소에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('수거 취소 실패:', error);
      alert(`수거 취소 실패\n\n${error.message || '알 수 없는 오류가 발생했습니다.'}`);
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoadingOrder) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">주문을 찾을 수 없습니다.</p>
        <Button onClick={() => router.push('/dashboard/orders')} className="mt-4">
          주문 목록으로
        </Button>
      </div>
    );
  }

  // Format order data for display
  const displayOrder = {
    id: order.id,
    customerName: order.customer_name || '고객명 없음',
    customerEmail: order.customer_email || '',
    customerPhone: order.customer_phone || '',
    item: order.item_name || `${order.clothing_type || ''} - ${order.repair_type || ''}`,
    description: order.item_description || order.item_name || '',
    trackingNo: order.tracking_no || order.shipment?.pickup_tracking_no || '',
    deliveryTrackingNo: order.shipment?.delivery_tracking_no,
    labelUrl: null as string | null,
    status: order.status,
    amount: order.total_price || 0,
    paymentMethod: order.payment_method || '신용카드',
    paymentId: order.payment_key || order.id,
    paymentStatus: order.payment_status || 'COMPLETED',
    createdAt: new Date(order.created_at).toLocaleString('ko-KR'),
    pickupAddress: [order.pickup_address, order.pickup_address_detail].filter(Boolean).join(' ') || '주소 없음',
    deliveryAddress: [order.delivery_address, order.delivery_address_detail].filter(Boolean).join(' ') || '주소 없음',
  };

  // Payment history
  const paymentHistory = [
    {
      id: displayOrder.paymentId,
      type: "결제",
      amount: displayOrder.amount,
      status: "완료",
      date: displayOrder.createdAt,
    },
  ];

  // Separate videos by type
  const inboundVideos = videos.filter(v => v.type === 'inbound_video').sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
  const outboundVideos = videos.filter(v => v.type === 'outbound_video').sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

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
            <p className="text-muted-foreground">{displayOrder.id}</p>
            {displayOrder.trackingNo && (
              <Badge variant="outline" className="font-mono text-sm">
                송장: {displayOrder.trackingNo}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {displayOrder.status === 'BOOKED' && displayOrder.trackingNo && (
            <Button 
              variant="destructive" 
              onClick={handleCancelShipment}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <>처리중...</>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  수거 취소
                </>
              )}
            </Button>
          )}
          {displayOrder.labelUrl && (
            <Button variant="outline" onClick={() => window.open(displayOrder.labelUrl!, '_blank')}>
              <Printer className="h-4 w-4 mr-2" />
              송장 출력
            </Button>
          )}
          <StatusChangeDialog
            orderId={displayOrder.id}
            trackingNo={displayOrder.trackingNo}
            currentStatus={displayOrder.status}
            onStatusChanged={() => loadOrder()}
          />
        </div>
      </div>

      {/* Timeline */}
      <OrderTimeline status={displayOrder.status} />

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
              <p className="font-medium">{displayOrder.item}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">상세 설명</p>
              <p className="font-medium">{displayOrder.description}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">주문 일시</p>
              <p className="font-medium">{displayOrder.createdAt}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">상태</p>
              <Badge>{displayOrder.status}</Badge>
            </div>
            <div className="pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  // TODO: 주문서 PDF 생성 및 출력
                  const orderInfo = `
주문서
─────────────────────
주문번호: ${displayOrder.id}
고객명: ${displayOrder.customerName}
수선 항목: ${displayOrder.item}
결제금액: ₩${displayOrder.amount.toLocaleString()}
주문일시: ${displayOrder.createdAt}
─────────────────────
수거지: ${displayOrder.pickupAddress}
배송지: ${displayOrder.deliveryAddress}
                  `.trim();
                  alert(`주문서 출력 기능\n\n${orderInfo}\n\n고객센터를 통해 주문서를 출력하실 수 있습니다.`);
                }}
              >
                <FileText className="h-4 w-4 mr-2" />
                주문서 출력
              </Button>
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
              <p className="font-medium">{displayOrder.customerName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">이메일</p>
              <p className="font-medium">{displayOrder.customerEmail}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">연락처</p>
              <p className="font-medium">{displayOrder.customerPhone}</p>
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
              {displayOrder.paymentStatus === "COMPLETED" && (
                <PaymentRefundDialog
                  orderId={displayOrder.id}
                  paymentId={displayOrder.paymentId}
                  originalAmount={displayOrder.amount}
                  paymentMethod={displayOrder.paymentMethod}
                  onRefunded={() => loadOrder()}
                />
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">결제 금액</p>
              <p className="text-2xl font-bold">₩{displayOrder.amount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">결제 방법</p>
              <p className="font-medium">{displayOrder.paymentMethod}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">결제 상태</p>
              <Badge
                variant={
                  displayOrder.paymentStatus === "COMPLETED"
                    ? "default"
                    : displayOrder.paymentStatus === "PENDING"
                    ? "secondary"
                    : "destructive"
                }
              >
                {displayOrder.paymentStatus === "COMPLETED"
                  ? "결제 완료"
                  : displayOrder.paymentStatus === "PENDING"
                  ? "결제 대기"
                  : "결제 실패"}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">결제 ID</p>
              <p className="font-medium font-mono text-sm">{displayOrder.paymentId}</p>
            </div>
          </CardContent>
        </Card>

        {/* Shipping Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                배송 정보
              </CardTitle>
              <TrackingManageDialog
                orderId={displayOrder.id}
                pickupTrackingNo={displayOrder.trackingNo}
                deliveryTrackingNo={displayOrder.deliveryTrackingNo}
                onUpdated={() => loadOrder()}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">수거 운송장번호</p>
              <div className="flex items-center gap-2">
                <p className="font-medium font-mono text-sm">{displayOrder.trackingNo || "-"}</p>
                {displayOrder.trackingNo && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigator.clipboard.writeText(displayOrder.trackingNo)}
                    >
                      복사
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(
                        `https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=${displayOrder.trackingNo}`,
                        '_blank'
                      )}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      추적
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // TODO: 송장 재출력 기능 (우체국 API 연동)
                        alert(`송장 재출력 기능\n송장번호: ${displayOrder.trackingNo}\n\n고객센터를 통해 재출력을 요청하실 수 있습니다.`);
                      }}
                    >
                      출력
                    </Button>
                  </>
                )}
              </div>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground mb-1">배송 운송장번호</p>
              <div className="flex items-center gap-2">
                <p className="font-medium font-mono text-sm text-muted-foreground">
                  {displayOrder.deliveryTrackingNo || "출고 시 발급"}
                </p>
                {displayOrder.deliveryTrackingNo && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigator.clipboard.writeText(displayOrder.deliveryTrackingNo)}
                    >
                      복사
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(
                        `https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=${displayOrder.deliveryTrackingNo}`,
                        '_blank'
                      )}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      추적
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // TODO: 송장 재출력 기능 (우체국 API 연동)
                        alert(`송장 재출력 기능\n송장번호: ${displayOrder.deliveryTrackingNo}\n\n고객센터를 통해 재출력을 요청하실 수 있습니다.`);
                      }}
                    >
                      출력
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground">택배사</p>
              <Badge variant="outline" className="mt-1">우체국 택배</Badge>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">수거지</p>
              <p className="font-medium text-sm">{displayOrder.pickupAddress}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">배송지</p>
              <p className="font-medium text-sm">{displayOrder.deliveryAddress}</p>
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

      {/* Inbound Videos */}
      {inboundVideos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-blue-600" />
              입고 영상
            </CardTitle>
            <CardDescription>입고 시 촬영된 영상입니다</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {inboundVideos.map((video) => (
                <Card key={video.id} className="overflow-hidden border-blue-200">
                  <div className="relative aspect-video bg-gray-900 flex items-center justify-center">
                    <Video className="h-12 w-12 text-gray-600" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedVideo(video)}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        재생
                      </Button>
                    </div>
                    {video.sequence && (
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-blue-600">#{video.sequence}</Badge>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <p className="font-medium text-sm">입고 영상 {video.sequence ? `#${video.sequence}` : ''}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(video.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Outbound Videos */}
      {outboundVideos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-green-600" />
              출고 영상
            </CardTitle>
            <CardDescription>출고 시 촬영된 영상입니다</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {outboundVideos.map((video) => (
                <Card key={video.id} className="overflow-hidden border-green-200">
                  <div className="relative aspect-video bg-gray-900 flex items-center justify-center">
                    <Video className="h-12 w-12 text-gray-600" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedVideo(video)}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        재생
                      </Button>
                    </div>
                    {video.sequence && (
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-green-600">#{video.sequence}</Badge>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <p className="font-medium text-sm">출고 영상 {video.sequence ? `#${video.sequence}` : ''}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(video.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Video Player Modal */}
      {selectedVideo && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedVideo(null)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">{getVideoTypeLabel(selectedVideo.type)} 영상</h2>
                <p className="text-sm text-gray-500">
                  {selectedVideo.sequence && `#${selectedVideo.sequence} • `}
                  {new Date(selectedVideo.created_at).toLocaleString('ko-KR')}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedVideo(null)}
              >
                닫기
              </Button>
            </div>
            <div className="p-4">
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  src={getVideoUrl(selectedVideo)}
                  controls
                  autoPlay
                  className="w-full h-full"
                >
                  브라우저가 비디오를 지원하지 않습니다.
                </video>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Provider</p>
                  <p className="font-medium">{selectedVideo.provider}</p>
                </div>
                <div>
                  <p className="text-gray-500">Video ID</p>
                  <p className="font-mono text-xs truncate">{selectedVideo.path}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

