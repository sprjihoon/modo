"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

      // 2. 사용자 프로필 및 권한 확인
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

      // 3. ADMIN 권한 확인
      if (userData.role !== "ADMIN") {
        console.error("❌ 관리자 권한이 없습니다:", userData.role);
        await supabase.auth.signOut();
        alert("⛔ 접근 권한이 없습니다. ADMIN 계정으로 로그인해주세요.");
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
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardNav />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
