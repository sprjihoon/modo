import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Supabase 클라이언트 생성 (Edge Function용 - service_role 사용)
 * RLS를 우회하기 위해 service_role 키만 사용합니다.
 */
export function createSupabaseClient(req: Request) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  // 사용자의 Authorization 헤더에서 토큰 추출
  const authHeader = req.headers.get('Authorization');

  // Edge Function에서는 service_role 사용하되, 
  // 사용자 토큰이 있으면 global headers로 전달하여 getUser() 작동하게 함
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
  });
}

/**
 * 사용자 인증용 Supabase 클라이언트 생성 (anon key + 사용자 토큰)
 * getUser()로 현재 사용자를 확인할 때 사용합니다.
 */
export function createSupabaseUserClient(req: Request) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

  // Authorization 헤더에서 JWT 토큰 추출
  const authHeader = req.headers.get('Authorization');

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
  });
}

