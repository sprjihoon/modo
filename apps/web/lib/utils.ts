import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return `₩${price.toLocaleString("ko-KR")}`;
}

export function formatDate(dateStr: string): string {
  const dt = new Date(dateStr);
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")}`;
}

/** 고객 웹 공식 URL (환경변수 미설정 시 https://modo.io.kr) */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "https://modo.io.kr";
}

/** OAuth·비밀번호 재설정 등에 쓰는 현재 사이트 origin (클라이언트: 방문 도메인, SSR: getSiteUrl) */
export function getAuthOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return getSiteUrl();
}

/** Supabase OAuth (카카오·구글·애플) 콜백 URL */
export function getOAuthCallbackUrl(redirectTo = "/"): string {
  const base = `${getAuthOrigin()}/auth/callback`;
  return `${base}?redirectTo=${encodeURIComponent(redirectTo)}`;
}

/** 네이버 로그인 콜백 URL — 네이버 개발자 콘솔에 등록된 고정 URL이어야 함.
 *  window.location.origin을 쓰면 프리뷰/로컬 도메인이 전달되어 disp_stat=207 오류 발생. */
export function getNaverCallbackUrl(): string {
  return `${getSiteUrl()}/auth/naver/callback`;
}

/** 비밀번호 재설정 완료 후 돌아올 URL — 이메일 링크는 항상 프로덕션 URL이어야 함 */
export function getPasswordResetUrl(): string {
  return `${getSiteUrl()}/auth/reset-password`;
}

export const ORDER_STATUS_MAP: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  PENDING_PAYMENT: {
    // ⚠️ 신규 흐름에서는 더 이상 생성되지 않는 레거시 상태.
    //    잔존 row 는 마이그레이션으로 모두 CANCELLED 처리됨.
    //    혹시 모를 데이터 호환을 위해 라벨만 남겨둠.
    label: "결제 미완료",
    color: "text-gray-500",
    bgColor: "bg-gray-50",
  },
  BOOKED: {
    label: "수거예약",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  PICKED_UP: {
    label: "수거완료",
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
  },
  INBOUND: {
    label: "입고완료",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
  PROCESSING: {
    label: "수선중",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  READY_TO_SHIP: {
    label: "출고완료",
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  DELIVERED: {
    label: "배송완료",
    color: "text-gray-600",
    bgColor: "bg-gray-50",
  },
  CANCELLED: {
    label: "수거취소",
    color: "text-red-600",
    bgColor: "bg-red-50",
  },
  RETURN_PENDING: {
    label: "반송 대기",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
  },
  RETURN_SHIPPING: {
    label: "반송 배송중",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
  RETURN_DONE: {
    label: "반송 완료",
    color: "text-stone-700",
    bgColor: "bg-stone-100",
  },
};

export function getAppStoreUrl(): string {
  if (typeof window === "undefined") return "";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) {
    return process.env.NEXT_PUBLIC_IOS_APP_URL || "#";
  }
  if (/Android/.test(ua)) {
    return process.env.NEXT_PUBLIC_ANDROID_APP_URL || "#";
  }
  return "";
}

export function openInApp(fallbackPath?: string) {
  const deepLink =
    process.env.NEXT_PUBLIC_APP_DEEP_LINK || "modorepair://";
  const appUrl = deepLink + (fallbackPath || "home");
  const storeUrl = getAppStoreUrl();

  if (storeUrl) {
    window.location.href = appUrl;
    setTimeout(() => {
      window.location.href = storeUrl;
    }, 1500);
  }
}
