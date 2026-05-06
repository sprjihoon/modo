"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AddressSearchButtonProps {
  onSelect: (zipcode: string, address: string) => void;
  className?: string;
  label?: string;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg";
  disabled?: boolean;
}

export function AddressSearchButton({
  onSelect,
  className,
  label = "주소 검색",
  variant = "outline",
  size = "default",
  disabled,
}: AddressSearchButtonProps) {
  const onSelectRef = useRef(onSelect);
  const [fallbackOpen, setFallbackOpen] = useState(false);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

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
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={openSearch}
        disabled={disabled}
        className={className}
      >
        <MapPin className="w-4 h-4 mr-1" />
        {label}
      </Button>

      {fallbackOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-[500px] bg-white rounded-lg overflow-hidden flex flex-col" style={{ height: "560px" }}>
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <p className="text-sm font-semibold">주소 검색</p>
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
      )}
    </>
  );
}
