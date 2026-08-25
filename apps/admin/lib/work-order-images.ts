import type { WorkOrderImage, WorkOrderPin } from "@/components/ops/work-order-sheet";

function toCoord(value: unknown, fallback = 0.5): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  if (n > 1 && n <= 100) return n / 100;
  return n;
}

function imageUrlFrom(raw: Record<string, unknown> | null | undefined): string {
  if (!raw) return "";
  const url =
    raw.imageUrl ??
    raw.imagePath ??
    raw.url ??
    raw.image_url ??
    raw.path;
  return typeof url === "string" ? url : "";
}

function parsePins(raw: unknown): WorkOrderPin[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((pin) => {
    const p = (pin ?? {}) as Record<string, unknown>;
    return {
      x: toCoord(p.relative_x ?? p.x ?? p.relX),
      y: toCoord(p.relative_y ?? p.y ?? p.relY),
      memo: String(p.memo ?? p.note ?? p.text ?? ""),
    };
  });
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function parseWorkOrderImages(order: {
  images_with_pins?: unknown;
  images?: unknown;
  image_urls?: unknown;
} | null | undefined): WorkOrderImage[] {
  if (!order) return [];

  const pinned = asArray(order.images_with_pins)
    .map((item) => {
      const img = (item ?? {}) as Record<string, unknown>;
      return {
        url: imageUrlFrom(img),
        pins: parsePins(img.pins),
      };
    })
    .filter((img) => img.url);

  if (pinned.length > 0) return pinned;

  const urls: string[] = [];
  const images = order.images;
  if (images && typeof images === "object" && !Array.isArray(images)) {
    const nested = (images as { urls?: unknown }).urls;
    if (Array.isArray(nested)) {
      urls.push(...nested.filter((u): u is string => typeof u === "string"));
    }
  } else if (Array.isArray(images)) {
    urls.push(...images.filter((u): u is string => typeof u === "string"));
  }
  if (Array.isArray(order.image_urls)) {
    urls.push(...order.image_urls.filter((u): u is string => typeof u === "string"));
  }

  return [...new Set(urls)].map((url) => ({ url, pins: [] }));
}

export function customerRequestSummary(order: {
  notes?: string | null;
  repair_detail?: string | null;
  item_description?: string | null;
  item_name?: string | null;
} | null | undefined): string {
  if (!order) return "수선 요청 정보 없음";
  const parts = [order.notes, order.repair_detail, order.item_description]
    .map((s) => (s ?? "").trim())
    .filter(Boolean);
  if (parts.length > 0) return [...new Set(parts)].join("\n");
  return order.item_name || "수선 요청 정보 없음";
}
