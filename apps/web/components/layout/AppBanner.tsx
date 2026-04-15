"use client";

import { useState, useEffect } from "react";
import { X, Smartphone } from "lucide-react";
import { openInApp } from "@/lib/utils";

const BANNER_HIDDEN_KEY = "app_banner_hidden_until";

export function AppBanner() {
  const [visible, setVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const mobile = /iPhone|iPad|iPod|Android/i.test(ua);
    setIsMobile(mobile);

    const hiddenUntil = localStorage.getItem(BANNER_HIDDEN_KEY);
    if (hiddenUntil && Date.now() < parseInt(hiddenUntil)) {
      return;
    }
    setVisible(true);
  }, []);

  function handleClose() {
    // 24시간 동안 숨김
    const until = Date.now() + 24 * 60 * 60 * 1000;
    localStorage.setItem(BANNER_HIDDEN_KEY, String(until));
    setVisible(false);
  }

  function handleOpenApp() {
    if (isMobile) {
      openInApp();
    } else {
      // PC에서는 앱 소개 or QR 섹션으로 스크롤
      document.getElementById("app-download-section")?.scrollIntoView({
        behavior: "smooth",
      });
    }
  }

  if (!visible) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-[#00C896] text-white">
      <Smartphone className="w-4 h-4 shrink-0" />
      <span className="text-xs font-medium flex-1 leading-tight">
        {isMobile
          ? "모두의수선 앱으로 더 편리하게 이용하세요"
          : "모두의수선 앱을 다운로드 받으세요"}
      </span>
      <button
        onClick={handleOpenApp}
        className="text-xs font-bold bg-white text-[#00C896] px-3 py-1 rounded-full shrink-0 active:opacity-80"
      >
        {isMobile ? "앱에서 보기" : "앱 받기"}
      </button>
      <button
        onClick={handleClose}
        className="shrink-0 opacity-80 active:opacity-60"
        aria-label="닫기"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
