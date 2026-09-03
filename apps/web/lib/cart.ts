/**
 * 장바구니 — 크로스 디바이스 (Supabase cart_drafts 기반)
 *
 * 로그인 상태이면 Supabase 를 primary storage 로 사용한다.
 * 비로그인 / 서버 오류 시에는 localStorage 를 fallback 으로 유지한다.
 */
import { createClient } from "@/lib/supabase/client";
import { OrderDraft } from "@/components/order/OrderNewClient";
import { normalizeStoredDraft } from "./normalize-cart-draft";
import { collectOrderImageUrls, deleteOrderImages } from "./order-image-storage";
import { partitionExpiredCart } from "./cart-expiry";

export { CART_TTL_DAYS, isCartExpired } from "./cart-expiry";

export { normalizeStoredDraft } from "./normalize-cart-draft";

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

async function dropExpiredCartItems(
  items: CartDraftItem[],
  removeServerIds?: (ids: string[]) => Promise<void>,
): Promise<CartDraftItem[]> {
  const { keep, expired } = partitionExpiredCart(items, (item) => item.savedAt);
  if (expired.length === 0) return items;

  if (removeServerIds) {
    const ids = expired
      .map((item) => item.id)
      .filter((id) => !id.startsWith("cart_"));
    if (ids.length > 0) {
      try {
        await removeServerIds(ids);
      } catch { /* 로컬만이라도 비운다 */ }
    }
  }

  const remainingUrls = new Set(keep.flatMap((item) => collectOrderImageUrls(item.draft)));
  const toDelete = expired
    .flatMap((item) => collectOrderImageUrls(item.draft))
    .filter((url) => !remainingUrls.has(url));
  await deleteOrderImages(toDelete);
  return keep;
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
    if (!userId) {
      const local = localLoad();
      const kept = await dropExpiredCartItems(local);
      if (kept.length !== local.length) localSave(kept);
      else localCache(kept);
      return kept;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from("cart_drafts")
      .select("id, draft_data, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const loaded: CartDraftItem[] = (data ?? []).flatMap((row) => {
      try {
        const d = row.draft_data as Record<string, unknown>;
        if (!d) return [];
        const draft = normalizeStoredDraft(d);
        return [{ id: row.id as string, savedAt: row.created_at as string, draft }];
      } catch {
        return [];
      }
    });

    const items = await dropExpiredCartItems(loaded, async (ids) => {
      await supabase.from("cart_drafts").delete().in("id", ids);
    });

    // 서버 데이터를 로컬에 캐싱 (이벤트 발행 없이 — 무한 루프 방지)
    localCache(items);
    return items;
  } catch {
    // 서버 오류 시 로컬 캐시 반환
    const kept = await dropExpiredCartItems(localLoad());
    localCache(kept);
    return kept;
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

/** 항목 하나를 삭제한다. 결제/재저장으로 옮길 때는 deletePhotos: false. */
export async function removeCartItem(
  id: string,
  options?: { deletePhotos?: boolean },
): Promise<void> {
  const deletePhotos = options?.deletePhotos !== false;
  import("@/lib/analytics").then(({ Analytics }) => Analytics.cartRemove(id));
  const leaving = localLoad().find((i) => i.id === id);
  try {
    const userId = await resolveUserId();
    if (userId) {
      const supabase = createClient();
      await supabase.from("cart_drafts").delete().eq("id", id);
    }
  } catch { /* fallback: 로컬만 삭제 */ }

  const items = localLoad().filter((i) => i.id !== id);
  localSave(items);
  if (deletePhotos && leaving) {
    const remainingUrls = new Set(items.flatMap((i) => collectOrderImageUrls(i.draft)));
    const toDelete = collectOrderImageUrls(leaving.draft).filter((url) => !remainingUrls.has(url));
    await deleteOrderImages(toDelete);
  }
}

/** 장바구니 전체 비우기. */
export async function clearCartItems(): Promise<void> {
  const leaving = localLoad();
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
  await deleteOrderImages(leaving.flatMap((i) => collectOrderImageUrls(i.draft)));
}

/** 로컬 캐시 기반 즉시 카운트 (동기, SSR-safe). */
export function getCartCount(): number {
  return getCartItems().length;
}

// 하위 호환: 동기 getCartItems (로컬 캐시 반환)
export function getCartItems(): CartDraftItem[] {
  return partitionExpiredCart(localLoad(), (item) => item.savedAt).keep;
}
