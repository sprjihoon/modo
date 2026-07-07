"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Camera, Check, X, RefreshCw } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PhotoType = "before_photo" | "after_photo";

export interface RepairItem {
  id: string;
  repairPart: string;
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
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const recordStartRef = useRef<number>(0);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [recordDuration, setRecordDuration] = useState(0);

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
    try {
      // 기존 스트림 및 녹화 중지
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraReady(true);
      setCameraError(null);
      startRecording(stream);
    } catch (err: any) {
      console.error("카메라 오류:", err);
      setCameraError(err.message || "카메라를 시작할 수 없습니다.");
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

  const saveToItem = async (sequence: number) => {
    if (!cameraReady) return;

    const dataUrl = captureFrame();
    if (!dataUrl) return;

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
    }
  };

  // ─── 닫기 시 CS용 오픈박스 영상 백그라운드 업로드 ────────────────────────

  const uploadBoxOpenVideoInBackground = (blob: Blob, duration: number) => {
    const currentOrderId = orderId;

    // 현재 페이지에 맞는 stream-upload 엔드포인트 선택
    let endpoint = "/api/ops/inbound/stream-upload";
    try {
      if (typeof window !== "undefined") {
        const path = window.location.pathname;
        if (path.includes("/ops/outbound")) {
          endpoint = "/api/ops/outbound/stream-upload";
        } else if (path.includes("/ops/work")) {
          endpoint = "/api/ops/work/stream-upload";
        }
      }
    } catch {}

    (async () => {
      try {
        console.log(`📹 오픈박스 영상 업로드 시작 (CS용, ${duration}초, ${(blob.size / 1024 / 1024).toFixed(1)}MB, endpoint: ${endpoint})`);

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
            sequence: 0, // box_open_video (CS용)
            durationSeconds: duration,
          }),
        });
        console.log("✅ 오픈박스 영상 업로드 완료 (CS용)");
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

  const handleFinish = () => {
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
          {cameraError && (
            <div className="absolute inset-0 flex items-center justify-center text-white text-center p-4 z-10">
              <div>
                <Camera className="w-12 h-12 mx-auto mb-2 opacity-40" />
                <p className="text-sm">{cameraError}</p>
                <button
                  onClick={() => startCamera(facingMode)}
                  className="mt-3 px-4 py-2 bg-white/20 rounded-lg text-sm"
                >
                  재시도
                </button>
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
                오른쪽 제품명을 클릭하면 현재 화면이 저장됩니다
              </span>
            </div>
          )}
        </div>

        {/* ── 오른쪽: 제품 목록 ── */}
        <div className="flex flex-col w-[45%] bg-gray-50 overflow-y-auto">
          <div className="px-3 py-2 bg-white border-b border-gray-200">
            <p className="text-xs font-semibold text-gray-600">수선 항목</p>
            <p className="text-xs text-orange-600 font-medium mt-0.5">
              클릭 → 현재 화면 즉시 저장
            </p>
          </div>

          <div className="p-2 space-y-2">
            {repairItems.map((item, idx) => {
              const seq = idx + 1;
              const state = photoStates[seq] || {};
              const isDone =
                photoType === "before_photo" ? state.beforeDone : state.afterDone;
              const isUploading =
                photoType === "before_photo"
                  ? state.beforeUploading
                  : state.afterUploading;
              const thumbUrl =
                photoType === "before_photo" ? state.before : state.after;

              return (
                <button
                  key={item.id}
                  onClick={() => saveToItem(seq)}
                  disabled={!cameraReady || isUploading}
                  className={`w-full text-left rounded-xl p-3 border-2 transition-all ${
                    !cameraReady || isUploading
                      ? "border-gray-200 bg-white cursor-not-allowed opacity-60"
                      : isDone
                      ? "border-green-300 bg-green-50 hover:bg-green-100 cursor-pointer"
                      : "border-orange-400 bg-orange-50 hover:bg-orange-100 cursor-pointer shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {/* 썸네일 */}
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 shrink-0 border border-gray-200">
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
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {item.repairPart}
                      </p>
                    </div>

                    {/* 상태 뱃지 */}
                    <div className="shrink-0">
                      {isUploading ? (
                        <div className="w-7 h-7 rounded-full border-2 border-gray-300 border-t-orange-500 animate-spin" />
                      ) : isDone ? (
                        <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
                          <Check className="w-4 h-4 text-green-600" />
                        </div>
                      ) : (
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: labelColor }}
                        >
                          클릭
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
            {allDone ? (
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
                {doneCount > 0
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
