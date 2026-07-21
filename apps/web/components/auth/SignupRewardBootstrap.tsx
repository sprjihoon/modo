"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

/** 로그인 직후 회원가입 축하 포인트가 없으면 1회 지급 시도 (트리거 누락 안전망) */
export function SignupRewardBootstrap() {
  const tried = useRef(false);

  useEffect(() => {
    if (tried.current) return;
    tried.current = true;

    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const cacheKey = `modo_signup_reward_${user.id}`;
      try {
        if (sessionStorage.getItem(cacheKey) === "1") return;
      } catch {
        /* ignore */
      }

      const { data: row } = await supabase
        .from("users")
        .select("signup_rewarded_at")
        .eq("auth_id", user.id)
        .maybeSingle();

      if (row?.signup_rewarded_at) {
        try {
          sessionStorage.setItem(cacheKey, "1");
        } catch {
          /* ignore */
        }
        return;
      }

      try {
        await fetch("/api/points/signup-reward", { method: "POST" });
        try {
          sessionStorage.setItem(cacheKey, "1");
        } catch {
          /* ignore */
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  return null;
}
