"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { applyStashedInviteCode, readStashedInviteCode } from "@/lib/invite";

/** 로그인 직후 스태시된 초대 코드가 있으면 1회 적용 */
export function InviteBootstrap() {
  const tried = useRef(false);

  useEffect(() => {
    if (tried.current) return;
    if (!readStashedInviteCode()) return;
    tried.current = true;

    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await applyStashedInviteCode();
    })();
  }, []);

  return null;
}
