import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Supabase 클라이언트 생성 (Edge Function용 - service_role 사용)
 * RLS를 우회하고 Admin API를 사용할 수 있습니다.
 */
export function createSupabaseClient(req: Request) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  // service_role 키로 클라이언트 생성 (RLS 우회 + Admin API 사용 가능)
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Admin 전용 Supabase 클라이언트 (service_role)
 * auth.admin.deleteUser() 등 Admin API 호출용
 */
export function createSupabaseAdminClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

