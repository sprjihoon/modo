import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET: 배경 이미지 URL 조회
export async function GET() {
  try {
    // company_info 테이블에서 모든 컬럼 조회 후 label_background_image_url 추출
    const { data, error } = await supabaseAdmin
      .from("company_info")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 컬럼이 있으면 사용, 없으면 null 반환 (타입 안전하게 처리)
    const backgroundImageUrl = (data as any)?.label_background_image_url || null;

    return NextResponse.json({ 
      success: true, 
      backgroundImageUrl 
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST: 배경 이미지 URL 저장
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { backgroundImageUrl } = body;

    // 먼저 기존 레코드 확인 (id 없이 첫 번째 레코드)
    const { data: existingData, error: checkError } = await supabaseAdmin
      .from("company_info")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (checkError && checkError.code !== "PGRST116") {
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    let error;
    if (existingData && existingData.id) {
      // 레코드가 있으면 업데이트 (실제 id 사용)
      const { error: updateError } = await supabaseAdmin
        .from("company_info")
        .update({
          label_background_image_url: backgroundImageUrl || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingData.id);

      error = updateError;
    } else {
      // 레코드가 없으면 기존 company-info API와 동일한 방식으로 처리
      // id 없이 insert 시도 (자동 생성)
      const { error: insertError } = await supabaseAdmin
        .from("company_info")
        .insert({
          label_background_image_url: backgroundImageUrl || null,
          updated_at: new Date().toISOString(),
        });

      error = insertError;
    }

    if (error) {
      // 컬럼이 없으면 에러 메시지 반환
      if (error.code === "42703" || error.message?.includes("column") || error.message?.includes("schema cache")) {
        return NextResponse.json({ 
          error: "label_background_image_url 컬럼이 없습니다. Supabase SQL Editor에서 다음 SQL을 실행해주세요:\n\nALTER TABLE company_info ADD COLUMN IF NOT EXISTS label_background_image_url TEXT;",
          needsMigration: true
        }, { status: 500 });
      }
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

