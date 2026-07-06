"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { logAction } from "@/lib/api/action-logs";
import { ActionType } from "@/lib/types/action-log";

const SAVED_EMAIL_KEY = "modo_admin_saved_email";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem(SAVED_EMAIL_KEY);
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch {
      localStorage.removeItem(SAVED_EMAIL_KEY);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const supabase = createClient();

      // 1. Supabase 로그인
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error("로그인에 실패했습니다.");
      }

      console.log("✅ 로그인 성공:", authData.user.email);

      // 2. 사용자 프로필 및 역할 확인
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, email, name, role")
        .eq("auth_id", authData.user.id)
        .maybeSingle();

      if (userError || !userData) {
        console.error("❌ 사용자 프로필 조회 실패:", userError);
        throw new Error("사용자 프로필을 찾을 수 없습니다.");
      }

      console.log("✅ 사용자 프로필 조회 완료:", userData);

      // 3. 직원 역할 확인 — 역할별 랜딩 경로 분기
      const STAFF_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "WORKER"];
      if (!STAFF_ROLES.includes(userData.role)) {
        await supabase.auth.signOut();
        throw new Error("직원 계정만 접근 가능합니다.");
      }

      console.log("✅ 역할 확인 완료:", userData.role);

      if (rememberMe) {
        localStorage.setItem(SAVED_EMAIL_KEY, email);
      } else {
        localStorage.removeItem(SAVED_EMAIL_KEY);
      }

      // 4. 📊 로그인 액션 로그 기록
      await logAction(ActionType.LOGIN, undefined, {
        email: email,
        loginTime: new Date().toISOString(),
      });

      // 5. 역할별 랜딩 페이지로 이동
      //    SUPER_ADMIN / ADMIN → 관리자 대시보드
      //    MANAGER / WORKER    → 센터 콘솔
      const landingPath = ["SUPER_ADMIN", "ADMIN"].includes(userData.role)
        ? "/dashboard"
        : "/ops/inbound";
      router.push(landingPath);
      router.refresh();
    } catch (error: any) {
      console.error("❌ 로그인 실패:", error);
      setError(error.message || "로그인에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-2xl text-white">🧵</span>
            </div>
          </div>
          <CardTitle className="text-2xl text-center">모두의수선</CardTitle>
          <CardDescription className="text-center">
            관리자 콘솔에 로그인하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@modorepair.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={6}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                id="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isLoading}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
              />
              <Label htmlFor="rememberMe" className="text-sm font-normal cursor-pointer select-none">
                로그인 정보 저장
              </Label>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "로그인 중..." : "로그인"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            <p>💡 직원 계정(ADMIN/MANAGER/WORKER)으로 로그인하세요</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

