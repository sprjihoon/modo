import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 허용된 관리자 도메인 목록 (환경변수로 추가 지정 가능)
const ALLOWED_ADMIN_DOMAINS = new Set([
  "admin.modo.mom",
]);

// Vercel 프리뷰는 특정 프로젝트 prefix만 허용
const ALLOWED_VERCEL_PREFIX = process.env.ADMIN_VERCEL_PROJECT_PREFIX || "modo-admin";

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";

  const isAdminDomain =
    ALLOWED_ADMIN_DOMAINS.has(hostname) ||
    hostname === "localhost" ||
    hostname.startsWith("localhost:") ||
    (hostname.endsWith(".vercel.app") && hostname.startsWith(ALLOWED_VERCEL_PREFIX));

  // 관리자 도메인이 아닌 경우 차단 (modo.mom은 apps/web이 처리)
  // modo.mom 자체로 리디렉트하면 무한 루프가 발생하므로 404 반환
  if (!isAdminDomain) {
    return new NextResponse("Not Found", { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // 정적 파일 제외
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
