import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Supabase 클라이언트 생성 (Edge Function용 - service_role 사용)
 * RLS를 우회하기 위해 service_role 키만 사용합니다.
 */
export function createSupabaseClient(req: Request) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  // Edge Function에서는 service_role만 사용하여 RLS 우회
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

