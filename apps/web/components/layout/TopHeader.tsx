"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, User, ChevronLeft, ShoppingCart, Home } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchCartItems } from "@/lib/cart";

interface TopHeaderProps {
  title?: string;
  showBack?: boolean;
  showIcons?: boolean;
}

// 앱 전체에서 공유되는 회사 이름 캐시
let cachedBrandName: string | null = null;

export function TopHeader({
  title,
  showBack = false,
  showIcons = true,
}: TopHeaderProps) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [brandName, setBrandName] = useState<string>(cachedBrandName ?? "모두의수선");

  useEffect(() => {
    const refresh = () => fetchCartItems().then((items) => setCartCount(items.length));
    refresh();

    const onStorage = (e: StorageEvent) => {
      if (e.key === "modu_cart_drafts_v2") refresh();
    };
    window.addEventListener("modu_cart_update", refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("modu_cart_update", refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
      if (user) fetchUnreadCount(user.id);
    });

    // company_info에서 브랜드명 로드 (캐시 활용)
    if (!cachedBrandName) {
      (async () => {
        try {
          const { data } = await supabase
            .from("company_info")
            .select("header_title, company_name")
            .limit(1)
            .maybeSingle();
          if (data) {
            const name =
              (data.header_title as string | null) ||
              (data.company_name as string | null)?.split("(")[0]?.trim() ||
              "모두의수선";
            cachedBrandName = name;
            setBrandName(name);
          }
        } catch {
          // 실패 시 기본값 유지
        }
      })();
    }

    const onNotificationsRead = () => setUnreadCount(0);
    window.addEventListener("modu_notifications_read", onNotificationsRead);
    return () => window.removeEventListener("modu_notifications_read", onNotificationsRead);
  }, []);

  async function fetchUnreadCount(authId: string) {
    try {
      const supabase = createClient();
      const { data: userRow } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", authId)
        .maybeSingle();

      if (!userRow) return;

      const { data } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", userRow.id)
        .eq("is_read", false);

      setUnreadCount(data?.length ?? 0);
    } catch {
      // 조회 실패 시 무시
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
      <div className="flex items-center h-14 px-4 gap-2">
        {showBack ? (
          <>
            <button
              onClick={() => {
                const e = new CustomEvent("modu_before_navigate", {
                  cancelable: true,
                  detail: { type: "back" },
                });
                const cancelled = !window.dispatchEvent(e);
                if (!cancelled) router.back();
              }}
              className="p-1 -ml-1 active:opacity-60"
              aria-label="뒤로가기"
            >
              <ChevronLeft className="w-6 h-6 text-gray-800" />
            </button>
            <button
              onClick={() => {
                const e = new CustomEvent("modu_before_navigate", {
                  cancelable: true,
                  detail: { type: "home" },
                });
                const cancelled = !window.dispatchEvent(e);
                if (!cancelled) router.push("/");
              }}
              className="p-1 active:opacity-60"
              aria-label="홈으로"
            >
              <Home className="w-5 h-5 text-gray-500" />
            </button>
          </>
        ) : null}

        {title ? (
          <h1 className="flex-1 text-base font-bold text-gray-900 truncate">
            {title}
          </h1>
        ) : (
          <Link
            href="/"
            className="flex-1 text-xl font-extrabold text-gray-900 tracking-tight"
          >
            {brandName}
          </Link>
        )}

        {showIcons && (
          <div className="flex items-center gap-1">
            {/* 알림 */}
            <Link
              href={isLoggedIn ? "/notifications" : "/login"}
              className="relative p-2 active:opacity-60"
              aria-label="알림"
            >
              <Bell className="w-5 h-5 text-gray-700" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>

            {/* 장바구니 */}
            <Link
              href="/cart"
              className="relative p-2 active:opacity-60"
              aria-label="장바구니"
            >
              <ShoppingCart className="w-5 h-5 text-gray-700" />
              {cartCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>

            {/* 마이페이지 */}
            <Link
              href={isLoggedIn ? "/profile" : "/login"}
              className="p-2 active:opacity-60"
              aria-label="마이페이지"
            >
              <User className="w-5 h-5 text-gray-700" />
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
