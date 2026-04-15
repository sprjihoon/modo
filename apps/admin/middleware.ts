import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const pathname = request.nextUrl.pathname;

  // admin.modo.mom 또는 localhost만 관리자 페이지 접근 허용
  const isAdminDomain =
    hostname === "admin.modo.mom" ||
    hostname.includes("localhost") ||
    hostname.includes("vercel.app");

  // 관리자 도메인이 아닌 경우 차단 (modo.mom은 apps/web이 처리)
  if (!isAdminDomain) {
    return NextResponse.redirect("https://modo.mom");
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // 정적 파일 제외
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
