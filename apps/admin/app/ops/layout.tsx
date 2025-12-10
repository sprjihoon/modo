"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, Wrench, Send, Cpu, FileText } from "lucide-react";

const navigation = [
  { name: "입고", href: "/ops/inbound", icon: Package },
  { name: "작업", href: "/ops/work", icon: Wrench },
  { name: "출고", href: "/ops/outbound", icon: Send },
  { name: "장비", href: "/ops/devices", icon: Cpu },
  { name: "송장 레이아웃", href: "/ops/label-editor", icon: FileText },
];

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 좌측 사이드바 */}
      <div className="w-64 bg-white border-r border-gray-200">
        <div className="flex flex-col h-full">
          {/* 헤더 */}
          <div className="p-6 border-b border-gray-200">
            <Link 
              href="/dashboard" 
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors border border-gray-200 hover:border-gray-300"
            >
              <Home className="h-4 w-4" suppressHydrationWarning />
              <span className="text-sm font-medium">관리자 콘솔로 이동</span>
            </Link>
            <h1 className="text-xl font-bold text-gray-900 mt-4">센터 콘솔</h1>
            <p className="text-sm text-gray-500 mt-1">현장 작업 관리</p>
          </div>

          {/* 네비게이션 메뉴 */}
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                    ${
                      isActive
                        ? "bg-green-50 text-green-700"
                        : "text-gray-700 hover:bg-gray-50"
                    }
                  `}
                >
                  <Icon className="h-5 w-5" suppressHydrationWarning />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* 푸터 */}
          <div className="p-4 border-t border-gray-200 text-xs text-gray-500">
            센터 운영 시스템 v1.0
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 영역 */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}

