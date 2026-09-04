import {
  exclusiveCouponOwnerOk,
  generateExclusiveCode,
  missionConditionsMet,
  parseCouponValidUntil,
  shouldIssueInviteMilestone,
  validateExclusiveIssueBody,
  validateInviteMilestoneBody,
} from "./exclusive-coupon";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(exclusiveCouponOwnerOk(null, "u1"), "공개 코드는 누구나");
assert(exclusiveCouponOwnerOk("u1", "u1"), "본인 전용은 통과");
assert(!exclusiveCouponOwnerOk("u1", "u2"), "타인 전용은 거부");
assert(!exclusiveCouponOwnerOk("u1", null), "로그인 없는 전용은 거부");

assert(shouldIssueInviteMilestone(10, 10, false), "10명 도달 시 1회 발급");
assert(shouldIssueInviteMilestone(11, 10, false), "10명 넘어도 미발급이면 지급");
assert(!shouldIssueInviteMilestone(10, 10, true), "이미 발급된 threshold는 스킵");
assert(!shouldIssueInviteMilestone(9, 10, false), "9명에서는 아직 없음");

assert(
  !missionConditionsMet({
    inviteCount: 10,
    paidOrders: 0,
    photoReviews: 0,
    alreadyIssued: false,
    minInvite: 10,
    minPaidOrders: 1,
    minPhotoReviews: 1,
  }),
  "초대만 채우면 조합 미션 미달"
);
assert(
  missionConditionsMet({
    inviteCount: 10,
    paidOrders: 1,
    photoReviews: 1,
    alreadyIssued: false,
    minInvite: 10,
    minPaidOrders: 1,
    minPhotoReviews: 1,
  }),
  "초대 10 + 수선 1 + 포토리뷰 1"
);
assert(
  !missionConditionsMet({
    inviteCount: 10,
    paidOrders: 1,
    photoReviews: 1,
    alreadyIssued: true,
    minInvite: 10,
    minPaidOrders: 1,
    minPhotoReviews: 1,
  }),
  "조합 미션은 1회만"
);

const cs = generateExclusiveCode("cs");
assert(cs.startsWith("CS") && cs.length >= 6, "CS 코드 형식");
const inv = generateExclusiveCode("invite_milestone", 10);
assert(inv.startsWith("INV10"), "초대 코드 형식");

const bad = validateExclusiveIssueBody({ discount_value: 0 });
assert("error" in bad, "할인 0은 거절");

const ok = validateExclusiveIssueBody({
  discount_type: "FIXED",
  discount_value: 5000,
  valid_days: 30,
});
assert(
  !("error" in ok) &&
    ok.discount_value === 5000 &&
    ok.valid_days === 30 &&
    ok.includes_free_shipping === false,
  "CS 발급 payload"
);

const withShip = validateExclusiveIssueBody({
  discount_type: "PERCENTAGE",
  discount_value: 100,
  valid_days: 14,
  includes_free_shipping: true,
});
assert(
  !("error" in withShip) && withShip.includes_free_shipping,
  "왕복 배송비 무료 플래그"
);

const until = parseCouponValidUntil("2026-12-31");
assert(typeof until === "string" && until.startsWith("2026-12-31"), "사용기한 파싱");
const withUntil = validateExclusiveIssueBody({
  discount_type: "FIXED",
  discount_value: 5000,
  valid_until: "2026-12-31",
});
assert(
  !("error" in withUntil) &&
    withUntil.valid_until?.startsWith("2026-12-31") &&
    withUntil.valid_days === 0,
  "사용기한 있으면 일수 없이도 통과"
);
const noExpiry = validateExclusiveIssueBody({
  discount_type: "FIXED",
  discount_value: 5000,
  valid_days: 0,
});
assert("error" in noExpiry, "기한과 일수 둘 다 없으면 거절");

const assignedRequired = validateInviteMilestoneBody({
  discount_type: "FIXED",
  discount_value: 5000,
});
assert("error" in assignedRequired, "조건이 하나도 없으면 거절");

const milestone = validateInviteMilestoneBody({
  threshold: 10,
  min_paid_orders: 1,
  min_photo_reviews: 1,
  discount_type: "FIXED",
  discount_value: 5000,
  valid_days: 14,
  valid_until: "2026-12-31",
});
assert(
  !("error" in milestone) &&
    milestone.threshold === 10 &&
    milestone.min_paid_orders === 1 &&
    milestone.min_photo_reviews === 1 &&
    milestone.valid_days === 14 &&
    milestone.valid_until === null &&
    milestone.includes_free_shipping === false,
  "미션은 발급 후 일수만 쓰고 고정 날짜는 무시"
);
const milestoneShip = validateInviteMilestoneBody({
  threshold: 5,
  discount_type: "PERCENTAGE",
  discount_value: 100,
  valid_days: 14,
  includes_free_shipping: true,
});
assert(
  !("error" in milestoneShip) && milestoneShip.includes_free_shipping,
  "미션에도 왕복 배송비 무료 플래그"
);
const badDays = validateInviteMilestoneBody({
  threshold: 10,
  discount_type: "FIXED",
  discount_value: 5000,
  valid_days: 0,
});
assert("error" in badDays, "발급 후 0일은 거절");

assert(
  missionConditionsMet({
    inviteCount: 0,
    paidOrders: 1,
    photoReviews: 0,
    alreadyIssued: false,
    minInvite: 0,
    minPaidOrders: 1,
    minPhotoReviews: 0,
  }),
  "수선만 조건이어도 발급"
);
assert(
  !missionConditionsMet({
    inviteCount: 9,
    paidOrders: 1,
    photoReviews: 1,
    alreadyIssued: false,
    minInvite: 10,
    minPaidOrders: 1,
    minPhotoReviews: 1,
  }),
  "초대 미달이면 AND 실패"
);

console.log("exclusive-coupon.test.ts ok");
