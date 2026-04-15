"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Truck, Package, CheckCircle, Clock, XCircle, CreditCard,
  MapPin, ChevronRight, RefreshCw, Scissors, MessageCircle,
  ReceiptText, Copy, Check, Video, Play, X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatPrice, ORDER_STATUS_MAP } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface RepairItem {
  name: string;
  price?: number;
  quantity?: number;
}

interface OrderData {
  id: string;
  order_number?: string;
  status: string;
  extra_charge_status?: string;
  extra_charge_data?: {
    managerPrice?: number;
    managerNote?: string;
    workerMemo?: string;
  };
  item_name?: string;
  clothing_type?: string;
  repair_type?: string;
  total_price?: number;
  payment_method?: string;
  created_at?: string;
  pickup_address?: string;
  pickup_address_detail?: string;
  delivery_address?: string;
  delivery_address_detail?: string;
  memo?: string;
  pickup_date?: string;
  tracking_no?: string;
  repair_items?: RepairItem[];
}

interface ShipmentData {
  tracking_no?: string;
  pickup_tracking_no?: string;
  delivery_tracking_no?: string;
  carrier?: string;
  status?: string;
}

// 6단계 타임라인 (수거완료 포함)
const TIMELINE_STEPS = [
  { key: "BOOKED",        label: "수거예약", icon: Clock },
  { key: "PICKED_UP",     label: "수거완료", icon: Truck },
  { key: "INBOUND",       label: "입고완료", icon: Package },
  { key: "PROCESSING",    label: "수선중",   icon: Scissors },
  { key: "READY_TO_SHIP", label: "출고완료", icon: Truck },
  { key: "DELIVERED",     label: "배송완료", icon: CheckCircle },
];

const DB_STATUS_STEP: Record<string, number> = {
  PENDING_PAYMENT: -1,
  BOOKED:          0,
  PICKED_UP:       1,
  INBOUND:         2,
  PROCESSING:      3,
  READY_TO_SHIP:   4,
  DELIVERED:       5,
  CANCELLED:       -1,
};

function getPaymentMethodLabel(method?: string): string {
  if (!method) return "미결제";
  const map: Record<string, string> = {
    CARD: "신용카드", VIRTUAL_ACCOUNT: "가상계좌", TRANSFER: "계좌이체",
    MOBILE: "휴대폰결제", BILLING: "정기결제", TOSS: "토스페이",
    NAVERPAY: "네이버페이", KAKAOPAY: "카카오페이",
  };
  return map[method.toUpperCase()] ?? method;
}

function formatOrderNumber(id?: string, orderNumber?: string): string {
  if (orderNumber) return orderNumber;
  if (!id) return "번호 없음";
  return `...${id.slice(-8)}`;
}

interface VideoItem {
  inbound: string;
  outbound: string;
}

function buildVideoUrl(path: string, provider: string): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  if (provider === "cloudflare") return `https://iframe.videodelivery.net/${path}`;
  return null;
}

