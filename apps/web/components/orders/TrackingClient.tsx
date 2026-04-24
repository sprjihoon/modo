"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Package, Truck, CheckCircle, Clock, Copy, Check,
  RefreshCw, ExternalLink, AlertCircle, MapPin, Info,
  CalendarDays, Building2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface TrackingEvent {
  date: string;
  time: string;
  location: string;
  status: string;
  description?: string;
}

interface EpostStatus {
  treatStusCd?: string;
  treatStusNm?: string;
  regiPoNm?: string;
  resDate?: string;
  deliveryStatus?: string;
  senderName?: string;
  receiverName?: string;
}

interface TrackingData {
  tracking_no: string;
  tracking_url: string;
  isNotYetPickedUp?: boolean;
  isCachedEvents?: boolean;
  epost?: EpostStatus | null;
  epostError?: { message: string; code: string } | null;
  trackingEvents?: TrackingEvent[];
  shipment?: {
    status?: string;
    carrier?: string;
    pickup_tracking_no?: string;
    delivery_tracking_no?: string;
    pickup_requested_at?: string;
    pickup_completed_at?: string;
    delivery_started_at?: string;
    delivery_completed_at?: string;
  };
}

// treatStusCd → 색상·아이콘·레이블
const STATUS_CODE_MAP: Record<string, {
  label: string;
  color: string;
  bg: string;
  border: string;
  iconColor: string;
}> = {
  "00": { label: "신청준비",  color: "text-gray-600",    bg: "bg-gray-50",         border: "border-gray-200",    iconColor: "text-gray-500"   },
  "01": { label: "소포신청",  color: "text-blue-600",    bg: "bg-blue-50",         border: "border-blue-200",    iconColor: "text-blue-500"   },
  "02": { label: "운송장출력",color: "text-blue-700",    bg: "bg-blue-50",         border: "border-blue-200",    iconColor: "text-blue-600"   },
  "03": { label: "집하완료",  color: "text-orange-700",  bg: "bg-orange-50",       border: "border-orange-200",  iconColor: "text-orange-500" },
  "04": { label: "배송중",    color: "text-[#00C896]",   bg: "bg-[#00C896]/10",    border: "border-[#00C896]/30",iconColor: "text-[#00C896]"  },
  "05": { label: "배송완료",  color: "text-green-700",   bg: "bg-green-50",        border: "border-green-200",   iconColor: "text-green-600"  },
};

function formatDateTime(raw?: string | null): string {
  if (!raw) return "";
  // ISO string: 2026-04-16T06:29:00.000Z  → 2026.04.16 15:29
  try {
    const dt = new Date(raw);
    if (!isNaN(dt.getTime())) {
      const y = dt.getFullYear();
      const mo = String(dt.getMonth() + 1).padStart(2, "0");
      const d  = String(dt.getDate()).padStart(2, "0");
      const h  = String(dt.getHours()).padStart(2, "0");
      const mi = String(dt.getMinutes()).padStart(2, "0");
      return `${y}.${mo}.${d} ${h}:${mi}`;
    }
  } catch { /* fallback below */ }
  // YYYYMMDDHHmmss format
  const s = raw.replace(/[-:.TZ ]/g, "");
  if (s.length >= 8) {
    const date = `${s.slice(0,4)}.${s.slice(4,6)}.${s.slice(6,8)}`;
    if (s.length >= 12) return `${date} ${s.slice(8,10)}:${s.slice(10,12)}`;
    return date;
  }
  return raw;
}

function formatTrackingDateTime(date?: string, time?: string): string {
  if (!date) return "";
  const d = date.replace(/\./g, "").replace(/-/g, "");
  if (d.length === 8) {
    const formatted = `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6, 8)}`;
    if (time) {
      const t = time.replace(":", "");
      return `${formatted} ${t.slice(0, 2)}:${t.slice(2, 4)}`;
    }
    return formatted;
  }
  return `${date}${time ? " " + time : ""}`;
}

function carrierLabel(carrier?: string): string {
  if (!carrier) return "우체국 택배";
  return carrier === "EPOST" ? "우체국 택배" : carrier;
}

