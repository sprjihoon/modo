"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  orderId: string;
  onUploaded?: (url: string) => void;
  onClose?: () => void;
};

export default function WebcamRecorder({ orderId, onUploaded, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const recordStartTimeRef = useRef<number>(0);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);
  const [recording, setRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const list = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = list.filter((d) => d.kind === "videoinput");
        setDevices(videoInputs);
        const preferred =
          videoInputs.find((d) => /usb|webcam|camera/i.test(d.label))?.deviceId ||
          videoInputs[0]?.deviceId;
        setDeviceId(preferred);
      } catch (e: any) {
        setError(e.message || "카메라 장치를 찾을 수 없습니다.");
      }
    };
    init();
    return () => {
      stopStream();
    };
  }, []);

  useEffect(() => {
    if (!deviceId) return;
    startPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  const stopStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  };

  const startPreview = async () => {
    try {
      stopStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId,
          width: { ideal: 640 },
          height: { ideal: 360 },
          frameRate: { ideal: 24, max: 24 },
        },
        audio: false,
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (videoRef.current as any).srcObject = stream;
        await videoRef.current.play();
      }
    } catch (e: any) {
      setError(e.message || "카메라 미리보기에 실패했습니다.");
    }
  };

  // Canvas에 비디오 + 오버레이 그리기
  const drawFrame = () => {
    if (!videoRef.current || !canvasRef.current || !recording) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 비디오 프레임 그리기
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 현재 시간 오버레이
    const now = new Date();
    const dateStr = now.toLocaleDateString("ko-KR");
    const timeStr = now.toLocaleTimeString("ko-KR");
    
    // 녹화 시간 계산
    const elapsed = Math.floor((Date.now() - recordStartTimeRef.current) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const durationStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;

    // 배경 + 텍스트 그리기
    ctx.font = "16px Arial";
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(10, 10, 200, 60);
    
    ctx.fillStyle = "#fff";
    ctx.fillText(dateStr, 20, 30);
    ctx.fillText(timeStr, 20, 50);
    
    // 녹화 시간 (우측 상단)
    ctx.fillStyle = "rgba(255, 0, 0, 0.8)";
    ctx.fillRect(canvas.width - 120, 10, 110, 30);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px Arial";
    ctx.fillText(`⏺ ${durationStr}`, canvas.width - 110, 32);

    setRecordDuration(elapsed);
    animationFrameRef.current = requestAnimationFrame(drawFrame);
  };

  const startRecord = async () => {
    if (!mediaStreamRef.current || !canvasRef.current) return;
    try {
      chunksRef.current = [];
      recordStartTimeRef.current = Date.now();
      setRecordDuration(0);
      
      // Canvas 스트림 생성
      const canvasStream = canvasRef.current.captureStream(24);
      
      const mimeType =
        MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
      const rec = new MediaRecorder(canvasStream, {
        mimeType,
        videoBitsPerSecond: 700_000,
      });
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        const b = new Blob(chunksRef.current, { type: "video/webm" });
        setBlob(b);
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
      
      // 프레임 그리기 시작
      drawFrame();
    } catch (e: any) {
      setError(e.message || "녹화 시작 실패");
    }
  };

  const stopRecord = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  const upload = async () => {
    if (!blob) return;
    try {
      setUploading(true);
      const arrayBuffer = await blob.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      // Determine stream upload endpoint based on current path
      let endpoint = "/api/ops/inbound/stream-upload";
      try {
        if (typeof window !== "undefined" && window.location.pathname.includes("/ops/outbound")) {
          endpoint = "/api/ops/outbound/stream-upload";
        }
      } catch {}

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          base64,
          mimeType: "video/webm",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "업로드 실패");
      onUploaded?.(json.videoId || "");
      alert("업로드 완료 (Cloudflare Stream)");
    } catch (e: any) {
      alert(e.message || "업로드 실패");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-sm">카메라</label>
        <select
          className="border rounded px-2 py-1 text-sm"
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
        >
          {devices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || d.deviceId}
            </option>
          ))}
        </select>
      </div>

      <div className="relative">
        <video ref={videoRef} className="w-full rounded border" muted playsInline style={{ display: recording ? 'none' : 'block' }} />
        <canvas ref={canvasRef} width={640} height={360} className="w-full rounded border" style={{ display: recording ? 'block' : 'none' }} />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-2">
        {!recording ? (
          <button
            onClick={startRecord}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-2"
          >
            <span className="text-xl">⏺</span>
            녹화 시작
          </button>
        ) : (
          <button
            onClick={stopRecord}
            className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 flex items-center gap-2"
          >
            <span className="text-xl">⏹</span>
            녹화 종료 ({recordDuration}초)
          </button>
        )}

        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          닫기
        </button>
      </div>

      {blob && (
        <div className="space-y-2">
          <p className="text-xs text-gray-600">
            파일 크기: {(blob.size / 1024 / 1024).toFixed(2)} MB
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={uploading}
              onClick={upload}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {uploading ? "업로드 중..." : "업로드"}
            </button>
            <button
              onClick={() => setBlob(null)}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              다시 찍기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

