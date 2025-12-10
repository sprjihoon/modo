"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, User, LayoutDashboard, Building2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function DashboardHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const isOpsConsole = pathname.startsWith("/ops");
  const [userEmail, setUserEmail] = useState<string>("");
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setUserEmail(session.user.email || "");
        
        // users 테이블에서 이름 가져오기
        const { data } = await supabase
          .from("users")
          .select("name")
          .eq("auth_id", session.user.id)
          .maybeSingle();
        
        if (data) {
          setUserName(data.name);
        }
      }
    } catch (error) {
      console.error("사용자 정보 로드 실패:", error);
    }
  };

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("로그아웃 실패:", error);
      alert("로그아웃에 실패했습니다.");
    }
  };

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {isOpsConsole ? "센터 콘솔" : "관리자 콘솔"}
          </h2>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* 콘솔 전환 토글 스위치 */}
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <Link
              href="/dashboard"
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200",
                !isOpsConsole
                  ? "bg-white dark:bg-gray-600 text-primary shadow-sm font-medium"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
              )}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="text-sm">관리자</span>
            </Link>
            <Link
              href="/ops/inbound"
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200",
                isOpsConsole
                  ? "bg-white dark:bg-gray-600 text-green-600 dark:text-green-400 shadow-sm font-medium"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
              )}
            >
              <Building2 className="h-4 w-4" />
              <span className="text-sm">센터</span>
            </Link>
          </div>
          
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
          
          {/* 사용자 메뉴 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{userName || "관리자"}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {userEmail}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>로그아웃</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

