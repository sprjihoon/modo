import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { ORDER_IMAGE_BUCKET, collectOrderImagePaths } from "./order-image-storage";

type Admin = SupabaseClient<Database>;

export const CART_TTL_DAYS = 5;

export function cartExpireCutoff(now = new Date()): Date {
  return new Date(now.getTime() - CART_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export function isCartDraftExpired(createdAt: string | Date, now = new Date()): boolean {
  const t = createdAt instanceof Date ? createdAt.getTime() : Date.parse(createdAt);
  if (Number.isNaN(t)) return false;
  return t <= cartExpireCutoff(now).getTime();
}

async function fetchAllRows<T>(
  query: (from: number, to: number) => PromiseLike<{ data: T[] | null }>,
  pageSize = 500,
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;
  while (true) {
    const { data } = await query(from, from + pageSize - 1);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

export async function expireAbandonedCarts(admin: Admin, now = new Date()) {
  const cutoff = cartExpireCutoff(now).toISOString();
  const rows = await fetchAllRows<{
    id: string;
    draft_data: unknown;
    created_at: string;
  }>((from, to) =>
    admin
      .from("cart_drafts")
      .select("id, draft_data, created_at")
      .lte("created_at", cutoff)
      .range(from, to),
  );

  const keepRows = await fetchAllRows<{ draft_data: unknown }>((from, to) =>
    admin
      .from("cart_drafts")
      .select("draft_data")
      .gt("created_at", cutoff)
      .range(from, to),
  );

  const keepPaths = new Set<string>();
  for (const row of keepRows) {
    for (const path of collectOrderImagePaths(row.draft_data)) keepPaths.add(path);
  }

  const photoPaths = [...new Set(
    rows.flatMap((row) => [...collectOrderImagePaths(row.draft_data)]).filter((path) => !keepPaths.has(path)),
  )];

  let photosDeleted = 0;
  for (let i = 0; i < photoPaths.length; i += 50) {
    const chunk = photoPaths.slice(i, i + 50);
    const { error } = await admin.storage.from(ORDER_IMAGE_BUCKET).remove(chunk);
    if (!error) photosDeleted += chunk.length;
    else console.error("[cart-drafts] photo remove failed", error.message, chunk);
  }

  let deleted = 0;
  const ids = rows.map((row) => row.id);
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const { error } = await admin.from("cart_drafts").delete().in("id", chunk);
    if (!error) deleted += chunk.length;
    else console.error("[cart-drafts] delete failed", error.message, chunk);
  }

  return { cutoff, scanned: rows.length, deleted, photosDeleted };
}
