import type { User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/** 쿠키 세션 또는 Authorization Bearer(앱)로 로그인한 사용자를 반환한다. */
export async function getRequestAuthUser(request?: NextRequest): Promise<User | null> {
  const cookieClient = await createClient();
  const { data: cookieAuth } = await cookieClient.auth.getUser();
  if (cookieAuth.user) return cookieAuth.user;

  const header = request?.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;

  const admin = createServiceClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}
