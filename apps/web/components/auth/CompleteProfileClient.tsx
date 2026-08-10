"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { User, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { safeRedirectPath } from "@/lib/utils";

export function CompleteProfileClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirectPath(searchParams.get("redirectTo"), "/");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      const meta = user.user_metadata || {};
      const preset =
        meta.full_name || meta.name || meta.nickname || "";
      if (preset && preset !== "고객" && preset !== "사용자") {
        setName(preset);
      }
      const { data: row } = await supabase
        .from("users")
        .select("name, phone")
        .eq("auth_id", user.id)
        .maybeSingle();
      if (row?.name && row.name !== "고객" && row.name !== "사용자") {
        setName(row.name);
      }
      if (row?.phone) setPhone(row.phone);
    })();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const normalizedPhone = phone.trim().replace(/[-\s]/g, "");

    if (!trimmedName) {
      setError("이름을 입력해주세요.");
      return;
    }
    if (!normalizedPhone || !/^01[0-9]{8,9}$/.test(normalizedPhone)) {
      setError("올바른 휴대폰 번호를 입력해주세요.");
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("로그인 정보가 없습니다. 다시 로그인해 주세요.");
        router.replace("/login");
        return;
      }

      const { data, error: rpcError } = await supabase.rpc(
        "complete_user_profile",
        {
          p_auth_id: user.id,
          p_name: trimmedName,
          p_phone: normalizedPhone,
          p_terms_agreed: true,
          p_privacy_agreed: true,
          p_marketing_agreed: false,
        }
      );

      if (rpcError || data === false) {
        setError("프로필 저장에 실패했습니다. 다시 시도해주세요.");
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

  return (
    <div className="px-5 py-8 max-w-md mx-auto">
      <h1 className="text-xl font-extrabold text-gray-900 mb-1">추가 정보 입력</h1>
      <p className="text-sm text-gray-500 mb-6">
        서비스 이용을 위해 이름·연락처와 약관 동의가 필요합니다.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="이름 *"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            className="w-full pl-11 pr-4 py-4 border border-gray-200 rounded-xl text-base outline-none focus:border-[#00C896]"
          />
        </div>

        <div className="relative">
          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="tel"
            placeholder="휴대폰 번호 *"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setError("");
            }}
            className="w-full pl-11 pr-4 py-4 border border-gray-200 rounded-xl text-base outline-none focus:border-[#00C896]"
          />
        </div>

        <label className="flex items-start gap-2 pt-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            className="mt-1"
          />
          <span>
            [필수]{" "}
            <Link href="/terms" className="text-[#00C896] underline">
              이용약관
            </Link>{" "}
            동의
          </span>
        </label>

        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={agreePrivacy}
            onChange={(e) => setAgreePrivacy(e.target.checked)}
            className="mt-1"
          />
          <span>
            [필수]{" "}
            <Link href="/privacy-policy" className="text-[#00C896] underline">
              개인정보처리방침
            </Link>{" "}
            동의
          </span>
        </label>

        {error && (
          <p className="text-sm text-red-500 px-1" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="btn-brand w-full py-4 text-base mt-2 disabled:opacity-60"
        >
          {isLoading ? "저장 중..." : "완료하고 시작하기"}
        </button>
      </form>
    </div>
  );
}
