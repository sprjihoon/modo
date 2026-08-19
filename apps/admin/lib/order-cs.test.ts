import {
  CS_COMPENSATION_CAP,
  CLOSED_CS_STATUSES,
  WORKSHOP_STATUSES,
  compensationAmount,
  repairFeeOf,
  snapshotShipment,
} from "./order-cs";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(repairFeeOf({ base_price: 18000, total_price: 25000, shipping_fee: 7000 }) === 18000, "base_price 우선");
assert(repairFeeOf({ total_price: 25000, shipping_fee: 7000, remote_area_fee: 0 }) === 18000, "total-shipping");
assert(repairFeeOf({ total_price: 25000, shipping_fee: 7000, remote_area_fee: 3000 }) === 15000, "도서산간 차감");
assert(repairFeeOf({ total_price: 5000, shipping_fee: 7000 }) === 0, "음수 방지");

assert(compensationAmount(500000, 18000) === 90000, "수선비×5가 한도보다 작으면 그 값");
assert(compensationAmount(500000, 50000) === CS_COMPENSATION_CAP, "20만 한도");
assert(compensationAmount(80000, 18000) === 80000, "잔존가치가 더 작으면 잔존가치");
assert(compensationAmount(500000, 10000) === 50000, "수선비×5가 더 작으면 그 값");
assert(compensationAmount(-1, 10000) === 0, "잔존가치 음수 방지");

assert(WORKSHOP_STATUSES.has("PROCESSING") && !WORKSHOP_STATUSES.has("DELIVERED"), "공방 상태");
assert(CLOSED_CS_STATUSES.has("COMPENSATED") && CLOSED_CS_STATUSES.has("REPAIR_REFUNDED"), "종료 상태");

const snap = snapshotShipment({
  pickup_tracking_no: "P1",
  delivery_tracking_no: "D1",
  pickup_scheduled_date: "2026-08-01",
  status: "DELIVERED",
});
assert(snap?.pickup_tracking_no === "P1" && snap?.delivery_tracking_no === "D1", "송장 스냅샷");
assert(snapshotShipment(null) === null, "빈 송장");

console.log("order-cs tests passed");
