"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Banner {
  id: string;
  title: string;
  button_text: string;
  background_color: string;
  background_image_url: string | null;
  action_type: string;
  action_value: string | null;
}

const DEFAULT_BANNERS: Banner[] = [
  {
    id: "1",
    title: "멀리 갈 필요 없이\n문앞에 두고",
    button_text: "수거신청 하기",
    background_color: "#2D3E50",
    background_image_url: null,
    action_type: "order",
    action_value: null,
  },
  {
    id: "2",
    title: "옷 수선,\n이제 집에서 간편하게",
    button_text: "수선 접수하기",
    background_color: "#00C896",
    background_image_url: null,
    action_type: "order",
    action_value: null,
  },
  {
    id: "3",
    title: "수거부터 배송까지\n한 번에",
    button_text: "서비스 둘러보기",
    background_color: "#8B5CF6",
    background_image_url: null,
    action_type: "url",
    action_value: null,
  },
];

interface BannerSliderProps {
  hasOrders: boolean;
  onOrderStart: () => void;
}

export function BannerSlider({ hasOrders, onOrderStart }: BannerSliderProps) {
  const router = useRouter();
  const [banners, setBanners] = useState<Banner[]>(DEFAULT_BANNERS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startX, setStartX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    loadBanners();
  }, []);

  // 자동 슬라이드
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [banners.length]);

  async function loadBanners() {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("banners")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (data && data.length > 0) {
        setBanners(data);
      }
    } catch {
      // 기본 배너 사용
    }
  }

  function handleBannerTap(banner: Banner) {
    if (banner.action_type === "navigate" && banner.action_value) {
      router.push(banner.action_value);
    } else if (banner.action_type === "url" && banner.action_value) {
      window.open(banner.action_value, "_blank");
    } else {
      onOrderStart();
    }
  }

  // 터치/드래그 스와이프
  function handleTouchStart(e: React.TouchEvent) {
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (!isDragging) return;
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        setCurrentIndex((prev) => (prev + 1) % banners.length);
      } else {
        setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
      }
    }
    setIsDragging(false);
  }

  const currentBanner = banners[currentIndex];
  const bgColor = currentBanner?.background_color || "#2D3E50";

  return (
    <div className="px-4 pt-2">
      <div
        className="relative rounded-2xl overflow-hidden cursor-pointer select-none"
        style={{
          backgroundColor: bgColor,
          backgroundImage: currentBanner?.background_image_url
            ? `url(${currentBanner.background_image_url})`
            : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          height: 200,
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={() => handleBannerTap(currentBanner)}
      >
        {/* 배경 패턴 원형 */}
        <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/10" />
        <div className="absolute right-10 -bottom-10 w-28 h-28 rounded-full bg-white/10" />

        {/* 컨텐츠 */}
        <div className="absolute inset-0 p-7 flex flex-col justify-between">
          <div className="bg-white/20 self-start px-3 py-1 rounded-full">
            <span className="text-white text-xs font-semibold">서비스 이용</span>
          </div>
          <div>
            <p className="text-white text-2xl font-bold leading-tight whitespace-pre-line mb-5">
              {currentBanner?.title}
            </p>
            <button
              className="bg-[#00C896] text-white text-sm font-bold px-6 py-3 rounded-full active:opacity-80"
              onClick={(e) => {
                e.stopPropagation();
                handleBannerTap(currentBanner);
              }}
            >
              {hasOrders && currentBanner?.button_text === "수거신청 하기"
                ? "수거신청 하기"
                : currentBanner?.button_text}
            </button>
          </div>
        </div>
      </div>

      {/* 인디케이터 */}
      <div className="flex justify-center gap-1.5 mt-3">
        {banners.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-2 rounded-full transition-all duration-300 ${
              idx === currentIndex
                ? "w-6 bg-gray-800"
                : "w-2 bg-gray-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
