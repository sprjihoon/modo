import type { MarketingActionsData } from "./marketing-actions";

export const MARKETING_AUDIENCE_LABELS = {
  all: "전체 사용자",
  active_users: "활성 사용자 (30일 내)",
  recent_orders: "최근 주문자 (7일 내)",
  quiet_30: "휴면 30일",
  quiet_60: "휴면 60일",
  one_shot: "1회 구매 후 조용",
  abandon: "장바구니 이탈",
  app_only: "앱만 쓰는 고객",
} as const;

export type MarketingAudience = keyof typeof MARKETING_AUDIENCE_LABELS;

export const SEGMENT_AUDIENCES = ["quiet_30", "quiet_60", "one_shot", "abandon", "app_only"] as const;

export function isSegmentAudience(value?: string | null): boolean {
  return Boolean(value && (SEGMENT_AUDIENCES as readonly string[]).includes(value));
}

export function getAudienceLabel(value?: string | null): string {
  if (!value) return MARKETING_AUDIENCE_LABELS.all;
  return MARKETING_AUDIENCE_LABELS[value as MarketingAudience] || value;
}

export function resolveAudienceUserIds(audience: string, data: MarketingActionsData): string[] {
  const rows =
    audience === "quiet_30" ? data.quiet30 :
    audience === "quiet_60" ? data.quiet60 :
    audience === "one_shot" ? data.oneShot :
    audience === "abandon" ? data.abandon :
    audience === "app_only" ? data.appOnly :
    [];
  return rows.map((row) => row.id);
}
