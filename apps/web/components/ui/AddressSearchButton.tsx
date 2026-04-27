"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, X } from "lucide-react";

declare global {
  interface Window {
    daum: {
      Postcode: new (options: {
        oncomplete: (data: {
          zonecode: string;
          address: string;
          addressType: string;
          jibunAddress: string;
          roadAddress: string;
        }) => void;
        width?: string;
        height?: string;
      }) => { embed: (el: HTMLElement) => void };
    };
  }
}

interface AddressSearchButtonProps {
  onSelect: (zipcode: string, address: string) => void;
  className?: string;
  label?: string;
}

export function AddressSearchButton({
  onSelect,
  className,
  label = "주소 검색",
}: AddressSearchButtonProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (scriptLoadedRef.current) return;
    const existing = document.getElementById("kakao-postcode-script");
    if (existing) {
      // 스크립트 태그가 있지만 아직 로드 중일 수 있으므로 load 이벤트로 확인
      if (window.daum?.Postcode) {
        scriptLoadedRef.current = true;
      } else {
        existing.addEventListener("load", () => { scriptLoadedRef.current = true; }, { once: true });
      }
      return;
    }
    const script = document.createElement("script");
    script.id = "kakao-postcode-script";
    script.src = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    script.onload = () => { scriptLoadedRef.current = true; };
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!open || !containerRef.current) return;

    let cancelled = false;

    function tryEmbed(attempts = 0) {
      if (cancelled) return;
      if (typeof window === "undefined" || !window.daum?.Postcode) {
        if (attempts < 40) setTimeout(() => tryEmbed(attempts + 1), 150);
        return;
      }
      if (!containerRef.current || cancelled) return;
      containerRef.current.innerHTML = "";
      new window.daum.Postcode({
        oncomplete: (data) => {
          const addr =
            data.addressType === "R" ? data.roadAddress : data.jibunAddress;
          onSelectRef.current(data.zonecode, addr);
          setOpen(false);
        },
        width: "100%",
        height: "100%",
      }).embed(containerRef.current);
    }

    tryEmbed();

    return () => { cancelled = true; };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className
            ? `flex items-center gap-1.5 ${className}`
            : "flex items-center gap-1.5 px-4 py-3 bg-[#00C896] text-white text-sm font-bold rounded-xl active:opacity-80 transition-opacity whitespace-nowrap"
        }
      >
        <MapPin className="w-4 h-4" />
        {label}
      </button>

      {/* 인라인 주소 검색 모달 */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/50">
          <div className="flex-1 flex items-end justify-center sm:items-center">
            <div className="w-full max-w-[430px] bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
              style={{ height: "520px" }}>
              {/* 헤더 */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
                <p className="text-sm font-bold text-gray-800">주소 검색</p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              {/* 카카오 우편번호 임베드 */}
              <div ref={containerRef} className="flex-1 overflow-hidden" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
