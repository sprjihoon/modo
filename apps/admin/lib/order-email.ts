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
