import {
  canRebookPickup,
  isFailedPickupStatus,
  isUnavailablePickupDate,
  nextAvailablePickupDate,
  shouldOfferCustomerRebook,
} from "./rebook-pickup";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(isFailedPickupStatus("송화인부재"), "송화인부재");
assert(!isFailedPickupStatus("수령인 부재"), "배송 수령인 부재 제외");
assert(canRebookPickup({ status: "BOOKED" }), "BOOKED 재접수 가능");
assert(!canRebookPickup({ status: "PROCESSING" }), "수선중 재접수 불가");
assert(isUnavailablePickupDate("2026-09-12"), "토요일 불가");
assert(isUnavailablePickupDate("2026-09-13"), "일요일 불가");
assert(!isUnavailablePickupDate("2026-09-14"), "월요일 가능");
assert(nextAvailablePickupDate("2026-09-11") === "2026-09-14", "금→월");
assert(
  !shouldOfferCustomerRebook({
    status: "BOOKED",
    scheduledDate: "2026-09-09",
    todayYmd: "2026-09-11",
  }),
  "신규 예약은 미수거 없이 숨김"
);
assert(
  shouldOfferCustomerRebook({
    status: "BOOKED",
    trackingEvents: [{ status: "BOOKED" }, { status: "미수거" }],
  }),
  "이번 수거 실패만 노출"
);

console.log("web rebook-pickup tests passed");
