import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 인증 필요 경로 보호
    const protectedPaths = ["/orders", "/profile", "/notifications", "/cart", "/order/new", "/payment"];
    const pathname = request.nextUrl.pathname;
    const isProtected = protectedPaths.some((path) => pathname.startsWith(path));

    if (isProtected && !user) {
      // /login으로의 리디렉트가 다시 /login을 향하지 않도록 안전 확인
      if (pathname !== "/login") {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("redirectTo", pathname);
        return NextResponse.redirect(url);
      }
    }
  } catch {
    // Supabase 연결 오류 시 인증 없이 요청 통과 (페이지에서 처리)
  }

  return supabaseResponse;
}
