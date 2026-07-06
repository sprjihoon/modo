"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type Props = {
  orderId: string;
  onUploaded?: (url: string, duration: number) => void;
  onClose?: () => void;
  maxDuration?: number; // 최대 녹화 시간 (초), 설정 시 자동 종료
  sequence?: number; // 촬영 순서 (1, 2, 3...)
  existingVideoId?: string; // 재촬영 시 삭제할 기존 영상 ID
};

export default function WebcamRecorder({ orderId, onUploaded, onClose, maxDuration, sequence = 1, existingVideoId }: Props) {
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        console.log("🔍 카메라 장치 목록 조회 중...");
        const list = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = list.filter((d) => d.kind === "videoinput");
        console.log("📹 카메라 장치 발견:", videoInputs.length, "개");
        
        if (videoInputs.length === 0) {
          throw new Error("카메라 장치를 찾을 수 없습니다.");
        }
        
        setDevices(videoInputs);
        
        // deviceId가 있는 카메라 찾기
        const preferred =
          videoInputs.find((d) => d.deviceId && /usb|webcam|camera/i.test(d.label))?.deviceId ||
          videoInputs.find((d) => d.deviceId)?.deviceId ||
          "default"; // deviceId가 없으면 "default" 사용
        
        console.log("✅ 선택된 카메라:", preferred);
        setDeviceId(preferred);
      } catch (e: any) {
        console.error("❌ 카메라 장치 조회 실패:", e);
        setError(e.message || "카메라 장치를 찾을 수 없습니다.");
        setLoading(false);
      }
    };
    init();
    return () => {
      stopStream();
    };
  }, []);

  useEffect(() => {
    if (!deviceId || deviceId === "") {
      console.log("⏸️ deviceId 없음, 카메라 시작 대기");
      return;
    }
    console.log("🚀 deviceId 변경 감지, 카메라 시작:", deviceId);
    startPreview().catch((e) => {
      console.error("❌ startPreview 실패:", e);
    });
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
      setLoading(true);
      stopStream();
      setError(null);
      
      console.log("🎥 카메라 시작 시도, deviceId:", deviceId);
      
      // 타임아웃을 20초로 늘려서 사용자가 권한 대화상자를 확인할 시간 확보
      const getUserMediaWithTimeout = async (constraints: MediaStreamConstraints, timeout = 20000) => {
        return Promise.race([
          navigator.mediaDevices.getUserMedia(constraints),
          new Promise<MediaStream>((_, reject) => 
            setTimeout(() => reject(new Error("카메라 접근 시간이 초과되었습니다. 브라우저 주소창에서 카메라 권한을 허용해주세요.")), timeout)
          )
        ]);
      };

      let stream: MediaStream | null = null;

      // 1차 시도: 가장 단순한 제약 조건으로 시도 (기본 카메라)
      try {
        console.log("🎥 1차 시도: 기본 카메라 (제약 조건 최소화)");
        stream = await getUserMediaWithTimeout({
          video: true,
          audio: false,
        });
        console.log("✅ 1차 시도 성공");
      } catch (e: any) {
        console.warn("⚠️ 1차 시도 실패:", e.message);
        
        // 2차 시도: deviceId가 있고 "default"가 아니면 해당 카메라 시도
        if (deviceId && deviceId !== "default") {
          try {
            console.log("🎥 2차 시도: deviceId 사용:", deviceId);
            stream = await getUserMediaWithTimeout({
              video: {
                deviceId: { ideal: deviceId },
              },
              audio: false,
            });
            console.log("✅ 2차 시도 성공");
          } catch (e2: any) {
            console.warn("⚠️ 2차 시도 실패:", e2.message);
            // 최종적으로 원래 에러를 throw
            throw e;
          }
        } else {
          throw e;
        }
      }

      if (!stream) {
        throw new Error("카메라 스트림을 가져올 수 없습니다.");
      }

      console.log("✅ 카메라 스트림 획득 성공");
      mediaStreamRef.current = stream;
      
      if (videoRef.current) {
        // eslint-disable-next-line
        (videoRef.current as any).srcObject = stream;
        await videoRef.current.play();
        console.log("✅ 비디오 재생 시작");
      }
      
      // Canvas 초기화
      if (canvasRef.current && videoRef.current) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.width = 640;
        canvas.height = 360;
      }
      
      // 권한을 받은 후 장치 목록 다시 조회 (실제 카메라 이름 가져오기)
      try {
        const updatedList = await navigator.mediaDevices.enumerateDevices();
        const updatedVideoInputs = updatedList.filter((d) => d.kind === "videoinput");
        if (updatedVideoInputs.length > 0) {
          console.log("🔄 카메라 목록 업데이트:", updatedVideoInputs.length, "개");
          setDevices(updatedVideoInputs);
          
          // 현재 사용 중인 카메라 ID 찾기
          const currentTrack = stream.getVideoTracks()[0];
          const currentDeviceId = currentTrack?.getSettings()?.deviceId;
          if (currentDeviceId) {
            console.log("📹 현재 사용 중인 카메라:", currentDeviceId);
            setDeviceId(currentDeviceId);
          }
        }
      } catch (e) {
        console.warn("⚠️ 카메라 목록 업데이트 실패:", e);
      }
      
      setLoading(false);
      console.log("✅ 카메라 준비 완료");
    } catch (e: any) {
      setLoading(false);
      let errorMessage = "카메라 미리보기에 실패했습니다.";
      
      if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
        errorMessage = "카메라 권한이 거부되었습니다. 브라우저 주소창 왼쪽의 🔒 아이콘을 클릭하여 카메라 권한을 '허용'으로 변경하고 페이지를 새로고침해주세요.";
      } else if (e.name === "NotFoundError" || e.name === "DevicesNotFoundError") {
        errorMessage = "카메라 장치를 찾을 수 없습니다. 카메라가 컴퓨터에 연결되어 있는지 확인해주세요.";
      } else if (e.name === "NotReadableError" || e.name === "TrackStartError") {
        errorMessage = "카메라가 다른 프로그램에서 사용 중입니다. Zoom, Teams, Skype 등 카메라를 사용하는 프로그램을 모두 종료한 후 다시 시도해주세요.";
      } else if (e.name === "OverconstrainedError") {
        errorMessage = "선택한 카메라가 요구사항을 충족하지 못합니다. 다른 카메라를 선택해주세요.";
      } else if (e.name === "AbortError" || (e.message && e.message.includes("Timeout starting video source"))) {
        errorMessage = `카메라가 응답하지 않습니다. 아래 방법을 시도해보세요:

1️⃣ 다른 프로그램에서 카메라를 사용 중이라면 모두 종료하세요
   (Zoom, Teams, Skype, OBS, Discord 등)

2️⃣ Windows 카메라 앱으로 카메라가 작동하는지 확인하세요
   (시작 > 카메라 검색 후 실행)

3️⃣ USB 카메라라면 다시 연결해보세요
   (케이블을 뽑았다가 다시 연결)

4️⃣ 브라우저를 완전히 닫고 다시 열어보세요
   (모든 Chrome/Edge 창을 닫고 재시작)

5️⃣ 컴퓨터를 재시작해보세요`;
      } else if (e.message && e.message.includes("초과")) {
        errorMessage = e.message + "\n\n브라우저 주소창 왼쪽에 카메라 권한 요청 팝업이 표시되었다면 '허용'을 클릭해주세요.";
      } else if (e.message) {
        errorMessage = e.message;
      }
      
      console.error("❌ 카메라 시작 실패:", e.name, e.message, e);
      setError(errorMessage);
    }
  };


  const startRecord = async () => {
    if (!mediaStreamRef.current) return;
    try {
      chunksRef.current = [];
      recordStartTimeRef.current = Date.now();
      setRecordDuration(0);
      
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
      
      // Duration 업데이트용 interval
      const durationInterval = setInterval(() => {
        if (!recorderRef.current || recorderRef.current.state !== "recording") {
          clearInterval(durationInterval);
          return;
        }
        const elapsed = Math.floor((Date.now() - recordStartTimeRef.current) / 1000);
        setRecordDuration(elapsed);
        
        // maxDuration 도달 시 자동 종료
        if (maxDuration && elapsed >= maxDuration) {
          clearInterval(durationInterval);
          stopRecord();
        }
      }, 1000);
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
    
    const currentSequence = sequence;
    const currentDuration = recordDuration;
    const currentOrderId = orderId;
    
    try {
      setUploading(true);
      console.log(`📤 ${currentSequence}번 아이템 업로드 시작`);
      
      // 기존 영상 삭제 (재촬영인 경우)
      if (existingVideoId) {
        try {
          await fetch("/api/ops/video/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ videoId: existingVideoId }),
          });
          console.log("🗑️ 기존 영상 삭제:", existingVideoId);
        } catch (deleteError) {
          console.warn("⚠️ 기존 영상 삭제 실패 (계속 진행):", deleteError);
        }
      }
      
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      console.log(`📦 ArrayBuffer 생성: ${(uint8Array.length / 1024).toFixed(2)}KB`);
      
      // Base64 변환 (큰 배열에 안전한 방법)
      let binary = '';
      const chunkSize = 8192; // 8KB 청크로 분할
      
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }
      
      const base64 = btoa(binary);
      
      console.log(`✅ Base64 변환 완료: ${(base64.length / 1024).toFixed(2)}KB`);
      
      // Determine stream upload endpoint based on current path
      let endpoint = "/api/ops/inbound/stream-upload";
      try {
        if (typeof window !== "undefined") {
          const pathname = window.location.pathname;
          if (pathname.includes("/ops/work")) {
            endpoint = "/api/ops/work/stream-upload";
          } else if (pathname.includes("/ops/outbound")) {
            endpoint = "/api/ops/outbound/stream-upload";
          }
        }
      } catch {}

      console.log(`📡 업로드 중: ${endpoint}`);

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: currentOrderId,
          base64,
          mimeType: "video/webm",
          sequence: currentSequence,
          durationSeconds: currentDuration,
        }),
      });
      
      const json = await res.json();
      console.log(`📥 서버 응답:`, json.success, json.videoId);
      
      if (!res.ok) throw new Error(json?.error || "업로드 실패");
      
      console.log(`✅ ${currentSequence}번 업로드 완료`);
      
      // 콜백 호출 (순환 참조 없는 primitive 값만 전달)
      if (onUploaded) {
        const videoId = json.videoId || "";
        onUploaded(videoId, currentDuration);
      }
      
      alert(`업로드 완료 (${currentDuration}초)`);
    } catch (e: any) {
      console.error(`❌ ${currentSequence}번 업로드 실패:`, e);
      alert(e.message || "업로드 실패");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* 카메라 권한 안내 */}
      {loading && !error && (
        <div className="p-3 bg-blue-50 border-2 border-blue-300 rounded-lg animate-pulse">
          <div className="flex items-start gap-2">
            <span className="text-lg">🎥</span>
            <div>
              <p className="text-sm text-blue-900 font-semibold">카메라 권한 요청 중...</p>
              <p className="text-xs text-blue-700 mt-1">
                브라우저에서 카메라 권한을 요청하는 팝업이 나타나면 <strong>&quot;허용&quot;</strong>을 클릭해주세요.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* 안내 메시지 */}
      {maxDuration && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            ⏱️ <strong>{maxDuration}초</strong> 후 자동으로 촬영이 종료됩니다.
          </p>
        </div>
      )}
      {existingVideoId && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            🔄 재촬영 모드: 업로드 시 기존 영상이 삭제됩니다.
          </p>
        </div>
      )}
      {sequence > 1 && (
        <div className="p-2 bg-gray-50 border border-gray-200 rounded">
          <p className="text-xs text-gray-600">
            📹 {sequence}번째 아이템 촬영 중
          </p>
        </div>
      )}
      
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
        <video ref={videoRef} className="w-full rounded border" muted playsInline />
        
        {/* 로딩 중 오버레이 */}
        {loading && (
          <div className="absolute inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center rounded">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-3"></div>
              <p className="text-sm">카메라 준비 중...</p>
            </div>
          </div>
        )}
        
        {/* 녹화 중 오버레이 */}
        {recording && (
          <>
            {/* 날짜/시간 (좌상단) */}
            <div className="absolute top-3 left-3 bg-black bg-opacity-70 text-white px-3 py-2 rounded text-xs leading-tight">
              <div>{new Date().toLocaleDateString("ko-KR")}</div>
              <div className="mt-1">{new Date().toLocaleTimeString("ko-KR")}</div>
            </div>
            {/* REC + 녹화시간 (우상단) */}
            <div className="absolute top-3 right-3 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              REC {recordDuration}초
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <p className="text-sm text-red-800 font-semibold mb-3 whitespace-pre-line">{error}</p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={startPreview}
                  className="px-6 py-2 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition-colors"
                >
                  🔄 다시 시도
                </button>
                <a
                  href="ms-settings:privacy-webcam"
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
                  title="Windows 카메라 설정 열기"
                >
                  ⚙️ Windows 카메라 설정
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        {!recording ? (
          <button
            onClick={startRecord}
            disabled={loading || !!error || !mediaStreamRef.current}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
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

