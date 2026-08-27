"use client";

import { useEffect } from "react";

/**
 * Flutter WebView가 가이드 실제 높이를 알 수 있게 한다.
 * window.MeasureGuideHeight 는 앱 WebView JavaScriptChannel.
 */
export function MeasureEmbedHeight() {
  useEffect(() => {
    const send = () => {
      const height = Math.max(
        document.body?.scrollHeight ?? 0,
        document.documentElement?.scrollHeight ?? 0
      );
      const channel = (
        window as Window & { MeasureGuideHeight?: { postMessage: (m: string) => void } }
      ).MeasureGuideHeight;
      channel?.postMessage(String(height));
    };

    send();
    const observer = new ResizeObserver(send);
    observer.observe(document.body);
    window.addEventListener("load", send);
    document.querySelectorAll("img").forEach((img) => {
      img.addEventListener("load", send);
    });
    const timers = [300, 800, 1600, 2800].map((ms) => window.setTimeout(send, ms));

    return () => {
      observer.disconnect();
      window.removeEventListener("load", send);
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  return null;
}
