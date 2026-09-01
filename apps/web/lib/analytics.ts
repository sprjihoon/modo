let _sessionId: string | null = null;
const ACQ_KEY = "modo_acq";

function getSessionId(): string {
  if (!_sessionId) {
    _sessionId = Date.now().toString(36) + Math.random().toString(36).slice(2);
  }
  return _sessionId;
}

function captureAcquisition() {
  if (typeof window === "undefined") {
    return { referrer: "", pageUrl: "", utm_source: "", utm_medium: "", utm_campaign: "" };
  }
  const url = new URL(window.location.href);
  const incoming = {
    referrer: document.referrer || "",
    utm_source: url.searchParams.get("utm_source") || "",
    utm_medium: url.searchParams.get("utm_medium") || "",
    utm_campaign: url.searchParams.get("utm_campaign") || "",
  };
  let stored = { referrer: "", utm_source: "", utm_medium: "", utm_campaign: "" };
  try {
    stored = { ...stored, ...JSON.parse(sessionStorage.getItem(ACQ_KEY) || "{}") };
  } catch {
    // ignore
  }
  const next = {
    referrer: incoming.referrer || stored.referrer,
    utm_source: incoming.utm_source || stored.utm_source,
    utm_medium: incoming.utm_medium || stored.utm_medium,
    utm_campaign: incoming.utm_campaign || stored.utm_campaign,
  };
  try {
    sessionStorage.setItem(ACQ_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return {
    ...next,
    pageUrl: `${url.pathname}${url.search}`,
  };
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
    const acq = captureAcquisition();
    await fetch("/api/analytics/track-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...params,
        sessionId: getSessionId(),
        referrer: acq.referrer || undefined,
        pageUrl: params.pageUrl ?? acq.pageUrl,
        metadata: {
          ...params.metadata,
          ...(acq.utm_source ? { utm_source: acq.utm_source } : {}),
          ...(acq.utm_medium ? { utm_medium: acq.utm_medium } : {}),
          ...(acq.utm_campaign ? { utm_campaign: acq.utm_campaign } : {}),
        },
      }),
    });
  } catch {
    // 분석 실패는 앱 기능에 영향 없이 무시
  }
}

// 편의 함수
export const Analytics = {
  pageView: (title: string, url?: string) =>
    trackEvent({
      eventType: "PAGE_VIEW",
      pageTitle: title,
      pageUrl: url ?? (typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : undefined),
    }),

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

  cartAdd: (draftId: string, itemCount?: number, repairCount?: number) =>
    trackEvent({ eventType: "CART_ADD", targetId: draftId, targetType: "cart_item", metadata: { item_count: itemCount, repair_count: repairCount } }),

  cartRemove: (draftId: string) =>
    trackEvent({ eventType: "CART_REMOVE", targetId: draftId, targetType: "cart_item" }),

  cartView: (itemCount: number) =>
    trackEvent({ eventType: "PAGE_VIEW", pageTitle: "장바구니", pageUrl: "/cart", metadata: { cart_item_count: itemCount } }),

  productView: (productId: string, productName: string) =>
    trackEvent({ eventType: "PRODUCT_VIEW", eventName: productName, targetId: productId, targetType: "product" }),

  repairMenuView: (menuId: string, menuName: string) =>
    trackEvent({ eventType: "REPAIR_MENU_VIEW", eventName: menuName, targetId: menuId, targetType: "repair_menu" }),

  bannerClick: (bannerId: string, bannerTitle: string) =>
    trackEvent({ eventType: "BANNER_CLICK", eventName: bannerTitle, targetId: bannerId, targetType: "banner" }),

  popupView: (popupId: string, popupTitle: string) =>
    trackEvent({ eventType: "BANNER_CLICK", eventName: popupTitle, targetId: popupId, targetType: "popup" }),

  imageUploadStart: (orderId?: string) =>
    trackEvent({ eventType: "IMAGE_UPLOAD_START", targetId: orderId, targetType: "order" }),

  imageUploadComplete: (orderId?: string, imageCount?: number) =>
    trackEvent({ eventType: "IMAGE_UPLOAD_COMPLETE", targetId: orderId, targetType: "order", metadata: { image_count: imageCount } }),

  pinAdd: (orderId: string | undefined, imageId: string) =>
    trackEvent({ eventType: "PIN_ADD", targetId: orderId, targetType: "order", metadata: { image_id: imageId } }),

  notificationClick: (notificationId: string, notificationType?: string, orderId?: string) =>
    trackEvent({
      eventType: "NOTIFICATION_CLICK",
      targetId: notificationId,
      targetType: "notification",
      metadata: { notification_type: notificationType, order_id: orderId },
    }),

  search: (query: string, resultCount?: number) =>
    trackEvent({ eventType: "SEARCH", metadata: { query, result_count: resultCount } }),

  reviewStart: (orderId: string) =>
    trackEvent({ eventType: "REVIEW_START", targetId: orderId, targetType: "order" }),

  reviewSubmit: (orderId: string, rating: number, hasPhoto: boolean) =>
    trackEvent({
      eventType: "REVIEW_SUBMIT",
      targetId: orderId,
      targetType: "order",
      metadata: { rating, has_photo: hasPhoto },
    }),
};
