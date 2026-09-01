import { getAudienceLabel, isSegmentAudience, resolveAudienceUserIds } from "./marketing-audience";
import { buildMarketingActions } from "./marketing-actions";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(isSegmentAudience("quiet_30"), "세그먼트");
assert(!isSegmentAudience("all"), "전체는 세그먼트 아님");
assert(getAudienceLabel("abandon") === "장바구니 이탈", "라벨");

const actions = buildMarketingActions({
  nowMs: Date.parse("2026-09-01T06:00:00.000Z"),
  users: [{ id: "u1", name: "휴면", email: "a@a.com", created_at: "2026-01-01T00:00:00.000Z" }],
  orders: [],
  lastSeen: [{ user_id: "u1", created_at: "2026-07-01T00:00:00.000Z" }],
  abandonEvents: [],
  promotions: [],
  usages: [],
});

assert(resolveAudienceUserIds("quiet_30", actions).includes("u1"), "휴면 ID");
assert(resolveAudienceUserIds("all", actions).length === 0, "전체는 여기서 비움");

console.log("marketing-audience.test.ts ok");
