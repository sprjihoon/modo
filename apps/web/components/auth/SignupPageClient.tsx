"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, User, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SignupPageClient() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    passwordConfirm: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name || !form.email || !form.password) {
      setError("필수 항목을 모두 입력해주세요.");
      return;
    }
    if (form.password !== form.passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (form.password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (!agreeTerms || !agreePrivacy) {
      setError("필수 약관에 동의해주세요.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          setError("이미 사용 중인 이메일입니다.");
        } else {
          setError("회원가입에 실패했습니다. 다시 시도해주세요.");
        }
        return;
      }

      if (data.user) {
        // users 테이블에 프로필 저장
        await supabase.from("users").insert({
          auth_id: data.user.id,
          name: form.name,
          email: form.email,
          phone: form.phone || null,
          agreed_to_terms: true,
          agreed_to_privacy: true,
          role: "customer",
        });

        router.push("/");
        router.refresh();
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="px-5 py-6">
      <form onSubmit={handleSignup} className="space-y-3">
        {/* 이름 */}
        <div className="relative">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="이름 *"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="w-full pl-11 pr-4 py-4 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00C896] transition-colors"
          />
        </div>

        {/* 이메일 */}
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="email"
            placeholder="이메일 *"
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
            className="w-full pl-11 pr-4 py-4 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00C896] transition-colors"
            autoComplete="email"
          />
        </div>

        {/* 전화번호 */}
        <div className="relative">
          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="tel"
            placeholder="전화번호 (선택)"
            value={form.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            className="w-full pl-11 pr-4 py-4 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00C896] transition-colors"
          />
        </div>

        {/* 비밀번호 */}
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="비밀번호 (8자 이상) *"
            value={form.password}
            onChange={(e) => handleChange("password", e.target.value)}
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

        {/* 비밀번호 확인 */}
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="비밀번호 확인 *"
            value={form.passwordConfirm}
            onChange={(e) => handleChange("passwordConfirm", e.target.value)}
            className="w-full pl-11 pr-4 py-4 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00C896] transition-colors"
          />
        </div>

        {/* 약관 동의 */}
        <div className="border border-gray-100 rounded-xl p-4 space-y-2.5 mt-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="w-4 h-4 accent-[#00C896]"
            />
            <span className="text-sm text-gray-700">
              [필수]{" "}
              <Link
                href="/terms"
                target="_blank"
                className="text-[#00C896] underline"
              >
                이용약관
              </Link>{" "}
              동의
            </span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreePrivacy}
              onChange={(e) => setAgreePrivacy(e.target.checked)}
              className="w-4 h-4 accent-[#00C896]"
            />
            <span className="text-sm text-gray-700">
              [필수]{" "}
              <Link
                href="/privacy"
                target="_blank"
                className="text-[#00C896] underline"
              >
                개인정보처리방침
              </Link>{" "}
              동의
            </span>
          </label>
        </div>

        {/* 에러 */}
        {error && (
          <p className="text-xs text-red-500 text-center">{error}</p>
        )}

        {/* 회원가입 버튼 */}
        <button
          type="submit"
          disabled={isLoading}
          className="btn-brand w-full py-4 text-base"
        >
          {isLoading ? "처리 중..." : "회원가입"}
        </button>
      </form>

      <p className="text-center text-xs text-gray-400 mt-4">
        이미 회원이신가요?{" "}
        <Link href="/login" className="text-[#00C896] font-semibold underline">
          로그인
        </Link>
      </p>
    </div>
  );
}
