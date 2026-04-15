"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, Bell, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", icon: Home, label: "홈" },
  { href: "/orders", icon: Package, label: "주문" },
  { href: "/notifications", icon: Bell, label: "알림" },
  { href: "/profile", icon: User, label: "마이" },
];

export function BottomTabBar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 bg-white border-t border-gray-100 safe-area-inset-bottom">
      <div className="flex items-center">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "tab-item",
                active && "active"
              )}
            >
              <tab.icon
                className={cn(
                  "w-5 h-5 transition-colors",
                  active ? "text-[#00C896]" : "text-gray-400"
                )}
                strokeWidth={active ? 2.5 : 2}
              />
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
