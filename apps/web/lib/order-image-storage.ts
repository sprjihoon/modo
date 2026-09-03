import { createClient } from "@/lib/supabase/client";

export const ORDER_IMAGE_BUCKET = "order-images";

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

export function collectOrderImageUrls(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") {
    if (orderImagePathFromUrl(value)) out.push(value);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectOrderImageUrls(item, out);
    return out;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) {
      collectOrderImageUrls(item, out);
    }
  }
  return out;
}

export async function deleteOrderImages(urls: Iterable<string>): Promise<void> {
  const paths = [...new Set(
    [...urls].map((url) => orderImagePathFromUrl(url)).filter((p): p is string => !!p),
  )];
  if (paths.length === 0) return;
  try {
    const supabase = createClient();
    const { error } = await supabase.storage.from(ORDER_IMAGE_BUCKET).remove(paths);
    if (error) console.warn("[order-images] delete failed", error.message);
  } catch (e) {
    console.warn("[order-images] delete failed", e);
  }
}
