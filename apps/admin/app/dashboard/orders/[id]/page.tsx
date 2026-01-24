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
import { WorkOrderPrintDialog } from "@/components/orders/work-order-print-dialog";
import { LabelPrintDialog } from "@/components/orders/label-print-dialog";
import { ExtraChargeReviewDialog } from "@/components/orders/extra-charge-review-dialog";
import { ExtraChargeStatusCard } from "@/components/orders/extra-charge-status-card";
import { ReturnShipmentButton } from "@/components/orders/return-shipment-button";
import PointManagementDialog from "@/components/customers/PointManagementDialog";
import { Package, Truck, User, CreditCard, History, ExternalLink, Video, Play, Printer, FileText, XCircle, Coins, Copy, Send } from "lucide-react";

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
  const [pointDialogOpen, setPointDialogOpen] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [extraCharges, setExtraCharges] = useState<any[]>([]);
  
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
          console.log('👤 사용자 ID:', data.order.user_id);
          setOrder(data.order);
          setVideos(data.order.videos || []);
          
          // Load user data for point management
          if (data.order.user_id) {
            console.log('👤 사용자 데이터 로드 시작:', data.order.user_id);
            loadUserData(data.order.user_id);
          } else {
            console.warn('⚠️ 주문에 user_id가 없습니다! 자동 연결 시도...');
            // 자동으로 사용자 연결 시도
            await autoLinkUser();
          }

          // Load extra charge requests
          loadExtraCharges();
        }
      }
    } catch (error) {
      console.error('주문 로드 실패:', error);
    } finally {
      setIsLoadingOrder(false);
    }
  };

  const loadExtraCharges = async () => {
    try {
      const response = await fetch(`/api/orders/${params.id}/extra-charges`);
      if (response.ok) {
        const data = await response.json();
        setExtraCharges(data.requests || []);
      }
    } catch (error) {
      console.error('추가 비용 내역 로드 실패:', error);
    }
  };

  const autoLinkUser = async () => {
    try {
      console.log('🔗 자동 사용자 연결 시작...');
      const response = await fetch(`/api/orders/${params.id}/link-user`, {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ 사용자 연결 성공:', data);
        
        if (data.success) {
          // 주문 다시 로드
          const orderResponse = await fetch(`/api/orders/${params.id}`);
          if (orderResponse.ok) {
            const orderData = await orderResponse.json();
            if (orderData.success && orderData.order) {
              setOrder(orderData.order);
              if (orderData.order.user_id) {
                loadUserData(orderData.order.user_id);
              }
            }
          }
        }
      } else {
        console.error('❌ 사용자 연결 실패:', await response.json());
      }
    } catch (error) {
      console.error('❌ 자동 사용자 연결 오류:', error);
    }
  };

  const loadUserData = async (userId: string) => {
    try {
      console.log('👤 API 호출:', `/api/customers/${userId}`);
      const response = await fetch(`/api/customers/${userId}`);
      console.log('👤 API 응답 상태:', response.status);
      
      // Get response text first, then try to parse as JSON
      const responseText = await response.text();
      
      if (response.ok) {
        try {
          const data = JSON.parse(responseText);
          console.log('👤 API 응답 데이터:', data);
          if (data.success && data.customer) {
            setUserData(data.customer);
            console.log('✅ 사용자 데이터 설정 완료:', data.customer);
          } else {
            console.error('❌ 사용자 데이터 없음:', data);
          }
        } catch (jsonError) {
          console.error('❌ JSON 파싱 실패:', responseText);
        }
      } else {
        // Try to parse error response as JSON
        try {
          const errorData = JSON.parse(responseText);
          console.error('❌ API 오류 응답:', errorData);
        } catch (jsonError) {
          console.error('❌ API 오류 응답 (non-JSON):', response.status, responseText);
        }
      }
    } catch (error) {
      console.error('❌ 사용자 데이터 로드 실패:', error);
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
    if (type === 'box_open_video') return '박스오픈';
    if (type === 'packing_video') return '포장';
    if (type === 'work_video') return '작업';
    return type;
  };

  // 영상 시청 링크 생성
  const getVideoWatchUrl = (videoId: string) => {
    return `https://iframe.videodelivery.net/${videoId}`;
  };

  // 영상 링크 복사 (카카오톡 상담에서 전달용)
  const handleCopyVideoLink = async (video: MediaVideo) => {
    const watchUrl = getVideoWatchUrl(video.path);
    const videoTypeLabel = getVideoTypeLabel(video.type);
    
    try {
      await navigator.clipboard.writeText(watchUrl);
      alert(`✅ ${videoTypeLabel} 영상 링크가 복사되었습니다!\n\n카카오톡 상담 채널에서 고객님께 전달해주세요.\n\n${watchUrl}`);
    } catch (error) {
      // 클립보드 API 실패 시 prompt로 대체
      prompt(`${videoTypeLabel} 영상 링크를 복사하세요:`, watchUrl);
    }
  };

  // 영상 링크 + 안내 메시지 함께 복사 (상담용)
  const handleCopyVideoWithMessage = async (video: MediaVideo) => {
    const watchUrl = getVideoWatchUrl(video.path);
    const videoTypeLabel = getVideoTypeLabel(video.type);
    const customerName = order?.customer_name || "고객";
    
    // 상담용 메시지 템플릿
    const message = `안녕하세요 ${customerName}님, 모두의수선입니다.\n\n요청하신 ${videoTypeLabel} 영상 확인 링크를 보내드립니다.\n\n📹 영상 보기: ${watchUrl}\n\n영상 확인 후 추가 문의사항 있으시면 말씀해주세요.`;
    
    try {
      await navigator.clipboard.writeText(message);
      alert(`✅ 상담용 메시지가 복사되었습니다!\n\n카카오톡 상담 채널에 붙여넣기 해주세요.`);
    } catch (error) {
      prompt("상담용 메시지를 복사하세요:", message);
    }
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
  const boxOpenVideos = videos.filter(v => v.type === 'box_open_video').sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
  const inboundVideos = videos.filter(v => v.type === 'inbound_video').sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
  const outboundVideos = videos.filter(v => v.type === 'outbound_video').sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
  const packingVideos = videos.filter(v => v.type === 'packing_video').sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

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
          {/* 추가 비용 검토 다이얼로그 */}
          <ExtraChargeReviewDialog 
            orderId={displayOrder.id}
            requests={extraCharges}
            onReviewed={() => loadExtraCharges()}
          />
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

      {/* 추가 결제 현황 카드 */}
      {order?.extra_charge_status && (
        <ExtraChargeStatusCard 
          status={order.extra_charge_status}
          data={order.extra_charge_data}
          orderId={order.id}
          onReturnShipmentCreated={() => loadOrder()}
        />
      )}

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
            {/* 작업지시서는 입고처리(INBOUND/RECEIVED) 이후만 표시 */}
            {['INBOUND', 'RECEIVED', 'IN_REPAIR', 'REPAIR_COMPLETED', 'SHIPPED', 'DELIVERED', 'COMPLETED'].includes(displayOrder.status) && (
              <div className="pt-4 border-t">
                <WorkOrderPrintDialog order={order} />
              </div>
            )}
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
            {/* 포인트 관리는 항상 표시 */}
            {order?.user_id ? (
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-muted-foreground">포인트 잔액</p>
                  <p className="text-xl font-bold text-blue-600">
                    {userData ? (userData.point_balance || 0).toLocaleString() : '로딩중...'}P
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    console.log('🔵 포인트 관리 버튼 클릭');
                    console.log('🔵 Order user_id:', order.user_id);
                    console.log('🔵 User data:', userData);
                    setPointDialogOpen(true);
                  }}
                >
                  <Coins className="h-4 w-4 mr-2" />
                  포인트 관리
                </Button>
              </div>
            ) : isLoadingOrder ? (
              <div className="pt-4 border-t">
                <p className="text-sm text-blue-600">🔗 사용자 연결 중...</p>
              </div>
            ) : (
              <div className="pt-4 border-t">
                <p className="text-sm text-orange-600">⚠️ 사용자 연결 실패</p>
                <p className="text-xs text-muted-foreground mt-1">
                  페이지를 새로고침하거나 관리자에게 문의하세요.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => window.location.reload()}
                >
                  새로고침
                </Button>
              </div>
            )}
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
                    {/* 수거송장은 출력 버튼 불필요 */}
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
                    {/* 배송 송장 출력 - 운송장번호 발급 시에만 표시 */}
                    <LabelPrintDialog 
                      trackingNo={displayOrder.deliveryTrackingNo} 
                      type="delivery"
                      orderId={displayOrder.id}
                    />
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

            {/* 반송 송장 정보 - 반송 요청 상태인 경우에만 표시 */}
            {order?.extra_charge_status === 'RETURN_REQUESTED' && (
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-red-600 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    반송 송장
                  </p>
                  {!order?.extra_charge_data?.returnTrackingNo && (
                    <ReturnShipmentButton 
                      orderId={displayOrder.id}
                      onCreated={() => loadOrder()}
                    />
                  )}
                </div>
                {order?.extra_charge_data?.returnTrackingNo ? (
                  <div className="flex items-center gap-2">
                    <p className="font-medium font-mono text-sm">
                      {order.extra_charge_data.returnTrackingNo}
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigator.clipboard.writeText(order.extra_charge_data.returnTrackingNo)}
                    >
                      복사
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(
                        `https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=${order.extra_charge_data.returnTrackingNo}`,
                        '_blank'
                      )}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      추적
                    </Button>
                    <LabelPrintDialog 
                      trackingNo={order.extra_charge_data.returnTrackingNo} 
                      type="return"
                      orderId={displayOrder.id}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    반송 송장이 아직 생성되지 않았습니다
                  </p>
                )}
              </div>
            )}
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

      {/* Box Open Videos (CS용) */}
      {boxOpenVideos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-orange-600" />
              📦 박스오픈 영상
              <Badge variant="outline" className="ml-2 text-orange-600 border-orange-300">CS용</Badge>
            </CardTitle>
            <CardDescription>입고 시 박스 개봉 영상입니다 (CS 분쟁 시 고객에게 공유 가능)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {boxOpenVideos.map((video) => (
                <Card key={video.id} className="overflow-hidden border-orange-200">
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
                  </div>
                  <CardContent className="p-3 space-y-2">
                    <p className="font-medium text-sm">박스오픈 영상</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(video.created_at).toLocaleDateString('ko-KR')}
                    </p>
                    {/* 공유 버튼 (카카오톡 상담용) */}
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => handleCopyVideoLink(video)}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        링크만 복사
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1 text-xs bg-yellow-500 hover:bg-yellow-600 text-black"
                        onClick={() => handleCopyVideoWithMessage(video)}
                      >
                        <Send className="h-3 w-3 mr-1" />
                        상담용 복사
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inbound Videos */}
      {inboundVideos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-blue-600" />
              📥 입고 영상
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
              <Video className="h-5 w-5 text-purple-600" />
              📤 출고 영상
            </CardTitle>
            <CardDescription>출고 시 촬영된 영상입니다</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {outboundVideos.map((video) => (
                <Card key={video.id} className="overflow-hidden border-purple-200">
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
                        <Badge className="bg-purple-600">#{video.sequence}</Badge>
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

      {/* Packing Videos */}
      {packingVideos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-green-600" />
              🎁 포장 완료 영상
              <Badge variant="outline" className="ml-2 text-green-600 border-green-300">CS용</Badge>
            </CardTitle>
            <CardDescription>출고 시 포장 완료 상태 영상입니다 (CS 분쟁 시 고객에게 공유 가능)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {packingVideos.map((video) => (
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
                  </div>
                  <CardContent className="p-3 space-y-2">
                    <p className="font-medium text-sm">포장 완료 영상</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(video.created_at).toLocaleDateString('ko-KR')}
                    </p>
                    {/* 공유 버튼 (카카오톡 상담용) */}
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => handleCopyVideoLink(video)}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        링크만 복사
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1 text-xs bg-yellow-500 hover:bg-yellow-600 text-black"
                        onClick={() => handleCopyVideoWithMessage(video)}
                      >
                        <Send className="h-3 w-3 mr-1" />
                        상담용 복사
                      </Button>
                    </div>
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

      {/* Point Management Dialog - 항상 사용 가능 */}
      {order?.user_id && (
        <PointManagementDialog
          open={pointDialogOpen}
          onOpenChange={setPointDialogOpen}
          customerId={order.user_id}
          customerName={displayOrder.customerName}
          currentBalance={userData?.point_balance || 0}
          onSuccess={() => {
            if (order.user_id) {
              loadUserData(order.user_id);
            }
            loadOrder();
          }}
        />
      )}
    </div>
  );
}

