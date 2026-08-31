import {
  ADMIN_VIDEO_TYPE_FILTERS,
  adminMediaPlaybackUrl,
  adminVideoFilterLabel,
  adminVideoTypeLabel,
  cloudflareHlsUrl,
  cloudflareWatchUrl,
  collectMediaLookupKeys,
  filterAdminOrderVideos,
  groupRepairPhotos,
  isAdminOrderVideoType,
  isMediaExpired,
  splitOrderVideosByType,
  uniqueMediaKeys,
} from "./admin-media";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(uniqueMediaKeys("", "  ", null, undefined).length === 0, "빈 키 제거");
assert(
  JSON.stringify(uniqueMediaKeys("A", "A", " B ", "B")) === JSON.stringify(["A", "B"]),
  "중복·공백 키"
);

const inboundKeys = collectMediaLookupKeys({
  orderId: "ord-1",
  orderTrackingNo: "TN-1",
  pickupTrackingNo: "PICKUP-111",
  deliveryTrackingNo: "DELIVERY-222",
  shipmentTrackingNo: "TN-1",
});
assert(inboundKeys.includes("PICKUP-111"), "입고 사진/영상 키(수거송장)");
assert(inboundKeys.includes("DELIVERY-222"), "출고 영상 키(출고송장)");
assert(inboundKeys.includes("TN-1"), "출고 사진 키(tracking_no)");
assert(inboundKeys.includes("ord-1"), "orderId fallback");
assert(inboundKeys.filter((k) => k === "TN-1").length === 1, "같은 송장은 한 번만");

assert(isAdminOrderVideoType("inbound_video") === true, "입고영상 표시");
assert(isAdminOrderVideoType("outbound_video") === true, "출고영상 표시");
assert(isAdminOrderVideoType("box_open_video") === false, "박스오픈은 주문 API에서 제외");
assert(isAdminOrderVideoType("before_photo") === false, "사진은 영상 목록에서 제외");

const now = new Date("2026-08-31T00:00:00.000Z");
const mediaRows = [
  { type: "inbound_video", expires_at: null, sequence: 1, path: "in-1" },
  { type: "outbound_video", expires_at: "2026-12-01T00:00:00.000Z", sequence: 1, path: "out-1" },
  { type: "outbound_video", expires_at: "2026-01-01T00:00:00.000Z", sequence: 2, path: "out-old" },
  { type: "box_open_video", expires_at: null, sequence: 0, path: "box-1" },
  { type: "before_photo", expires_at: null, sequence: 1, path: "ord-1/before.jpg" },
  { type: "after_photo", expires_at: null, sequence: 1, path: "ord-1/after.jpg" },
];

const orderVideos = filterAdminOrderVideos(mediaRows, now);
assert(orderVideos.length === 2, "유효 입고+출고만");
assert(orderVideos.every((v) => v.type === "inbound_video" || v.type === "outbound_video"), "타입");
assert(orderVideos.some((v) => v.path === "out-old") === false, "만료 출고영상 제외");
assert(isMediaExpired("2026-01-01T00:00:00.000Z", now) === true, "만료 판정");
assert(isMediaExpired(null, now) === false, "만료일 없으면 유지");

const photos = groupRepairPhotos(mediaRows, (path) => `https://cdn/${path}`);
assert(photos[1]?.before === "https://cdn/ord-1/before.jpg", "수선전 그룹");
assert(photos[1]?.after === "https://cdn/ord-1/after.jpg", "수선후 그룹");
assert(Object.keys(photos).length === 1, "영상은 사진 그룹에 안 들어감");

const twoItemPhotos = groupRepairPhotos(
  [
    { type: "before_photo", sequence: 2, path: "b2" },
    { type: "before_photo", sequence: 1, path: "b1" },
    { type: "after_photo", sequence: 2, path: "a2" },
  ],
  (p) => p,
);
assert(twoItemPhotos[1]?.before === "b1" && !twoItemPhotos[1]?.after, "1번 수선후 없음");
assert(twoItemPhotos[2]?.before === "b2" && twoItemPhotos[2]?.after === "a2", "2번 전후");

const split = splitOrderVideosByType([
  { type: "outbound_video", sequence: 2 },
  { type: "inbound_video", sequence: 1 },
  { type: "outbound_video", sequence: 1 },
  { type: "box_open_video", sequence: 0 },
]);
assert(split.inbound.map((v) => v.sequence).join(",") === "1", "입고 섹션");
assert(split.outbound.map((v) => v.sequence).join(",") === "1,2", "출고 섹션 정렬");
assert(split.boxOpen.length === 1, "구 박스오픈 섹션");

assert(cloudflareHlsUrl("uid-9").endsWith("/uid-9/manifest/video.m3u8"), "HLS URL");
assert(cloudflareWatchUrl("uid-9") === "https://iframe.videodelivery.net/uid-9", "공유 URL");
assert(
  adminMediaPlaybackUrl({ provider: "cloudflare", path: "uid-9" }) === cloudflareHlsUrl("uid-9"),
  "클라우드플레어 재생"
);
assert(
  adminMediaPlaybackUrl({ provider: "supabase", path: "https://x/a.jpg" }) === "https://x/a.jpg",
  "절대경로 그대로"
);

assert(adminVideoTypeLabel("inbound_video") === "입고", "주문 상세 입고 라벨");
assert(adminVideoTypeLabel("outbound_video") === "출고", "주문 상세 출고 라벨");
assert(adminVideoFilterLabel("inbound_video") === "입고 영상", "영상관리 입고는 현재 타입");
assert(adminVideoFilterLabel("inbound_video").includes("(구)") === false, "입고영상을 구버전으로 표시하면 안 됨");
assert(
  ADMIN_VIDEO_TYPE_FILTERS.some((t) => t.value === "inbound_video" && t.label === "입고 영상"),
  "필터 목록에 입고 영상"
);

function adminCanSeeStationMedia(args: {
  savedWaybill: string;
  lookup: ReturnType<typeof collectMediaLookupKeys>;
  type: string;
  expiresAt?: string | null;
}) {
  if (!args.lookup.includes(args.savedWaybill)) return false;
  if (args.type === "before_photo" || args.type === "after_photo") return true;
  return filterAdminOrderVideos([{ type: args.type, expires_at: args.expiresAt ?? null }], now).length === 1;
}

assert(
  adminCanSeeStationMedia({
    savedWaybill: "PICKUP-111",
    lookup: inboundKeys,
    type: "before_photo",
  }),
  "입고 수선전 사진 조회"
);
assert(
  adminCanSeeStationMedia({
    savedWaybill: "PICKUP-111",
    lookup: inboundKeys,
    type: "inbound_video",
  }),
  "입고영상 조회"
);
assert(
  adminCanSeeStationMedia({
    savedWaybill: "TN-1",
    lookup: inboundKeys,
    type: "after_photo",
  }),
  "출고 수선후 사진 조회"
);
assert(
  adminCanSeeStationMedia({
    savedWaybill: "DELIVERY-222",
    lookup: inboundKeys,
    type: "outbound_video",
  }),
  "출고영상 조회"
);
assert(
  adminCanSeeStationMedia({
    savedWaybill: "MISSING",
    lookup: inboundKeys,
    type: "inbound_video",
  }) === false,
  "다른 송장 영상은 안 보임"
);

console.log("admin-media.test.ts passed");
