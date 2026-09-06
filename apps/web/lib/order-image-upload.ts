export const MAX_ORDER_IMAGES = 5;
export const MAX_PINS_PER_IMAGE = 5;
export const MAX_ORDER_IMAGE_BYTES = 10 * 1024 * 1024;

const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"]);

export function orderImageExtension(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (!ext || ext === name.toLowerCase()) return "jpg";
  return ALLOWED_EXT.has(ext) ? ext : "jpg";
}

export function isAllowedOrderImageFile(file: {
  type?: string;
  name: string;
  size: number;
}): boolean {
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_ORDER_IMAGE_BYTES) {
    return false;
  }
  if (file.type && file.type.startsWith("image/")) return true;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return ALLOWED_EXT.has(ext);
}

export function planOrderImageUpload<T extends { type?: string; name: string; size: number }>(
  files: T[],
  currentCount: number,
  reservedCount = 0,
  max = MAX_ORDER_IMAGES,
): {
  accepted: T[];
  rejectedType: number;
  rejectedExtra: number;
  remainingSlots: number;
} {
  const remainingSlots = Math.max(0, max - currentCount - reservedCount);
  const valid = files.filter(isAllowedOrderImageFile);
  const rejectedType = files.length - valid.length;
  if (remainingSlots <= 0) {
    return { accepted: [], rejectedType, rejectedExtra: valid.length, remainingSlots: 0 };
  }
  return {
    accepted: valid.slice(0, remainingSlots),
    rejectedType,
    rejectedExtra: Math.max(0, valid.length - remainingSlots),
    remainingSlots,
  };
}

export function imageUrlsNotIn(current: Iterable<string>, kept: Iterable<string>): string[] {
  const keep = new Set(kept);
  return [...current].filter((url) => url && !keep.has(url));
}
