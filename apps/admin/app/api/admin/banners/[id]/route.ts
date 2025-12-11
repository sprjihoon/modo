import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

// GET: 배너 상세 조회
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await Promise.resolve(params);

    const { data, error } = await supabaseAdmin
      .from("banners")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error('❌ 배너 조회 실패:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      
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

    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    console.error('배너 조회 오류:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT: 배너 수정
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await Promise.resolve(params);
    const body = await req.json();

    const payload: any = {
      updated_at: new Date().toISOString(),
    };

    if (body.title !== undefined) payload.title = body.title;
    if (body.button_text !== undefined) payload.button_text = body.button_text;
    if (body.background_color !== undefined) payload.background_color = body.background_color;
    if (body.background_image_url !== undefined) payload.background_image_url = body.background_image_url;
    if (body.display_order !== undefined) payload.display_order = body.display_order;
    if (body.is_active !== undefined) payload.is_active = body.is_active;
    if (body.action_type !== undefined) payload.action_type = body.action_type;
    if (body.action_value !== undefined) payload.action_value = body.action_value;

    const { data, error } = await supabaseAdmin
      .from("banners")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error('❌ 배너 수정 실패:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      
      const isTableNotFound = error.code === 'PGRST205' || 
                              error.message?.includes('schema cache') ||
                              error.message?.includes('not found');
      
      const errorMessage = isTableNotFound
        ? 'banners 테이블이 데이터베이스에 없습니다. 마이그레이션을 실행해주세요: apps/sql/migrations/create_banners_table.sql'
        : error.message || '배너 수정 실패';
      
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
    console.error('배너 수정 오류:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE: 배너 삭제
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await Promise.resolve(params);

    const { error } = await supabaseAdmin
      .from("banners")
      .delete()
      .eq("id", id);

    if (error) {
      console.error('❌ 배너 삭제 실패:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      
      const isTableNotFound = error.code === 'PGRST205' || 
                              error.message?.includes('schema cache') ||
                              error.message?.includes('not found');
      
      const errorMessage = isTableNotFound
        ? 'banners 테이블이 데이터베이스에 없습니다. 마이그레이션을 실행해주세요: apps/sql/migrations/create_banners_table.sql'
        : error.message || '배너 삭제 실패';
      
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

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('배너 삭제 오류:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

