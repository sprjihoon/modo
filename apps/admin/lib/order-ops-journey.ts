import {
  buildBarcodeNo,
  canStartOutboundPackScan,
  resolveOutboundPackScan,
  type PackScanDecision,
} from "./barcode";
import {
  collectMediaLookupKeys,
  filterAdminOrderVideos,
  groupRepairPhotos,
} from "./admin-media";
import { resolveOpsLiveVideoUpload } from "./ops-camera";

export type JourneyStatus = "PAID" | "BOOKED" | "INBOUND" | "PROCESSING" | "READY_TO_SHIP";

export type JourneyOrder = {
  status: JourneyStatus;
  orderId: string;
  orderNumber: string;
  trackingNo: string;
  pickupTrackingNo: string;
  deliveryTrackingNo: string | null;
  itemCount: number;
  items: { seq: number; barcodeNo?: string }[];
  beforePhotoSeqs: number[];
  afterPhotoSeqs: number[];
  inboundPacked: number[];
  outboundPacked: number[];
  inboundVideoSaved: boolean;
  outboundVideoSaved: boolean;
  inboundCaptureFinished: boolean;
  outboundCaptureFinished: boolean;
};

export function inboundPrefixes(order: JourneyOrder): string[] {
  return [order.pickupTrackingNo, order.trackingNo, order.orderNumber].filter(
    (v, i, arr) => v && arr.indexOf(v) === i,
  );
}

export function outboundPrefixes(order: JourneyOrder): string[] {
  return [
    order.pickupTrackingNo,
    order.deliveryTrackingNo,
    order.trackingNo,
    order.orderNumber,
  ].filter((v, i, arr): v is string => !!v && arr.indexOf(v) === i);
}

export function createBookedOrder(args: {
  orderId: string;
  orderNumber: string;
  pickupTrackingNo: string;
  trackingNo?: string;
  itemCount: number;
}): JourneyOrder {
  const trackingNo = args.trackingNo || args.pickupTrackingNo;
  return {
    status: "BOOKED",
    orderId: args.orderId,
    orderNumber: args.orderNumber,
    trackingNo,
    pickupTrackingNo: args.pickupTrackingNo,
    deliveryTrackingNo: null,
    itemCount: args.itemCount,
    items: Array.from({ length: args.itemCount }, (_, i) => ({
      seq: i + 1,
      barcodeNo: buildBarcodeNo(args.pickupTrackingNo, i + 1),
    })),
    beforePhotoSeqs: [],
    afterPhotoSeqs: [],
    inboundPacked: [],
    outboundPacked: [],
    inboundVideoSaved: false,
    outboundVideoSaved: false,
    inboundCaptureFinished: false,
    outboundCaptureFinished: false,
  };
}

function scanAt(
  order: JourneyOrder,
  station: "inbound" | "outbound",
  scanned: string,
): PackScanDecision {
  const packed = station === "inbound" ? order.inboundPacked : order.outboundPacked;
  const photos = station === "inbound" ? order.beforePhotoSeqs : order.afterPhotoSeqs;
  return resolveOutboundPackScan({
    scanned,
    items: order.items,
    prefixes: station === "inbound" ? inboundPrefixes(order) : outboundPrefixes(order),
    photoDoneCount: photos.length,
    photoDoneSeqs: photos,
    packedSeqs: packed,
  });
}

export function saveRepairPhoto(order: JourneyOrder, station: "inbound" | "outbound", seq: number): JourneyOrder {
  if (seq < 1 || seq > order.itemCount) {
    throw new Error(`${seq}번은 이 주문 항목이 아닙니다`);
  }
  const key = station === "inbound" ? "beforePhotoSeqs" : "afterPhotoSeqs";
  if (order[key].includes(seq)) return order;
  return { ...order, [key]: [...order[key], seq] };
}

export function scanStationItem(order: JourneyOrder, station: "inbound" | "outbound", scanned: string): {
  order: JourneyOrder;
  decision: PackScanDecision;
} {
  const decision = scanAt(order, station, scanned);
  if (!decision.ok || decision.action !== "PACK") return { order, decision };
  const key = station === "inbound" ? "inboundPacked" : "outboundPacked";
  return {
    decision,
    order: { ...order, [key]: [...order[key], decision.seq] },
  };
}

export function finishStationCapture(order: JourneyOrder, station: "inbound" | "outbound", waybill: string): {
  order: JourneyOrder;
  decision: PackScanDecision;
} {
  const decision = scanAt(order, station, waybill);
  if (!decision.ok || decision.action !== "FINISH") return { order, decision };

  const upload = resolveOpsLiveVideoUpload(station === "inbound" ? "/ops/inbound" : "/ops/outbound");
  if (station === "inbound") {
    return {
      decision,
      order: {
        ...order,
        inboundCaptureFinished: true,
        inboundVideoSaved: upload.videoType === "inbound_video",
      },
    };
  }
  return {
    decision,
    order: {
      ...order,
      outboundCaptureFinished: true,
      outboundVideoSaved: upload.videoType === "outbound_video",
    },
  };
}

export function canCompleteInbound(order: JourneyOrder): boolean {
  return (
    order.status === "BOOKED" &&
    canStartOutboundPackScan({
      itemCount: order.itemCount,
      photoDoneCount: order.beforePhotoSeqs.length,
    })
  );
}

