import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 일반 클라이언트 (anon key 사용)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 관리자용 클라이언트를 함수로 생성 (서버 사이드에서만 호출)
// Service Role Key는 런타임에 확인
export function getSupabaseAdmin() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!serviceRoleKey) {
    console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다. 일반 클라이언트를 사용합니다.')
    return supabase
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// 하위 호환성을 위한 기존 export (lazy initialization)
let _supabaseAdmin: ReturnType<typeof createClient> | null = null
export const supabaseAdmin = new Proxy({} as ReturnType<typeof createClient>, {
  get(_, prop) {
    if (!_supabaseAdmin) {
      _supabaseAdmin = getSupabaseAdmin()
    }
    return (_supabaseAdmin as any)[prop]
  }
})

