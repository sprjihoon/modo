import {
  DEFAULT_OUTBOUND_DELIV_MSG,
  EPOST_DELIV_MSG_MAX,
  resolveDeliveryRequestMessage,
} from "./delivery-request";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(resolveDeliveryRequestMessage("  현관 비번 1234  ") === "현관 비번 1234", "trim notes");
assert(resolveDeliveryRequestMessage("") === "", "empty stays empty");
assert(resolveDeliveryRequestMessage(null) === "", "null stays empty");
assert(
  resolveDeliveryRequestMessage(null, DEFAULT_OUTBOUND_DELIV_MSG) === DEFAULT_OUTBOUND_DELIV_MSG,
  "empty uses fallback"
);
assert(
  resolveDeliveryRequestMessage("경비실", DEFAULT_OUTBOUND_DELIV_MSG) === "경비실",
  "notes win over fallback"
);

const long = "가".repeat(EPOST_DELIV_MSG_MAX + 20);
assert(resolveDeliveryRequestMessage(long).length === EPOST_DELIV_MSG_MAX, "truncate to epost max");

console.log("delivery-request.test.ts ok");
