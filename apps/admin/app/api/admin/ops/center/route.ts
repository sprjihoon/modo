import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const DEFAULTS = {
  recipient_name: "모두의수선",
  zipcode: "41142",
  address1: "대구광역시 동구 동촌로 1",
  address2: "동대구우체국 2층 소포실 모두의수선",
  phone: "01027239490",
};

// GET: 현재 센터(입고 도착지) 설정 조회
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("ops_center_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error) {
      // 테이블 없음 등 500을 막고 기본값 반환
      return NextResponse.json({ success: true, data: DEFAULTS });
    }

    if (!data) {
      return NextResponse.json({ success: true, data: DEFAULTS });
    }

    return NextResponse.json({ success: true, data });
  } catch {
    // 예외 발생 시에도 기본값 반환
    return NextResponse.json({ success: true, data: DEFAULTS });
  }
}

// POST: 설정 저장/업데이트
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const payload = {
      id: 1,
      recipient_name: body.recipient_name || DEFAULTS.recipient_name,
      zipcode: body.zipcode || DEFAULTS.zipcode,
      address1: body.address1 || DEFAULTS.address1,
      address2: body.address2 || DEFAULTS.address2,
      phone: (body.phone || DEFAULTS.phone).replace(/-/g, ""),
      updated_at: new Date().toISOString(),
    };

    // 1) ops_center_settings 저장 시도 (없으면 무시)
    try {
      await supabaseAdmin
        .from("ops_center_settings")
        .upsert(payload, { onConflict: "id" });
    } catch {
      // 테이블이 없다면 스킵 (기본값으로 동작)
    }

    // 2) app 하단 푸터용 company_info에도 반영 (주소/전화)
    //    기존 구조를 유지하면서 주소/전화만 최신화
    await supabaseAdmin
      .from("company_info")
      .upsert(
        {
          address: `${payload.address1} ${payload.address2}`.trim(),
          phone: payload.phone,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}


