import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET: 저장된 레이아웃 조회
export async function GET() {
  try {
    // company_info 테이블에서 레이아웃 조회
    const { data, error } = await supabaseAdmin
      .from("company_info")
      .select("label_layout_config")
      .limit(1)
      .maybeSingle();

    if (error) {
      // 컬럼이 없으면 null 반환
      if (error.code === "42703" || error.message?.includes("column") || error.message?.includes("schema cache")) {
        return NextResponse.json({ 
          success: true, 
          layout: null 
        });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // JSON 파싱
    let layout = null;
    if (data?.label_layout_config) {
      try {
        layout = typeof data.label_layout_config === 'string' 
          ? JSON.parse(data.label_layout_config) 
          : data.label_layout_config;
      } catch (e) {
        console.error("Layout parse error:", e);
      }
    }

    return NextResponse.json({ 
      success: true, 
      layout 
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST: 레이아웃 저장
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { layout } = body;

    // 먼저 기존 레코드 확인
    const { data: existingData, error: checkError } = await supabaseAdmin
      .from("company_info")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (checkError && checkError.code !== "PGRST116") {
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
      label_layout_config: JSON.stringify(layout),
    };

    let error;
    if (existingData && existingData.id) {
      // 레코드가 있으면 업데이트
      const { error: updateError } = await supabaseAdmin
        .from("company_info")
        .update(updateData)
        .eq("id", existingData.id);

      error = updateError;
      
      if (error && (error.code === "42703" || error.message?.includes("column") || error.message?.includes("schema cache"))) {
        return NextResponse.json({ 
          success: false,
          error: "label_layout_config 컬럼이 없습니다. Supabase Dashboard → Table Editor → company_info → Add Column → label_layout_config (text) 추가해주세요.",
          needsMigration: true
        });
      }
    } else {
      // 레코드가 없으면 삽입
      const { error: insertError } = await supabaseAdmin
        .from("company_info")
        .insert(updateData);

      error = insertError;
      
      if (error && (error.code === "42703" || error.message?.includes("column") || error.message?.includes("schema cache"))) {
        return NextResponse.json({ 
          success: false,
          error: "label_layout_config 컬럼이 없습니다. Supabase Dashboard → Table Editor → company_info → Add Column → label_layout_config (text) 추가해주세요.",
          needsMigration: true
        });
      }
    }

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