export function TrackingClient({
  orderId,
  trackingNo,
}: {
  orderId: string;
  trackingNo: string;
}) {
  const [data, setData] = useState<TrackingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadTracking = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: result, error: fnError } = await supabase.functions.invoke(
        "shipments-track",
        { body: { tracking_no: trackingNo } }
      );
      if (fnError) throw new Error(fnError.message);
      setData(result?.data ?? result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "배송추적 조회에 실패했습니다.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [trackingNo]);

  useEffect(() => { loadTracking(); }, [loadTracking]);

  async function copyTrackingNo() {
    await navigator.clipboard.writeText(trackingNo).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="m-4 p-6 bg-white border border-gray-100 rounded-2xl text-center shadow-sm">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-sm font-bold text-gray-800 mb-1">배송추적 정보를 불러올 수 없습니다</p>
        <p className="text-xs text-gray-500 mb-4">{error}</p>
        <button
          onClick={() => loadTracking()}
          className="text-sm font-semibold text-[#00C896] border border-[#00C896] rounded-lg px-4 py-2"
        >
          다시 시도
        </button>
      </div>
    );
  }

  const statusInfo = data?.epost?.treatStusCd
    ? STATUS_CODE_MAP[data.epost.treatStusCd] ?? null
    : null;
  const events = data?.trackingEvents ?? [];
  const isNotYetPickedUp = data?.isNotYetPickedUp ?? false;
  const isCachedEvents = data?.isCachedEvents ?? false;
  const epostError = data?.epostError;
  const shipment = data?.shipment;

  return (
    <div className="pb-8 space-y-3">
      {/* 새로고침 */}
      <div className="flex justify-end px-4 pt-3">
        <button
          onClick={() => loadTracking(true)}
          disabled={isRefreshing}
          className="flex items-center gap-1 text-xs text-gray-400 active:text-gray-600"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
          새로고침
        </button>
      </div>

      {/* ── 송장번호 ── */}
      <div className="mx-4 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Truck className="w-4 h-4 text-[#00C896]" />
          <p className="text-sm font-bold text-gray-800">송장번호</p>
          {shipment?.carrier && (
            <span className="text-xs text-gray-400">({carrierLabel(shipment.carrier)})</span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <p className="font-mono text-base font-bold text-gray-800 tracking-wider">
            {trackingNo}
          </p>
          <button
            onClick={copyTrackingNo}
            className="flex items-center gap-1 text-xs text-gray-400 active:text-gray-600 p-1"
          >
            {copied ? (
              <Check className="w-4 h-4 text-[#00C896]" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* ── 아직 집하 전 안내 ── */}
      {(isNotYetPickedUp || (!data?.epost && !epostError && events.length === 0)) && (
        <div className="mx-4 p-5 bg-orange-50 border border-orange-200 rounded-2xl">
          <div className="flex flex-col items-center text-center gap-3">
            <Clock className="w-12 h-12 text-orange-500" />
            <p className="text-base font-bold text-orange-900">아직 집하되지 않았습니다</p>
            <p className="text-sm text-orange-700 leading-relaxed">
              송장번호가 발급되었지만, 우체부가 제품을 수거하고 스캔하기 전까지는 추적 정보가 표시되지 않습니다.{"\n"}
              수거 예정일을 확인하시거나, 우체국 사이트에서 직접 확인해보세요.
            </p>
          </div>
        </div>
      )}

      {/* ── 현재 배송 상태 (모바일 _buildStatusCard 동일) ── */}
      {data?.epost && statusInfo && (
        <div className={cn(
          "mx-4 p-5 rounded-2xl border",
          statusInfo.bg, statusInfo.border
        )}>
          <div className="flex items-start gap-4">
            {/* 아이콘 */}
            <div className={cn(
              "w-14 h-14 rounded-xl flex items-center justify-center shrink-0",
              statusInfo.bg, "border", statusInfo.border
            )}>
              {data.epost.treatStusCd === "05" ? (
                <CheckCircle className={cn("w-7 h-7", statusInfo.iconColor)} />
              ) : data.epost.treatStusCd === "04" ? (
                <Truck className={cn("w-7 h-7", statusInfo.iconColor)} />
              ) : data.epost.treatStusCd === "03" ? (
                <Package className={cn("w-7 h-7", statusInfo.iconColor)} />
              ) : (
                <Clock className={cn("w-7 h-7", statusInfo.iconColor)} />
              )}
            </div>
            {/* 상태 텍스트 */}
            <div className="flex-1 min-w-0">
              <p className={cn("text-xl font-bold", statusInfo.color)}>
                {statusInfo.label}
              </p>
              {/* 스크래핑 deliveryStatus (더 자세한 한글 상태) */}
              {data.epost.deliveryStatus && data.epost.deliveryStatus !== statusInfo.label && (
                <p className={cn("text-sm mt-0.5", statusInfo.color, "opacity-80")}>
                  {data.epost.deliveryStatus}
                </p>
              )}
              {/* 우체국명 */}
              {data.epost.regiPoNm && (
                <div className="flex items-center gap-1 mt-1">
                  <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <p className="text-sm text-gray-500">{data.epost.regiPoNm}</p>
                </div>
              )}
            </div>
          </div>

          {/* 처리일시 */}
          {data.epost.resDate && (
            <>
              <div className="border-t border-current opacity-10 my-3" />
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                <p className="text-xs text-gray-500">
                  처리일시: {formatDateTime(data.epost.resDate)}
                </p>
              </div>
            </>
          )}

          {/* 보내는 분 / 받는 분 */}
          {(data.epost.senderName || data.epost.receiverName) && (
            <div className="mt-3 pt-3 border-t border-current border-opacity-10 flex gap-4 text-xs text-gray-500">
              {data.epost.senderName && <span>보내는 분: {data.epost.senderName}</span>}
              {data.epost.receiverName && <span>받는 분: {data.epost.receiverName}</span>}
            </div>
          )}
        </div>
      )}

      {/* ── 배송 추적 이력 (타임라인) ── */}
      {events.length > 0 && (
        <div className="mx-4 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-4 h-4 text-[#00C896]" />
            <p className="text-sm font-bold text-gray-800">배송 추적 이력</p>
            {isCachedEvents && (
              <span className="ml-auto text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                마지막 조회 기록
              </span>
            )}
          </div>
          <div className="space-y-0">
            {[...events].reverse().map((event, i) => {
              const isFirst = i === 0;
              const isLast = i === events.length - 1;
              return (
                <div key={i} className="flex gap-3">
                  {/* 타임라인 선 */}
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-3 h-3 rounded-full mt-1 shrink-0 border-2",
                      isFirst
                        ? "bg-[#00C896] border-[#00C896]"
                        : "bg-white border-gray-300"
                    )} />
                    {!isLast && (
                      <div className="w-0.5 flex-1 bg-gray-200 my-1 min-h-[16px]" />
                    )}
                  </div>
                  {/* 이벤트 내용 */}
                  <div className="pb-4 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn(
                        "text-sm font-semibold leading-tight",
                        isFirst ? "text-[#00C896]" : "text-gray-800"
                      )}>
                        {event.status}
                      </p>
                      <p className="text-[10px] text-gray-400 shrink-0 mt-0.5">
                        {formatTrackingDateTime(event.date, event.time)}
                      </p>
                    </div>
                    {event.location && (
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {event.location}
                      </p>
                    )}
                    {event.description && (
                      <p className="text-xs text-gray-400 mt-0.5">{event.description}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 배송 정보 (모바일 _buildShipmentInfoCard 동일) ── */}
      {shipment && (shipment.status || shipment.carrier || shipment.pickup_requested_at || shipment.delivery_completed_at) && (
        <div className="mx-4 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-4 h-4 text-gray-500" />
            <p className="text-sm font-bold text-gray-800">배송 정보</p>
          </div>
          <div className="space-y-3">
            {shipment.status && (
              <ShipmentRow label="배송 상태" value={shipment.status} />
            )}
            {shipment.carrier && (
              <ShipmentRow label="택배사" value={carrierLabel(shipment.carrier)} />
            )}
            {shipment.pickup_requested_at && (
              <ShipmentRow label="수거 요청일" value={formatDateTime(shipment.pickup_requested_at)} />
            )}
            {shipment.pickup_completed_at && (
              <ShipmentRow label="수거 완료일" value={formatDateTime(shipment.pickup_completed_at)} />
            )}
            {shipment.delivery_started_at && (
              <ShipmentRow label="배송 시작일" value={formatDateTime(shipment.delivery_started_at)} />
            )}
            {shipment.delivery_completed_at && (
              <ShipmentRow label="배송 완료일" value={formatDateTime(shipment.delivery_completed_at)} />
            )}
          </div>
        </div>
      )}

      {/* ── epostError 안내 ── (이벤트가 이미 있으면 에러 카드 숨김) */}
      {epostError && events.length === 0 && (() => {
        const isErr225 =
          epostError.message.includes("ERR-225") ||
          epostError.message.includes("신청정보가 존재하지 않습니다");
        if (isErr225) {
          return (
            <div className="mx-4 p-5 bg-orange-50 border border-orange-200 rounded-2xl">
              <div className="flex flex-col items-center text-center gap-3">
                <Info className="w-10 h-10 text-orange-500" />
                <p className="text-base font-bold text-orange-900">배송 정보 확인 중</p>
                <p className="text-sm text-orange-700 leading-relaxed">
                  우체국 시스템에서 배송 정보를 확인하는 중입니다.{"\n"}
                  아래 버튼을 눌러 우체국 사이트에서 직접 확인해보세요.
                </p>
              </div>
            </div>
          );
        }
        return (
          <div className="mx-4 p-5 bg-red-50 border border-red-100 rounded-2xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-800">추적 정보 조회 실패</p>
                <p className="text-xs text-red-600 mt-1">{epostError.message}</p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── 우체국 사이트 열기 ── */}
      {data?.tracking_url && (
        <div className="mx-4">
          <a
            href={data.tracking_url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl active:bg-gray-50"
          >
            <ExternalLink className="w-4 h-4" />
            우체국 사이트에서 자세히 보기
          </a>
        </div>
      )}
    </div>
  );
}

function ShipmentRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-400 shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-800 text-right">{value}</span>
    </div>
  );
}
