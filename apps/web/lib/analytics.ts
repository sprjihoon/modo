let _sessionId: string | null = null;

function getSessionId(): string {
  if (!_sessionId) {
    _sessionId = Date.now().toString(36) + Math.random().toString(36).slice(2);
  }
  return _sessionId;
}

interface TrackEventParams {
  eventType: string;
  eventName?: string;
  pageUrl?: string;
  pageTitle?: string;
  targetId?: string;
  targetType?: string;
  metadata?: Record<string, unknown>;
}

export async function trackEvent(params: TrackEventParams): Promise<void> {
  try {
    await fetch("/api/analytics/track-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...params, sessionId: getSessionId() }),
    });
  } catch {
    // 분석 실패는 앱 기능에 영향 없이 무시
  }
}

// 편의 함수
export const Analytics = {
  pageView: (title: string, url?: string) =>
    trackEvent({ eventType: "PAGE_VIEW", pageTitle: title, pageUrl: url ?? (typeof window !== "undefined" ? window.location.pathname : undefined) }),

  orderStart: (orderId?: string, amount?: number) =>
    trackEvent({ eventType: "ORDER_START", targetId: orderId, targetType: "order", metadata: { amount } }),

  paymentStart: (orderId: string, amount: number) =>
    trackEvent({ eventType: "ORDER_PAYMENT_START", targetId: orderId, targetType: "order", metadata: { amount } }),

  paymentSuccess: (orderId: string, amount: number, method?: string) =>
    trackEvent({ eventType: "ORDER_PAYMENT_SUCCESS", targetId: orderId, targetType: "order", metadata: { amount, method } }),

  paymentFail: (orderId: string, amount: number, error?: string) =>
    trackEvent({ eventType: "ORDER_PAYMENT_FAIL", targetId: orderId, targetType: "order", metadata: { amount, error } }),

  extraChargeView: (orderId: string, amount: number) =>
    trackEvent({ eventType: "EXTRA_CHARGE_VIEW", targetId: orderId, targetType: "order", metadata: { amount } }),

  extraChargeAccept: (orderId: string, amount: number) =>
    trackEvent({ eventType: "EXTRA_CHARGE_ACCEPT", targetId: orderId, targetType: "order", metadata: { amount } }),

  extraChargeReject: (orderId: string, amount: number) =>
    trackEvent({ eventType: "EXTRA_CHARGE_REJECT", targetId: orderId, targetType: "order", metadata: { amount } }),
};
