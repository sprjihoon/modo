import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET: 회사(푸터) 정보 조회
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("company_info")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST: 회사(푸터) 정보 저장
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // 기존 레코드 확인
    const { data: existingData } = await supabaseAdmin
      .from("company_info")
      .select("id")
      .limit(1)
      .maybeSingle();
    
    const payload = {
      company_name: body.company_name ?? null,
      ceo_name: body.ceo_name ?? null,
      business_number: body.business_number ?? null,
      online_business_number: body.online_business_number ?? null,
      address: body.address ?? null,
      privacy_officer: body.privacy_officer ?? null,
      email: body.email ?? null,
      phone: body.phone ? String(body.phone) : null,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (existingData?.id) {
      // 기존 레코드 업데이트
      result = await supabaseAdmin
        .from("company_info")
        .update(payload)
        .eq("id", existingData.id);
    } else {
      // 새 레코드 생성
      result = await supabaseAdmin
        .from("company_info")
        .insert(payload);
    }

    if (result.error) throw result.error;

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}


