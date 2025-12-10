import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase 클라이언트 생성 (브라우저 환경)
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

