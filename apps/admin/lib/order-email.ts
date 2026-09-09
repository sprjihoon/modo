const PLACEHOLDER_EMAIL_SUFFIXES = [
  "@noemail.local",
  "@example.com",
  "@example.net",
];

/** 가입 이메일로 주문 안내를 보낼 수 있는지. Edge `resend.ts`와 규칙을 맞춘다. */
export function isDeliverableEmail(email?: string | null): boolean {
  if (!email) return false;
  const value = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return false;
  return !PLACEHOLDER_EMAIL_SUFFIXES.some((suffix) => value.endsWith(suffix));
}

export function resolveOrderNotifyEmail(params: {
  userEmail?: string | null;
  orderEmail?: string | null;
}): string | null {
  if (isDeliverableEmail(params.userEmail)) return params.userEmail!.trim();
  if (isDeliverableEmail(params.orderEmail)) return params.orderEmail!.trim();
  return null;
}

export function orderStatusEmailSubject(title: string): string {
  return `[모두의수선] ${title}`;
}

export const ORDER_EMAIL_FROM = "모두의수선 <noreply@modo.mom>";

export const OUT_FOR_DELIVERY_TEMPLATE = {
  title: "배송 시작",
  body: "주문({{order_number}})의 수선이 완료되어 고객님께 배송을 시작했습니다.",
} as const;

/** Edge `getOrderStatusMessage` / DB 폴백과 같은 주문 상태 문구. */
export function orderStatusFallbackMessage(
  status: string,
  orderNumber: string
): { title: string; body: string } {
  const messages: Record<string, { title: string; body: string }> = {
    PAID: {
      title: "결제 완료",
      body: `주문(${orderNumber})의 결제가 완료되었습니다.`,
    },
    BOOKED: {
      title: "수거예약 완료",
      body: `주문(${orderNumber})의 수거예약이 완료되었습니다. 곧 방문 예정입니다.`,
    },
    INBOUND: {
      title: "입고 완료",
      body: `주문(${orderNumber})이 입고되었습니다. 곧 수선을 시작합니다.`,
    },
    PROCESSING: {
      title: "수선 중",
      body: `주문(${orderNumber})의 수선 작업이 시작되었습니다.`,
    },
    HOLD: {
      title: "작업 대기",
      body: `주문(${orderNumber})이 일시 대기 중입니다. 확인이 필요합니다.`,
    },
    READY_TO_SHIP: {
      title: "출고 완료",
      body: `주문(${orderNumber})의 수선이 완료되어 출고되었습니다.`,
    },
    OUT_FOR_DELIVERY: {
      title: OUT_FOR_DELIVERY_TEMPLATE.title,
      body: OUT_FOR_DELIVERY_TEMPLATE.body.replace("{{order_number}}", orderNumber),
    },
    DELIVERED: {
      title: "배송 완료",
      body: `주문(${orderNumber})이 배송 완료되었습니다. 감사합니다!`,
    },
    CANCELLED: {
      title: "주문 취소",
      body: `주문(${orderNumber})이 취소되었습니다.`,
    },
  };

  return (
    messages[status] ?? {
      title: "주문 상태 변경",
      body: `주문(${orderNumber})의 상태가 변경되었습니다.`,
    }
  );
}
