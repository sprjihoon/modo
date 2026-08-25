export const ORDER_SOURCES = ['web', 'app', 'ios', 'android'] as const
export type OrderSource = (typeof ORDER_SOURCES)[number]

export function normalizeOrderSource(raw: unknown): OrderSource | null {
  const value = String(raw ?? '').toLowerCase().trim()
  if (value === 'web' || value === 'app' || value === 'ios' || value === 'android') {
    return value
  }
  return null
}

export function resolveOrderSourceFromRequest(
  req: Request,
  body?: Record<string, unknown> | null,
  fallback: OrderSource | null = null,
): OrderSource | null {
  const fromBody = normalizeOrderSource(body?.orderSource ?? body?.order_source)
  if (fromBody) return fromBody

  const clientInfo = (req.headers.get('x-client-info') ?? '').toLowerCase()
  const userAgent = (req.headers.get('user-agent') ?? '').toLowerCase()
  if (clientInfo.includes('supabase-flutter') || userAgent.includes('dart/')) {
    return 'app'
  }

  return fallback
}

export function orderSourceFromPayload(
  payload: Record<string, unknown> | null | undefined,
): OrderSource | null {
  if (!payload) return null
  return normalizeOrderSource(payload.orderSource ?? payload.order_source)
}
