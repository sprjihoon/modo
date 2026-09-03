import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import {
  ORDER_IMAGE_BUCKET,
  classifyOrderImage,
  collectOrderImagePaths,
  selectOrderImagesToDelete,
  summarizeOrderImages,
  type ClassifiedOrderImage,
  type OrderImageRef,
  type StoredOrderImage,
} from "./order-image-storage";

type Admin = SupabaseClient<Database>;

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

export async function listOrderImageFiles(admin: Admin): Promise<StoredOrderImage[]> {
  const files: StoredOrderImage[] = [];

  async function walk(prefix: string) {
    let offset = 0;
    while (true) {
      const { data, error } = await admin.storage.from(ORDER_IMAGE_BUCKET).list(prefix, {
        limit: 100,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
      if (error || !data?.length) break;
      for (const item of data) {
        const path = prefix ? `${prefix}/${item.name}` : item.name;
        if (!item.id) {
          await walk(path);
          continue;
        }
        files.push({
          path,
          createdAt: item.created_at ? new Date(item.created_at) : new Date(),
        });
      }
      if (data.length < 100) break;
      offset += data.length;
    }
  }

  await walk("");
  return files;
}

export async function loadOrderImageRefs(admin: Admin): Promise<OrderImageRef[]> {
  const refs: OrderImageRef[] = [];

  const orders = await fetchAllRows<{
    images: unknown;
    images_with_pins: unknown;
    created_at: string;
  }>((from, to) =>
    admin.from("orders").select("images, images_with_pins, created_at").range(from, to),
  );
  for (const row of orders) {
    const boundAt = new Date(row.created_at);
    for (const path of collectOrderImagePaths([row.images, row.images_with_pins])) {
      refs.push({ path, kind: "order", boundAt });
    }
  }

  const carts = await fetchAllRows<{ draft_data: unknown; created_at: string }>((from, to) =>
    admin.from("cart_drafts").select("draft_data, created_at").range(from, to),
  );
  for (const row of carts) {
    const boundAt = new Date(row.created_at);
    for (const path of collectOrderImagePaths(row.draft_data)) {
      refs.push({ path, kind: "cart", boundAt });
    }
  }

  const intents = await fetchAllRows<{
    payload: unknown;
    created_at: string;
    consumed_at: string | null;
  }>((from, to) =>
    admin
      .from("payment_intents")
      .select("payload, created_at, consumed_at")
      .is("consumed_at", null)
      .range(from, to),
  );
  for (const row of intents) {
    const boundAt = new Date(row.created_at);
    for (const path of collectOrderImagePaths(row.payload)) {
      refs.push({ path, kind: "intent", boundAt });
    }
  }

  return refs;
}

export async function classifyStoredOrderImages(admin: Admin) {
  const [files, refs] = await Promise.all([listOrderImageFiles(admin), loadOrderImageRefs(admin)]);
  const classified = files.map((file) => classifyOrderImage(file, refs));
  return { files: classified, summary: summarizeOrderImages(classified) };
}

export async function cleanupOrderImages(
  admin: Admin,
  action: "orphans" | "expired" | "run",
) {
  const { files, summary } = await classifyStoredOrderImages(admin);
  const targets = selectOrderImagesToDelete(files, action);
  const paths = targets.map((f) => f.path);
  let deleted = 0;
  for (let i = 0; i < paths.length; i += 50) {
    const chunk = paths.slice(i, i + 50);
    const { error } = await admin.storage.from(ORDER_IMAGE_BUCKET).remove(chunk);
    if (!error) deleted += chunk.length;
    else console.error("[order-images] remove failed", error.message, chunk);
  }
  return {
    action,
    summary,
    deleted,
    deletedKinds: {
      orphans: targets.filter((f) => f.kind === "orphan").length,
      expiredBound: targets.filter((f) => f.kind !== "orphan").length,
    },
  };
}

export type { ClassifiedOrderImage };
