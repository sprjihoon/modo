"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Package, Wrench, Send, Cpu, FileText, ClipboardList } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { createClient } from "@/lib/supabase/client";

const navigation = [
  { name: "입고", href: "/ops/inbound", icon: Package },
  { name: "작업", href: "/ops/work", icon: Wrench },
  { name: "출고", href: "/ops/outbound", icon: Send },
  { name: "작업 내역", href: "/dashboard/work-history", icon: ClipboardList },
  { name: "장비", href: "/ops/devices", icon: Cpu },
  { name: "송장 레이아웃", href: "/ops/label-editor", icon: FileText },
];

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const supabase = createClient();

      // 1. 로그인 상태 확인
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.log("🔒 로그인이 필요합니다. /login으로 이동");
        router.push("/login");
        return;
      }

      // 2. 사용자 프로필 확인
      const { data: userData, error } = await supabase
        .from("users")
        .select("id, email, name, role")
        .eq("auth_id", session.user.id)
        .maybeSingle();

      if (error || !userData) {
        console.error("❌ 사용자 프로필 조회 실패:", error);
        await supabase.auth.signOut();
        router.push("/login");
        return;
      }

      // 3. 센터 콘솔은 ADMIN, MANAGER, WORKER 모두 접근 가능
      if (!["ADMIN", "MANAGER", "WORKER"].includes(userData.role)) {
        console.error("❌ 접근 권한이 없습니다:", userData.role);
        await supabase.auth.signOut();
        alert("⛔ 접근 권한이 없습니다.");
        router.push("/login");
        return;
      }

      console.log("✅ 인증 완료:", userData.email, userData.role);
      setIsAuthorized(true);
    } catch (error) {
      console.error("❌ 인증 확인 중 오류:", error);
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* 헤더 */}
      <DashboardHeader />
      
      <div className="flex flex-1 overflow-hidden">
        {/* 좌측 사이드바 */}
        <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <div className="flex flex-col h-full p-4">
            {/* 사이드바 헤더 */}
            <div className="mb-8">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-green-600 dark:bg-green-700 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">🏭</span>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">센터 콘솔</h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">현장 작업 관리</p>
                </div>
              </div>
            </div>

            {/* 네비게이션 메뉴 */}
            <nav className="flex-1 space-y-1 overflow-y-auto">
              {navigation.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`
                      flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${
                        isActive
                          ? "bg-green-600 dark:bg-green-700 text-white"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
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
            <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
              센터 운영 시스템 v1.0
            </div>
          </div>
        </div>

        {/* 메인 컨텐츠 영역 */}
        <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900 p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

