import {
  extractPickupBookingFields,
  isMissingReqNoError,
  mergeTrackingEventsWithBooking,
} from "../../edge/supabase/functions/_shared/epost/booking-fields.ts";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const overwritten = [
  { status: "운송장출력" },
  { status: "미수거" },
];
assert(extractPickupBookingFields(overwritten).reqNo === "", "덮인 이력에는 reqNo 없음");

const booked = extractPickupBookingFields(
  [
    { status: "BOOKED", reqNo: "202609077153253327", resNo: "2026090754959864", reqType: "2", payType: "2", reqYmd: "20260907" },
    { status: "미수거" },
  ],
);
assert(booked.reqNo === "202609077153253327", "예약 이벤트에서 reqNo");
assert(booked.resNo === "2026090754959864", "예약 이벤트에서 resNo");

const fromInfo = extractPickupBookingFields([], { reqNo: "REQ1", resNo: "RES1", apprNo: "AP1" });
assert(fromInfo.reqNo === "REQ1", "delivery_info 에서 reqNo");

const merged = mergeTrackingEventsWithBooking(
  [{ status: "BOOKED", reqNo: "REQ9", resNo: "RES9" }],
  [{ status: "미수거" }],
);
assert(merged[0].reqNo === "REQ9", "추적 저장 시 예약 정보 유지");
assert(merged[1].status === "미수거", "실시간 이력은 뒤에");

const mergedFromInfo = mergeTrackingEventsWithBooking(
  overwritten,
  [{ status: "미수거" }],
  { reqNo: "REQ-INFO", resNo: "RES-INFO" },
);
assert(mergedFromInfo[0].reqNo === "REQ-INFO", "delivery_info 예약번호도 유지");

const keptHistory = mergeTrackingEventsWithBooking(
  [{ status: "미수거" }, { status: "BOOKED", reqNo: "REQ-NEW" }],
  [{ status: "운송장출력" }],
);
assert(keptHistory[0].status === "미수거", "이전 미수거 이력 유지");
assert(keptHistory[1].status === "BOOKED", "새 예약 유지");
assert(keptHistory[2].status === "운송장출력", "이번 추적 뒤에");

assert(isMissingReqNoError("필수항목누락-우체국택배신청번호(reqNo) 값이 없습니다."), "reqNo 누락 에러");
assert(!isMissingReqNoError("고객번호(custNo)가 유효하지 않습니다."), "custNo 오류는 다른 처리");

console.log("rebook-booking-fields tests passed");
