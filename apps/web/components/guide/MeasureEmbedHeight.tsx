"use client";

import { useEffect } from "react";
import {
  MEASURE_GUIDE_LAYOUT_EVENT,
  measureGuideEmbedContentHeight,
} from "@/lib/measure-guide-embed-height";

/**
 * Flutter WebView가 가이드 실제 높이를 알 수 있게 한다.
 * window.MeasureGuideHeight 는 앱 WebView JavaScriptChannel.
 * 가이드 종류가 바뀌면 그 높이만 다시 보낸다.
 */
export function MeasureEmbedHeight() {
  useEffect(() => {
    document.documentElement.classList.add("measure-guide-embed-active");
    const send = () => {
      const height = measureGuideEmbedContentHeight(document);
      if (height < 80) return;
      const channel = (
        window as Window & { MeasureGuideHeight?: { postMessage: (m: string) => void } }
      ).MeasureGuideHeight;
      channel?.postMessage(String(height));
    };

    const sendAfterLayout = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(send);
      });
    };

    sendAfterLayout();

    const root =
      document.getElementById("measure-guide-embed") ??
      document.querySelector<HTMLElement>("[data-measure-guide-root]") ??
      document.querySelector<HTMLElement>(".pb-10") ??
      document.body;

    const observer = new ResizeObserver(sendAfterLayout);
    if (root) observer.observe(root);

    window.addEventListener("load", sendAfterLayout);
    window.addEventListener(MEASURE_GUIDE_LAYOUT_EVENT, sendAfterLayout);
    document.querySelectorAll("img").forEach((img) => {
      img.addEventListener("load", sendAfterLayout);
    });
    const timers = [120, 400, 1000, 2200].map((ms) =>
      window.setTimeout(sendAfterLayout, ms)
    );

    return () => {
      document.documentElement.classList.remove("measure-guide-embed-active");
      observer.disconnect();
      window.removeEventListener("load", sendAfterLayout);
      window.removeEventListener(MEASURE_GUIDE_LAYOUT_EVENT, sendAfterLayout);
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  return null;
}
