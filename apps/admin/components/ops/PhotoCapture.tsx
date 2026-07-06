"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Camera, RotateCcw, Check, X, RefreshCw } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PhotoType = "before_photo" | "after_photo";

export interface RepairItem {
  id: string;
  repairPart: string;
}

export interface CapturedPhoto {
  sequence: number;
  photoType: PhotoType;
  dataUrl: string; // base64 미리보기
  file?: File;     // 실제 업로드용
}

interface PhotoState {
  before?: string; // URL or dataUrl
  after?: string;
  beforeUploading?: boolean;
  afterUploading?: boolean;
  beforeDone?: boolean;
  afterDone?: boolean;
}

interface Props {
  orderId: string;
  repairItems: RepairItem[];
  photoType: PhotoType; // 이 세션이 before인지 after인지
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

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null); // 방금 찍은 사진 dataUrl
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  // 각 아이템의 사진 상태
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
  const labelColor = photoType === "before_photo" ? "#F97316" : "#00C896"; // orange / green

  // ─── 카메라 시작 ──────────────────────────────────────────────────────────

  const startCamera = useCallback(async (facing: "environment" | "user" = "environment") => {
    try {
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
    } catch (err: any) {
      console.error("카메라 오류:", err);
      setCameraError(err.message || "카메라를 시작할 수 없습니다.");
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleCamera = () => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    startCamera(next);
  };

  // ─── 사진 촬영 ────────────────────────────────────────────────────────────

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedPhoto(dataUrl);
  };

  const discardCapture = () => setCapturedPhoto(null);

  // dataUrl → File 변환
  const dataUrlToFile = (dataUrl: string, filename: string): File => {
    const arr = dataUrl.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
    const bstr = atob(arr[1]);
    const n = bstr.length;
    const u8arr = new Uint8Array(n);
    for (let i = 0; i < n; i++) u8arr[i] = bstr.charCodeAt(i);
    return new File([u8arr], filename, { type: mime });
  };

  // ─── 제품 클릭 → 저장 ────────────────────────────────────────────────────

  const saveToItem = async (sequence: number) => {
    if (!capturedPhoto) return;

    // 업로드 중 표시
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
        capturedPhoto,
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

      const savedUrl = json.url || capturedPhoto;

      setPhotoStates((prev) => ({
        ...prev,
        [sequence]: {
          ...prev[sequence],
          ...(photoType === "before_photo"
            ? { before: savedUrl, beforeDone: true, beforeUploading: false }
            : { after: savedUrl, afterDone: true, afterUploading: false }),
        },
      }));

      setCapturedPhoto(null); // 다음 촬영 준비
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

  // ─── 완료 여부 ────────────────────────────────────────────────────────────

  const doneCount = Object.values(photoStates).filter((s) =>
    photoType === "before_photo" ? s.beforeDone : s.afterDone
  ).length;
  const totalCount = repairItems.length;
  const allDone = doneCount === totalCount;

  const handleFinish = () => {
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
          <span className="font-bold text-base">
            {label} 사진 촬영
          </span>
          <span className="text-sm opacity-80">
            ({doneCount}/{totalCount} 완료)
          </span>
        </div>
        <button onClick={onClose} className="p-1 hover:opacity-70">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 메인 영역 — 좌우 분할 */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── 왼쪽: 카메라 영역 ── */}
        <div className="flex flex-col w-[55%] bg-black relative">
          {/* 카메라 에러 */}
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

          {/* 라이브 뷰 */}
          <video
            ref={videoRef}
            muted
            playsInline
            className={`w-full flex-1 object-cover ${capturedPhoto ? "hidden" : ""}`}
          />

          {/* 촬영된 사진 미리보기 */}
          {capturedPhoto && (
            <div className="relative w-full flex-1">
              <img
                src={capturedPhoto}
                alt="촬영된 사진"
                className="w-full h-full object-contain"
              />
              <div
                className="absolute top-2 left-2 px-2 py-1 rounded text-white text-xs font-bold"
                style={{ backgroundColor: labelColor }}
              >
                {label}
              </div>
            </div>
          )}

          {/* hidden canvas */}
          <canvas ref={canvasRef} className="hidden" />

          {/* 카메라 컨트롤 */}
          <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent">
            {/* 카메라 전환 */}
            <button
              onClick={toggleCamera}
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30"
            >
              <RefreshCw className="w-5 h-5" />
            </button>

            {!capturedPhoto ? (
              /* 촬영 버튼 */
              <button
                onClick={capture}
                disabled={!cameraReady}
                className="w-16 h-16 rounded-full border-4 border-white bg-white/30 hover:bg-white/50 disabled:opacity-40 flex items-center justify-center"
              >
                <div className="w-11 h-11 rounded-full bg-white" />
              </button>
            ) : (
              /* 재촬영 버튼 */
              <button
                onClick={discardCapture}
                className="w-16 h-16 rounded-full border-4 border-white bg-red-500/80 hover:bg-red-500 flex items-center justify-center"
              >
                <RotateCcw className="w-6 h-6 text-white" />
              </button>
            )}

            <div className="w-10" />
          </div>

          {/* 안내 문구 */}
          {!capturedPhoto && cameraReady && (
            <div className="absolute top-3 left-0 right-0 text-center">
              <span className="px-3 py-1 bg-black/50 text-white text-xs rounded-full">
                촬영 후 오른쪽 제품을 클릭하여 저장
              </span>
            </div>
          )}
          {capturedPhoto && (
            <div className="absolute top-3 left-0 right-0 text-center">
              <span className="px-3 py-1 bg-black/50 text-white text-xs rounded-full">
                저장할 제품을 오른쪽에서 클릭하세요
              </span>
            </div>
          )}
        </div>

        {/* ── 오른쪽: 제품 목록 ── */}
        <div className="flex flex-col w-[45%] bg-gray-50 overflow-y-auto">
          <div className="px-3 py-2 bg-white border-b border-gray-200">
            <p className="text-xs font-semibold text-gray-600">수선 항목</p>
            {capturedPhoto ? (
              <p className="text-xs text-orange-600 font-medium mt-0.5">
                클릭하여 사진 저장
              </p>
            ) : (
              <p className="text-xs text-gray-400 mt-0.5">사진을 먼저 찍어주세요</p>
            )}
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
                  disabled={!capturedPhoto || isUploading}
                  className={`w-full text-left rounded-xl p-3 border-2 transition-all ${
                    capturedPhoto && !isUploading
                      ? "border-orange-400 bg-orange-50 hover:bg-orange-100 cursor-pointer shadow-sm"
                      : isDone
                      ? "border-green-200 bg-green-50 cursor-default"
                      : "border-gray-200 bg-white cursor-default opacity-60"
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
                      ) : capturedPhoto ? (
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: labelColor }}
                        >
                          저장
                        </div>
                      ) : null}
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
