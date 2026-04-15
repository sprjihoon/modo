"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordClient() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError("비밀번호 변경에 실패했습니다. 링크가 만료되었을 수 있습니다.");
        return;
      }

      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  if (done) {
    return (
      <div className="px-5 py-16 text-center">
        <div className="w-16 h-16 bg-[#00C896]/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">✅</span>
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">
          비밀번호가 변경되었습니다
        </h2>
        <p className="text-sm text-gray-500">잠시 후 로그인 페이지로 이동합니다.</p>
      </div>
    );
  }

  return (
    <div className="px-5 py-8">
      <p className="text-sm text-gray-500 mb-6">
        새로운 비밀번호를 입력해주세요.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="새 비밀번호 (8자 이상)"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            className="w-full pl-11 pr-12 py-4 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00C896] transition-colors"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="새 비밀번호 확인"
            value={passwordConfirm}
            onChange={(e) => { setPasswordConfirm(e.target.value); setError(""); }}
            className="w-full pl-11 pr-4 py-4 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00C896] transition-colors"
          />
        </div>

        {error && <p className="text-xs text-red-500 text-center">{error}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className="btn-brand w-full py-4 text-base"
        >
          {isLoading ? "변경 중..." : "비밀번호 변경"}
        </button>
      </form>

      <div className="text-center mt-4">
        <Link href="/login" className="text-xs text-gray-400 underline">
          로그인으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
