"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

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

      // 3. 관리자 권한 확인 (ADMIN만 접근 가능)
      if (userData.role !== "ADMIN") {
        // 비관리자는 로그아웃 처리
        await supabase.auth.signOut();
        throw new Error("관리자 권한이 필요합니다. ADMIN 계정으로 로그인해주세요.");
      }

      console.log("✅ 관리자 권한 확인 완료");

      // 4. 대시보드로 이동
      router.push("/dashboard");
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
                placeholder="admin@modusrepair.com"
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
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "로그인 중..." : "로그인"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            <p>💡 ADMIN 권한 계정만 접근 가능합니다</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

