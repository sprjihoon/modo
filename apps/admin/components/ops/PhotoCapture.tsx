"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Camera, Check, X, RefreshCw, Scan } from "lucide-react";
import { formatCameraError, requestCameraStream, resolveOpsLiveVideoUpload } from "@/lib/ops-camera";
import {
  canStartOutboundPackScan,
  packScanFailMessage,
  resolveOutboundPackScan,
  shouldAutoFinishPacking,
} from "@/lib/barcode";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PhotoType = "before_photo" | "after_photo";

export interface RepairItem {
  id: string;
  repairPart: string;
  barcodeNo?: string;
}

export interface CapturedPhoto {
  sequence: number;
  photoType: PhotoType;
  dataUrl: string;
  file?: File;
}

interface PhotoState {
  before?: string;
  after?: string;
  beforeUploading?: boolean;
  afterUploading?: boolean;
  beforeDone?: boolean;
  afterDone?: boolean;
}

interface Props {
  orderId: string;
  repairItems: RepairItem[];
  photoType: PhotoType;
  finalWaybillNo?: string;
  initialPhotos?: Record<number, { before?: string; after?: string }>;
  onAllDone?: (photos: Record<number, { before?: string; after?: string }>) => void;
  onClose: () => void;
  /** 입고/출고: 항목 스캔 후 송장을 다시 스캔하면 녹화 종료 */
  autoFinishOnAllPacked?: boolean;
  barcodePrefixes?: string[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PhotoCapture({
  orderId,
  repairItems,
  photoType,
  finalWaybillNo,
  initialPhotos = {},
  onAllDone,
  onClose,
  autoFinishOnAllPacked = false,
  barcodePrefixes = [],
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const recordStartRef = useRef<number>(0);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [recordDuration, setRecordDuration] = useState(0);
  const [scanValue, setScanValue] = useState("");
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [sessionPacked, setSessionPacked] = useState<Record<number, boolean>>({});
  const scanInputRef = useRef<HTMLInputElement>(null);
  const finishingRef = useRef(false);

  const [photoStates, setPhotoStates] = useState<Record<number, PhotoState>>(() => {
    const init: Record<number, PhotoState> = {};
    repairItems.forEach((_, idx) => {
      const seq = idx + 1;
      init[seq] = {
        before: initialPhotos[seq]?.before,
        after: initialPhotos[seq]?.after,
        beforeDone: !!initialPhotos[seq]?.before,
        afterDone: !!initialPhotos[seq]?.after,
      };
    });
    return init;
  });

  const label = photoType === "before_photo" ? "수선 전" : "수선 후";
  const labelColor = photoType === "before_photo" ? "#F97316" : "#00C896";
  const packMode = photoType === "before_photo" ? "inbound" : "outbound";
  const waybillLabel = packMode === "inbound" ? "입고 송장" : "출고 송장";

  // ─── 카메라 + 녹화 시작 ────────────────────────────────────────────────────

  const startRecording = (stream: MediaStream) => {
    try {
      chunksRef.current = [];
      recordStartRef.current = Date.now();

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";

      const rec = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 700_000,
      });

      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorderRef.current = rec;
      rec.start(1000); // 1초 단위로 청크 수집
    } catch (e) {
      console.warn("영상 녹화 시작 실패 (무시):", e);
    }
  };

  const startCamera = useCallback(async (facing: "environment" | "user" = "environment") => {
    setCameraStarting(true);
    setCameraReady(false);
    setCameraError(null);
    try {
      // 기존 스트림 및 녹화 중지
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await requestCameraStream(facing);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraReady(true);
      setCameraError(null);
      startRecording(stream);
    } catch (err: unknown) {
      console.error("카메라 오류:", err);
      setCameraReady(false);
      setCameraError(formatCameraError(err));
    } finally {
      setCameraStarting(false);
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);

    const timer = setInterval(() => {
      if (recordStartRef.current > 0) {
        setRecordDuration(Math.floor((Date.now() - recordStartRef.current) / 1000));
      }
    }, 1000);

    return () => {
      clearInterval(timer);
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleCamera = () => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    startCamera(next);
  };

  // ─── 현재 프레임 캡처 ─────────────────────────────────────────────────────

  const captureFrame = (): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.9);
  };

  // dataUrl → File 변환
  const dataUrlToFile = (dataUrl: string, filename: string): File => {
    const arr = dataUrl.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
    const bstr = atob(arr[1]);
    const u8arr = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i);
    return new File([u8arr], filename, { type: mime });
  };

