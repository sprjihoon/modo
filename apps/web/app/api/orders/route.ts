import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function fetchOrdersByFilter(
  supabase: ReturnType<typeof createClient>,
  filter?: { column: string; value: string }
) {
  const cols = "id, status, extra_charge_status, item_name, clothing_type, total_price, created_at, pickup_date";
  const colsFallback = "id, status, extra_charge_status, item_name, clothing_type, total_price, created_at";

  const buildQuery = (selectCols: string) => {
    let q = supabase.from("orders").select(selectCols).order("created_at", { ascending: false });
    if (filter) q = q.eq(filter.column, filter.value) as typeof q;
    return q;
  };

  const { data, error } = await buildQuery(cols);
  if (error) {
    const { data: fallback } = await buildQuery(colsFallback);
    return (fallback ?? []) as unknown as Record<string, unknown>[];
  }
  return (data ?? []) as unknown as Record<string, unknown>[];
}

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 1차: users 테이블에서 내부 ID 조회 후 user_id로 필터
    const { data: userRow } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();

    let rows: Record<string, unknown>[] = [];

    if (userRow?.id) {
      rows = await fetchOrdersByFilter(supabase, { column: "user_id", value: userRow.id as string });
    }

    // 2차: auth.uid()를 user_id로 직접 조회 (구버전 모바일 데이터)
    if (rows.length === 0) {
      rows = await fetchOrdersByFilter(supabase, { column: "user_id", value: user.id });
    }

    // 3차: RLS에 의존한 전체 조회
    if (rows.length === 0) {
      rows = await fetchOrdersByFilter(supabase);
    }

    // 중복 제거 및 정렬
    const unique = Array.from(new Map(rows.map((o) => [o.id, o])).values());
    unique.sort((a, b) =>
      new Date((b.created_at as string) ?? 0).getTime() - new Date((a.created_at as string) ?? 0).getTime()
    );

    return NextResponse.json({ orders: unique });
  } catch (e) {
    console.error("Orders GET error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      clothingType,
      clothingCategoryId,
      repairItems,
      imagesWithPins,
      pickupAddress,
      pickupAddressDetail,
      pickupDate,
      memo,
    } = body;

    // users 테이블에서 user.id 조회
    const { data: userRow } = await supabase
      .from("users")
      .select("id, name, phone")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (!userRow) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 수선 항목 이름 합치기
    const itemName =
      repairItems?.map((i: { name: string }) => i.name).join(", ") ||
      clothingType;

    // total_price 계산 (수량 × 단가 합산)
    const totalPrice = (repairItems as Array<{ price?: number; quantity?: number }> ?? []).reduce(
      (sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 1),
      0
    );

    // 주문 생성 (결제 필요 여부에 따라 status 분기)
    const initialStatus = totalPrice > 0 ? "PENDING_PAYMENT" : "BOOKED";

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        user_id: userRow.id,
        status: initialStatus,
        item_name: itemName,
        clothing_type: clothingType,
        category_id: clothingCategoryId || null,
        repair_items: repairItems || [],
        images_with_pins: imagesWithPins && imagesWithPins.length > 0 ? imagesWithPins : null,
        images: imagesWithPins && imagesWithPins.length > 0
          ? { urls: imagesWithPins.map((i: { imageUrl: string }) => i.imageUrl) }
          : null,
        pickup_address: pickupAddress,
        pickup_address_detail: pickupAddressDetail || null,
        pickup_date: pickupDate || null,
        memo: memo || null,
        total_price: totalPrice,
        customer_name: userRow.name || null,
        pickup_phone: userRow.phone || null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Order creation error:", error);
      return NextResponse.json(
        { error: "Failed to create order" },
        { status: 500 }
      );
    }

    return NextResponse.json({ orderId: order.id, totalPrice });
  } catch (e) {
    console.error("Unexpected error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
