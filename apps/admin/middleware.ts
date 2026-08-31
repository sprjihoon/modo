import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAllowedAdminHost, isVercelCronRequest } from "@/lib/admin-host";
import { updateSession } from "@/lib/supabase/middleware";

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";

  // Vercel 크론은 커스텀 도메인이 아니라 `modo-<hash>-<team>.vercel.app` 으로 들어온다.
  // 예전 prefix `modo-admin` 과 달라서 아침 운영 리포트가 404로 빠졌다.
  if (
    !isAllowedAdminHost(hostname, {
      cron: isVercelCronRequest(request.headers),
    })
  ) {
    return new NextResponse("Not Found", { status: 404 });
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    // 정적 파일 제외
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