  // ─── 제품명 클릭 → 현재 프레임 즉시 저장 ─────────────────────────────────

  const saveToItem = async (sequence: number): Promise<boolean> => {
    if (!cameraReady) return false;

    const dataUrl = captureFrame();
    if (!dataUrl) return false;

    setPhotoStates((prev) => ({
      ...prev,
      [sequence]: {
        ...prev[sequence],
        ...(photoType === "before_photo"
          ? { beforeUploading: true }
          : { afterUploading: true }),
      },
    }));

    try {
      const file = dataUrlToFile(
        dataUrl,
        `${photoType}_${sequence}_${Date.now()}.jpg`
      );

      const form = new FormData();
      form.append("file", file);
      form.append("orderId", orderId);
      form.append("sequence", String(sequence));
      form.append("photoType", photoType);
      if (finalWaybillNo) form.append("finalWaybillNo", finalWaybillNo);

      const res = await fetch("/api/ops/photo/upload", {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "업로드 실패");

      const savedUrl = json.url || dataUrl;

      setPhotoStates((prev) => ({
        ...prev,
        [sequence]: {
          ...prev[sequence],
          ...(photoType === "before_photo"
            ? { before: savedUrl, beforeDone: true, beforeUploading: false }
            : { after: savedUrl, afterDone: true, afterUploading: false }),
        },
      }));
      return true;
    } catch (err: any) {
      console.error("저장 실패:", err);
      alert(`저장 실패: ${err.message}`);
      setPhotoStates((prev) => ({
        ...prev,
        [sequence]: {
          ...prev[sequence],
          ...(photoType === "before_photo"
            ? { beforeUploading: false }
            : { afterUploading: false }),
        },
      }));
      return false;
    }
  };

  // ─── 닫기 시 CS용 오픈박스 영상 백그라운드 업로드 ────────────────────────

  const uploadBoxOpenVideoInBackground = (blob: Blob, duration: number) => {
    const currentOrderId = orderId;

    const path =
      typeof window !== "undefined" ? window.location.pathname : "/ops/inbound";
    const { endpoint, sequence } = resolveOpsLiveVideoUpload(path);

    (async () => {
      try {
        console.log(`📹 라이브 영상 업로드 시작 (${duration}초, ${(blob.size / 1024 / 1024).toFixed(1)}MB, endpoint: ${endpoint}, sequence: ${sequence})`);

        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        let binary = "";
        const chunkSize = 8192;
        for (let i = 0; i < uint8Array.length; i += chunkSize) {
          const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
          binary += String.fromCharCode.apply(null, Array.from(chunk));
        }
        const base64 = btoa(binary);

        await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: currentOrderId,
            base64,
            mimeType: "video/webm",
            sequence,
            durationSeconds: duration,
          }),
        });
        console.log("✅ 라이브 영상 업로드 완료");
      } catch (e) {
        console.warn("⚠️ 오픈박스 영상 업로드 실패 (무시):", e);
      }
    })();
  };

  // ─── 완료 처리 ────────────────────────────────────────────────────────────

  const doneCount = Object.values(photoStates).filter((s) =>
    photoType === "before_photo" ? s.beforeDone : s.afterDone
  ).length;
  const totalCount = repairItems.length;
  const allDone = doneCount === totalCount;
  const packScanReady =
    autoFinishOnAllPacked &&
    canStartOutboundPackScan({ itemCount: totalCount, photoDoneCount: doneCount });

  const handleFinish = () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    const currentDuration = recordDuration;

    // 녹화 중지 후 영상 백그라운드 업로드
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        if (blob.size > 0) {
          uploadBoxOpenVideoInBackground(blob, currentDuration);
        }
      };
      recorderRef.current.stop();
    }

    streamRef.current?.getTracks().forEach((t) => t.stop());

    const result: Record<number, { before?: string; after?: string }> = {};
    Object.entries(photoStates).forEach(([seq, s]) => {
      result[Number(seq)] = { before: s.before, after: s.after };
    });
    onAllDone?.(result);
    onClose();
  };

  const focusScan = () => {
    requestAnimationFrame(() => scanInputRef.current?.focus());
  };

  const handlePackScan = async () => {
    const raw = scanValue;
    setScanValue("");
    focusScan();
    if (!autoFinishOnAllPacked) return;

    const photoDoneSeqs = repairItems
      .map((_, idx) => idx + 1)
      .filter((seq) =>
        photoType === "before_photo"
          ? photoStates[seq]?.beforeDone
          : photoStates[seq]?.afterDone
      );
    const decision = resolveOutboundPackScan({
      scanned: raw,
      items: repairItems.map((item, idx) => ({
        seq: idx + 1,
        barcodeNo: item.barcodeNo,
      })),
      prefixes: barcodePrefixes,
      photoDoneCount: doneCount,
      photoDoneSeqs,
      packedSeqs: Object.keys(sessionPacked).map(Number),
    });

    if (!decision.ok) {
      setScanMessage(
        packScanFailMessage(decision.reason, {
          doneCount,
          totalCount,
          seq: decision.seq,
          mode: packMode,
        })
      );
      return;
    }

    if (decision.action === "FINISH") {
      setScanMessage(`${waybillLabel} 확인 — 촬영 종료`);
      handleFinish();
      return;
    }

    setSessionPacked((prev) => ({ ...prev, [decision.seq]: true }));
    setScanMessage(`#${decision.seq} 담기 완료`);
    focusScan();
  };

  const markPackedByClick = (sequence: number) => {
    if (!packScanReady) return;
    if (sessionPacked[sequence]) return;
    setSessionPacked((prev) => ({ ...prev, [sequence]: true }));
    setScanMessage(`#${sequence} 담기 완료`);
    focusScan();
  };

  const allPacked =
    autoFinishOnAllPacked &&
    shouldAutoFinishPacking({
      itemCount: repairItems.length,
      sessionPackedSeqs: Object.keys(sessionPacked).map(Number),
      photosComplete: packScanReady,
    });

  useEffect(() => {
    if (!packScanReady || !cameraReady) return;
    focusScan();
  }, [packScanReady, cameraReady, allPacked]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div
        className="flex items-center justify-between px-4 py-3 text-white"
        style={{ backgroundColor: labelColor }}
      >
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5" />
          <span className="font-bold text-base">{label} 사진</span>
          <span className="text-sm opacity-80">({doneCount}/{totalCount} 완료)</span>
        </div>
        <div className="flex items-center gap-3">
          {/* REC 표시 */}
          {cameraReady && (
            <div className="flex items-center gap-1.5 bg-red-600 px-2.5 py-1 rounded-full text-xs font-bold">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              REC {recordDuration}초
            </div>
          )}
          <button onClick={handleFinish} className="p-1 hover:opacity-70">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 메인 영역 — 좌우 분할 */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── 왼쪽: 라이브 영상 ── */}
        <div className="flex flex-col w-[55%] bg-black relative">
          {(cameraError || cameraStarting) && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white text-center p-4 z-10">
              <div>
                <Camera className="w-12 h-12 mx-auto mb-2 opacity-40" />
                {cameraStarting ? (
                  <>
                    <div className="w-8 h-8 mx-auto mb-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <p className="text-sm">카메라 연결 중...</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm whitespace-pre-line">{cameraError}</p>
                    <button
                      type="button"
                      onClick={() => void startCamera(facingMode)}
                      className="mt-3 px-4 py-2 bg-white/20 rounded-lg text-sm hover:bg-white/30"
                    >
                      재시도
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          <video
            ref={videoRef}
            muted
            playsInline
            className="w-full flex-1 object-cover"
          />

          {/* hidden canvas (캡처용) */}
          <canvas ref={canvasRef} className="hidden" />

          {/* 카메라 전환 버튼 */}
          <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent">
            <button
              onClick={toggleCamera}
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <div className="w-10" />
          </div>

          {/* 안내 문구 */}
          {cameraReady && (
            <div className="absolute top-3 left-0 right-0 text-center pointer-events-none">
              <span className="px-3 py-1 bg-black/50 text-white text-xs rounded-full">
                {autoFinishOnAllPacked
                  ? packScanReady
                    ? allPacked
                      ? `${waybillLabel}을 다시 스캔하면 촬영이 종료됩니다`
                      : "내품 바코드를 스캔하거나 항목을 클릭하면 담기가 완료됩니다"
                    : `오른쪽 항목을 클릭해 ${label} 사진을 먼저 저장하세요`
                  : "오른쪽 제품명을 클릭하면 현재 화면이 저장됩니다"}
              </span>
            </div>
          )}
        </div>

        {/* ── 오른쪽: 제품 목록 ── */}
        <div className="flex flex-col w-[45%] bg-gray-50 overflow-y-auto">
          <div className="px-3 py-2 bg-white border-b border-gray-200">
            {autoFinishOnAllPacked ? (
              <>
                <p className="text-xs font-semibold text-gray-600">
                  {packMode === "inbound" ? "수선 신청 항목" : "내품 리스트"}
                </p>
                <p className="text-xs text-gray-800 font-mono mt-0.5 truncate">
                  {barcodePrefixes[0] || finalWaybillNo || "송장 없음"}
                </p>
                <p className="text-xs font-medium mt-0.5 text-green-700">
                  {packScanReady
                    ? allPacked
                      ? `항목 완료 · ${waybillLabel}을 다시 스캔하면 촬영 종료`
                      : `스캔 또는 클릭 → 담기 · 모두 담은 뒤 ${waybillLabel} 스캔`
                    : `${label} 사진 ${doneCount}/${totalCount}장 저장 후 스캔`}
                </p>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold text-gray-600">수선 항목</p>
                <p className="text-xs text-orange-600 font-medium mt-0.5">
                  클릭 → 현재 화면 즉시 저장
                </p>
              </>
            )}
          </div>

          {autoFinishOnAllPacked && (
            <div className="px-3 py-2 bg-white border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Scan className="w-4 h-4 text-gray-500 shrink-0" />
                <input
                  ref={scanInputRef}
                  value={scanValue}
                  onChange={(e) => setScanValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handlePackScan();
                    }
                  }}
                  placeholder={
                    packScanReady
                      ? allPacked
                        ? `${waybillLabel} 다시 스캔 → 촬영 종료`
                        : "내품 바코드 스캔"
                      : `${label} 사진 저장 후 스캔`
                  }
                  disabled={!packScanReady}
                  className={`flex-1 border rounded-lg px-3 py-2 text-sm font-mono ${
                    packScanReady ? "bg-white" : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                  autoComplete="off"
                />
              </div>
              {scanMessage && (
                <p className={`text-xs mt-1.5 ${
                  scanMessage.includes("완료") || scanMessage.includes("종료")
                    ? "text-green-700"
                    : "text-red-600"
                }`}>
                  {scanMessage}
                </p>
              )}
              <p className={`text-xs mt-1 font-medium ${
                Object.keys(sessionPacked).length === repairItems.length
                  ? "text-green-700"
                  : packScanReady
                  ? "text-amber-700"
                  : "text-gray-500"
              }`}>
                담기 {Object.keys(sessionPacked).length}/{repairItems.length}
                {allPacked
                  ? ` · ${waybillLabel}을 다시 스캔하세요`
                  : packScanReady && Object.keys(sessionPacked).length < repairItems.length
                  ? " · 스캔하면 초록 체크로 바뀝니다"
                  : ""}
              </p>
            </div>
          )}

          <div className="p-2 space-y-2">
            {repairItems.map((item, idx) => {
              const seq = idx + 1;
              const state = photoStates[seq] || {};
              const isDone =
                photoType === "before_photo" ? state.beforeDone : state.afterDone;
              const isPacked = !!sessionPacked[seq];
              const isUploading =
                photoType === "before_photo"
                  ? state.beforeUploading
                  : state.afterUploading;
              const thumbUrl =
                photoType === "before_photo" ? state.before : state.after;

              return (
                <button
                  key={item.id}
                  onClick={async () => {
                    if (autoFinishOnAllPacked && packScanReady && isDone) {
                      markPackedByClick(seq);
                      return;
                    }
                    await saveToItem(seq);
                    if (autoFinishOnAllPacked) focusScan();
                  }}
                  disabled={!cameraReady || isUploading}
                  className={`w-full text-left rounded-xl p-3 border-2 transition-all ${
                    !cameraReady || isUploading
                      ? "border-gray-200 bg-white cursor-not-allowed opacity-60"
                      : isPacked
                      ? "border-green-600 bg-green-100 ring-2 ring-green-300 cursor-pointer"
                      : isDone
                      ? "border-amber-300 bg-amber-50 hover:bg-amber-100 cursor-pointer"
                      : "border-orange-400 bg-orange-50 hover:bg-orange-100 cursor-pointer shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {/* 썸네일 */}
                    <div className={`w-12 h-12 rounded-lg overflow-hidden bg-gray-200 shrink-0 border ${
                      isPacked ? "border-green-500" : "border-gray-200"
                    }`}>
                      {thumbUrl ? (
                        <img
                          src={thumbUrl}
                          alt={label}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Camera className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500">#{seq}</p>
                      <p className={`text-sm font-medium truncate ${
                        isPacked ? "text-green-800" : "text-gray-800"
                      }`}>
                        {item.repairPart}
                      </p>
                      {autoFinishOnAllPacked && (
                        <p className={`text-xs truncate ${
                          isPacked ? "text-green-700 font-semibold" : isDone ? "text-amber-700" : "text-gray-400"
                        }`}>
                          {isPacked
                            ? "담기 완료"
                            : isDone
                            ? "사진 저장됨 · 스캔 대기"
                            : item.barcodeNo || "사진 대기"}
                        </p>
                      )}
                      {!autoFinishOnAllPacked && item.barcodeNo && (
                        <p className="text-xs text-gray-400 font-mono truncate">{item.barcodeNo}</p>
                      )}
                    </div>

                    {/* 상태 뱃지 */}
                    <div className="shrink-0 flex flex-col items-center gap-0.5">
                      {isUploading ? (
                        <div className="w-8 h-8 rounded-full border-2 border-gray-300 border-t-orange-500 animate-spin" />
                      ) : isPacked ? (
                        <>
                          <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">
                            <Check className="w-5 h-5 text-white" />
                          </div>
                          <span className="text-[10px] font-bold text-green-700">담김</span>
                        </>
                      ) : isDone ? (
                        <>
                          <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white text-[10px] font-bold">
                            담기
                          </div>
                        </>
                      ) : (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: labelColor }}
                        >
                          {autoFinishOnAllPacked ? "사진" : "클릭"}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* 완료 버튼 */}
          <div className="mt-auto p-3 border-t border-gray-200 bg-white">
            {autoFinishOnAllPacked && allPacked ? (
              <button
                onClick={handleFinish}
                className="w-full py-3 rounded-xl font-bold text-white"
                style={{ backgroundColor: labelColor }}
              >
                <span className="flex items-center justify-center gap-2">
                  <Check className="w-5 h-5" />
                  {waybillLabel} 스캔하면 촬영 종료
                </span>
              </button>
            ) : allDone && !autoFinishOnAllPacked ? (
              <button
                onClick={handleFinish}
                className="w-full py-3 rounded-xl font-bold text-white"
                style={{ backgroundColor: labelColor }}
              >
                <span className="flex items-center justify-center gap-2">
                  <Check className="w-5 h-5" />
                  전체 완료 — 닫기
                </span>
              </button>
            ) : (
              <button
                onClick={handleFinish}
                className="w-full py-3 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200"
              >
                {autoFinishOnAllPacked
                  ? `남은 내품 ${repairItems.length - Object.keys(sessionPacked).length}개 — 강제 종료`
                  : doneCount > 0
                  ? `${doneCount}개 저장 완료 — 닫기`
                  : "닫기"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
