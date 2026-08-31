import { buildBarcodeNo } from "./barcode";
import {
  adminCanViewJourney,
  canCompleteInbound,
  canCompleteOutbound,
  completeInbound,
  completeOutbound,
  createBookedOrder,
  finishStationCapture,
  runHappyPathJourney,
  saveRepairPhoto,
  scanStationItem,
} from "./order-ops-journey";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const seed = {
  orderId: "ord-journey-1",
  orderNumber: "ORD-J1",
  pickupTrackingNo: "PICKUP-J1",
  deliveryTrackingNo: "DELIVERY-J1",
  itemCount: 2,
};

const { order, steps } = runHappyPathJourney(seed);

assert(order.status === "READY_TO_SHIP", "행복 경로 최종 상태");
assert(order.inboundVideoSaved === true, "입고영상 확보");
assert(order.outboundVideoSaved === true, "출고영상 확보");
assert(order.beforePhotoSeqs.join(",") === "1,2", "수선전 사진");
assert(order.afterPhotoSeqs.join(",") === "1,2", "수선후 사진");
assert(order.items[0].barcodeNo === buildBarcodeNo("PICKUP-J1", 1), "입고 시 내품 바코드");
assert(steps[0].includes("BOOKED") && steps.some((s) => s.includes("INBOUND")), "상태 여정");
assert(steps.some((s) => s.includes("READY_TO_SHIP")), "출고완료 단계");

const view = adminCanViewJourney(order);
assert(view.videos.length === 2, "관리자 유효 영상 2건");
assert(view.videos.some((v) => v.type === "inbound_video"), "관리자 입고영상");
assert(view.videos.some((v) => v.type === "outbound_video"), "관리자 출고영상");
assert(view.photos[1]?.before && view.photos[1]?.after, "1번 전후 사진");
assert(view.photos[2]?.before && view.photos[2]?.after, "2번 전후 사진");
assert(view.keys.includes("PICKUP-J1") && view.keys.includes("DELIVERY-J1"), "관리자 조회 키");

let early = createBookedOrder(seed);
assert(canCompleteInbound(early) === false, "사진 없이 입고완료 불가");
const earlyInbound = finishStationCapture(early, "inbound", "PICKUP-J1");
assert(earlyInbound.decision.ok === false, "사진 전 입고송장으로 촬영종료 불가");

early = saveRepairPhoto(early, "inbound", 1);
early = saveRepairPhoto(early, "inbound", 2);
const waybillBeforePack = finishStationCapture(early, "inbound", "PICKUP-J1");
assert(waybillBeforePack.decision.ok === false, "내품 전 입고송장 종료 불가");

const firstPack = scanStationItem(early, "inbound", "PICKUP-J1-01");
assert(firstPack.decision.ok === true, "1번 담기");
const outboundOnInbound = scanStationItem(firstPack.order, "inbound", "DELIVERY-J1");
assert(outboundOnInbound.decision.ok === false, "입고 화면에서 출고송장은 종료 키가 아님");

let inboundReady = firstPack.order;
inboundReady = scanStationItem(inboundReady, "inbound", "PICKUP-J1-02").order;
const inboundDone = finishStationCapture(inboundReady, "inbound", "PICKUP-J1");
assert(inboundDone.decision.ok === true && inboundDone.order.inboundVideoSaved, "입고 촬영종료");
assert(canCompleteInbound(inboundDone.order) === true, "사진 있으면 입고완료 가능");

const inbounded = completeInbound(inboundDone.order, "DELIVERY-J1");
assert(inbounded.status === "INBOUND", "입고완료 상태");
assert(canCompleteOutbound(inbounded) === false, "수선후 사진 없이 출고완료 불가");

try {
  completeOutbound(inbounded);
  throw new Error("출고완료가 막혀야 함");
} catch (e) {
  assert(e instanceof Error && e.message.includes("수선 후"), "출고완료 가드");
}

let outbound = inbounded;
outbound = saveRepairPhoto(outbound, "outbound", 1);
outbound = saveRepairPhoto(outbound, "outbound", 2);
outbound = scanStationItem(outbound, "outbound", "PICKUP-J1-01").order;
outbound = scanStationItem(outbound, "outbound", "PICKUP-J1-02").order;
const outboundDone = finishStationCapture(outbound, "outbound", "DELIVERY-J1");
assert(outboundDone.order.outboundVideoSaved === true, "출고 촬영종료");
const shipped = completeOutbound(outboundDone.order);
assert(shipped.status === "READY_TO_SHIP", "출고완료");

console.log("order-ops-journey.test.ts passed");
console.log(steps.join(" → "));
