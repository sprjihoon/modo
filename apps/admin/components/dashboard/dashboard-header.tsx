"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, User, LayoutDashboard, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DashboardHeader() {
  const pathname = usePathname();
  const isOpsConsole = pathname.startsWith("/ops");

  return (
    <header className="bg-white dark:bg-gray-800 border-b px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold">
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
          <Button variant="ghost" size="icon">
            <User className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}

