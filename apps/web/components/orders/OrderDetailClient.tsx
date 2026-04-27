"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Truck, Package, CheckCircle, Clock, XCircle, CreditCard,
  MapPin, ChevronRight, RefreshCw, Scissors, MessageCircle,
  ReceiptText, Copy, Check, Video, Play, X, AlertTriangle,
  ArrowRight, RotateCcw, Pencil,
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
  payment_status?: string;
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
  remote_area_fee?: number;
  payment_method?: string;
  created_at?: string;
  pickup_address?: string;
  pickup_address_detail?: string;
  delivery_address?: string;
  delivery_address_detail?: string;
  delivery_zipcode?: string;
  notes?: string;
  memo?: string;
  pickup_date?: string;
  tracking_no?: string;
  repair_items?: RepairItem[];
  repair_parts?: RepairItem[];
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

// Daum 우편번호 전역 타입
declare global {
  interface Window {
    daum: {
      Postcode: new (options: {
        oncomplete: (data: {
          zonecode: string;
          address: string;
          addressType: string;
          jibunAddress: string;
          roadAddress: string;
        }) => void;
        width?: string;
        height?: string;
      }) => { embed: (el: HTMLElement) => void };
    };
  }
}

export function OrderDetailClient({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [shipment, setShipment] = useState<ShipmentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [returnShippingFee, setReturnShippingFee] = useState<number | null>(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inboundVideoUrl, setInboundVideoUrl] = useState<string | null>(null);
  const [outboundVideoUrl, setOutboundVideoUrl] = useState<string | null>(null);
  const [videoItems, setVideoItems] = useState<VideoItem[]>([]);
  const [activeVideo, setActiveVideo] = useState<{ url: string; title: string; comparisonUrl?: string; comparisonTitle?: string } | null>(null);
  const [isExtraActionLoading, setIsExtraActionLoading] = useState(false);

  // 배송지/메모 수정 상태
  const [isDeliveryEditOpen, setIsDeliveryEditOpen] = useState(false);
  const [editZipcode, setEditZipcode] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editAddressDetail, setEditAddressDetail] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [isSavingDelivery, setIsSavingDelivery] = useState(false);
  const [isAddressSearchOpen, setIsAddressSearchOpen] = useState(false);
  const addressContainerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);

  // loadOrder 는 아래에서 useCallback 으로 선언되며, useEffect 는 그 직후에 등록한다.

  // 입고 후 취소 안내용 — 관리자 페이지에 설정된 왕복 배송비
  useEffect(() => {
    let cancelled = false;
    fetch("/api/shipping-settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const fee = Number(data?.returnShippingFee);
        if (Number.isFinite(fee)) setReturnShippingFee(fee);
      })
      .catch(() => { /* 폴백: confirm 시 기본 안내 */ });
    return () => { cancelled = true; };
  }, []);

  // Daum 우편번호 스크립트 로드
  useEffect(() => {
    if (scriptLoadedRef.current) return;
    if (document.getElementById("kakao-postcode-script-detail")) {
      scriptLoadedRef.current = true;
      return;
    }
    const script = document.createElement("script");
    script.id = "kakao-postcode-script-detail";
    script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    script.onload = () => { scriptLoadedRef.current = true; };
    document.head.appendChild(script);
  }, []);

  // 주소 검색 패널 임베드
  useEffect(() => {
    if (!isAddressSearchOpen || !addressContainerRef.current) return;
    function tryEmbed(attempts = 0) {
      if (typeof window === "undefined" || !window.daum?.Postcode) {
        if (attempts < 20) setTimeout(() => tryEmbed(attempts + 1), 150);
        return;
      }
      if (!addressContainerRef.current) return;
      addressContainerRef.current.innerHTML = "";
      new window.daum.Postcode({
        oncomplete: (data) => {
          const addr = data.addressType === "R" ? data.roadAddress : data.jibunAddress;
          setEditZipcode(data.zonecode);
          setEditAddress(addr);
          setIsAddressSearchOpen(false);
        },
        width: "100%",
        height: "100%",
      }).embed(addressContainerRef.current);
    }
    tryEmbed();
  }, [isAddressSearchOpen]);

  const loadVideoUrls = useCallback(async (s: ShipmentData | null, orderData: OrderData) => {
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
  }, []);

  const loadOrder = useCallback(async (silent = false) => {
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
  }, [orderId, loadVideoUrls]);

  useEffect(() => { loadOrder(); }, [loadOrder]);

  function openDeliveryEdit() {
    setEditZipcode(order?.delivery_zipcode ?? "");
    setEditAddress(order?.delivery_address ?? "");
    setEditAddressDetail(order?.delivery_address_detail ?? "");
    setEditNotes(order?.notes ?? order?.memo ?? "");
    setIsAddressSearchOpen(false);
    setIsDeliveryEditOpen(true);
  }

  async function handleSaveDelivery() {
    if (!editAddress.trim()) {
      alert("배송 주소를 입력해주세요.");
      return;
    }
    setIsSavingDelivery(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("orders").update({
        delivery_address: editAddress.trim(),
        delivery_address_detail: editAddressDetail.trim() || null,
        delivery_zipcode: editZipcode.trim() || null,
        notes: editNotes.trim() || null,
        delivery_address_updated_at: new Date().toISOString(),
      }).eq("id", orderId);
      if (error) throw error;
      setOrder((prev) => prev ? {
        ...prev,
        delivery_address: editAddress.trim(),
        delivery_address_detail: editAddressDetail.trim() || undefined,
        delivery_zipcode: editZipcode.trim() || undefined,
        notes: editNotes.trim() || undefined,
      } : prev);
      setIsDeliveryEditOpen(false);
    } catch {
      alert("저장 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsSavingDelivery(false);
    }
  }

  // 취소 버튼 클릭 시: 커스텀 확인 모달을 띄운다.
  // (네이티브 confirm() 은 모바일 앱과 톤이 안 맞아 폐지)
  function openCancelDialog() {
    setIsCancelDialogOpen(true);
  }

  async function handleCancel() {
    setIsCancelDialogOpen(false);
    const isPostPickup =
      order?.status === "PICKED_UP" || order?.status === "INBOUND";
    setIsCancelling(true);
    try {
      // /api/orders/{id}/cancel : 수거 취소 + 결제 환불을 한 트랜잭션으로 처리
      const cancelReason = isPostPickup
        ? "고객 요청 - 입고 후 취소"
        : "고객 요청 - 수거 예약 취소";
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        throw new Error(data?.error || "취소 처리에 실패했습니다.");
      }

      let msg = data?.message ?? "취소가 처리되었습니다.";

      // 입고 후 취소(부분환불 + 반송)
      if (data?.flow === "POST_PICKUP_RETURN") {
        if (data?.refundProcessed) {
          msg += "\n💳 환불 금액이 카드사를 통해 처리됩니다.";
        } else if (data?.noRefundRequired) {
          // 무료 프로모션 등으로 환불 대상 결제가 없는 정상 케이스
        } else if (data?.refundError) {
          msg += `\n⚠️ 환불 실패: ${data.refundError}\n고객센터로 문의해 주세요.`;
        }
        if (data?.refundProcessed || data?.refundAmount === 0) {
          setOrder((prev) =>
            prev
              ? {
                  ...prev,
                  status: "RETURN_PENDING",
                  payment_status: data?.refundProcessed
                    ? "PARTIAL_CANCELED"
                    : prev.payment_status,
                }
              : prev,
          );
        }
      } else {
        // 수거 전 취소(우체국 + 전액 환불)
        const epostResult = data?.epost_result as Record<string, string> | undefined;
        const canceledYn = epostResult?.canceledYn;
        const cancelDate = epostResult?.cancelDate;
        const notCancelReason = epostResult?.notCancelReason;

        if (canceledYn === "Y") {
          msg += "\n✅ 우체국 전산에도 취소되었습니다.";
          if (cancelDate && cancelDate.length >= 12) {
            const y = cancelDate.slice(0, 4), mo = cancelDate.slice(4, 6);
            const d = cancelDate.slice(6, 8), h = cancelDate.slice(8, 10), mi = cancelDate.slice(10, 12);
            msg += `\n취소 일시: ${y}.${mo}.${d} ${h}:${mi}`;
          }
        } else if (canceledYn === "N") {
          msg += "\n⚠️ 우체국 전산 취소는 실패했습니다.";
          if (notCancelReason) msg += `\n사유: ${notCancelReason}`;
        } else if (canceledYn === "D") {
          msg += "\n🗑️ 우체국 전산에서 삭제되었습니다.";
        }

        if (data?.hasValidPayment) {
          if (data?.paymentCanceled) {
            msg += "\n💳 결제 금액이 자동으로 환불되었습니다.";
          } else if (data?.paymentCancelError) {
            msg += `\n⚠️ 결제 환불에 실패했습니다: ${data.paymentCancelError}\n고객센터로 문의해 주세요.`;
          }
        } else if (data?.noRefundRequired) {
          // 무료 프로모션 등 결제 자체가 없었던 주문 — 환불 절차 불필요
          msg += "\nℹ️ 결제하지 않은 주문이라 환불 절차는 없습니다.";
        }

        const dbActuallyCancelled = !data?.hasValidPayment || data?.paymentCanceled;
        if (dbActuallyCancelled) {
          setOrder((prev) => prev ? {
            ...prev,
            status: "CANCELLED",
            payment_status: data?.paymentCanceled ? "CANCELED" : prev.payment_status,
          } : prev);
        }
      }

      alert(msg);
      await loadOrder(true);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      alert(`수거 취소 실패: ${errMsg.replace("수거 취소 실패: ", "")}`);
    } finally {
      setIsCancelling(false);
    }
  }

  async function handleExtraChargeDecision(action: "SKIP" | "RETURN") {
    let msg: string;
    if (action === "SKIP") {
      msg = "추가 작업 없이 원안대로 진행하시겠습니까?";
    } else {
      // 반송 안내 — 실제 차감 금액(서버 설정 반송비 + 도서산간 왕복) 으로 표시.
      // 백엔드(api/orders/[id]/return-and-refund) 와 동일한 산식.
      const fee = returnShippingFee ?? 7000;
      const remoteFee = Math.max(0, Number(order?.remote_area_fee ?? 0) || 0);
      const totalDeduction = fee + remoteFee;
      const total = Number(order?.total_price ?? 0);
      const refund = Math.max(total - totalDeduction, 0);
      const remotePart =
        remoteFee > 0
          ? ` + 도서산간 ${remoteFee.toLocaleString()}원`
          : "";
      msg =
        `반송 처리하시겠습니까?\n` +
        `왕복 배송비 ${fee.toLocaleString()}원${remotePart}이 차감되고 ` +
        `나머지 금액(${refund.toLocaleString()}원)은 자동 환불됩니다.`;
    }
    if (!confirm(msg)) return;
    setIsExtraActionLoading(true);
    try {
      if (action === "RETURN") {
        // 반송: RPC + Toss 부분환불을 한 트랜잭션으로 처리하는 신규 라우트
        const res = await fetch(`/api/orders/${orderId}/return-and-refund`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.success === false) {
          throw new Error(data?.error || "반송 처리에 실패했습니다.");
        }
        let resultMsg = data?.message || "반송 요청이 접수되었습니다.";
        // 무료 프로모션 등 환불 절차 자체가 필요 없는 케이스는 경고 톤 표시 X
        if (data?.refundError && !data?.noRefundRequired) {
          resultMsg += `\n⚠️ 환불 처리 오류: ${data.refundError}\n고객센터로 문의해 주세요.`;
        }
        alert(resultMsg);
      } else {
        // SKIP: 단순 RPC
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { alert("로그인이 필요합니다."); return; }
        const { data: userRow } = await supabase
          .from("users")
          .select("id")
          .eq("auth_id", user.id)
          .maybeSingle();
        if (!userRow) { alert("사용자 정보를 찾을 수 없습니다."); return; }
        const { error } = await supabase.rpc("process_customer_decision", {
          p_order_id: orderId,
          p_action: action,
          p_customer_id: userRow.id,
        });
        if (error) throw error;
      }
      await loadOrder(true);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : "처리 중 오류가 발생했습니다.";
      alert(errMsg);
      console.error(e);
    } finally {
      setIsExtraActionLoading(false);
    }
  }

  function handleExtraChargePay() {
    router.push(`/orders/${orderId}/extra-charge`);
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
  // PENDING_PAYMENT 는 폐지됨. 레거시 row 방어용으로만 남김.
  const isPendingPayment = order.status === "PENDING_PAYMENT";
  const isPendingCharge = order.extra_charge_status === "PENDING_CUSTOMER";
  // 수거 전(BOOKED) 또는 수거 후/입고 후(PICKED_UP, INBOUND)에는 고객이 직접 취소 가능.
  // - BOOKED         : 우체국 수거 취소 + 전액 환불
  // - PICKED_UP/INBOUND : 왕복 배송비 차감 후 부분 환불 + 의류 반송
  const canCancel = ["BOOKED", "PICKED_UP", "INBOUND"].includes(order.status);
  const cancelIsPostPickup = order.status === "PICKED_UP" || order.status === "INBOUND";
  const canEditDelivery = !["READY_TO_SHIP", "DELIVERED", "CANCELLED"].includes(order.status);
  // 카카오 문의용: 발송 송장 우선 → 회수 송장 → legacy
  const trackingNo =
    shipment?.delivery_tracking_no ??
    shipment?.pickup_tracking_no ??
    shipment?.tracking_no ??
    order.tracking_no;
  // repair_parts 컬럼은 text[] 타입이라 다양한 형식이 들어올 수 있음:
  //   1) 객체 배열: [{name, price, quantity, detail}, ...]   (Web v1)
  //   2) JSON 문자열 배열: ['{"name":"...","price":...}', ...] (Web → text[]에 저장될 때 직렬화됨)
  //   3) 단순 문자열 배열: ['소매기장 줄임', ...] (Mobile)
  // 모든 형식을 RepairItem[]으로 정규화한다.
  const normalizeRepairItem = (raw: unknown): RepairItem | null => {
    if (raw == null) return null;
    if (typeof raw === "object") return raw as RepairItem;
    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (trimmed.startsWith("{")) {
        try {
          return JSON.parse(trimmed) as RepairItem;
        } catch {
          return { name: raw };
        }
      }
      return { name: raw };
    }
    return null;
  };
  const rawList: unknown[] = Array.isArray(order.repair_parts)
    ? order.repair_parts
    : Array.isArray(order.repair_items)
      ? order.repair_items
      : [];
  const repairItems: RepairItem[] = rawList
    .map(normalizeRepairItem)
    .filter((x): x is RepairItem => !!x);

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

      {/* ── 추가결제 카드 (앱과 동일한 인라인 카드) ── */}
      {isPendingCharge && (() => {
        const extraData = order.extra_charge_data;
        const price = extraData?.managerPrice ?? 0;
        const note = extraData?.managerNote ?? "추가 작업이 필요합니다";
        const memo = extraData?.workerMemo ?? "";
        return (
          <div className="mx-4 mt-3 p-5 bg-orange-50 border-2 border-orange-300 rounded-2xl shadow-sm">
            {/* 헤더 */}
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-6 h-6 text-orange-600 shrink-0" />
              <p className="text-base font-bold text-orange-900">💳 추가 결제 요청</p>
            </div>

            {/* 안내 문구 */}
            <div className="bg-white rounded-xl p-3 mb-3">
              <p className="text-sm text-gray-700 leading-relaxed">{note}</p>
            </div>

            {/* 추가 금액 */}
            <div className="bg-orange-100 rounded-xl p-3 flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-orange-800">추가 청구 금액</span>
              <span className="text-xl font-extrabold text-orange-900">{formatPrice(price)}</span>
            </div>

            {/* 현장 메모 */}
            {memo.length > 0 && (
              <p className="text-xs text-gray-500 mb-3">현장 메모: {memo}</p>
            )}

            {/* 액션 버튼 */}
            <div className="space-y-2">
              <button
                onClick={handleExtraChargePay}
                disabled={isExtraActionLoading}
                className="w-full py-3.5 bg-blue-600 text-white text-sm font-bold rounded-xl active:brightness-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                {formatPrice(price)} 결제하기
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleExtraChargeDecision("SKIP")}
                  disabled={isExtraActionLoading}
                  className="py-3 border border-[#00C896] text-[#00C896] text-sm font-semibold rounded-xl active:bg-[#00C896]/10 disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  <ArrowRight className="w-4 h-4" />
                  그냥 진행
                </button>
                <button
                  onClick={() => handleExtraChargeDecision("RETURN")}
                  disabled={isExtraActionLoading}
                  className="py-3 border border-red-400 text-red-500 text-sm font-semibold rounded-xl active:bg-red-50 disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  <RotateCcw className="w-4 h-4" />
                  반송하기
                </button>
              </div>
            </div>

            {/* 안내 */}
            <div className="mt-3 p-2.5 bg-gray-100 rounded-lg">
              <p className="text-xs text-gray-500 leading-relaxed">
                • 그냥 진행: 추가 작업 없이 원안대로 진행합니다{"\n"}
                • 반송: 왕복 배송비 {(returnShippingFee ?? 7000).toLocaleString()}원
                {(() => {
                  const rf = Math.max(0, Number(order?.remote_area_fee ?? 0) || 0);
                  return rf > 0 ? ` + 도서산간 ${rf.toLocaleString()}원` : "";
                })()}
                이 차감됩니다
              </p>
            </div>
          </div>
        );
      })()}

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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#00C896]" />
              <p className="text-sm font-bold text-gray-800">주소 정보</p>
            </div>
            {canEditDelivery && order.delivery_address && (
              <button
                onClick={openDeliveryEdit}
                className="flex items-center gap-1 text-xs text-[#00C896] font-semibold active:opacity-70"
              >
                <Pencil className="w-3.5 h-3.5" />
                배송지 수정
              </button>
            )}
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
              {order.delivery_zipcode && (
                <p className="text-xs text-gray-400 mb-0.5">[{order.delivery_zipcode}]</p>
              )}
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
          {(order.notes || order.memo) && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400">배송 메모</p>
              <p className="text-sm text-gray-600 mt-0.5">{order.notes ?? order.memo}</p>
            </div>
          )}
        </div>
      )}

      {/* ── 배송지/메모 수정 모달 ── */}
      {isDeliveryEditOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/50">
          <div className="flex-1 flex items-end justify-center sm:items-center">
            <div className="w-full max-w-[430px] bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* 헤더 */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
                <p className="text-sm font-bold text-gray-800">배송지 수정</p>
                <button
                  type="button"
                  onClick={() => { setIsDeliveryEditOpen(false); setIsAddressSearchOpen(false); }}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* 주소 검색 패널 (조건부) */}
              {isAddressSearchOpen ? (
                <div className="flex flex-col flex-1 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
                    <p className="text-xs text-gray-500">도로명 또는 지번 주소를 검색하세요</p>
                    <button
                      type="button"
                      onClick={() => setIsAddressSearchOpen(false)}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      닫기
                    </button>
                  </div>
                  <div ref={addressContainerRef} className="flex-1 overflow-hidden" style={{ minHeight: 380 }} />
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {/* 주소 검색 */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2">배송 주소</p>
                    <div className="flex gap-2 mb-2">
                      {editZipcode && (
                        <span className="text-sm text-gray-500 self-center">[{editZipcode}]</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsAddressSearchOpen(true)}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-[#00C896] text-white text-sm font-semibold rounded-xl active:opacity-80 whitespace-nowrap"
                      >
                        <MapPin className="w-4 h-4" />
                        주소 검색
                      </button>
                    </div>
                    {editAddress ? (
                      <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-4 py-3">{editAddress}</p>
                    ) : (
                      <p className="text-sm text-gray-400 bg-gray-50 rounded-xl px-4 py-3">주소를 검색해주세요</p>
                    )}
                  </div>

                  {/* 상세 주소 */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2">상세 주소</p>
                    <input
                      type="text"
                      value={editAddressDetail}
                      onChange={(e) => setEditAddressDetail(e.target.value)}
                      placeholder="동, 호수 등 상세주소 입력"
                      className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#00C896] transition-colors"
                    />
                  </div>

                  {/* 배송 메모 */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2">배송 메모</p>
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="배송 시 요청사항 (예: 문 앞에 놓아주세요)"
                      rows={3}
                      className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#00C896] transition-colors resize-none"
                    />
                  </div>

                  {/* 저장 버튼 */}
                  <button
                    onClick={handleSaveDelivery}
                    disabled={isSavingDelivery || !editAddress.trim()}
                    className="w-full py-3.5 bg-[#00C896] text-white text-sm font-bold rounded-xl active:opacity-90 disabled:opacity-50"
                  >
                    {isSavingDelivery ? "저장 중..." : "저장하기"}
                  </button>
                </div>
              )}
            </div>
          </div>
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
              onClick={() => setActiveVideo({ url: inboundVideoUrl, title: "입고 영상", comparisonUrl: outboundVideoUrl, comparisonTitle: "출고 영상" })}
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
              <p className="text-white text-sm font-bold">
                {activeVideo.comparisonUrl ? "입출고 전후 영상" : activeVideo.title}
              </p>
              <button
                onClick={() => setActiveVideo(null)}
                className="text-white/70 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {activeVideo.comparisonUrl ? (
              /* 전후 비교: 입고/출고 영상 세로 배치 */
              <div className="flex flex-col">
                <div>
                  <p className="text-white/60 text-[10px] font-medium px-3 pt-2 pb-1">
                    {activeVideo.title}
                  </p>
                  <div className="aspect-video w-full">
                    {activeVideo.url.includes("iframe.videodelivery.net") ? (
                      <iframe src={activeVideo.url} className="w-full h-full"
                        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture" allowFullScreen />
                    ) : (
                      <video src={activeVideo.url} controls autoPlay playsInline
                        className="w-full h-full object-contain" />
                    )}
                  </div>
                </div>
                <div className="border-t border-white/10">
                  <p className="text-white/60 text-[10px] font-medium px-3 pt-2 pb-1">
                    {activeVideo.comparisonTitle}
                  </p>
                  <div className="aspect-video w-full">
                    {activeVideo.comparisonUrl.includes("iframe.videodelivery.net") ? (
                      <iframe src={activeVideo.comparisonUrl} className="w-full h-full"
                        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture" allowFullScreen />
                    ) : (
                      <video src={activeVideo.comparisonUrl} controls playsInline
                        className="w-full h-full object-contain" />
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* 단일 영상 */
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
            )}
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
        {canCancel && (() => {
          const fee = returnShippingFee ?? 7000;
          const remoteFee = Math.max(0, Number(order?.remote_area_fee ?? 0) || 0);
          const buttonLabel = cancelIsPostPickup ? "주문 취소 / 반송 요청" : "수거 예약 취소";
          return (
            <div className="space-y-1">
              <button
                onClick={openCancelDialog}
                disabled={isCancelling}
                className="w-full py-3.5 border border-red-200 text-red-500 text-sm font-medium rounded-xl active:bg-red-50 disabled:opacity-50"
              >
                {isCancelling ? "취소 중..." : buttonLabel}
              </button>
              {cancelIsPostPickup && (
                <p className="text-[11px] text-gray-400 text-center px-2">
                  의류가 이미 입고된 상태입니다. 취소 시 왕복 배송비
                  {" "}
                  <span className="font-semibold text-gray-500">
                    {fee.toLocaleString()}원
                  </span>
                  {remoteFee > 0 && (
                    <>
                      {" + 도서산간 "}
                      <span className="font-semibold text-orange-500">
                        {remoteFee.toLocaleString()}원
                      </span>
                    </>
                  )}
                  이 차감되고 나머지 금액이 환불됩니다.
                </p>
              )}
            </div>
          );
        })()}
      </div>

      {/* ── 주문 취소 확인 모달 ── */}
      {isCancelDialogOpen && order && (
        <CancelConfirmDialog
          status={order.status}
          isPaid={order.payment_status === "PAID"}
          totalPrice={Number(order.total_price ?? 0)}
          returnFee={returnShippingFee ?? 7000}
          remoteAreaFee={Math.max(0, Number(order.remote_area_fee ?? 0) || 0)}
          onCancel={() => setIsCancelDialogOpen(false)}
          onConfirm={handleCancel}
          isProcessing={isCancelling}
        />
      )}
    </div>
  );
}

function CancelConfirmDialog({
  status,
  isPaid,
  totalPrice,
  returnFee,
  remoteAreaFee,
  onCancel,
  onConfirm,
  isProcessing,
}: {
  status: string;
  isPaid: boolean;
  totalPrice: number;
  returnFee: number;
  remoteAreaFee: number;
  onCancel: () => void;
  onConfirm: () => void;
  isProcessing: boolean;
}) {
  const isPostPickup = status === "PICKED_UP" || status === "INBOUND";
  const totalDeduction = isPostPickup ? returnFee + remoteAreaFee : 0;
  const refund = Math.max(totalPrice - totalDeduction, 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">
            {isPostPickup ? "주문을 취소하시겠습니까?" : "수거 예약을 취소하시겠습니까?"}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {isPostPickup
              ? "의류가 이미 입고된 상태이므로 반송이 진행됩니다."
              : "취소 후에는 다시 예약하셔야 합니다."}
          </p>
        </div>

        <div className="px-5 py-4 space-y-3">
          {isPostPickup ? (
            <>
              <div className="bg-gray-50 rounded-xl p-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">결제 금액</span>
                  <span className="font-semibold text-gray-900">
                    {totalPrice.toLocaleString()}원
                  </span>
                </div>
                <div className="flex items-center justify-between text-red-600">
                  <span>왕복 배송비 차감</span>
                  <span className="font-semibold">
                    -{returnFee.toLocaleString()}원
                  </span>
                </div>
                {remoteAreaFee > 0 && (
                  <div className="flex items-center justify-between text-orange-600">
                    <span>🏝 도서산간 배송비 차감 (왕복)</span>
                    <span className="font-semibold">
                      -{remoteAreaFee.toLocaleString()}원
                    </span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-2 flex items-center justify-between">
                  <span className="text-gray-700 font-semibold">
                    {isPaid ? "환불 예정 금액" : "차감 후 잔액"}
                  </span>
                  <span className="text-base font-bold text-[#00C896]">
                    {refund.toLocaleString()}원
                  </span>
                </div>
              </div>
              <ul className="text-xs text-gray-500 space-y-1 pl-1">
                <li>· 의류는 등록하신 주소로 반송됩니다.</li>
                {isPaid && <li>· 환불은 카드사를 통해 자동 처리됩니다.</li>}
                {remoteAreaFee > 0 && (
                  <li>· 도서산간 배송비는 편도 단가 × 2 (왕복) 기준입니다.</li>
                )}
              </ul>
            </>
          ) : (
            <p className="text-sm text-gray-600 leading-relaxed">
              {isPaid
                ? "결제하신 금액은 카드사를 통해 자동으로 환불됩니다."
                : "취소 후 다시 수거를 신청하시려면 새로 주문해 주셔야 합니다."}
            </p>
          )}
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 active:bg-gray-50 disabled:opacity-50"
          >
            계속 진행
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className="flex-1 py-3 rounded-xl bg-red-500 text-sm font-bold text-white active:bg-red-600 disabled:opacity-50"
          >
            {isProcessing ? "처리 중..." : "취소하기"}
          </button>
        </div>
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
