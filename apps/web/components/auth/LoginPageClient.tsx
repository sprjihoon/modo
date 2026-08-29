"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { safeRedirectPath } from "@/lib/utils";
import {
  applyStashedInviteCode,
  normalizeInviteCode,
  signupHrefWithInvite,
  stashInviteCode,
} from "@/lib/invite";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";

const SAVED_EMAIL_KEY = "modo_web_saved_email";
/** @deprecated plaintext password — cleared on load */
const LEGACY_CREDENTIALS_KEY = "modo_web_saved_credentials";

export function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirectPath(searchParams.get("redirectTo"), "/");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteFromUrl, setInviteFromUrl] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const invite = searchParams.get("invite");
    if (invite) {
      const code = normalizeInviteCode(invite);
      stashInviteCode(code);
      setInviteFromUrl(code);
    }
  }, [searchParams]);

  useEffect(() => {
    try {
      // 레거시 평문 비밀번호 저장 제거 (이메일만 복원)
      const legacy = localStorage.getItem(LEGACY_CREDENTIALS_KEY);
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (parsed?.email) {
          localStorage.setItem(SAVED_EMAIL_KEY, parsed.email);
          setEmail(parsed.email);
          setRememberMe(true);
        }
        localStorage.removeItem(LEGACY_CREDENTIALS_KEY);
      } else {
        const savedEmail = localStorage.getItem(SAVED_EMAIL_KEY);
        if (savedEmail) {
          setEmail(savedEmail);
          setRememberMe(true);
        }
      }
    } catch {
      localStorage.removeItem(LEGACY_CREDENTIALS_KEY);
      localStorage.removeItem(SAVED_EMAIL_KEY);
    }
  }, []);

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
      const { data, error: authError } = await supabase.auth.signInWithPassword({
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

      if (rememberMe) {
        localStorage.setItem(SAVED_EMAIL_KEY, email);
      } else {
        localStorage.removeItem(SAVED_EMAIL_KEY);
      }
      localStorage.removeItem(LEGACY_CREDENTIALS_KEY);

      const code = normalizeInviteCode(inviteFromUrl);
      if (code) stashInviteCode(code);
      await applyStashedInviteCode();

      // 프로필 미완료면 추가정보 입력
      if (data.user) {
        const { data: check } = await supabase.rpc("check_profile_completed", {
          p_auth_id: data.user.id,
        });
        const row = Array.isArray(check) ? check[0] : check;
        if (row && row.is_completed === false) {
          router.push(
            `/complete-profile?redirectTo=${encodeURIComponent(redirectTo)}`
          );
          router.refresh();
          return;
        }
      }

      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  const signupHref = signupHrefWithInvite(inviteFromUrl);

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
            className="w-full pl-11 pr-4 py-4 border border-gray-200 rounded-xl text-base outline-none focus:border-[#00C896] transition-colors"
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
            className="w-full pl-11 pr-12 py-4 border border-gray-200 rounded-xl text-base outline-none focus:border-[#00C896] transition-colors"
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

        {/* 아이디/비밀번호 저장 */}
        <div className="flex items-center gap-2">
          <input
            id="rememberMe"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            disabled={isLoading}
            className="w-4 h-4 rounded border-gray-300 accent-[#00C896] cursor-pointer"
          />
          <label
            htmlFor="rememberMe"
            className="text-sm text-gray-500 cursor-pointer select-none"
          >
            아이디 저장
          </label>
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
        <Link
          href={signupHref}
          className="active:opacity-60"
        >
          회원가입
        </Link>
      </div>

      {/* 구분선 */}
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-xs text-gray-300">또는</span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>

      <SocialAuthButtons
        inviteCode={inviteFromUrl}
        redirectTo={redirectTo}
        actionVerb="로그인"
      />

      {/* 회원가입 안내 */}
      <p className="text-center text-xs text-gray-400 mt-6">
        아직 회원이 아니신가요?{" "}
        <Link
          href={signupHref}
          className="text-[#00C896] font-semibold underline"
        >
          회원가입
        </Link>
      </p>
    </div>
  );
}
