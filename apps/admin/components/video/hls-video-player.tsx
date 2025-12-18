"use client";

import { useEffect, useRef } from "react";
import Hls from "hls.js";

interface HLSVideoPlayerProps {
  src: string;
  controls?: boolean;
  autoplay?: boolean;
  className?: string;
  onError?: (error: any) => void;
}

/**
 * HLS 비디오 플레이어 컴포넌트
 * 
 * Cloudflare Stream의 HLS(.m3u8) 영상을 Chrome/Firefox에서 재생
 * Safari는 네이티브 HLS 지원으로 hls.js 없이 재생
 */
export function HLSVideoPlayer({
  src,
  controls = true,
  autoplay = false,
  className = "w-full h-full",
  onError,
}: HLSVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    // HLS 지원 확인
    if (Hls.isSupported()) {
      // Chrome, Firefox 등: hls.js 사용
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });

      hlsRef.current = hls;

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log("✅ HLS manifest loaded");
        if (autoplay) {
          video.play().catch(err => {
            console.warn("Autoplay prevented:", err);
          });
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error("❌ HLS error:", data);
        
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error("Network error, trying to recover...");
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error("Media error, trying to recover...");
              hls.recoverMediaError();
              break;
            default:
              console.error("Fatal error, cannot recover");
              onError?.(data);
              break;
          }
        }
      });

      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari: 네이티브 HLS 지원
      console.log("✅ Native HLS support (Safari)");
      video.src = src;
      
      if (autoplay) {
        video.play().catch(err => {
          console.warn("Autoplay prevented:", err);
        });
      }
    } else {
      console.error("❌ HLS not supported");
      onError?.(new Error("HLS not supported"));
    }
  }, [src, autoplay, onError]);

  return (
    <video
      ref={videoRef}
      controls={controls}
      className={className}
      playsInline
      preload="metadata"
    >
      Your browser does not support HLS video playback.
    </video>
  );
}

