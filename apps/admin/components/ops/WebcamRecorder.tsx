"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  orderId: string;
  onUploaded?: (url: string) => void;
  onClose?: () => void;
};

export default function WebcamRecorder({ orderId, onUploaded, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);
  const [recording, setRecording] = useState(false);
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

  const startRecord = async () => {
    if (!mediaStreamRef.current) return;
    try {
      chunksRef.current = [];
      const mimeType =
        MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
      const rec = new MediaRecorder(mediaStreamRef.current, {
        mimeType,
        videoBitsPerSecond: 700_000,
      });
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const b = new Blob(chunksRef.current, { type: "video/webm" });
        setBlob(b);
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
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

      <video ref={videoRef} className="w-full rounded border" muted playsInline />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-2">
        {!recording ? (
          <button
            onClick={startRecord}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            녹화 시작
          </button>
        ) : (
          <button
            onClick={stopRecord}
            className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900"
          >
            녹화 종료
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

