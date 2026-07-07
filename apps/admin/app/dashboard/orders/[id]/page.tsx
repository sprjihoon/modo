"use client";

import { useRouter, useParams } from "next/navigation";
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
import { canShowReturnShipmentUi, getEffectiveOrderStatus } from "@/lib/order-return-flow";
import PointManagementDialog from "@/components/customers/PointManagementDialog";
import { Package, Truck, User, CreditCard, History, ExternalLink, Video, Play, Printer, FileText, XCircle, Coins, Copy, Send, Tag, Image, RotateCcw, PlusCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface OrderDetailPageProps {
  // params is now handled via useParams() in Next.js 15
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

export default function OrderDetailPage(_props: OrderDetailPageProps) {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<any | null>(null);
  const [videos, setVideos] = useState<MediaVideo[]>([]);
  const [isLoadingOrder, setIsLoadingOrder] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<MediaVideo | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isCompletingReturn, setIsCompletingReturn] = useState(false);
  const [sendingPushVideoId, setSendingPushVideoId] = useState<string | null>(null);
  const [barcodes, setBarcodes] = useState<any[]>([]);
  const [photos, setPhotos] = useState<Record<number, { before?: string; after?: string }>>({});
  const [portonePaymentInfo, setPortonePaymentInfo] = useState<{
    totalAmount: number;
    cancelledAmount: number;
    cancellations: { amount: { total: number }; reason: string; cancelledAt: string }[];
  } | null>(null);

  const handleCompleteReturn = async () => {
    if (!order?.id) return;
    if (!confirm("반송을 완료 처리하시겠습니까?\n\n고객과 다른 관리자에게 알림이 발송되며, 주문은 '반송 완료' 상태로 전환됩니다.")) {
      return;
    }
    setIsCompletingReturn(true);
    try {
      const res = await fetch(`/api/admin/cancellations/${order.id}/complete-return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: "" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "처리 실패");
      alert("반송 완료 처리되었습니다.");
      await loadOrder();
    } catch (e: any) {
      alert(e?.message || "반송 완료 처리에 실패했습니다.");
    } finally {
      setIsCompletingReturn(false);
    }
  };
  const [pointDialogOpen, setPointDialogOpen] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [extraCharges, setExtraCharges] = useState<any[]>([]);

  // 추가 결제 요청 다이얼로그
  const [showExtraChargeDialog, setShowExtraChargeDialog] = useState(false);
  const [extraChargeReason, setExtraChargeReason] = useState("");
  const [extraChargeAmount, setExtraChargeAmount] = useState("");
  const [extraChargeNote, setExtraChargeNote] = useState("");
  const [isSubmittingExtraCharge, setIsSubmittingExtraCharge] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.success && d.user) setCurrentUserRole(d.user.role);
    }).catch(() => {});
  }, []);
  
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

          // Load barcodes and photos
          loadBarcodes(params.id);
          loadPhotos(params.id);

          // 부분취소 금액 표시를 위해 portone 조회
          if (
            data.order.payment_id &&
            data.order.payment_status === 'PARTIAL_CANCELED'
          ) {
            loadPortonePaymentInfo(data.order.payment_id);
          } else {
            setPortonePaymentInfo(null);
          }
          
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

  const loadPortonePaymentInfo = async (paymentId: string) => {
    try {
      const res = await fetch(`/api/pay/inquiry?paymentId=${encodeURIComponent(paymentId)}`);
      const data = await res.json();
      if (data.success && data.payment) {
        const cancellations = data.payment.cancellations ?? [];
        const cancelledAmount = cancellations.reduce(
          (sum: number, c: { amount?: { total?: number } }) => sum + (c.amount?.total ?? 0),
          0
        );
        setPortonePaymentInfo({
          totalAmount: data.payment.totalAmount ?? 0,
          cancelledAmount,
          cancellations,
        });
      }
    } catch (e) {
      console.warn("포트원 결제 정보 조회 실패:", e);
    }
  };

  const loadBarcodes = async (id: string) => {
    try {
      const res = await fetch(`/api/ops/barcodes?orderId=${encodeURIComponent(id)}`);
      const data = await res.json();
      if (data.success) setBarcodes(data.barcodes || []);
    } catch (e) {
      console.warn("바코드 로드 실패:", e);
    }
  };

  const loadPhotos = async (id: string) => {
    try {
      const res = await fetch(`/api/ops/photo/upload?orderId=${encodeURIComponent(id)}`);
      const data = await res.json();
      if (data.success) setPhotos(data.photos || {});
    } catch (e) {
      console.warn("사진 로드 실패:", e);
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

  const isManagerRole = ["MANAGER", "ADMIN", "SUPER_ADMIN"].includes(currentUserRole ?? "");

  const handleRequestExtraCharge = async () => {
    if (!extraChargeReason.trim() || !params.id) return;
    if (isManagerRole && (!extraChargeAmount || Number(extraChargeAmount) <= 0)) {
      alert("청구 금액을 입력해주세요."); return;
    }
    setIsSubmittingExtraCharge(true);
    try {
      const res = await fetch("/api/ops/extra-charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: params.id,
          reason: extraChargeReason.trim(),
          amount: extraChargeAmount ? Number(extraChargeAmount) : undefined,
          note: extraChargeNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "요청 실패");
      alert(data.message || (isManagerRole ? "고객에게 추가 결제 요청을 보냈습니다." : "관리자 승인 대기 중입니다."));
      setShowExtraChargeDialog(false);
      setExtraChargeReason("");
      setExtraChargeAmount("");
      setExtraChargeNote("");
      await loadOrder();
    } catch (e: any) {
      alert(e?.message || "추가 결제 요청에 실패했습니다.");
    } finally {
      setIsSubmittingExtraCharge(false);
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

  // CS 영상 앱 푸시 전송
  const handleSendCsVideoPush = async (video: MediaVideo) => {
    if (!order?.id) return;
    const videoTypeLabel = getVideoTypeLabel(video.type);

    if (!confirm(`고객(${order.customer_name || "고객"})에게 ${videoTypeLabel} 링크를 앱 푸시로 전송하시겠습니까?`)) {
      return;
    }

    setSendingPushVideoId(video.id);
    try {
      const res = await fetch("/api/admin/cs-video/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          videoId: video.path,
          videoType: video.type,
          videoLabel: videoTypeLabel,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "전송 실패");
      alert(`✅ ${data.message}`);
    } catch (e: any) {
      alert(`❌ 전송 실패: ${e.message}`);
    } finally {
      setSendingPushVideoId(null);
    }
  };

  const handleCancelShipment = async () => {
    const isPaid =
      order?.payment_id &&
      ['PAID', 'COMPLETED', 'DONE'].includes(order?.payment_status ?? '');

    const confirmMsg = isPaid
      ? '수거 예약을 취소하시겠습니까?\n\n✅ 우체국 수거 취소\n✅ 카드 결제 자동 취소 (전액 환불)\n\n취소 후에는 되돌릴 수 없습니다.'
      : '수거 예약을 취소하시겠습니까?\n\n우체국 전산에서 취소되며, 취소 후에는 되돌릴 수 없습니다.';

    if (!confirm(confirmMsg)) return;

    setIsCancelling(true);
    try {
      const response = await fetch(`/api/shipments/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: params.id }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        let msg = '수거 취소가 완료되었습니다.';
        if (result.paymentCanceled) {
          msg += '\n\n💳 카드 결제도 자동으로 취소되었습니다. (환불은 영업일 기준 3~5일 소요)';
        } else if (result.hasValidPayment && result.paymentCancelError) {
          msg += `\n\n⚠️ 수거는 취소됐으나 카드 취소에 실패했습니다.\n사유: ${result.paymentCancelError}\n\n결제 취소 메뉴에서 수동으로 처리해주세요.`;
        }
        alert(msg);
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
    paymentId: order.payment_id || order.id,
    paymentStatus: (() => {
      const s = order.payment_status;
      if (!s || s === 'PAID' || s === 'COMPLETED' || s === 'DONE') return 'COMPLETED';
      if (s === 'PENDING' || s === 'PENDING_PAYMENT' || s === 'WAITING') return 'PENDING';
      if (s === 'CANCELED' || s === 'CANCELLED') return 'CANCELED';
      if (s === 'PARTIAL_CANCELED') return 'PARTIAL_CANCELED';
      return s;
    })(),
    createdAt: new Date(order.created_at).toLocaleString('ko-KR'),
    pickupAddress: [order.pickup_address, order.pickup_address_detail].filter(Boolean).join(' ') || '주소 없음',
    deliveryAddress: [order.delivery_address, order.delivery_address_detail].filter(Boolean).join(' ') || '주소 없음',
    deliveryZipcode: order.delivery_zipcode || '',
    deliveryAddressUpdatedAt: order.delivery_address_updated_at || null,
    deliveryTrackingCreatedAt: order.shipment?.delivery_tracking_created_at || null,
  };

  // 배송지 변경 후 송장 재출력 필요 여부
  const needsLabelReprint = (() => {
    const { deliveryAddressUpdatedAt, deliveryTrackingNo, deliveryTrackingCreatedAt } = displayOrder;
    if (!deliveryAddressUpdatedAt || !deliveryTrackingNo) return false;
    if (deliveryTrackingCreatedAt) {
      return new Date(deliveryAddressUpdatedAt) > new Date(deliveryTrackingCreatedAt);
    }
    return true; // delivery_tracking_created_at 없으면 보수적으로 경고
  })();

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
          {/* 추가 결제 요청 버튼 */}
          {order && !["DELIVERED", "CANCELLED", "RETURN_DONE"].includes(order.status) && (
            <Button
              variant="outline"
              className="border-orange-300 text-orange-600 hover:bg-orange-50"
              onClick={() => setShowExtraChargeDialog(true)}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              추가 결제 요청
            </Button>
          )}
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
          {barcodes.length > 0 && (
            <Button variant="outline" onClick={() => window.open(`/ops/print/barcodes?orderId=${params.id}`, "_blank")}>
              <Tag className="h-4 w-4 mr-2" />
              바코드 출력
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
      <OrderTimeline status={displayOrder.status} order={order} />

      {/* 반송 처리 배너 */}
      {order && canShowReturnShipmentUi(order) && order.status !== "RETURN_DONE" && (
        <Card className="border-rose-300 bg-rose-50/40 dark:bg-rose-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3">
                <Package className="h-5 w-5 text-rose-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-rose-700">반송 처리 필요</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    아래 <strong>배송 정보</strong>의 출고 송장을 재출력하여 상품에 부착 후 발송하세요.
                    발송 완료 후 <strong>반송 완료 처리</strong>를 눌러 주문을 종료하세요.
                  </p>
                  {order?.cancellation_reason && (
                    <p className="text-xs text-rose-600 mt-1">취소 사유: {order.cancellation_reason}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {displayOrder.deliveryTrackingNo && (
                  <LabelPrintDialog
                    trackingNo={displayOrder.deliveryTrackingNo}
                    type="delivery"
                    orderId={displayOrder.id}
                    buttonLabel="출고 송장 재출력"
                    buttonVariant="outline"
                    buttonSize="default"
                  />
                )}
                <Button
                  onClick={handleCompleteReturn}
                  disabled={isCompletingReturn || !displayOrder.deliveryTrackingNo}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isCompletingReturn ? "처리중..." : (
                    <>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      반송 완료 처리
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 추가 결제 현황 카드 */}
      {order?.extra_charge_status && (
        <ExtraChargeStatusCard 
          status={order.extra_charge_status}
          data={order.extra_charge_data}
          orderId={order.id}
          deliveryTrackingNo={displayOrder.deliveryTrackingNo}
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
              <Badge>{
                ({
                  PAID: '결제완료', BOOKED: '수거예약', INBOUND: '입고완료',
                  PROCESSING: '수선중', HOLD: '작업대기', READY_TO_SHIP: '출고완료',
                  OUT_FOR_DELIVERY: '배송중', DELIVERED: '배송완료', CANCELLED: '취소',
                  RETURN_PENDING: '취소·반송대기', RETURN_SHIPPING: '취소·반송중', RETURN_DONE: '반송완료(종료)',
                } as Record<string,string>)[getEffectiveOrderStatus(order)] || getEffectiveOrderStatus(order)
              }</Badge>
            </div>
            {/* 작업지시서: 입고 이후 또는 추가결제 대기(HOLD) 상태에서도 출력 가능 */}
            {['INBOUND', 'PROCESSING', 'HOLD', 'READY_TO_SHIP', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(displayOrder.status) && (
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
              {(displayOrder.paymentStatus === "COMPLETED" || displayOrder.paymentStatus === "PARTIAL_CANCELED" || displayOrder.paymentStatus === "CANCELED") && (
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
              <div className="flex items-center gap-2 flex-wrap mt-1">
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
                    : displayOrder.paymentStatus === "CANCELED"
                    ? "결제 취소"
                    : displayOrder.paymentStatus === "PARTIAL_CANCELED"
                    ? "부분 취소"
                    : "결제 실패"}
                </Badge>
                {displayOrder.paymentStatus === "PARTIAL_CANCELED" && portonePaymentInfo && (
                  <span className="text-sm text-red-600 font-medium">
                    -{portonePaymentInfo.cancelledAmount.toLocaleString()}원 취소됨
                    <span className="text-muted-foreground font-normal ml-1">
                      (잔여 {(portonePaymentInfo.totalAmount - portonePaymentInfo.cancelledAmount).toLocaleString()}원)
                    </span>
                  </span>
                )}
              </div>
              {displayOrder.paymentStatus === "PARTIAL_CANCELED" && portonePaymentInfo?.cancellations && portonePaymentInfo.cancellations.length > 0 && (
                <div className="mt-2 space-y-1">
                  {portonePaymentInfo.cancellations.map((c, idx) => (
                    <div key={idx} className="text-xs text-muted-foreground bg-red-50 dark:bg-red-950/20 rounded px-2 py-1">
                      <span className="text-red-600 font-medium">-{(c.amount?.total ?? 0).toLocaleString()}원</span>
                      {" · "}{c.reason}
                      {" · "}{new Date(c.cancelledAt).toLocaleString("ko-KR")}
                    </div>
                  ))}
                </div>
              )}
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
                    <LabelPrintDialog 
                      trackingNo={displayOrder.deliveryTrackingNo} 
                      type="delivery"
                      orderId={displayOrder.id}
                      buttonLabel={order && canShowReturnShipmentUi(order) && order.status !== "RETURN_DONE" ? "재출력" : "출력"}
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
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm text-muted-foreground">배송지</p>
                {displayOrder.deliveryAddressUpdatedAt && (
                  <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded">
                    주소 변경됨
                  </span>
                )}
              </div>
              {displayOrder.deliveryZipcode && (
                <p className="text-xs text-muted-foreground mt-0.5">[{displayOrder.deliveryZipcode}]</p>
              )}
              <p className={`font-medium text-sm ${needsLabelReprint ? "text-red-700" : ""}`}>
                {displayOrder.deliveryAddress}
              </p>
              {displayOrder.deliveryAddressUpdatedAt && (
                <p className="text-xs text-amber-600 mt-0.5">
                  변경: {new Date(displayOrder.deliveryAddressUpdatedAt).toLocaleString("ko-KR")}
                </p>
              )}
            </div>

            {/* 송장 재출력 필요 알림 */}
            {needsLabelReprint && (
              <div className="p-3 bg-red-50 border border-red-300 rounded-lg">
                <div className="flex items-start gap-2">
                  <span className="text-red-600 text-base shrink-0">⚠️</span>
                  <div>
                    <p className="text-sm font-bold text-red-700">
                      송장 재출력 필요
                    </p>
                    <p className="text-xs text-red-600 mt-0.5">
                      고객이 출고 송장 생성 이후 배송 주소를 변경했습니다.
                      현재 주소로 송장을 재출력하여 기존 송장과 교체하세요.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 반송 처리 중일 때 배송 운송장으로 재출력 안내 */}
            {order && canShowReturnShipmentUi(order) && order.status !== "RETURN_DONE" && displayOrder.deliveryTrackingNo && (
              <div className="border-t pt-4 mt-2">
                <p className="text-xs text-rose-600 font-medium flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  반송 처리 중 — 위 출고 송장을 재출력하여 상품에 부착 후 발송하세요.
                </p>
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
                    {/* 공유 버튼 (카카오톡 상담용 + 앱 푸시) */}
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => handleCopyVideoLink(video)}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        링크 복사
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1 text-xs bg-yellow-500 hover:bg-yellow-600 text-black"
                        onClick={() => handleCopyVideoWithMessage(video)}
                      >
                        <Send className="h-3 w-3 mr-1" />
                        상담용
                      </Button>
                    </div>
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full text-xs bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={sendingPushVideoId === video.id}
                      onClick={() => handleSendCsVideoPush(video)}
                    >
                      {sendingPushVideoId === video.id ? (
                        <>전송 중...</>
                      ) : (
                        <>
                          <Send className="h-3 w-3 mr-1" />
                          고객 앱 푸시 전송
                        </>
                      )}
                    </Button>
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
                  <CardContent className="p-3 space-y-2">
                    <p className="font-medium text-sm">출고 영상 {video.sequence ? `#${video.sequence}` : ''}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(video.created_at).toLocaleDateString('ko-KR')}
                    </p>
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => handleCopyVideoLink(video)}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        링크 복사
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                        disabled={sendingPushVideoId === video.id}
                        onClick={() => handleSendCsVideoPush(video)}
                      >
                        {sendingPushVideoId === video.id ? (
                          <>전송 중...</>
                        ) : (
                          <>
                            <Send className="h-3 w-3 mr-1" />
                            앱 푸시 전송
                          </>
                        )}
                      </Button>
                    </div>
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
                    {/* 공유 버튼 */}
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => handleCopyVideoLink(video)}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        링크 복사
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1 text-xs bg-yellow-500 hover:bg-yellow-600 text-black"
                        onClick={() => handleCopyVideoWithMessage(video)}
                      >
                        <Send className="h-3 w-3 mr-1" />
                        상담용
                      </Button>
                    </div>
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full text-xs bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={sendingPushVideoId === video.id}
                      onClick={() => handleSendCsVideoPush(video)}
                    >
                      {sendingPushVideoId === video.id ? (
                        <>전송 중...</>
                      ) : (
                        <>
                          <Send className="h-3 w-3 mr-1" />
                          고객 앱 푸시 전송
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 내부 바코드 섹션 */}
      {barcodes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-indigo-600" />
              내부 바코드 ({barcodes.length}개)
            </CardTitle>
            <CardDescription>입고 시 생성된 내부 제품 바코드입니다</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {barcodes.map((bc: any) => (
                <div key={bc.id} className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <span className="text-xs bg-indigo-600 text-white px-1.5 py-0.5 rounded font-bold">
                    #{bc.seq}
                  </span>
                  <span className="font-mono text-sm font-medium text-indigo-800">{bc.barcode_no}</span>
                  {bc.item_name && <span className="text-xs text-gray-500">({bc.item_name})</span>}
                  {bc.printed_at && (
                    <span className="text-xs text-green-600">✓ 출력됨</span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/ops/print/barcodes?orderId=${params.id}`, "_blank")}
              >
                <Tag className="h-4 w-4 mr-1" />
                바코드 라벨 출력
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 수선 전/후 사진 섹션 */}
      {Object.keys(photos).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5 text-teal-600" />
              수선 전/후 사진
            </CardTitle>
            <CardDescription>입고(수선 전) 및 출고(수선 후) 시 촬영된 사진입니다</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(photos).map(([seqStr, photo]: [string, any]) => {
                const seq = parseInt(seqStr);
                return (
                  <div key={seq} className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">#{seq}번 아이템</p>
                    <div className="grid grid-cols-2 gap-2">
                      {photo.before ? (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">수선 전</p>
                          <a href={photo.before} target="_blank" rel="noopener noreferrer">
                            <img src={photo.before} alt={`#${seq} 수선전`} className="w-full aspect-square object-cover rounded border hover:opacity-80 transition-opacity" />
                          </a>
                        </div>
                      ) : (
                        <div className="w-full aspect-square bg-gray-100 rounded border flex items-center justify-center">
                          <span className="text-xs text-gray-400">수선 전 없음</span>
                        </div>
                      )}
                      {photo.after ? (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">수선 후</p>
                          <a href={photo.after} target="_blank" rel="noopener noreferrer">
                            <img src={photo.after} alt={`#${seq} 수선후`} className="w-full aspect-square object-cover rounded border hover:opacity-80 transition-opacity" />
                          </a>
                        </div>
                      ) : (
                        <div className="w-full aspect-square bg-gray-100 rounded border flex items-center justify-center">
                          <span className="text-xs text-gray-400">수선 후 없음</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
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

      {/* 추가 결제 요청 다이얼로그 */}
      <Dialog open={showExtraChargeDialog} onOpenChange={setShowExtraChargeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>추가 결제 요청</DialogTitle>
            <DialogDescription>
              {isManagerRole
                ? "추가 비용 금액과 사유를 입력하여 고객에게 청구하세요."
                : "추가 비용 발생 사유를 입력해주세요. 관리자가 검토 후 고객에게 안내합니다."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="ec-reason" className="mb-2 block">요청 사유 *</Label>
              <Textarea
                id="ec-reason"
                placeholder="예: 안감 교체 필요"
                value={extraChargeReason}
                onChange={(e) => setExtraChargeReason(e.target.value)}
                rows={3}
              />
            </div>
            {isManagerRole && (
              <>
                <div>
                  <Label htmlFor="ec-amount" className="mb-2 block">청구 금액 (원) *</Label>
                  <input
                    id="ec-amount"
                    type="number"
                    placeholder="10000"
                    value={extraChargeAmount}
                    onChange={(e) => setExtraChargeAmount(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <Label htmlFor="ec-note" className="mb-2 block">고객 안내 메시지 (선택)</Label>
                  <Textarea
                    id="ec-note"
                    placeholder="고객에게 전달할 내용"
                    value={extraChargeNote}
                    onChange={(e) => setExtraChargeNote(e.target.value)}
                    rows={2}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowExtraChargeDialog(false)}
              disabled={isSubmittingExtraCharge}
            >
              취소
            </Button>
            <Button
              onClick={handleRequestExtraCharge}
              disabled={!extraChargeReason.trim() || isSubmittingExtraCharge}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isSubmittingExtraCharge
                ? "요청 중..."
                : isManagerRole
                ? "고객에게 청구"
                : "요청 보내기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

