import { buildCreativeStats } from "./marketing-creatives";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const data = buildCreativeStats({
  banners: [{ id: "b1", title: "기장 배너", is_active: true }],
  popups: [{ id: "p1", title: "오픈 팝업", is_active: true }],
  clicks: [
    { target_id: "b1", target_type: "banner", user_id: "u1", created_at: "2026-09-01T01:00:00.000Z" },
    { target_id: "b1", target_type: "banner", user_id: "u1", created_at: "2026-09-01T02:00:00.000Z" },
    { target_id: "p1", target_type: "popup", user_id: "u2", created_at: "2026-09-01T03:00:00.000Z" },
  ],
  orders: [
    {
      user_id: "u1",
      paid_at: "2026-09-02T01:00:00.000Z",
      created_at: "2026-09-02T01:00:00.000Z",
      total_price: 18000,
      payment_status: "PAID",
    },
  ],
});

const banner = data.find((row) => row.id === "b1");
const popup = data.find((row) => row.id === "p1");
assert(banner?.clicks === 2 && banner.users === 1, "배너 클릭");
assert(banner?.payments === 1 && banner.amount === 18000, "배너 이후 결제");
assert(popup?.clicks === 1 && popup.payments === 0, "팝업 클릭만");

console.log("marketing-creatives.test.ts ok");
