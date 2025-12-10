"use client";

import Link from "next/link";
import { Bell, User, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashboardHeader() {
  return (
    <header className="bg-white dark:bg-gray-800 border-b px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold">관리자 콘솔</h2>
        </div>
        
        <div className="flex items-center space-x-4">
          <Link href="/ops/inbound">
            <Button variant="outline" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span>센터 콘솔</span>
            </Button>
          </Link>
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

