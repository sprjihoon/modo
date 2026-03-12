import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const pathname = request.nextUrl.pathname;

  // modo.mom (고객용 도메인) - 인증 페이지만 허용
  const isCustomerDomain =
    hostname === "modo.mom" ||
    hostname === "www.modo.mom" ||
    hostname.includes("modo-virid.vercel.app");

  // admin.modo.mom (관리자 도메인) - 모든 페이지 허용
  const isAdminDomain =
    hostname === "admin.modo.mom" ||
    hostname.includes("localhost");

  if (isCustomerDomain) {
    // 고객 도메인에서 허용되는 경로
    const allowedPaths = [
      "/auth/reset-password",
      "/_next",
      "/favicon.ico",
      "/api",
    ];

    const isAllowed = allowedPaths.some((path) => pathname.startsWith(path));

    if (!isAllowed) {
      // 허용되지 않은 경로 접근 시 안내 페이지로 리다이렉트
      return NextResponse.redirect(new URL("/auth/customer-landing", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // 정적 파일 제외
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
