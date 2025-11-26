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
    const payload = {
      id: 1,
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

    const { error } = await supabaseAdmin
      .from("company_info")
      .upsert(payload, { onConflict: "id" });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}


