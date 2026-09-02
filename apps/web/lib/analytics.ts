import { captureBrowserAcquisition } from "./acquisition";

let _sessionId: string | null = null;

function getSessionId(): string {
  if (!_sessionId) {
    _sessionId = Date.now().toString(36) + Math.random().toString(36).slice(2);
  }
  return _sessionId;
}

function captureAcquisition() {
  if (typeof window === "undefined") {
    return {
      referrer: "",
      pageUrl: "",
      utm_source: "",
      utm_medium: "",
      utm_campaign: "",
      utm_content: "",
      utm_term: "",
    };
  }
  const pair = captureBrowserAcquisition();
  const last = pair.last.source ? pair.last : pair.first;
  return {
    referrer: last.referrer || pair.first.referrer,
    pageUrl: `${window.location.pathname}${window.location.search}`,
    utm_source: last.source,
    utm_medium: last.medium,
    utm_campaign: last.campaign,
    utm_content: last.content,
    utm_term: last.term,
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
          ...(acq.utm_content ? { utm_content: acq.utm_content } : {}),
          ...(acq.utm_term ? { utm_term: acq.utm_term } : {}),
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
