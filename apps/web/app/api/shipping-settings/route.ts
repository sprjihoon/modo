import { NextResponse } from "next/server";
import {
  getShippingSettings,
  DEFAULT_SHIPPING_SETTINGS,
} from "@/lib/shipping-settings";

/**
 * GET /api/shipping-settings
 * 관리자 페이지에서 설정한 글로벌 배송비 정책을 반환합니다.
 * (모바일/웹 클라이언트 양쪽에서 사용)
 */
export async function GET() {
  try {
    const settings = await getShippingSettings();
    return NextResponse.json(settings, {
      headers: {
        // 짧은 CDN/브라우저 캐시 — 관리자 변경 후 최대 60초 안에 반영
        "Cache-Control": "public, max-age=30, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (e) {
    console.error("shipping-settings GET error:", e);
    return NextResponse.json(DEFAULT_SHIPPING_SETTINGS, { status: 200 });
  }
}
