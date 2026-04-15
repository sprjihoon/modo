"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Package, Truck, CheckCircle, Clock, Copy, Check,
  RefreshCw, ExternalLink, AlertCircle, MapPin,
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

const STATUS_CODE_MAP: Record<string, { label: string; color: string; bg: string }> = {
  "00": { label: "신청준비", color: "text-gray-600", bg: "bg-gray-100" },
  "01": { label: "소포신청", color: "text-blue-600", bg: "bg-blue-50" },
  "02": { label: "운송장출력", color: "text-blue-600", bg: "bg-blue-50" },
  "03": { label: "집하완료", color: "text-orange-600", bg: "bg-orange-50" },
  "04": { label: "배송중", color: "text-[#00C896]", bg: "bg-[#00C896]/10" },
  "05": { label: "배송완료", color: "text-green-600", bg: "bg-green-50" },
};

function formatTrackingDateTime(date?: string, time?: string): string {
  if (!date) return "";
  // date: "YYYYMMDD" or "YYYY.MM.DD", time: "HHmm" or "HH:MM"
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

export function TrackingClient({
  orderId,
  trackingNo,
}: {
  orderId: string;
  trackingNo: string;
}) {
  const router = useRouter();
  const [data, setData] = useState<TrackingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadTracking();
  }, [trackingNo]);

  async function loadTracking(silent = false) {
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
  }

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
    ? STATUS_CODE_MAP[data.epost.treatStusCd]
    : null;
  const events = data?.trackingEvents ?? [];
  const isNotYetPickedUp = data?.isNotYetPickedUp ?? false;

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

      {/* 송장번호 */}
      <div className="mx-4 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Truck className="w-4 h-4 text-[#00C896]" />
          <p className="text-sm font-bold text-gray-800">송장번호</p>
          {data?.shipment?.carrier && (
            <span className="text-xs text-gray-400">({data.shipment.carrier})</span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <p className="font-mono text-base font-bold text-gray-800 tracking-wider">
            {trackingNo}
          </p>
          <button
            onClick={copyTrackingNo}
            className="flex items-center gap-1 text-xs text-gray-400 active:text-gray-600"
          >
            {copied ? (
              <Check className="w-4 h-4 text-[#00C896]" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* 아직 집하 전 안내 */}
      {isNotYetPickedUp && (
        <div className="mx-4 p-5 bg-orange-50 border border-orange-100 rounded-2xl">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-orange-500" />
            <p className="text-sm font-bold text-orange-800">수거 대기 중</p>
          </div>
          <p className="text-xs text-orange-600">
            아직 택배사에 집하되지 않았습니다. 수거 기사님이 방문한 후 추적이 시작됩니다.
          </p>
        </div>
      )}

      {/* 현재 배송 상태 */}
      {data?.epost && statusInfo && (
        <div className="mx-4 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-[#00C896]" />
            <p className="text-sm font-bold text-gray-800">배송 현황</p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span
                className={cn(
                  "inline-block text-sm font-bold px-3 py-1.5 rounded-full",
                  statusInfo.color,
                  statusInfo.bg
                )}
              >
                {statusInfo.label}
              </span>
              {data.epost.deliveryStatus && data.epost.deliveryStatus !== statusInfo.label && (
                <p className="text-xs text-gray-500 mt-1.5">{data.epost.deliveryStatus}</p>
              )}
            </div>
            {data.epost.regiPoNm && (
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <MapPin className="w-3.5 h-3.5" />
                {data.epost.regiPoNm}
              </div>
            )}
          </div>
          {(data.epost.senderName || data.epost.receiverName) && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex gap-4 text-xs text-gray-500">
              {data.epost.senderName && <span>보내는 분: {data.epost.senderName}</span>}
              {data.epost.receiverName && <span>받는 분: {data.epost.receiverName}</span>}
            </div>
          )}
        </div>
      )}

      {/* 배송 추적 이벤트 */}
      {events.length > 0 && (
        <div className="mx-4 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-4 h-4 text-[#00C896]" />
            <p className="text-sm font-bold text-gray-800">배송 추적 이력</p>
          </div>
          <div className="space-y-0">
            {[...events].reverse().map((event, i) => {
              const isFirst = i === 0;
              return (
                <div key={i} className="flex gap-3">
                  {/* 타임라인 선 */}
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "w-2.5 h-2.5 rounded-full mt-1.5 shrink-0",
                        isFirst ? "bg-[#00C896]" : "bg-gray-300"
                      )}
                    />
                    {i < events.length - 1 && (
                      <div className="w-0.5 flex-1 bg-gray-200 my-1" />
                    )}
                  </div>
                  {/* 이벤트 내용 */}
                  <div className="pb-4 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={cn(
                          "text-sm font-semibold",
                          isFirst ? "text-[#00C896]" : "text-gray-700"
                        )}
                      >
                        {event.status}
                      </p>
                      <p className="text-[10px] text-gray-400 shrink-0">
                        {formatTrackingDateTime(event.date, event.time)}
                      </p>
                    </div>
                    {event.location && (
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
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

      {/* 우체국 사이트 열기 */}
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
