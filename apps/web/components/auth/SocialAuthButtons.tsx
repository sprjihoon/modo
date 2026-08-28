"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getNaverCallbackUrl,
  getOAuthCallbackUrl,
  safeRedirectPath,
} from "@/lib/utils";
import { normalizeInviteCode, stashInviteCode } from "@/lib/invite";

const NAVER_CLIENT_ID = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID;
const NAVER_OAUTH_STATE_KEY = "naver_oauth_state";

type SocialAuthButtonsProps = {
  inviteCode?: string;
  redirectTo?: string;
  actionVerb?: "로그인" | "가입";
};

export function SocialAuthButtons({
  inviteCode = "",
  redirectTo = "/",
  actionVerb = "로그인",
}: SocialAuthButtonsProps) {
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const safeRedirect = safeRedirectPath(redirectTo, "/");

  function persistInvite() {
    const code = normalizeInviteCode(inviteCode);
    if (code) stashInviteCode(code);
  }

  async function startOAuth(provider: "kakao" | "google" | "apple", label: string) {
    persistInvite();
    setOauthLoading(label);
    setError("");
    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: getOAuthCallbackUrl(safeRedirect),
        },
      });
      if (oauthError) {
        setError(`${label} ${actionVerb}을 시작할 수 없습니다. 다시 시도해주세요.`);
        setOauthLoading(null);
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
      setOauthLoading(null);
    }
  }

  async function handleNaver() {
    persistInvite();
    if (!NAVER_CLIENT_ID) {
      setError("네이버 로그인 설정이 누락되었습니다. 관리자에게 문의해주세요.");
      return;
    }
    setOauthLoading("네이버");
    setError("");
    const callbackUrl = getNaverCallbackUrl();
    const state =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2) + Date.now().toString(36);
    sessionStorage.setItem(NAVER_OAUTH_STATE_KEY, state);
    sessionStorage.setItem("naver_redirect_to", safeRedirect);
    const naverOAuthUrl =
      `https://nid.naver.com/oauth2.0/authorize?` +
      `response_type=code&client_id=${NAVER_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
      `&state=${encodeURIComponent(state)}`;
    window.location.href = naverOAuthUrl;
  }

  return (
    <div>
      {error && <p className="text-xs text-red-500 text-center mb-3">{error}</p>}
      <div className="space-y-2.5">
        <button
          type="button"
          onClick={() => startOAuth("kakao", "카카오")}
          className="touch-target w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm text-gray-800"
          style={{ backgroundColor: "#FEE500" }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 1.5C5.134 1.5 2 4.134 2 7.35c0 2.06 1.19 3.863 2.988 4.937L4.2 15.3l3.62-2.19c.39.05.79.077 1.18.077 3.866 0 7-2.634 7-5.836C16 4.134 12.866 1.5 9 1.5z" fill="#3A1D1D"/>
          </svg>
          카카오로 {actionVerb}
        </button>

        <button
          type="button"
          onClick={handleNaver}
          className="touch-target w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm text-white"
          style={{ backgroundColor: "#03C75A" }}
        >
          <span className="text-base font-black leading-none">N</span>
          네이버로 {actionVerb}
        </button>

        <button
          type="button"
          onClick={() => startOAuth("google", "Google")}
          className="touch-target w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm text-gray-700 border border-gray-200 bg-white"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Google로 {actionVerb}
        </button>

        <button
          type="button"
          onClick={() => startOAuth("apple", "Apple")}
          className="touch-target w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm text-white bg-black"
        >
          <svg width="16" height="18" viewBox="0 0 16 18" fill="none">
            <path d="M13.17 9.62c-.02-2.16 1.77-3.2 1.85-3.26-1.01-1.47-2.57-1.67-3.13-1.7-1.34-.13-2.6.78-3.28.78-.67 0-1.72-.76-2.83-.74C4.27 4.72 2.8 5.57 2 6.9 .33 9.6 1.54 13.6 3.16 15.77c.81 1.16 1.77 2.46 3.03 2.41 1.21-.05 1.67-.78 3.13-.78 1.46 0 1.87.78 3.15.76 1.31-.03 2.14-1.19 2.94-2.35.92-1.35 1.3-2.66 1.32-2.72-.03-.01-2.54-.97-2.56-3.47zM10.95 2.9C11.6 2.1 12.06 1 11.91 0 10.97.04 9.84.62 9.17 1.41 8.57 2.12 8.03 3.26 8.21 4.33c1.05.08 2.12-.54 2.74-1.43z" fill="white"/>
          </svg>
          Apple로 {actionVerb}
        </button>
      </div>
      {oauthLoading && (
        <p className="text-center text-xs text-gray-400 mt-3">
          {oauthLoading} {actionVerb} 화면으로 이동 중...
        </p>
      )}
    </div>
  );
}
