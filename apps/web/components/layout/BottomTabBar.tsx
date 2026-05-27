"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, Bell, User, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { fetchCartItems } from "@/lib/cart";

const tabs = [
  { href: "/", icon: Home, label: "í??" },
  { href: "/orders", icon: Package, label: "ì£¼ë¬¸" },
  { href: "/cart", icon: ShoppingCart, label: "ì?¥ë°?êµ¬ë??" },
  { href: "/notifications", icon: Bell, label: "ì??ë¦¼" },
  { href: "/profile", icon: User, label: "ë§?ì´" },
];

export function BottomTabBar() {
  const pathname = usePathname();
  const [cartBadge, setCartBadge] = useState(0);

  useEffect(() => {
    const updateBadge = () =>
      fetchCartItems().then((items) => setCartBadge(items.length));
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
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-0.5 border border-white">
                    {cartBadge > 9 ? "9+" : cartBadge}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium",
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
