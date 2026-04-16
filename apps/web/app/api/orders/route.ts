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
      repairItems,
      imagesWithPins,
      pickupAddress,
      pickupAddressDetail,
      pickupZipcode,
      pickupDate,
      notes,
      deliveryAddress,
      deliveryAddressDetail,
      deliveryZipcode,
      agreedToExtraCharge,
    } = body;

    if (!agreedToExtraCharge) {
      return NextResponse.json({ error: "추가 결제 동의가 필요합니다." }, { status: 400 });
    }

    // users 테이블에서 user.id 조회
    const { data: userRow } = await supabase
      .from("users")
      .select("id, name, phone, email")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (!userRow) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    type RepairItem = { name: string; price?: number; quantity?: number };
    const repairArr: RepairItem[] = repairItems || [];

    // 수선 항목 이름 합치기
    const itemName =
      repairArr.map((i) => i.name).join(", ") || clothingType || "수선";

    // repair_type: 첫 번째 수선 항목 이름 (모바일 앱과 동일)
    const repairType = repairArr[0]?.name || "기타";

    // total_price 계산 (수량 × 단가 합산)
    const totalPrice = repairArr.reduce(
      (sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 1),
      0
    );

    const initialStatus = totalPrice > 0 ? "PENDING_PAYMENT" : "BOOKED";
    const orderNumber = `ORD${Date.now()}`;
    const finalDeliveryAddress = deliveryAddress || pickupAddress;
    const finalDeliveryAddressDetail = deliveryAddressDetail || pickupAddressDetail || null;
    const phone = userRow.phone || "010-0000-0000";

    // 필수 컬럼만 base insert (NOT NULL 컬럼)
    let insertData: Record<string, unknown> = {
      user_id: userRow.id,
      status: initialStatus,
      item_name: itemName,
      clothing_type: clothingType || "기타",
      repair_type: repairType,
      pickup_address: pickupAddress,
      total_price: totalPrice,
      customer_name: userRow.name || "고객",
      pickup_phone: phone,
    };

    const finalDeliveryZipcode = deliveryZipcode || pickupZipcode || null;

    // 선택적 컬럼 목록 (DB에 없을 수 있음 → PGRST204 오류 시 자동 제거)
    const optionalFields: Record<string, unknown> = {
      order_number: orderNumber,
      base_price: totalPrice,
      customer_email: userRow.email || user.email || null,
      customer_phone: phone,
      delivery_address: finalDeliveryAddress,
      delivery_address_detail: finalDeliveryAddressDetail,
      delivery_phone: phone,
      pickup_address_detail: pickupAddressDetail || null,
      pickup_zipcode: pickupZipcode || null,
      delivery_zipcode: finalDeliveryZipcode,
      pickup_date: pickupDate || null,
      notes: notes || null,
      repair_parts: repairArr.length > 0 ? repairArr : null,
      images_with_pins: imagesWithPins && imagesWithPins.length > 0 ? imagesWithPins : null,
      images: imagesWithPins && imagesWithPins.length > 0
        ? { urls: imagesWithPins.map((i: { imageUrl: string }) => i.imageUrl) }
        : null,
    };

    // 선택적 컬럼을 포함해서 시도, PGRST204 오류 시 해당 컬럼 제거 후 재시도
    insertData = { ...insertData, ...optionalFields };
    let order: { id: string } | null = null;
    let error: { code?: string; message?: string } | null = null;

    for (let attempt = 0; attempt < 10; attempt++) {
      const result = await supabase.from("orders").insert(insertData).select("id").single();
      order = result.data as { id: string } | null;
      error = result.error as { code?: string; message?: string } | null;

      if (!error) break;

      if (error.code === "PGRST204" && error.message) {
        // 오류 메시지에서 컬럼명 추출 후 제거
        const match = error.message.match(/Could not find the '(.+?)' column/);
        if (match?.[1]) {
          const badCol = match[1];
          console.warn(`컬럼 '${badCol}' 없음, 제거 후 재시도`);
          delete insertData[badCol];
          continue;
        }
      }
      break; // PGRST204 외 다른 에러는 바로 중단
    }

    if (error || !order) {
      console.error("Order creation error:", error);
      return NextResponse.json(
        { error: "Failed to create order" },
        { status: 500 }
      );
    }

    // 0원 주문은 바로 수거 예약 호출 (결제 불필요)
    if (totalPrice === 0 && userRow.name && pickupAddress) {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
        if (supabaseUrl && serviceRoleKey) {
          const bookRes = await fetch(`${supabaseUrl}/functions/v1/shipments-book`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceRoleKey}`,
              apikey: serviceRoleKey,
            },
            body: JSON.stringify({
              order_id: order.id,
              customer_name: userRow.name,
            }),
          });
          const bookData = await bookRes.json();
          if (!bookRes.ok) {
            console.error("수거 예약 실패:", bookData);
          } else {
            console.log("수거 예약 완료:", bookData?.data?.tracking_no);
          }
        }
      } catch (bookError) {
        console.error("수거 예약 호출 오류 (무시):", bookError);
      }
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
