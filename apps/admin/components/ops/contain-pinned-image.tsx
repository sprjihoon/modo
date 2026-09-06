"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { containRect, pinToContainerPercent } from "@/lib/image-pin-geometry";
import { cn } from "@/lib/utils";
import type { PinCoordSpace } from "@/lib/image-pin-geometry";

type OverlayPin = { x: number; y: number; memo: string };

export function ContainPinnedImage({
  src,
  alt,
  pins = [],
  coordSpace,
  className,
  imageClassName,
  imageStyle,
  showMemo = false,
  pinClassName,
}: {
  src: string;
  alt: string;
  pins?: OverlayPin[];
  coordSpace?: PinCoordSpace;
  className?: string;
  imageClassName?: string;
  imageStyle?: CSSProperties;
  showMemo?: boolean;
  pinClassName?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0, nw: 0, nh: 0 });

  function measure() {
    const wrap = wrapRef.current;
    const img = imgRef.current;
    if (!wrap || !img) return;
    const rect = wrap.getBoundingClientRect();
    setBox({
      w: rect.width,
      h: rect.height,
      nw: img.naturalWidth,
      nh: img.naturalHeight,
    });
  }

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [src]);

  const contain = containRect(
    { width: box.w, height: box.h },
    { width: box.nw, height: box.nh },
  );

  return (
    <div ref={wrapRef} className={cn("relative overflow-hidden", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={imageClassName}
        style={imageStyle}
        onLoad={measure}
      />
      {box.w > 0 &&
        pins.map((pin, pinIdx) => {
          const pos = pinToContainerPercent(
            { x: pin.x, y: pin.y },
            coordSpace,
            { width: box.w, height: box.h },
            contain,
          );
          return (
            <div
              key={pinIdx}
              className="absolute"
              style={{
                left: `${pos.leftPct}%`,
                top: `${pos.topPct}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <div
                className={cn(
                  "w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center",
                  pinClassName,
                )}
              >
                <span className="text-white text-xs font-bold">{pinIdx + 1}</span>
              </div>
              {showMemo && pin.memo ? (
                <div className="absolute left-8 top-0 bg-black bg-opacity-80 text-white text-xs px-2 py-1 rounded whitespace-nowrap max-w-[220px] truncate">
                  {pin.memo}
                </div>
              ) : null}
            </div>
          );
        })}
    </div>
  );
}
