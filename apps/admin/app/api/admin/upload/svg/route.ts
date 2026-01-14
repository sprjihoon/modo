import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * SVG 파일 업로드 API (관리자용)
 * Supabase Storage에 업로드하고 public URL 반환
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'category-icons';

    if (!file) {
      return NextResponse.json(
        { success: false, error: '파일이 필요합니다' },
        { status: 400 }
      );
    }

    // SVG 파일 검증
    if (!file.type.includes('svg') && !file.name.endsWith('.svg')) {
      return NextResponse.json(
        { success: false, error: 'SVG 파일만 업로드 가능합니다' },
        { status: 400 }
      );
    }

    // 파일 크기 제한 (1MB)
    if (file.size > 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: '파일 크기는 1MB 이하여야 합니다' },
        { status: 400 }
      );
    }

    // Supabase 클라이언트 생성 (Service Role Key로 RLS 우회)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    // Service Role Key가 있으면 사용 (RLS 우회), 없으면 anon key
    const supabase = createClient(
      supabaseUrl, 
      serviceRoleKey || anonKey,
      serviceRoleKey ? { auth: { autoRefreshToken: false, persistSession: false } } : undefined
    );

    // 파일명 생성 (중복 방지)
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${folder}/${timestamp}_${safeName}`;

    // 파일을 ArrayBuffer로 변환
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Supabase Storage에 업로드
    const { data, error } = await supabase.storage
      .from('icons')
      .upload(fileName, buffer, {
        contentType: 'image/svg+xml',
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Storage 업로드 실패:', error);
      return NextResponse.json(
        { success: false, error: `업로드 실패: ${error.message}` },
        { status: 500 }
      );
    }

    // Public URL 생성
    const { data: publicUrlData } = supabase.storage
      .from('icons')
      .getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      data: {
        path: data.path,
        url: publicUrlData.publicUrl,
        fileName: safeName,
      }
    });
  } catch (error: any) {
    console.error('SVG 업로드 API 에러:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

