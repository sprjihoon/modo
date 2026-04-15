"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordClient() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      setError("이메일을 입력해주세요.");
      return;
    }
    setIsLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        }
      );

      if (resetError) {
        setError("이메일 전송에 실패했습니다. 다시 시도해주세요.");
        return;
      }

      setSent(true);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="px-5 py-16 text-center">
        <div className="w-16 h-16 bg-[#00C896]/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="w-8 h-8 text-[#00C896]" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">이메일을 확인하세요</h2>
        <p className="text-sm text-gray-500 mb-1">
          <span className="font-semibold text-gray-700">{email}</span>으로
        </p>
        <p className="text-sm text-gray-500 mb-8">
          비밀번호 재설정 링크를 보내드렸습니다.
        </p>
        <Link href="/login" className="btn-brand inline-block px-8 py-3">
          로그인으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="px-5 py-8">
      <p className="text-sm text-gray-500 mb-6">
        가입하신 이메일 주소를 입력하시면<br />비밀번호 재설정 링크를 보내드립니다.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            className="w-full pl-11 pr-4 py-4 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00C896] transition-colors"
          />
        </div>

        {error && (
          <p className="text-xs text-red-500 text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="btn-brand w-full py-4 text-base"
        >
          {isLoading ? "전송 중..." : "이메일 전송"}
        </button>
      </form>

      <p className="text-center text-xs text-gray-400 mt-4">
        <Link href="/login" className="text-[#00C896] font-semibold underline">
          로그인으로 돌아가기
        </Link>
      </p>
    </div>
  );
}
