import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type StaffRole = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "WORKER";

const STAFF_ROLES: StaffRole[] = ["SUPER_ADMIN", "ADMIN", "MANAGER", "WORKER"];
const ADMIN_ROLES: StaffRole[] = ["SUPER_ADMIN", "ADMIN"];

export interface StaffUser {
  id: string;
  role: StaffRole;
}

/**
 * 관리자 전용 API 인증 가드 (SUPER_ADMIN / ADMIN).
 * 사용 패턴은 requireStaff 와 동일하다.
 */
export async function requireAdmin(): Promise<
  | { user: StaffUser; response?: never }
  | { user?: never; response: NextResponse }
> {
  return requireStaff(ADMIN_ROLES);
}

/**
 * 운영(ops) API 공통 인증 가드.
 *
 * 세션 쿠키 기반으로 로그인 여부와 스태프 권한(SUPER_ADMIN/ADMIN/MANAGER/WORKER)을
 * 검증한다. 통과하면 { user } 를, 실패하면 { response } 에 401/403 을 담아 반환한다.
 *
 * 사용 예:
 *   const auth = await requireStaff();
 *   if (auth.response) return auth.response;
 *   // auth.user 사용 가능
 */
export async function requireStaff(
  allowedRoles: StaffRole[] = STAFF_ROLES
): Promise<{ user: StaffUser; response?: never } | { user?: never; response: NextResponse }> {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: user } = await supabase
    .from("users")
    .select("id, role")
    .eq("auth_id", session.user.id)
    .maybeSingle();

  if (!user) {
    return {
      response: NextResponse.json({ error: "User not found" }, { status: 401 }),
    };
  }

  if (!allowedRoles.includes(user.role as StaffRole)) {
    return {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { user: { id: user.id, role: user.role as StaffRole } };
}
