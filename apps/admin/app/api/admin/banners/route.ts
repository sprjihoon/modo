import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/ops-auth";

export const dynamic = 'force-dynamic';

// GET: 배너 목록 조회
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const activeOnly = searchParams.get('active_only') === 'true';

    console.log('🔍 배너 조회 시작:', { 
      activeOnly,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    });

    let query = supabaseAdmin
      .from("banners")
      .select("*")
      .order("display_order", { ascending: true });

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ 배너 조회 실패:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      
      // 테이블이 없는 경우 명확한 메시지 제공
      const isTableNotFound = error.code === 'PGRST205' || 
                              error.message?.includes('schema cache') ||
                              error.message?.includes('not found');
      
      const errorMessage = isTableNotFound
        ? 'banners 테이블이 데이터베이스에 없습니다. 마이그레이션을 실행해주세요: apps/sql/migrations/create_banners_table.sql'
        : error.message || '배너 조회 실패';
      
      return NextResponse.json(
        { 
          success: false,
          error: errorMessage, 
          details: error.details || error.message,
          code: error.code,
          hint: error.hint || (isTableNotFound ? 'Run migration: create_banners_table.sql' : undefined),
        },
        { status: 500 }
      );
    }

    console.log('✅ 배너 조회 성공:', { count: data?.length || 0 });

    return NextResponse.json({ success: true, data: data || [] });
  } catch (e: any) {
    console.error('❌ 배너 조회 오류:', {
      message: e.message,
      stack: e.stack,
    });
    return NextResponse.json({ 
      success: false,
      error: e.message || '배너 조회 중 오류가 발생했습니다.' 
    }, { status: 500 });
  }
}

// POST: 새 배너 생성
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;

    const body = await req.json();

    const payload = {
      title: body.title,
      button_text: body.button_text,
      background_color: body.background_color || '#2D3E50',
      background_image_url: body.background_image_url || null,
      display_order: body.display_order ?? 0,
      is_active: body.is_active ?? true,
      action_type: body.action_type || 'none',
      action_value: body.action_value || null,
    };

    const { data, error } = await supabaseAdmin
      .from("banners")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('❌ 배너 생성 실패:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      
      // 테이블이 없는 경우 명확한 메시지 제공
      const isTableNotFound = error.code === 'PGRST205' || 
                              error.message?.includes('schema cache') ||
                              error.message?.includes('not found');
      
      const errorMessage = isTableNotFound
        ? 'banners 테이블이 데이터베이스에 없습니다. 마이그레이션을 실행해주세요: apps/sql/migrations/create_banners_table.sql'
        : error.message || '배너 생성 실패';
      
      return NextResponse.json(
        { 
          success: false,
          error: errorMessage, 
          details: error.details || error.message,
          code: error.code,
          hint: error.hint || (isTableNotFound ? 'Run migration: create_banners_table.sql' : undefined),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    console.error('배너 생성 오류:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

