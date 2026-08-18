"use client";

import { useEffect, useState } from "react";
import {
  ANDROID_PLAY_STORE_URL,
  IOS_APP_STORE_URL,
  detectDeviceStore,
  type DeviceStore,
} from "@/lib/app-stores";

export function AppDownloadLinks({ compact = false }: { compact?: boolean }) {
  const [device, setDevice] = useState<DeviceStore>("other");

  useEffect(() => {
    setDevice(detectDeviceStore(navigator.userAgent));
  }, []);

  const playReady = Boolean(ANDROID_PLAY_STORE_URL);
  const iosPrimary = device === "ios" || device === "other";
  const androidPrimary = device === "android";

  return (
    <div className={compact ? "flex flex-col gap-2" : "flex flex-col gap-3"}>
      <a
        href={IOS_APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center justify-center gap-2 rounded-xl font-bold transition-opacity active:opacity-80 ${
          compact ? "px-4 py-2.5 text-sm" : "px-4 py-3.5 text-sm"
        } ${
          iosPrimary
            ? "bg-gray-900 text-white"
            : "bg-white text-gray-800 border border-gray-200"
        }`}
      >
        App Store에서 받기
      </a>

      {playReady ? (
        <a
          href={ANDROID_PLAY_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center justify-center gap-2 rounded-xl font-bold transition-opacity active:opacity-80 ${
            compact ? "px-4 py-2.5 text-sm" : "px-4 py-3.5 text-sm"
          } ${
            androidPrimary
              ? "bg-gray-900 text-white"
              : "bg-white text-gray-800 border border-gray-200"
          }`}
        >
          Google Play에서 받기
        </a>
      ) : (
        <p
          className={`rounded-xl border border-dashed border-gray-200 text-center text-gray-400 ${
            compact ? "px-4 py-2.5 text-xs" : "px-4 py-3.5 text-sm"
          }`}
        >
          Google Play 준비 중
        </p>
      )}
    </div>
  );
}
