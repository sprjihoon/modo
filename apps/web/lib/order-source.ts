export type OrderSource = "web" | "app" | "ios" | "android";

export function normalizeOrderSource(raw: unknown): OrderSource | null {
  const value = String(raw ?? "").toLowerCase().trim();
  if (value === "web" || value === "app" || value === "ios" || value === "android") {
    return value;
  }
  return null;
}

export function orderSourceFromPayload(
  payload: Record<string, unknown> | null | undefined,
): OrderSource | null {
  if (!payload) return null;
  return normalizeOrderSource(payload.orderSource ?? payload.order_source);
}
