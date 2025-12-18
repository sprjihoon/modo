"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Upload, Video, Pause, Play, X, CheckCircle2, AlertCircle } from "lucide-react";
import { uploadToCloudflareStreamTus, formatUploadSpeed, calculateRemainingTime, formatTime, type UploadProgress } from "@/lib/cloudflareStreamUploadTus";

interface VideoUploadEnhancedProps {
  orderId: string;
  trackingNo: string;
  onUploadComplete?: (videoId: string, type: "inbound" | "outbound") => void;
}

type CompressionLevel = "none" | "low" | "medium" | "high";
type UploadState = "idle" | "uploading" | "paused" | "success" | "error";

interface VideoUploadState {
  state: UploadState;
  progress: UploadProgress | null;
  speed: number; // bytes per second
  error: string | null;
  videoId: string | null;
}

export function VideoUploadEnhanced({ orderId, trackingNo, onUploadComplete }: VideoUploadEnhancedProps) {
  const [inboundUpload, setInboundUpload] = useState<VideoUploadState>({
    state: "idle",
    progress: null,
    speed: 0,
    error: null,
    videoId: null,
  });
  
  const [outboundUpload, setOutboundUpload] = useState<VideoUploadState>({
    state: "idle",
    progress: null,
    speed: 0,
    error: null,
    videoId: null,
  });

  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>("medium");
  
  const fileInputInboundRef = useRef<HTMLInputElement>(null);
  const fileInputOutboundRef = useRef<HTMLInputElement>(null);
  const lastProgressTimeRef = useRef<number>(Date.now());
  const lastBytesUploadedRef = useRef<number>(0);

  const handleFileSelect = async (type: "inbound" | "outbound", file: File | null) => {
    if (!file) return;

    const setState = type === "inbound" ? setInboundUpload : setOutboundUpload;
    
    // Reset state
    setState({
      state: "uploading",
      progress: null,
      speed: 0,
      error: null,
      videoId: null,
    });

    // TODO: Implement client-side compression based on compressionLevel
    // For now, upload directly without compression

    try {
      const videoId = await uploadToCloudflareStreamTus({
        file,
        finalWaybillNo: trackingNo,
        type: type === "inbound" ? "inbound_video" : "outbound_video",
        onProgress: (progress) => {
          // Calculate upload speed
          const now = Date.now();
          const timeDiff = (now - lastProgressTimeRef.current) / 1000; // seconds
          const bytesDiff = progress.bytesUploaded - lastBytesUploadedRef.current;
          const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0;

          lastProgressTimeRef.current = now;
          lastBytesUploadedRef.current = progress.bytesUploaded;

          setState((prev) => ({
            ...prev,
            state: "uploading",
            progress,
            speed,
          }));
        },
        onError: (error) => {
          setState((prev) => ({
            ...prev,
            state: "error",
            error: error.message || "Upload failed",
          }));
        },
      });

      setState((prev) => ({
        ...prev,
        state: "success",
        videoId,
      }));

      onUploadComplete?.(videoId, type);
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        state: "error",
        error: error.message || "Upload failed",
      }));
    }
  };

  const renderUploadSection = (
    type: "inbound" | "outbound",
    uploadState: VideoUploadState,
    fileInputRef: React.RefObject<HTMLInputElement>
  ) => {
    const title = type === "inbound" ? "입고 영상" : "출고 영상";
    const { state, progress, speed, error, videoId } = uploadState;

    return (
      <div className="border rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">{title}</h3>
          <Video className="h-5 w-5 text-muted-foreground" />
        </div>

        {/* Video Preview or Status */}
        <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
          {state === "idle" && (
            <p className="text-sm text-muted-foreground">영상 없음</p>
          )}
          {state === "uploading" && progress && (
            <div className="text-center space-y-2">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm font-medium">{progress.percentage.toFixed(1)}%</p>
            </div>
          )}
          {state === "success" && (
            <div className="text-center space-y-2">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
              <p className="text-sm font-medium text-green-600">업로드 완료</p>
            </div>
          )}
          {state === "error" && (
            <div className="text-center space-y-2">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
              <p className="text-sm font-medium text-red-600">업로드 실패</p>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {state === "uploading" && progress && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{progress.percentage.toFixed(1)}%</span>
              <span>{formatUploadSpeed(speed)}</span>
              <span>
                {formatTime(
                  calculateRemainingTime(progress.bytesUploaded, progress.bytesTotal, speed)
                )}
                {" "}남음
              </span>
            </div>
            <Progress value={progress.percentage} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {(progress.bytesUploaded / 1024 / 1024).toFixed(1)} MB
              </span>
              <span>
                {(progress.bytesTotal / 1024 / 1024).toFixed(1)} MB
              </span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {state === "error" && error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {state === "success" && videoId && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <p className="text-sm text-green-600 dark:text-green-400">
              Video ID: {videoId}
            </p>
          </div>
        )}

        {/* Upload Button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => handleFileSelect(type, e.target.files?.[0] || null)}
        />
        
        <Button
          className="w-full"
          variant={state === "success" ? "outline" : "default"}
          onClick={() => fileInputRef.current?.click()}
          disabled={state === "uploading"}
        >
          <Upload className="mr-2 h-4 w-4" />
          {state === "idle" && `${title} 업로드`}
          {state === "uploading" && "업로드 중..."}
          {state === "success" && "재업로드"}
          {state === "error" && "다시 시도"}
        </Button>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>입출고 영상 관리 (개선됨 ✨)</CardTitle>
        <CardDescription>송장번호: {trackingNo}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Compression Options */}
        <div className="border rounded-lg p-4 space-y-3 bg-blue-50 dark:bg-blue-900/20">
          <Label className="text-sm font-medium">업로드 최적화 설정</Label>
          <Select value={compressionLevel} onValueChange={(value) => setCompressionLevel(value as CompressionLevel)}>
            <SelectTrigger>
              <SelectValue placeholder="압축 수준 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <div className="flex flex-col items-start">
                  <span className="font-medium">압축 안 함</span>
                  <span className="text-xs text-muted-foreground">원본 품질 유지, 느린 업로드</span>
                </div>
              </SelectItem>
              <SelectItem value="low">
                <div className="flex flex-col items-start">
                  <span className="font-medium">낮음 (빠름)</span>
                  <span className="text-xs text-muted-foreground">약간의 품질 손실, 빠른 업로드</span>
                </div>
              </SelectItem>
              <SelectItem value="medium">
                <div className="flex flex-col items-start">
                  <span className="font-medium">중간 (권장 ⭐)</span>
                  <span className="text-xs text-muted-foreground">균형잡힌 품질과 속도</span>
                </div>
              </SelectItem>
              <SelectItem value="high">
                <div className="flex flex-col items-start">
                  <span className="font-medium">높음 (느림)</span>
                  <span className="text-xs text-muted-foreground">최대 압축, 가장 작은 파일</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            💡 <strong>TUS Protocol</strong> 사용: 중단된 업로드 자동 재개, 실시간 진행률 표시
          </p>
        </div>

        {/* Upload Sections */}
        <div className="grid gap-4 md:grid-cols-2">
          {renderUploadSection("inbound", inboundUpload, fileInputInboundRef)}
          {renderUploadSection("outbound", outboundUpload, fileInputOutboundRef)}
        </div>

        {/* Info Box */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h4 className="font-medium text-sm mb-2 flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            개선 사항
          </h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>✅ <strong>재개 가능한 업로드:</strong> 네트워크 중단 시 자동 재개</li>
            <li>✅ <strong>실시간 진행률:</strong> 업로드 속도 및 남은 시간 표시</li>
            <li>✅ <strong>청크 업로드:</strong> 메모리 효율적 (5MB 청크)</li>
            <li>✅ <strong>자동 재시도:</strong> 실패 시 자동으로 재시도</li>
            <li>🔜 <strong>클라이언트 압축:</strong> 업로드 전 비디오 압축 (준비 중)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

