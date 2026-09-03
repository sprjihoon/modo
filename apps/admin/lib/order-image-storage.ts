export const ORDER_IMAGE_BUCKET = "order-images";
export const ORDER_PHOTO_TTL_DAYS = 60;
export const ORPHAN_PHOTO_TTL_DAYS = 7;

export type OrderImageKind = "order" | "cart" | "intent" | "orphan";

export type StoredOrderImage = {
  path: string;
  createdAt: Date;
};

export type OrderImageRef = {
  path: string;
  kind: Exclude<OrderImageKind, "orphan">;
  boundAt: Date;
};

export type ClassifiedOrderImage = {
  path: string;
  kind: OrderImageKind;
  createdAt: Date;
  boundAt: Date | null;
  deleteAfter: Date | null;
  expired: boolean;
};

export function orderImagePathFromUrl(url: string, bucket = ORDER_IMAGE_BUCKET): string | null {
  const raw = (url || "").trim();
  if (!raw) return null;

  const markers = [
    `/object/public/${bucket}/`,
    `/object/sign/${bucket}/`,
    `/object/authenticated/${bucket}/`,
  ];
  for (const marker of markers) {
    const idx = raw.indexOf(marker);
    if (idx >= 0) {
      const rest = raw.slice(idx + marker.length).split("?")[0];
      try {
        return decodeURIComponent(rest);
      } catch {
        return rest;
      }
    }
  }

  if (!raw.startsWith("http") && (raw.startsWith("repairs/") || raw.startsWith("orders/"))) {
    return raw.split("?")[0];
  }
  return null;
}

export function collectOrderImagePaths(value: unknown, out = new Set<string>()): Set<string> {
  if (typeof value === "string") {
    const path = orderImagePathFromUrl(value);
    if (path) out.add(path);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectOrderImagePaths(item, out);
    return out;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) {
      collectOrderImagePaths(item, out);
    }
  }
  return out;
}

export function daysAgo(days: number, now = new Date()): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

export function classifyOrderImage(
  file: StoredOrderImage,
  refs: OrderImageRef[],
  now = new Date(),
): ClassifiedOrderImage {
  const matches = refs.filter((ref) => ref.path === file.path);
  const orderRef = newest(matches.filter((r) => r.kind === "order"));
  const cartRef = newest(matches.filter((r) => r.kind === "cart"));
  const intentRef = newest(matches.filter((r) => r.kind === "intent"));

  if (orderRef) {
    const deleteAfter = addDays(orderRef.boundAt, ORDER_PHOTO_TTL_DAYS);
    return {
      path: file.path,
      kind: "order",
      createdAt: file.createdAt,
      boundAt: orderRef.boundAt,
      deleteAfter,
      expired: deleteAfter.getTime() <= now.getTime(),
    };
  }

  if (cartRef || intentRef) {
    const bound = newest([cartRef, intentRef].filter(Boolean) as OrderImageRef[])!;
    const deleteAfter = addDays(bound.boundAt, ORDER_PHOTO_TTL_DAYS);
    return {
      path: file.path,
      kind: bound.kind,
      createdAt: file.createdAt,
      boundAt: bound.boundAt,
      deleteAfter,
      expired: deleteAfter.getTime() <= now.getTime(),
    };
  }

  const deleteAfter = addDays(file.createdAt, ORPHAN_PHOTO_TTL_DAYS);
  return {
    path: file.path,
    kind: "orphan",
    createdAt: file.createdAt,
    boundAt: null,
    deleteAfter,
    expired: deleteAfter.getTime() <= now.getTime(),
  };
}

function newest(refs: OrderImageRef[]): OrderImageRef | null {
  if (refs.length === 0) return null;
  return refs.reduce((a, b) => (a.boundAt.getTime() >= b.boundAt.getTime() ? a : b));
}

export function selectOrderImagesToDelete(
  files: ClassifiedOrderImage[],
  action: "orphans" | "expired" | "run",
): ClassifiedOrderImage[] {
  if (action === "orphans") return files.filter((f) => f.kind === "orphan");
  if (action === "expired") {
    return files.filter((f) => f.kind !== "orphan" && f.expired);
  }
  return files.filter((f) => f.expired);
}

export function summarizeOrderImages(files: ClassifiedOrderImage[]) {
  return {
    total: files.length,
    orderBound: files.filter((f) => f.kind === "order").length,
    cartBound: files.filter((f) => f.kind === "cart" || f.kind === "intent").length,
    orphans: files.filter((f) => f.kind === "orphan").length,
    expiredBound: files.filter((f) => f.kind !== "orphan" && f.expired).length,
    expiredOrphans: files.filter((f) => f.kind === "orphan" && f.expired).length,
  };
}
