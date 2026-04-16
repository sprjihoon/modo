import { OrderDraft } from "@/components/order/OrderNewClient";

export interface CartDraftItem {
  id: string;
  savedAt: string;
  draft: OrderDraft;
}

const CART_KEY = "modu_cart_drafts";

function load(): CartDraftItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? (JSON.parse(raw) as CartDraftItem[]) : [];
  } catch {
    return [];
  }
}

function save(items: CartDraftItem[]) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch { /* ignore */ }
}

export function getCartItems(): CartDraftItem[] {
  return load();
}

export function addCartItem(draft: OrderDraft): CartDraftItem {
  const items = load();
  const item: CartDraftItem = {
    id: `cart_${Date.now()}`,
    savedAt: new Date().toISOString(),
    draft,
  };
  save([item, ...items]);
  return item;
}

export function removeCartItem(id: string) {
  const items = load().filter((i) => i.id !== id);
  save(items);
}

export function clearCartItems() {
  save([]);
}

export function getCartCount(): number {
  return load().length;
}
