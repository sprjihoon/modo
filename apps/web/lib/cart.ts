/**
 * 장바구니 — 크로스 디바이스 (Supabase cart_drafts 기반)
 *
 * 로그인 상태이면 Supabase 를 primary storage 로 사용한다.
 * 비로그인 / 서버 오류 시에는 localStorage 를 fallback 으로 유지한다.
 */
import { createClient } from "@/lib/supabase/client";
import {
  OrderDraft,
  ClothingItem,
  RepairItem,
  ImageWithPins,
} from "@/components/order/OrderNewClient";

export interface CartDraftItem {
  id: string;          // cart_drafts.id (서버 UUID) 또는 로컬 임시 ID
  savedAt: string;
  draft: OrderDraft;
}

const LOCAL_KEY = "modu_cart_drafts_v2";

// ── localStorage helpers ─────────────────────────────────────────────────

function localLoad(): CartDraftItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as CartDraftItem[]) : [];
  } catch {
    return [];
  }
}

/**
 * localStorage에 저장 + modu_cart_update 이벤트 발행.
 * 쓰기 작업(add/remove/clear) 에서만 호출한다.
 * fetchCartItems 의 서버→로컬 캐싱에는 localCache() 를 사용해
 * 이벤트 무한 루프를 방지한다.
 */
function localSave(items: CartDraftItem[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("modu_cart_update"));
  } catch { /* ignore */ }
}

/** 이벤트 없이 로컬 캐시만 갱신 (fetch 결과 캐싱 전용). */
function localCache(items: CartDraftItem[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
  } catch { /* ignore */ }
}

// ── 내부 헬퍼 ────────────────────────────────────────────────────────────

/**
 * Supabase 에 저장된 draft_data 를 신규 OrderDraft (items[]) 형태로 정규화한다.
 *
 * 지원하는 입력 포맷:
 * 1. 신규: items: ClothingItem[] (그대로 사용)
 * 2. 웹 단일: 최상위에 clothingType / repairItems / imagesWithPins
 * 3. 옛 모바일: 최상위에 repairItem 단일 맵
 */
function normalizeStoredDraft(raw: Record<string, unknown>): OrderDraft {
  const pickup: Partial<OrderDraft> = {
    pickupAddress: raw.pickupAddress as string | undefined,
    pickupAddressDetail: raw.pickupAddressDetail as string | undefined,
    pickupZipcode: raw.pickupZipcode as string | undefined,
    pickupPhone: raw.pickupPhone as string | undefined,
    pickupDate: raw.pickupDate as string | undefined,
    notes: raw.notes as string | undefined,
    deliveryAddress: raw.deliveryAddress as string | undefined,
    deliveryAddressDetail: raw.deliveryAddressDetail as string | undefined,
    deliveryZipcode: raw.deliveryZipcode as string | undefined,
    deliveryPhone: raw.deliveryPhone as string | undefined,
    agreedToExtraCharge: raw.agreedToExtraCharge as boolean | undefined,
    remoteAreaFee: raw.remoteAreaFee as number | undefined,
  };

  // 1. 신규 items[] 형식
  if (Array.isArray(raw.items)) {
    const items = (raw.items as unknown[]).map((it) => {
      const o = (it ?? {}) as Record<string, unknown>;
      const ci: ClothingItem = {
        clothingType: (o.clothingType as string) ?? "",
        clothingCategoryId: o.clothingCategoryId as string | undefined,
        repairItems: Array.isArray(o.repairItems)
          ? (o.repairItems as RepairItem[])
          : [],
        imagesWithPins: Array.isArray(o.imagesWithPins)
          ? (o.imagesWithPins as ImageWithPins[])
          : [],
      };
      return ci;
    });
    return { items, ...pickup };
  }

  // 2. 옛 모바일 단일 (repairItem)
  if (!Array.isArray(raw.repairItems) && raw.repairItem) {
    const ri = raw.repairItem as Record<string, unknown>;
    const single: ClothingItem = {
      clothingType: (raw.clothingType as string) ?? "",
      repairItems: [{
        name: (ri.repairPart as string) ?? (ri.name as string) ?? "",
        price: 0,
        priceRange: (ri.priceRange as string) ?? "",
        quantity: 1,
      }],
      imagesWithPins: [],
    };
    return { items: [single], ...pickup };
  }

  // 3. 옛 웹 단일 (최상위 clothingType / repairItems / imagesWithPins)
  const single: ClothingItem = {
    clothingType: (raw.clothingType as string) ?? "",
    clothingCategoryId: raw.clothingCategoryId as string | undefined,
    repairItems: Array.isArray(raw.repairItems)
      ? (raw.repairItems as RepairItem[])
      : [],
    imagesWithPins: Array.isArray(raw.imagesWithPins)
      ? (raw.imagesWithPins as ImageWithPins[])
      : [],
  };
  // 빈 단일이면 items: []
  const hasContent =
    single.clothingType ||
    single.repairItems.length > 0 ||
    single.imagesWithPins.length > 0;
  return { items: hasContent ? [single] : [], ...pickup };
}

