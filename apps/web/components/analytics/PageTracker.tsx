"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Analytics } from "@/lib/analytics";

const PAGE_TITLES: Record<string, string> = {
  "/": "홈",
  "/order/new": "수거신청",
  "/cart": "장바구니",
  "/orders": "주문 목록",
  "/payment": "결제",
  "/payment/success": "결제 완료",
  "/payment/fail": "결제 실패",
  "/profile": "프로필",
  "/profile/points": "포인트",
  "/profile/payment-history": "결제 내역",
  "/profile/addresses": "주소 관리",
  "/profile/settings": "설정",
  "/profile/account": "계정 정보",
  "/profile/support": "고객센터",
  "/profile/invite": "친구 초대",
  "/notifications": "알림",
  "/announcements": "공지사항",
  "/guide/easy": "이용 가이드",
  "/guide/price": "가격 안내",
  "/login": "로그인",
  "/signup": "회원가입",
};

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith("/orders/") && pathname.endsWith("/tracking")) return "배송 추적";
  if (pathname.startsWith("/orders/") && pathname.endsWith("/extra-charge")) return "추가금 안내";
  if (pathname.startsWith("/orders/")) return "주문 상세";
  return pathname;
}

export function PageTracker() {
  const pathname = usePathname();
  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (prevPathRef.current === pathname) return;
    prevPathRef.current = pathname;
    Analytics.pageView(getPageTitle(pathname), pathname);
  }, [pathname]);

  return null;
}
