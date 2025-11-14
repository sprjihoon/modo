import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 일반 클라이언트 (anon key 사용)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 관리자용 클라이언트 (service role key 사용 - RLS 우회)
// 주의: 이 키는 서버 사이드에서만 사용해야 합니다!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : supabase // Service Role Key가 없으면 일반 클라이언트 사용

