import {
  canRebookPickup,
  isFailedPickupStatus,
  nextAvailablePickupDate,
  shouldOfferCustomerRebook,
  trackingEventsShowFailedPickup,
} from "./rebook-pickup";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(isFailedPickupStatus("송화인부재"), "송화인부재");
assert(isFailedPickupStatus("송화인 부재"), "송화인 부재 공백");
assert(isFailedPickupStatus("미집하"), "미집하");
assert(isFailedPickupStatus("미수거"), "미수거");
assert(!isFailedPickupStatus("수령인 부재"), "배송 수령인 부재는 수거 실패가 아님");
assert(!isFailedPickupStatus("집하완료"), "집하완료는 실패 아님");

assert(
  trackingEventsShowFailedPickup([{ status: "방문", description: "송화인부재" }]),
  "이벤트 description 으로 감지"
);

assert(
  canRebookPickup({ status: "BOOKED" }),
  "BOOKED 는 재접수 가능"
);
assert(
  canRebookPickup({ status: "PAID" }),
  "PAID 도 재접수 가능"
);
assert(
  !canRebookPickup({ status: "BOOKED", pickupCompletedAt: "2026-09-10T00:00:00Z" }),
  "수거 완료 후 재접수 불가"
);
assert(
  !canRebookPickup({ status: "PICKED_UP" }),
  "PICKED_UP 재접수 불가"
);
assert(
  !canRebookPickup({ status: "BOOKED", canceled_at: "2026-09-10T00:00:00Z" }),
  "취소 건 제외"
);

assert(
  shouldOfferCustomerRebook({
    status: "BOOKED",
    trackingEvents: [{ status: "송화인부재" }],
  }),
  "고객에게 송화인부재면 재접수 노출"
);
assert(
  !shouldOfferCustomerRebook({
    status: "BOOKED",
    pickupDate: "2026-09-01",
    todayYmd: "2026-09-11",
  }),
  "신규·예약만 된 건은 재접수 숨김"
);
assert(
  !shouldOfferCustomerRebook({
    status: "BOOKED",
    trackingEvents: [{ status: "BOOKED", description: "수거예약 완료" }],
  }),
  "수거예약 완료만 있으면 숨김"
);
assert(
  shouldOfferCustomerRebook({
    status: "BOOKED",
    trackingEvents: [
      { status: "BOOKED", description: "수거예약 완료" },
      { status: "미수거" },
    ],
  }),
  "이번 예약 이후 미수거면 노출"
);
assert(
  !shouldOfferCustomerRebook({
    status: "BOOKED",
    trackingEvents: [
      { status: "미수거" },
      { status: "BOOKED", description: "수거 재접수 완료" },
    ],
  }),
  "재접수 후에는 이전 미수거로 버튼을 다시 열지 않음"
);

assert(nextAvailablePickupDate("2026-09-11") === "2026-09-14", "금요일 다음은 월요일");
assert(nextAvailablePickupDate("2026-09-12") === "2026-09-14", "토요일 다음은 월요일");

console.log("rebook-pickup tests passed");
