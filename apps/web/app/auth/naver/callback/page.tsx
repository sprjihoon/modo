"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Suspense } from "react";

function NaverCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("로그인 처리 중...");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const redirectTo = sessionStorage.getItem("naver_redirect_to") || "/";

    if (error || !code) {
      setStatus("네이버 로그인이 취소되었습니다.");
      setIsError(true);
      setTimeout(() => router.push("/login"), 2000);
      return;
    }

    handleCallback(code, redirectTo);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCallback(code: string, redirectTo: string) {
    try {
      const redirectUri = `${window.location.origin}/auth/naver/callback`;

      const res = await fetch("/api/auth/naver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, redirectUri }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "로그인 처리에 실패했습니다.");
      }

      // Supabase 세션 설정
      const supabase = createClient();
      if (data.access_token && data.refresh_token) {
        await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });

        // public.users에 네이버 유저 upsert (login_provider 포함)
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("users").upsert(
            {
              auth_id: user.id,
              email: user.email || data.email || `naver_${user.id}@naver.com`,
              name: user.user_metadata?.name || data.name || "고객",
              phone: null,
              role: "CUSTOMER",
              login_provider: "naver",
            },
            { onConflict: "auth_id", ignoreDuplicates: true }
          );
        }
      }

      sessionStorage.removeItem("naver_redirect_to");
      setStatus("로그인 성공! 이동 중...");
      router.push(redirectTo);
      router.refresh();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "네이버 로그인에 실패했습니다.");
      setIsError(true);
      setTimeout(() => router.push("/login"), 3000);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm text-center">
        {isError ? (
          <div>
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">❌</span>
            </div>
            <p className="text-sm font-semibold text-red-600 mb-1">{status}</p>
            <p className="text-xs text-gray-400">로그인 페이지로 돌아갑니다...</p>
          </div>
        ) : (
          <div>
            <div className="w-16 h-16 rounded-full bg-[#03C75A]/10 flex items-center justify-center mx-auto mb-4">
              <div className="w-8 h-8 rounded-full border-2 border-[#03C75A] border-t-transparent animate-spin" />
            </div>
            <p className="text-sm font-semibold text-gray-700">{status}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function NaverCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-[#03C75A] border-t-transparent animate-spin" /></div>}>
      <NaverCallbackContent />
    </Suspense>
  );
}
