export const CART_TTL_DAYS = 5;

export function isCartExpired(savedAt: string | Date | null | undefined, now = new Date()): boolean {
  if (!savedAt) return false;
  const t = savedAt instanceof Date ? savedAt.getTime() : Date.parse(String(savedAt));
  if (Number.isNaN(t)) return false;
  return now.getTime() - t >= CART_TTL_DAYS * 24 * 60 * 60 * 1000;
}

export function partitionExpiredCart<T>(
  items: T[],
  savedAt: (item: T) => string | Date | null | undefined,
  now = new Date(),
): { keep: T[]; expired: T[] } {
  const keep: T[] = [];
  const expired: T[] = [];
  for (const item of items) {
    (isCartExpired(savedAt(item), now) ? expired : keep).push(item);
  }
  return { keep, expired };
}
