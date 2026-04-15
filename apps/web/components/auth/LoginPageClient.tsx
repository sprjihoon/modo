"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const NAVER_CLIENT_ID = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID || "b7QJILomSlfsFL7RuAQs";

export function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError("이메일과 비밀번호를 입력해주세요.");
      return;
    }
    setIsLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        if (authError.message.includes("Invalid login credentials")) {
          setError("이메일 또는 비밀번호가 올바르지 않습니다.");
        } else {
          setError("로그인에 실패했습니다. 다시 시도해주세요.");
        }
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleKakaoLogin() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirectTo=${redirectTo}`,
      },
    });
  }

  async function handleGoogleLogin() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirectTo=${redirectTo}`,
      },
    });
  }

  async function handleNaverLogin() {
    const callbackUrl = `${window.location.origin}/auth/naver/callback`;
    const state = Math.random().toString(36).substring(2);
    sessionStorage.setItem("naver_redirect_to", redirectTo);
    const naverOAuthUrl =
      `https://nid.naver.com/oauth2.0/authorize?` +
      `response_type=code&client_id=${NAVER_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
      `&state=${state}`;
    window.location.href = naverOAuthUrl;
  }

  async function handleAppleLogin() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirectTo=${redirectTo}`,
      },
    });
  }

  return (
    <div className="px-5 py-8">
      {/* 로고 */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-extrabold text-gray-900">모두의수선</h1>
        <p className="text-sm text-gray-400 mt-1">비대면 의류 수선 서비스</p>
      </div>

      {/* 이메일 로그인 폼 */}
      <form onSubmit={handleLogin} className="space-y-3">
        {/* 이메일 */}
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full pl-11 pr-4 py-4 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00C896] transition-colors"
            autoComplete="email"
          />
        </div>

        {/* 비밀번호 */}
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full pl-11 pr-12 py-4 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00C896] transition-colors"
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <p className="text-xs text-red-500 text-center">{error}</p>
        )}

        {/* 로그인 버튼 */}
        <button
          type="submit"
          disabled={isLoading}
          className="btn-brand w-full py-4 text-base"
        >
          {isLoading ? "로그인 중..." : "로그인"}
        </button>
      </form>

      {/* 링크 */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-400">
        <Link href="/forgot-password" className="active:opacity-60">
          비밀번호 찾기
        </Link>
        <span>|</span>
        <Link href="/signup" className="active:opacity-60">
          회원가입
        </Link>
      </div>

      {/* 구분선 */}
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-xs text-gray-300">또는</span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>

      {/* 소셜 로그인 */}
      <div className="space-y-2.5">
        {/* 카카오 */}
        <button
          onClick={handleKakaoLogin}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm text-gray-800"
          style={{ backgroundColor: "#FEE500" }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 1.5C5.134 1.5 2 4.134 2 7.35c0 2.06 1.19 3.863 2.988 4.937L4.2 15.3l3.62-2.19c.39.05.79.077 1.18.077 3.866 0 7-2.634 7-5.836C16 4.134 12.866 1.5 9 1.5z" fill="#3A1D1D"/>
          </svg>
          카카오로 로그인
        </button>

        {/* 네이버 */}
        <button
          onClick={handleNaverLogin}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm text-white"
          style={{ backgroundColor: "#03C75A" }}
        >
          <span className="text-base font-black leading-none">N</span>
          네이버로 로그인
        </button>

        {/* 구글 */}
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm text-gray-700 border border-gray-200 bg-white"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Google로 로그인
        </button>

        {/* 애플 */}
        <button
          onClick={handleAppleLogin}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm text-white bg-black"
        >
          <svg width="16" height="18" viewBox="0 0 16 18" fill="none">
            <path d="M13.17 9.62c-.02-2.16 1.77-3.2 1.85-3.26-1.01-1.47-2.57-1.67-3.13-1.7-1.34-.13-2.6.78-3.28.78-.67 0-1.72-.76-2.83-.74C4.27 4.72 2.8 5.57 2 6.9 .33 9.6 1.54 13.6 3.16 15.77c.81 1.16 1.77 2.46 3.03 2.41 1.21-.05 1.67-.78 3.13-.78 1.46 0 1.87.78 3.15.76 1.31-.03 2.14-1.19 2.94-2.35.92-1.35 1.3-2.66 1.32-2.72-.03-.01-2.54-.97-2.56-3.47zM10.95 2.9C11.6 2.1 12.06 1 11.91 0 10.97.04 9.84.62 9.17 1.41 8.57 2.12 8.03 3.26 8.21 4.33c1.05.08 2.12-.54 2.74-1.43z" fill="white"/>
          </svg>
          Apple로 로그인
        </button>
      </div>

      {/* 회원가입 안내 */}
      <p className="text-center text-xs text-gray-400 mt-6">
        아직 회원이 아니신가요?{" "}
        <Link
          href="/signup"
          className="text-[#00C896] font-semibold underline"
        >
          회원가입
        </Link>
      </p>
    </div>
  );
}