async function resolveUserId(): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: row } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();
    return row?.id ?? null;
  } catch {
    return null;
  }
}

// ── 공개 API ─────────────────────────────────────────────────────────────

/** 장바구니 항목을 모두 불러온다 (서버 우선, fallback: localStorage). */
export async function fetchCartItems(): Promise<CartDraftItem[]> {
  try {
    const userId = await resolveUserId();
    if (!userId) return localLoad();

    const supabase = createClient();
    const { data, error } = await supabase
      .from("cart_drafts")
      .select("id, draft_data, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const items: CartDraftItem[] = (data ?? []).flatMap((row) => {
      try {
        const d = row.draft_data as Record<string, unknown>;
        if (!d) return [];
        const draft = normalizeStoredDraft(d);
        return [{ id: row.id as string, savedAt: row.created_at as string, draft }];
      } catch {
        return [];
      }
    });

    // 서버 데이터를 로컬에 캐싱 (이벤트 발행 없이 — 무한 루프 방지)
    localCache(items);
    return items;
  } catch {
    // 서버 오류 시 로컬 캐시 반환
    return localLoad();
  }
}

/** 항목 하나를 추가한다. */
export async function addCartItem(draft: OrderDraft): Promise<CartDraftItem> {
  const itemCount = draft.items?.length ?? 0;
  const repairCount = draft.items?.reduce((s, it) => s + (it.repairItems?.length ?? 0), 0) ?? 0;

  try {
    const userId = await resolveUserId();
    if (userId) {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("cart_drafts")
        .insert({ user_id: userId, draft_data: draft })
        .select("id, created_at")
        .single();
      if (error) throw error;
      const item: CartDraftItem = {
        id: data.id as string,
        savedAt: data.created_at as string,
        draft,
      };
      const cached = localLoad();
      localSave([item, ...cached]);
      // 추적
      import("@/lib/analytics").then(({ Analytics }) =>
        Analytics.cartAdd(item.id, itemCount, repairCount)
      );
      return item;
    }
  } catch { /* fallback to local */ }

  const item: CartDraftItem = {
    id: `cart_${Date.now()}`,
    savedAt: new Date().toISOString(),
    draft,
  };
  const items = localLoad();
  localSave([item, ...items]);
  import("@/lib/analytics").then(({ Analytics }) =>
    Analytics.cartAdd(item.id, itemCount, repairCount)
  );
  return item;
}

/** 항목 하나를 삭제한다. */
export async function removeCartItem(id: string): Promise<void> {
  import("@/lib/analytics").then(({ Analytics }) => Analytics.cartRemove(id));
  try {
    const userId = await resolveUserId();
    if (userId) {
      const supabase = createClient();
      await supabase.from("cart_drafts").delete().eq("id", id);
    }
  } catch { /* fallback: 로컬만 삭제 */ }

  const items = localLoad().filter((i) => i.id !== id);
  localSave(items);
}

/** 장바구니 전체 비우기. */
export async function clearCartItems(): Promise<void> {
  try {
    const userId = await resolveUserId();
    if (userId) {
      const supabase = createClient();
      await supabase
        .from("cart_drafts")
        .delete()
        .eq("user_id", userId);
    }
  } catch { /* fallback */ }
  localSave([]);
}

/** 로컬 캐시 기반 즉시 카운트 (동기, SSR-safe). */
export function getCartCount(): number {
  return localLoad().length;
}

// 하위 호환: 동기 getCartItems (로컬 캐시 반환)
export function getCartItems(): CartDraftItem[] {
  return localLoad();
}