export function OrderDetailClient({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [shipment, setShipment] = useState<ShipmentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inboundVideoUrl, setInboundVideoUrl] = useState<string | null>(null);
  const [outboundVideoUrl, setOutboundVideoUrl] = useState<string | null>(null);
  const [videoItems, setVideoItems] = useState<VideoItem[]>([]);
  const [activeVideo, setActiveVideo] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => { loadOrder(); }, [orderId]);

  async function loadOrder(silent = false) {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (data) {
        setOrder(data);
      const { data: s } = await supabase
        .from("shipments")
        .select("tracking_no, pickup_tracking_no, delivery_tracking_no, carrier, status")
        .eq("order_id", orderId)
        .maybeSingle();
        setShipment(s);
        await loadVideoUrls(s, data);
      }
    } catch { /* ignore */ } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  async function loadVideoUrls(s: ShipmentData | null, orderData: OrderData) {
    try {
      const candidates = [
        s?.pickup_tracking_no,
        s?.delivery_tracking_no,
        s?.tracking_no,
        orderData.id,
      ].filter((v): v is string => typeof v === "string" && v.length > 0);

      const seen = new Set<string>();
      const uniqueCandidates = candidates.filter((v) => {
        if (seen.has(v)) return false;
        seen.add(v);
        return true;
      });
      if (uniqueCandidates.length === 0) return;

      const supabase = createClient();
      const { data: videos } = await supabase
        .from("media")
        .select("type, path, provider, final_waybill_no, sequence")
        .in("final_waybill_no", uniqueCandidates)
        .in("type", ["inbound_video", "outbound_video"])
        .order("sequence", { ascending: true });

      if (!videos || videos.length === 0) return;

      const bySequence: Record<number, { inbound?: string; outbound?: string }> = {};
      let firstInbound: string | null = null;
      let firstOutbound: string | null = null;

      for (const v of videos) {
        const url = buildVideoUrl(v.path ?? "", v.provider ?? "");
        if (!url) continue;
        const seq: number = v.sequence ?? 1;
        bySequence[seq] = bySequence[seq] ?? {};
        if (v.type === "inbound_video") {
          bySequence[seq].inbound = url;
          if (!firstInbound) firstInbound = url;
        } else if (v.type === "outbound_video") {
          bySequence[seq].outbound = url;
          if (!firstOutbound) firstOutbound = url;
        }
      }

      const items: VideoItem[] = Object.keys(bySequence)
        .map(Number)
        .sort((a, b) => a - b)
        .filter((seq) => bySequence[seq].inbound && bySequence[seq].outbound)
        .map((seq) => ({
          inbound: bySequence[seq].inbound!,
          outbound: bySequence[seq].outbound!,
        }));

      setInboundVideoUrl(firstInbound);
      setOutboundVideoUrl(firstOutbound);
      setVideoItems(items);
    } catch { /* ignore */ }
  }

  async function handleCancel() {
    if (!confirm("수거 예약을 취소하시겠습니까?\n취소 후에는 되돌릴 수 없습니다.")) return;
    setIsCancelling(true);
    try {
      const supabase = createClient();
      await supabase.from("orders").update({ status: "CANCELLED" }).eq("id", orderId);
      setOrder((prev) => prev ? { ...prev, status: "CANCELLED" } : prev);
    } finally {
      setIsCancelling(false);
    }
  }

  function openKakaoChat() {
    const orderInfo = [
      "안녕하세요, 모두의수선 고객입니다.",
      "",
      "📦 문의 주문 정보",
      "─────────────",
      `주문번호: ${formatOrderNumber(order?.id, order?.order_number)}`,
      `의류: ${order?.clothing_type ?? "-"}`,
      `수선: ${order?.item_name ?? "-"}`,
      `상태: ${ORDER_STATUS_MAP[order?.status ?? ""]?.label ?? order?.status}`,
      ...(trackingNo ? [`송장번호: ${trackingNo}`] : []),
      "─────────────",
      "",
      "문의 내용:",
    ].join("\n");

    navigator.clipboard.writeText(orderInfo).catch(() => {});
    window.open("https://pf.kakao.com/_dLhAX/chat", "_blank");
  }

  async function copyOrderNumber() {
    const num = formatOrderNumber(order?.id, order?.order_number);
    await navigator.clipboard.writeText(num).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-16 text-center">
        <p className="text-gray-400 text-sm mb-3">주문 정보를 찾을 수 없습니다.</p>
        <button onClick={() => router.back()} className="text-sm text-[#00C896] font-semibold">
          돌아가기
        </button>
      </div>
    );
  }

  const statusInfo = ORDER_STATUS_MAP[order.status] ?? ORDER_STATUS_MAP["BOOKED"];
  const currentStep = DB_STATUS_STEP[order.status] ?? 0;
  const isCancelled = order.status === "CANCELLED";
  const isPendingPayment = order.status === "PENDING_PAYMENT";
  const isPendingCharge = order.extra_charge_status === "PENDING_CUSTOMER";
  const canCancel = order.status === "BOOKED" || order.status === "PENDING_PAYMENT";
  // 카카오 문의용: 발송 송장 우선 → 회수 송장 → legacy
  const trackingNo =
    shipment?.delivery_tracking_no ??
    shipment?.pickup_tracking_no ??
    shipment?.tracking_no ??
    order.tracking_no;
  const repairItems: RepairItem[] = Array.isArray(order.repair_items) ? order.repair_items : [];

  return (
    <div className="pb-8">
      {/* 새로고침 버튼 */}
      <div className="flex justify-end px-4 pt-3">
        <button
          onClick={() => loadOrder(true)}
          disabled={isRefreshing}
          className="flex items-center gap-1 text-xs text-gray-400 active:text-gray-600"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
          새로고침
        </button>
      </div>

      {/* ── 결제 대기 배너 ── */}
      {isPendingPayment && (
        <Link
          href={`/payment?orderId=${orderId}`}
          className="flex items-center gap-3 mx-4 mt-2 p-4 bg-[#00C896]/10 border border-[#00C896]/30 rounded-2xl active:opacity-80"
        >
          <CreditCard className="w-5 h-5 text-[#00C896] shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-[#00C896]">결제가 필요합니다</p>
            {order.total_price != null && (
              <p className="text-xs text-gray-600 mt-0.5">
                결제 금액: <span className="font-bold text-gray-800">{formatPrice(order.total_price)}</span>
              </p>
            )}
            <p className="text-xs text-gray-500 mt-0.5">탭하여 결제를 완료해 주세요</p>
          </div>
          <ChevronRight className="w-4 h-4 text-[#00C896]" />
        </Link>
      )}

      {/* 추가결제 알림 */}
      {isPendingCharge && (
        <Link
          href={`/orders/${orderId}/extra-charge`}
          className="flex items-center gap-3 mx-4 mt-2 p-4 bg-orange-50 border border-orange-200 rounded-2xl active:opacity-80"
        >
          <CreditCard className="w-5 h-5 text-orange-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-orange-800">추가결제가 필요합니다</p>
            {order.extra_charge_data?.managerNote && (
              <p className="text-xs text-orange-600 mt-0.5 line-clamp-1">
                {order.extra_charge_data.managerNote}
              </p>
            )}
            {order.extra_charge_data?.managerPrice != null && (
              <p className="text-sm font-bold text-orange-700 mt-1">
                추가금액: {formatPrice(order.extra_charge_data.managerPrice)}
              </p>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-orange-400" />
        </Link>
      )}

      {/* ── 현재 상태 헤더 ── */}
      <div className="mx-4 mt-3 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 mb-1">
              주문번호:{" "}
              <button
                onClick={copyOrderNumber}
                className="font-mono text-gray-600 hover:text-[#00C896] inline-flex items-center gap-0.5"
              >
                {formatOrderNumber(order.id, order.order_number)}
                {copied ? (
                  <Check className="w-3 h-3 text-[#00C896]" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </p>
            <p className="font-bold text-gray-900 text-base truncate">
              {order.item_name ?? "수선 항목"}
            </p>
            {order.total_price != null && (
              <p className="text-lg font-bold text-[#00C896] mt-0.5">
                {formatPrice(order.total_price)}
              </p>
            )}
          </div>
          <span
            className={cn(
              "shrink-0 text-xs font-bold px-3 py-1.5 rounded-full",
              statusInfo.color, statusInfo.bgColor
            )}
          >
            {statusInfo.label}
          </span>
        </div>
        {order.created_at && (
          <p className="text-xs text-gray-400 mt-2">
            주문일시: {formatDate(order.created_at)}
          </p>
        )}
      </div>

      {/* ── 진행 현황 타임라인 (6단계) ── */}
      {!isCancelled && (
        <div className="mx-4 mt-3 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-4 bg-[#00C896] rounded-full" />
            <p className="text-sm font-bold text-gray-800">진행 현황</p>
          </div>
          <div className="flex items-start">
            {TIMELINE_STEPS.map((step, idx) => {
              const isCompleted = idx <= currentStep;
              const isCurrent = idx === currentStep;
              const Icon = step.icon;
              return (
                <div key={step.key} className="flex items-start flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center transition-colors ring-2 ring-offset-1",
                        isCompleted
                          ? "bg-[#00C896] ring-[#00C896]/30"
                          : "bg-gray-100 ring-transparent"
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-4 h-4",
                          isCompleted ? "text-white" : "text-gray-300"
                        )}
                      />
                    </div>
                    <p
                      className={cn(
                        "text-[10px] mt-1.5 text-center leading-tight font-medium",
                        isCurrent
                          ? "text-[#00C896] font-bold"
                          : isCompleted
                          ? "text-gray-600"
                          : "text-gray-300"
                      )}
                    >
                      {step.label}
                    </p>
                  </div>
                  {/* 연결선 */}
                  {idx < TIMELINE_STEPS.length - 1 && (
                    <div
                      className={cn(
                        "h-0.5 flex-1 mt-4 mx-0.5 rounded-full transition-colors",
                        currentStep > idx ? "bg-[#00C896]" : "bg-gray-200"
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 취소 상태 ── */}
      {isCancelled && (
        <div className="mx-4 mt-3 p-5 bg-red-50 border border-red-100 rounded-2xl">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-400" />
            <p className="text-sm font-bold text-red-700">취소된 주문입니다</p>
          </div>
          <p className="text-xs text-red-400 mt-1 pl-7">
            수거 예약이 취소되었습니다.
          </p>
        </div>
      )}

      {/* ── 주문 정보 ── */}
      <div className="mx-4 mt-3 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <ReceiptText className="w-4 h-4 text-[#00C896]" />
          <p className="text-sm font-bold text-gray-800">주문 정보</p>
        </div>
        <div className="space-y-3">
          <InfoRow label="의류 종류" value={order.clothing_type ?? "-"} />
          <InfoRow label="수선 항목" value={order.item_name ?? "-"} />
          {order.payment_method && (
            <InfoRow label="결제 방법" value={getPaymentMethodLabel(order.payment_method)} />
          )}
          <div className="border-t border-gray-100 pt-3 mt-1">
            <InfoRow
              label="결제 금액"
              value={order.total_price != null ? formatPrice(order.total_price) : "미결제"}
              highlight
            />
          </div>
        </div>
      </div>

      {/* ── 수선 항목 상세 ── */}
      {repairItems.length > 0 && (
        <div className="mx-4 mt-3 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Scissors className="w-4 h-4 text-[#00C896]" />
            <p className="text-sm font-bold text-gray-800">수선 항목 상세</p>
          </div>
          <div className="space-y-2.5">
            {repairItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00C896] shrink-0" />
                  <span className="text-sm text-gray-700">{item.name}</span>
                  {(item.quantity ?? 1) > 1 && (
                    <span className="text-xs text-gray-400">×{item.quantity}</span>
                  )}
                </div>
                {item.price != null && item.price > 0 && (
                  <span className="text-sm font-semibold text-gray-700">
                    {formatPrice(item.price)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 주소 정보 ── */}
      {(order.pickup_address || order.delivery_address) && (
        <div className="mx-4 mt-3 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-[#00C896]" />
            <p className="text-sm font-bold text-gray-800">주소 정보</p>
          </div>
          {order.pickup_address && (
            <div className={order.delivery_address ? "mb-3" : ""}>
              <p className="text-xs font-semibold text-gray-400 mb-1">수거 주소</p>
              <p className="text-sm text-gray-700">{order.pickup_address}</p>
              {order.pickup_address_detail && (
                <p className="text-sm text-gray-500 mt-0.5">{order.pickup_address_detail}</p>
              )}
            </div>
          )}
          {order.delivery_address && (
            <div className={order.pickup_address ? "pt-3 border-t border-gray-50" : ""}>
              <p className="text-xs font-semibold text-gray-400 mb-1">배송 주소</p>
              <p className="text-sm text-gray-700">{order.delivery_address}</p>
              {order.delivery_address_detail && (
                <p className="text-sm text-gray-500 mt-0.5">{order.delivery_address_detail}</p>
              )}
            </div>
          )}
          {order.pickup_date && (
            <p className="text-xs text-[#00C896] font-medium mt-2">
              수거 예정일: {formatDate(order.pickup_date)}
            </p>
          )}
          {order.memo && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400">메모</p>
              <p className="text-sm text-gray-600 mt-0.5">{order.memo}</p>
            </div>
          )}
        </div>
      )}

      {/* ── 입출고 영상 ── */}
      {(inboundVideoUrl || outboundVideoUrl) && (
        <div className="mx-4 mt-3 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Video className="w-4 h-4 text-[#00C896]" />
            <p className="text-sm font-bold text-gray-800">입출고 영상</p>
          </div>

          {/* 전후 비교 카드 (둘 다 있을 때 우선 표시) */}
          {inboundVideoUrl && outboundVideoUrl ? (
            <button
              onClick={() => setActiveVideo({ url: inboundVideoUrl, title: "입고 영상" })}
              className="w-full p-4 rounded-xl border-2 border-[#00C896]/30 bg-gradient-to-br from-[#00C896]/10 to-[#00C896]/5 active:opacity-80 text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#00C896] flex items-center justify-center shrink-0">
                  <Play className="w-6 h-6 text-white ml-0.5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">입출고 전후 영상</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {videoItems.length > 1
                      ? `${videoItems.length}개 아이템 영상`
                      : "입고 영상과 출고 영상 보기"}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#00C896] ml-auto" />
              </div>
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <VideoCard
                title="입고 영상"
                url={inboundVideoUrl}
                onPlay={(url) => setActiveVideo({ url, title: "입고 영상" })}
              />
              <VideoCard
                title="출고 영상"
                url={outboundVideoUrl}
                onPlay={(url) => setActiveVideo({ url, title: "출고 영상" })}
              />
            </div>
          )}

          {/* 개별 영상 버튼 (둘 다 있을 때 하단에 추가 표시) */}
          {inboundVideoUrl && outboundVideoUrl && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <VideoCard
                title="입고 영상"
                url={inboundVideoUrl}
                onPlay={(url) => setActiveVideo({ url, title: "입고 영상" })}
                compact
              />
              <VideoCard
                title="출고 영상"
                url={outboundVideoUrl}
                onPlay={(url) => setActiveVideo({ url, title: "출고 영상" })}
                compact
              />
            </div>
          )}
        </div>
      )}

      {/* ── 배송 정보 / 우체국 배송 추적 ── */}
      {!isCancelled && !isPendingPayment && (
        <div className={cn(
          "mx-4 mt-3 p-5 bg-white border rounded-2xl shadow-sm",
          (shipment?.pickup_tracking_no || shipment?.delivery_tracking_no || order.tracking_no)
            ? "border-[#00C896]/30"
            : "border-gray-100"
        )}>
          <div className="flex items-center gap-2 mb-4">
            <Truck className={cn(
              "w-4 h-4",
              (shipment?.pickup_tracking_no || shipment?.delivery_tracking_no || order.tracking_no)
                ? "text-[#00C896]"
                : "text-gray-400"
            )} />
            <p className="text-sm font-bold text-gray-800">배송 추적</p>
            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
              {shipment?.carrier ?? "우체국 택배"}
            </span>
          </div>

          <div className="space-y-2.5">
            {/* 회수 송장번호 */}
            {shipment?.pickup_tracking_no && (
              <div>
                <p className="text-[10px] text-gray-400 font-medium mb-1.5">회수 송장번호</p>
                {order.status === "BOOKED" ? (
                  <Link
                    href={`/orders/${orderId}/tracking?tracking_no=${shipment.pickup_tracking_no}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-200 active:bg-blue-100"
                  >
                    <p className="text-sm font-mono font-bold text-gray-800 tracking-widest">
                      {shipment.pickup_tracking_no}
                    </p>
                    <div className="flex items-center gap-1 text-blue-600 text-xs font-bold">
                      추적
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </Link>
                ) : (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <p className="text-sm font-mono font-bold text-gray-500 tracking-widest">
                      {shipment.pickup_tracking_no}
                    </p>
                    <span className="text-[10px] text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">수거 완료</span>
                  </div>
                )}
              </div>
            )}

            {/* 발송 송장번호 */}
            {shipment?.delivery_tracking_no && (
              <div>
                <p className="text-[10px] text-gray-400 font-medium mb-1.5">발송 송장번호</p>
                {(order.status === "READY_TO_SHIP" || order.status === "DELIVERED") ? (
                  <Link
                    href={`/orders/${orderId}/tracking?tracking_no=${shipment.delivery_tracking_no}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#00C896]/5 border border-[#00C896]/20 active:bg-[#00C896]/10"
                  >
                    <p className="text-sm font-mono font-bold text-gray-800 tracking-widest">
                      {shipment.delivery_tracking_no}
                    </p>
                    <div className="flex items-center gap-1 text-[#00C896] text-xs font-bold">
                      배송 추적
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </Link>
                ) : (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <p className="text-sm font-mono font-bold text-gray-500 tracking-widest">
                      {shipment.delivery_tracking_no}
                    </p>
                    <span className="text-[10px] text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">배송 준비 중</span>
                  </div>
                )}
              </div>
            )}

            {/* legacy tracking_no (pickup/delivery 모두 없을 때) */}
            {!shipment?.pickup_tracking_no && !shipment?.delivery_tracking_no && order.tracking_no && (
              <Link
                href={`/orders/${orderId}/tracking?tracking_no=${order.tracking_no}`}
                className="flex items-center justify-between p-3 rounded-xl bg-[#00C896]/5 border border-[#00C896]/20 active:bg-[#00C896]/10"
              >
                <div>
                  <p className="text-[10px] text-[#00C896] font-semibold mb-1">송장번호</p>
                  <p className="text-sm font-mono font-bold text-gray-800 tracking-widest">{order.tracking_no}</p>
                </div>
                <div className="flex items-center gap-1 text-[#00C896] text-xs font-bold">
                  배송 추적
                  <ChevronRight className="w-4 h-4" />
                </div>
              </Link>
            )}

            {/* 송장번호 없을 때 안내 */}
            {!shipment?.pickup_tracking_no && !shipment?.delivery_tracking_no && !order.tracking_no && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                <p className="text-sm text-gray-500">
                  {currentStep < 1
                    ? "수거 기사님이 방문 후 배송 추적이 시작됩니다"
                    : "배송 추적 정보가 곧 업데이트됩니다"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 비디오 모달 ── */}
      {activeVideo && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4"
          onClick={() => setActiveVideo(null)}
        >
          <div
            className="w-full max-w-[430px] bg-black rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <p className="text-white text-sm font-bold">{activeVideo.title}</p>
              <button
                onClick={() => setActiveVideo(null)}
                className="text-white/70 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-video w-full">
              {activeVideo.url.includes("iframe.videodelivery.net") ? (
                <iframe
                  src={activeVideo.url}
                  className="w-full h-full"
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={activeVideo.url}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 하단 액션 ── */}
      <div className="mx-4 mt-4 space-y-2.5">
        {/* 고객센터 문의 */}
        <button
          onClick={openKakaoChat}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#FEE500] text-[#3A1D1D] text-sm font-bold rounded-xl active:brightness-95"
        >
          <MessageCircle className="w-4 h-4" />
          카카오톡으로 문의하기
        </button>

        {/* 주문 취소 */}
        {canCancel && (
          <button
            onClick={handleCancel}
            disabled={isCancelling}
            className="w-full py-3.5 border border-red-200 text-red-500 text-sm font-medium rounded-xl active:bg-red-50 disabled:opacity-50"
          >
            {isCancelling ? "취소 중..." : "수거 예약 취소"}
          </button>
        )}
      </div>
    </div>
  );
}

function VideoCard({
  title,
  url,
  onPlay,
  compact = false,
}: {
  title: string;
  url: string | null;
  onPlay: (url: string) => void;
  compact?: boolean;
}) {
  const hasVideo = !!url;
  return (
    <button
      onClick={() => url && onPlay(url)}
      disabled={!hasVideo}
      className={cn(
        "w-full rounded-xl border flex flex-col items-center justify-center transition-colors",
        compact ? "py-3 gap-1.5" : "py-6 gap-3",
        hasVideo
          ? "border-[#00C896]/20 bg-[#00C896]/5 active:bg-[#00C896]/10"
          : "border-gray-200 bg-gray-50"
      )}
    >
      <div
        className={cn(
          "rounded-full flex items-center justify-center",
          compact ? "w-9 h-9" : "w-14 h-14",
          hasVideo ? "bg-[#00C896]" : "bg-gray-300"
        )}
      >
        {hasVideo ? (
          <Play className={cn("text-white ml-0.5", compact ? "w-4 h-4" : "w-6 h-6")} />
        ) : (
          <Clock className={cn("text-white", compact ? "w-4 h-4" : "w-6 h-6")} />
        )}
      </div>
      <div className="text-center">
        <p
          className={cn(
            "font-semibold",
            compact ? "text-xs" : "text-sm",
            hasVideo ? "text-gray-800" : "text-gray-500"
          )}
        >
          {title}
        </p>
        {!hasVideo && (
          <p className="text-[10px] text-gray-400 mt-0.5">준비 중</p>
        )}
      </div>
    </button>
  );
}

function InfoRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={cn("text-sm shrink-0", highlight ? "text-gray-600 font-semibold" : "text-gray-400")}>
        {label}
      </span>
      <span
        className={cn(
          "text-sm text-right",
          highlight ? "font-bold text-gray-900 text-base" : "font-medium text-gray-700"
        )}
      >
        {value}
      </span>
    </div>
  );
}
