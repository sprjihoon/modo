"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, X } from "lucide-react";

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
  const onSelectRef = useRef(onSelect);
  const [fallbackOpen, setFallbackOpen] = useState(false);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // 폴백 iframe 모달이 열렸을 때 postMessage 수신
  useEffect(() => {
    if (!fallbackOpen) return;

    function handler(e: MessageEvent) {
      if (e.data?.type === "ADDRESS_SELECTED") {
        onSelectRef.current(e.data.zipcode, e.data.address);
        setFallbackOpen(false);
      }
    }
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [fallbackOpen]);

  function openSearch() {
    const width = 500;
    const height = 600;
    const left = Math.round(window.screenX + (window.outerWidth - width) / 2);
    const top = Math.round(window.screenY + (window.outerHeight - height) / 2);

    const popup = window.open(
      "/postcode",
      "kakao-postcode",
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
    );

    if (!popup) {
      // 팝업 차단 시 인라인 iframe 모달로 폴백
      setFallbackOpen(true);
      return;
    }

    function handler(e: MessageEvent) {
      if (e.data?.type === "ADDRESS_SELECTED") {
        onSelectRef.current(e.data.zipcode, e.data.address);
        window.removeEventListener("message", handler);
      }
    }
    window.addEventListener("message", handler);
  }

  return (
    <>
      <button
        type="button"
        onClick={openSearch}
        className={
          className
            ? `flex items-center gap-1.5 ${className}`
            : "flex items-center gap-1.5 px-4 py-3 bg-[#00C896] text-white text-sm font-bold rounded-xl active:opacity-80 transition-opacity whitespace-nowrap"
        }
      >
        <MapPin className="w-4 h-4" />
        {label}
      </button>

      {/* 팝업 차단 시 폴백: 인라인 iframe 모달 */}
      {fallbackOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/50">
          <div className="flex-1 flex items-end justify-center sm:items-center">
            <div
              className="w-full max-w-[430px] bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
              style={{ height: "520px" }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
                <p className="text-sm font-bold text-gray-800">주소 검색</p>
                <button
                  type="button"
                  onClick={() => setFallbackOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <iframe
                src="/postcode"
                className="flex-1 border-0"
                title="주소 검색"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
