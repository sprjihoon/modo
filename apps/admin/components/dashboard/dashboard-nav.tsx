"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  Users,
  Video,
  Settings,
  BarChart3,
  CreditCard,
  TrendingUp,
  Scissors,
  Ticket,
  Truck,
  FileText,
  Building2,
  Image,
} from "lucide-react";

const navItems = [
  {
    title: "대시보드",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "주문 관리",
    href: "/dashboard/orders",
    icon: Package,
  },
  {
    title: "수거/배송 관리",
    href: "/dashboard/shipments",
    icon: Truck,
  },
  {
    title: "고객 관리",
    href: "/dashboard/customers",
    icon: Users,
  },
  {
    title: "수선 메뉴 관리",
    href: "/dashboard/repair-menu",
    icon: Scissors,
  },
  {
    title: "결제 내역",
    href: "/dashboard/payments",
    icon: CreditCard,
  },
  {
    title: "포인트 관리",
    href: "/dashboard/points",
    icon: TrendingUp,
  },
  {
    title: "프로모션 코드",
    href: "/dashboard/promotions",
    icon: Ticket,
  },
  {
    title: "통계 및 분석",
    href: "/dashboard/analytics",
    icon: BarChart3,
  },
  {
    title: "영상 관리",
    href: "/dashboard/videos",
    icon: Video,
  },
  {
    title: "배너 관리",
    href: "/dashboard/banners",
    icon: Image,
  },
  {
    title: "설정",
    href: "/dashboard/settings",
    icon: Settings,
  },
  {
    title: "송장 레이아웃",
    href: "/ops/label-editor",
    icon: FileText,
  },
];

export function DashboardNav() {
  const pathname = usePathname();
  const [companyName, setCompanyName] = useState("모두의수선");

  // 회사 정보 로드
  useEffect(() => {
    const loadCompanyInfo = async () => {
      try {
        const response = await fetch("/api/admin/settings/company-info");
        const data = await response.json();
        if (data.success && data.data?.company_name) {
          // 회사명에서 괄호 및 그 이후 텍스트 제거 (예: "모두의수선(MODO)" -> "모두의수선")
          const cleanName = data.data.company_name.split('(')[0].trim();
          setCompanyName(cleanName);
        }
      } catch (error) {
        console.error("회사 정보 로드 실패:", error);
        // 실패시 기본값 유지
      }
    };

    loadCompanyInfo();
  }, []);

  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r min-h-screen flex flex-col p-4">
      <div className="mb-8">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white">🧵</span>
          </div>
          <div>
            <h2 className="font-bold">{companyName}</h2>
            <p className="text-xs text-muted-foreground">관리자</p>
          </div>
        </Link>
      </div>

      <nav className="space-y-1 flex-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      {/* 센터 콘솔로 이동 버튼 */}
      <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
        <Link
          href="/ops/inbound"
          className={cn(
            "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors font-medium shadow-sm",
            pathname.startsWith("/ops")
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-2 border-green-300 dark:border-green-700"
              : "bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 text-green-700 dark:text-green-400 border-2 border-green-200 dark:border-green-800 hover:border-green-300 dark:hover:border-green-700"
          )}
        >
          <Building2 className="h-5 w-5" />
          <span>센터 콘솔로 이동</span>
        </Link>
      </div>
    </div>
  );
}

