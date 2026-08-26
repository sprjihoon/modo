"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { loginLandingPath } from "@/lib/staff-permissions";

export default function OpsPage() {
  const router = useRouter();

  useEffect(() => {
    const go = async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }
      const { data } = await supabase
        .from("users")
        .select("role")
        .eq("auth_id", session.user.id)
        .maybeSingle();
      const dest = loginLandingPath(data?.role ?? "");
      router.replace(dest === "/dashboard" ? "/ops/inbound" : dest);
    };
    void go();
  }, [router]);

  return null;
}