export function completeInbound(order: JourneyOrder, deliveryTrackingNo: string): JourneyOrder {
  if (!canCompleteInbound(order)) {
    throw new Error("수선 전 사진이 없어 입고완료할 수 없습니다");
  }
  return {
    ...order,
    status: "INBOUND",
    deliveryTrackingNo,
    items: order.items.map((item) => ({
      ...item,
      barcodeNo: item.barcodeNo || buildBarcodeNo(order.pickupTrackingNo, item.seq),
    })),
  };
}

export function startWork(order: JourneyOrder): JourneyOrder {
  if (order.status !== "INBOUND") throw new Error("입고 후에만 수선을 시작할 수 있습니다");
  return { ...order, status: "PROCESSING" };
}

export function canCompleteOutbound(order: JourneyOrder): boolean {
  return (
    (order.status === "INBOUND" || order.status === "PROCESSING") &&
    canStartOutboundPackScan({
      itemCount: order.itemCount,
      photoDoneCount: order.afterPhotoSeqs.length,
    })
  );
}

export function completeOutbound(order: JourneyOrder): JourneyOrder {
  if (!canCompleteOutbound(order)) {
    throw new Error("수선 후 사진이 없어 출고완료할 수 없습니다");
  }
  return { ...order, status: "READY_TO_SHIP" };
}

export function journeyMediaRows(order: JourneyOrder) {
  const rows: Array<{
    final_waybill_no: string;
    type: string;
    path: string;
    sequence: number;
    expires_at: string | null;
  }> = [];

  for (const seq of order.beforePhotoSeqs) {
    rows.push({
      final_waybill_no: order.pickupTrackingNo,
      type: "before_photo",
      path: `${order.orderId}/before_photo_${seq}.jpg`,
      sequence: seq,
      expires_at: null,
    });
  }
  for (const seq of order.afterPhotoSeqs) {
    rows.push({
      final_waybill_no: order.trackingNo,
      type: "after_photo",
      path: `${order.orderId}/after_photo_${seq}.jpg`,
      sequence: seq,
      expires_at: null,
    });
  }
  if (order.inboundVideoSaved) {
    rows.push({
      final_waybill_no: order.pickupTrackingNo,
      type: "inbound_video",
      path: `${order.orderId}-inbound`,
      sequence: 1,
      expires_at: null,
    });
  }
  if (order.outboundVideoSaved && order.deliveryTrackingNo) {
    rows.push({
      final_waybill_no: order.deliveryTrackingNo,
      type: "outbound_video",
      path: `${order.orderId}-outbound`,
      sequence: 1,
      expires_at: null,
    });
  }
  return rows;
}

export function adminCanViewJourney(order: JourneyOrder) {
  const keys = collectMediaLookupKeys({
    orderId: order.orderId,
    orderTrackingNo: order.trackingNo,
    pickupTrackingNo: order.pickupTrackingNo,
    deliveryTrackingNo: order.deliveryTrackingNo,
    shipmentTrackingNo: order.trackingNo,
  });
  const rows = journeyMediaRows(order);
  const videos = filterAdminOrderVideos(rows);
  const photos = groupRepairPhotos(rows, (path) => path);
  return { keys, videos, photos };
}

/** 결제·수거예약 이후 입고→출고 행복 경로 */
export function runHappyPathJourney(seed: {
  orderId: string;
  orderNumber: string;
  pickupTrackingNo: string;
  deliveryTrackingNo: string;
  itemCount: number;
}): { order: JourneyOrder; steps: string[] } {
  const steps: string[] = [];
  let order = createBookedOrder(seed);
  steps.push("주문 발생·수거예약(BOOKED)");

  for (let seq = 1; seq <= order.itemCount; seq++) {
    order = saveRepairPhoto(order, "inbound", seq);
  }
  steps.push("입고: 수선 전 사진 저장");

  for (const item of order.items) {
    const packed = scanStationItem(order, "inbound", item.barcodeNo || "");
    if (!packed.decision.ok) throw new Error(`입고 내품 스캔 실패: ${item.barcodeNo}`);
    order = packed.order;
  }
  steps.push("입고: 내품 바코드 스캔");

  const inboundFinish = finishStationCapture(order, "inbound", order.pickupTrackingNo);
  if (!inboundFinish.decision.ok) throw new Error("입고 송장 재스캔 실패");
  order = inboundFinish.order;
  steps.push("입고: 입고송장 재스캔 → 입고영상 확보");

  order = completeInbound(order, seed.deliveryTrackingNo);
  steps.push("입고완료(INBOUND)");

  order = startWork(order);
  steps.push("수선 시작(PROCESSING)");

  for (let seq = 1; seq <= order.itemCount; seq++) {
    order = saveRepairPhoto(order, "outbound", seq);
  }
  steps.push("출고: 수선 후 사진 저장");

  for (const item of order.items) {
    const packed = scanStationItem(order, "outbound", item.barcodeNo || "");
    if (!packed.decision.ok) throw new Error(`출고 내품 스캔 실패: ${item.barcodeNo}`);
    order = packed.order;
  }
  steps.push("출고: 내품 바코드 스캔");

  const outboundFinish = finishStationCapture(order, "outbound", seed.deliveryTrackingNo);
  if (!outboundFinish.decision.ok) throw new Error("출고 송장 재스캔 실패");
  order = outboundFinish.order;
  steps.push("출고: 출고송장 재스캔 → 출고영상 확보");

  order = completeOutbound(order);
  steps.push("출고완료(READY_TO_SHIP)");

  return { order, steps };
}
