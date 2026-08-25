import { isMissingPickupWaybill } from "./missing-pickup";
import { parseShipmentsBookResult } from "./book-pickup";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(
  isMissingPickupWaybill({ status: "PAID", payment_status: "PAID", tracking_no: null }),
  "결제됐는데 송장 없으면 true"
);
assert(
  !isMissingPickupWaybill({ status: "PAID", payment_status: "PAID", tracking_no: "7890" }),
  "송장 있으면 false"
);
assert(
  !isMissingPickupWaybill({
    status: "PAID",
    payment_status: "PAID",
    tracking_no: null,
    shipment: { pickup_tracking_no: "7890" },
  }),
  "shipment 송장 있으면 false"
);
assert(
  !isMissingPickupWaybill({ status: "BOOKED", payment_status: "PAID", tracking_no: null }),
  "BOOKED 는 대상 아님"
);
assert(
  !isMissingPickupWaybill({
    status: "PAID",
    payment_status: "PAID",
    tracking_no: null,
    canceled_at: "2026-08-21T00:00:00Z",
  }),
  "취소 건 제외"
);

const already = parseShipmentsBookResult(400, { success: false, code: "ALREADY_BOOKED" });
assert(already.ok === true && already.code === "ALREADY_BOOKED", "이미 예약된 건은 성공으로 본다");

const booked = parseShipmentsBookResult(200, { success: true, data: { tracking_no: "7890" } });
assert(booked.ok && booked.trackingNo === "7890", "성공 응답에서 송장번호");

const failed = parseShipmentsBookResult(500, { success: false, error: "EPost API failed", code: "EPOST_API_ERROR" });
assert(!failed.ok && failed.code === "EPOST_API_ERROR", "우체국 오류는 실패");

const missing = parseShipmentsBookResult(400, { success: false, error: "zip required", code: "MISSING_ZIPCODE" });
assert(!missing.ok && missing.code === "MISSING_ZIPCODE", "영구 오류 코드 유지");

console.log("missing-pickup tests passed");
