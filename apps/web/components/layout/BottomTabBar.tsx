"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, Bell, User, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { getCartCount } from "@/lib/cart";
import { createClient } from "@/lib/supabase/client";

const tabs = [
  { href: "/", icon: Home, label: "홈" },
  { href: "/orders", icon: Package, label: "주문" },
  { href: "/cart", icon: ShoppingCart, label: "장바구니" },
  { href: "/notifications", icon: Bell, label: "알림" },
  { href: "/profile", icon: User, label: "마이" },
];

export function BottomTabBar() {
  const pathname = usePathname();
  const [cartBadge, setCartBadge] = useState(0);

  useEffect(() => {
    async function updateBadge() {
      let count = getCartCount();
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: userRow } = await supabase
            .from("users")
            .select("id")
            .eq("auth_id", user.id)
            .maybeSingle();
          if (userRow) {
            const { count: pendingCount } = await supabase
              .from("orders")
              .select("id", { count: "exact", head: true })
              .eq("user_id", userRow.id)
              .eq("status", "PENDING_PAYMENT");
            count += pendingCount ?? 0;
          }
        }
      } catch { /* ignore */ }
      setCartBadge(count);
    }
    updateBadge();

    window.addEventListener("modu_cart_update", updateBadge);
    return () => window.removeEventListener("modu_cart_update", updateBadge);
  }, [pathname]);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 bg-white border-t border-gray-100 safe-area-inset-bottom">
      <div className="flex items-center">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          const isCart = tab.href === "/cart";
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn("tab-item", active && "active")}
            >
              <div className="relative">
                <tab.icon
                  className={cn(
                    "w-5 h-5 transition-colors",
                    active ? "text-[#00C896]" : "text-gray-400"
                  )}
                  strokeWidth={active ? 2.5 : 2}
                />
                {isCart && cartBadge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 border border-white">
                    {cartBadge > 9 ? "9+" : cartBadge}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium",
                  active ? "text-[#00C896]" : "text-gray-400"
                )}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
