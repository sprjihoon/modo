import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const DIRECT_PRICING_FIELDS = [
  "price",
  "price_range",
  "requires_measurement",
  "input_count",
  "input_labels",
  "description",
  "sub_selection_label",
] as const;

/**
 * 카테고리 추가 API (관리자용)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, icon_name, display_order } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "카테고리명은 필수입니다" },
        { status: 400 }
      );
    }

    // 중복 체크
    const { data: existingCategory } = await supabaseAdmin
      .from("repair_categories")
      .select("id, name")
      .eq("name", name)
      .single();

    if (existingCategory) {
      return NextResponse.json(
        {
          success: false,
          error: `"${name}" 카테고리가 이미 존재합니다. 다른 이름을 사용해주세요.`,
        },
        { status: 400 }
      );
    }

    const insertPayload: Record<string, any> = {
      name,
      icon_name: icon_name || null,
      display_order: display_order || 999,
      parent_category_id: body.parent_category_id || null,
    };

    // 직접 가격/치수 필드 추가
    for (const field of DIRECT_PRICING_FIELDS) {
      if (field in body) {
        insertPayload[field] = body[field] ?? null;
      }
    }

    let { data, error } = await supabaseAdmin
      .from("repair_categories")
      .insert(insertPayload as unknown as { name: string })
      .select()
      .single();

    // DB에 컬럼이 없는 경우(마이그레이션 미적용) → 기본 필드만으로 재시도
    if (error && (error.code === "42703" || error.message?.includes("column"))) {
      console.warn("컬럼 누락, 기본 필드만으로 재시도:", error.message);
      const safePayload = {
        name,
        icon_name: icon_name || null,
        display_order: display_order || 999,
        parent_category_id: body.parent_category_id || null,
      };
      const retry = await supabaseAdmin
        .from("repair_categories")
        .insert(safePayload as unknown as { name: string })
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error("카테고리 추가 실패:", error);

      if (
        error.code === "23505" &&
        error.message.includes("repair_categories_name_key")
      ) {
        return NextResponse.json(
          {
            success: false,
            error: `"${name}" 카테고리가 이미 존재합니다. 다른 이름을 사용해주세요.`,
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error("API 에러:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * 카테고리 수정 API (관리자용)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, icon_name } = body;

    if (!id || !name) {
      return NextResponse.json(
        { success: false, error: "ID와 카테고리명은 필수입니다" },
        { status: 400 }
      );
    }

    const updatePayload: Record<string, any> = {
      name,
      icon_name: icon_name || null,
    };
    if ("parent_category_id" in body) {
      updatePayload.parent_category_id = body.parent_category_id || null;
    }

    // 직접 가격/치수 필드 업데이트
    for (const field of DIRECT_PRICING_FIELDS) {
      if (field in body) {
        updatePayload[field] = body[field] ?? null;
      }
    }

    let { data, error } = await supabaseAdmin
      .from("repair_categories")
      .update(updatePayload as unknown as { name: string })
      .eq("id", id)
      .select();

    // DB에 컬럼이 없는 경우(마이그레이션 미적용) → 기본 필드만으로 재시도
    if (error && (error.code === "42703" || error.message?.includes("column"))) {
      console.warn("컬럼 누락, 기본 필드만으로 재시도:", error.message);
      const safePayload: Record<string, any> = { name, icon_name: icon_name || null };
      if ("parent_category_id" in body) {
        safePayload.parent_category_id = body.parent_category_id || null;
      }
      const retry = await supabaseAdmin
        .from("repair_categories")
        .update(safePayload as unknown as { name: string })
        .eq("id", id)
        .select();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error("카테고리 수정 실패:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: data?.[0] || null });
  } catch (error: unknown) {
    console.error("API 에러:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * 카테고리 삭제 API (관리자용)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID는 필수입니다" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("repair_categories")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("카테고리 삭제 실패:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("API 에러:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
