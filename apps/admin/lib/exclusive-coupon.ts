export type ExclusiveCouponSource = "cs" | "invite_milestone";

export function exclusiveCouponOwnerOk(
  assignedUserId: string | null | undefined,
  currentUserId: string | null | undefined
): boolean {
  if (!assignedUserId) return true;
  return Boolean(currentUserId) && assignedUserId === currentUserId;
}

export function shouldIssueInviteMilestone(
  inviteCount: number,
  threshold: number,
  alreadyIssued: boolean
): boolean {
  return missionConditionsMet({
    inviteCount,
    paidOrders: 0,
    photoReviews: 0,
    alreadyIssued,
    minInvite: threshold,
    minPaidOrders: 0,
    minPhotoReviews: 0,
  });
}

export function missionConditionsMet(input: {
  inviteCount: number;
  paidOrders: number;
  photoReviews: number;
  alreadyIssued: boolean;
  minInvite: number;
  minPaidOrders: number;
  minPhotoReviews: number;
}): boolean {
  if (input.alreadyIssued) return false;
  const needInvite = input.minInvite > 0;
  const needOrders = input.minPaidOrders > 0;
  const needReviews = input.minPhotoReviews > 0;
  if (!needInvite && !needOrders && !needReviews) return false;
  if (needInvite && input.inviteCount < input.minInvite) return false;
  if (needOrders && input.paidOrders < input.minPaidOrders) return false;
  if (needReviews && input.photoReviews < input.minPhotoReviews) return false;
  return true;
}

export function generateExclusiveCode(
  source: ExclusiveCouponSource,
  threshold?: number
): string {
  const rand = Math.random().toString(36).replace(/[^a-z0-9]/gi, "").slice(0, 8).toUpperCase();
  if (source === "invite_milestone") {
    return `INV${threshold ?? 0}${rand.slice(0, 4)}`;
  }
  return `CS${rand.slice(0, 6)}`;
}

export function defaultCouponValidUntilDate(daysFromNow = 30): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseCouponValidUntil(value: unknown): string | null | { error: string } {
  if (value === undefined || value === "" || value === null) return null;
  const raw = String(value).trim();
  const day = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  const iso = day ? `${day[1]}T23:59:59+09:00` : raw;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return { error: "사용기한 날짜가 올바르지 않습니다." };
  }
  return parsed.toISOString();
}

export function validateExclusiveIssueBody(body: Record<string, unknown>):
  | {
      discount_type: "PERCENTAGE" | "FIXED";
      discount_value: number;
      valid_days: number;
      valid_until: string | null;
      min_order_amount: number;
      max_discount_amount: number | null;
      issued_note: string | null;
    }
  | { error: string } {
  const discount_type =
    body.discount_type === "PERCENTAGE" || body.discount_type === "FIXED"
      ? body.discount_type
      : "FIXED";
  const discount_value = Number(body.discount_value);
  if (!Number.isFinite(discount_value) || discount_value <= 0) {
    return { error: "할인 값은 1 이상이어야 합니다." };
  }
  if (discount_type === "PERCENTAGE" && discount_value > 100) {
    return { error: "퍼센트 할인은 100 이하여야 합니다." };
  }
  const valid_until = parseCouponValidUntil(body.valid_until);
  if (valid_until && typeof valid_until === "object" && "error" in valid_until) {
    return valid_until;
  }
  const hasUntil = typeof valid_until === "string";
  const valid_days = body.valid_days === undefined || body.valid_days === ""
    ? (hasUntil ? 0 : 30)
    : Number(body.valid_days);
  if (hasUntil) {
    if (!Number.isInteger(valid_days) || valid_days < 0) {
      return { error: "유효 일수는 0 이상의 정수여야 합니다." };
    }
  } else if (!Number.isInteger(valid_days) || valid_days < 1) {
    return { error: "사용기한 또는 유효 일수를 넣어주세요." };
  }
  const min_order_amount = body.min_order_amount === undefined || body.min_order_amount === ""
    ? 0
    : Number(body.min_order_amount);
  if (!Number.isFinite(min_order_amount) || min_order_amount < 0) {
    return { error: "최소 주문 금액은 0 이상이어야 합니다." };
  }
  let max_discount_amount: number | null = null;
  if (body.max_discount_amount !== undefined && body.max_discount_amount !== "" && body.max_discount_amount != null) {
    max_discount_amount = Number(body.max_discount_amount);
    if (!Number.isFinite(max_discount_amount) || max_discount_amount <= 0) {
      return { error: "최대 할인 금액은 1 이상이어야 합니다." };
    }
  }
  const issued_note = body.issued_note ? String(body.issued_note).trim() || null : null;
  return {
    discount_type,
    discount_value,
    valid_days,
    valid_until: hasUntil ? valid_until : null,
    min_order_amount,
    max_discount_amount,
    issued_note,
  };
}

export function validateInviteMilestoneBody(body: Record<string, unknown>):
  | {
      threshold: number;
      min_paid_orders: number;
      min_photo_reviews: number;
      discount_type: "PERCENTAGE" | "FIXED";
      discount_value: number;
      valid_days: number;
      valid_until: string | null;
      min_order_amount: number;
      description: string | null;
      is_active: boolean;
    }
  | { error: string } {
  const asCount = (value: unknown, fallback: number) => {
    if (value === undefined || value === "" || value === null) return fallback;
    return Number(value);
  };
  const threshold = asCount(body.threshold, 0);
  const min_paid_orders = asCount(body.min_paid_orders, 0);
  const min_photo_reviews = asCount(body.min_photo_reviews, 0);
  if (![threshold, min_paid_orders, min_photo_reviews].every((n) => Number.isInteger(n) && n >= 0)) {
    return { error: "조건 횟수는 0 이상의 정수여야 합니다." };
  }
  if (threshold + min_paid_orders + min_photo_reviews < 1) {
    return { error: "초대·수선·포토리뷰 중 하나 이상 조건을 넣어주세요." };
  }
  const valid_days = asCount(body.valid_days, 30);
  if (!Number.isInteger(valid_days) || valid_days < 1) {
    return { error: "발급 후 사용 가능 일수는 1일 이상이어야 합니다." };
  }
  const issued = validateExclusiveIssueBody({
    ...body,
    valid_days,
    valid_until: null,
  });
  if ("error" in issued) return issued;
  return {
    threshold,
    min_paid_orders,
    min_photo_reviews,
    discount_type: issued.discount_type,
    discount_value: issued.discount_value,
    valid_days,
    valid_until: null,
    min_order_amount: issued.min_order_amount,
    description: body.description ? String(body.description).trim() || null : null,
    is_active: body.is_active !== false,
  };
}
