import {
  buildBarcodeNo,
  canStartOutboundPackScan,
  matchPackedItemSeq,
  PACK_SCAN_WAYBILL,
  packScanFailMessage,
  resolveOutboundPackScan,
  shouldAutoFinishPacking,
} from "./barcode";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const items = [
  { seq: 1, barcodeNo: "123456789012-01" },
  { seq: 2, barcodeNo: "123456789012-02" },
];
const prefixes = ["123456789012", "ORD-9"];

assert(matchPackedItemSeq("123456789012-01", items, prefixes) === 1, "DB 바코드 1번");
assert(matchPackedItemSeq("123456789012-02", items, prefixes) === 2, "DB 바코드 2번");
assert(matchPackedItemSeq("ORD-9-01", items, prefixes) === 1, "주문번호 접두어");
assert(matchPackedItemSeq("123456789012", items, prefixes) === PACK_SCAN_WAYBILL, "송장 자체");
assert(matchPackedItemSeq("999-01", items, prefixes) === null, "다른 주문");
assert(matchPackedItemSeq("  123456789012-01  ", items, prefixes) === 1, "공백");

assert(buildBarcodeNo("ABC", 3) === "ABC-03", "바코드 번호 형식");

assert(canStartOutboundPackScan({ itemCount: 2, photoDoneCount: 1 }) === false, "사진 미완이면 스캔 불가");
assert(canStartOutboundPackScan({ itemCount: 2, photoDoneCount: 2 }) === true, "사진 완료면 스캔 가능");

assert(
  shouldAutoFinishPacking({ itemCount: 2, sessionPackedSeqs: [1, 2], photosComplete: false }) === false,
  "사진 없으면 종료 안 함"
);
assert(shouldAutoFinishPacking({ itemCount: 2, sessionPackedSeqs: [1], photosComplete: true }) === false, "일부만 담김");
assert(shouldAutoFinishPacking({ itemCount: 2, sessionPackedSeqs: [1, 2], photosComplete: true }) === true, "전부 담김");
assert(shouldAutoFinishPacking({ itemCount: 1, sessionPackedSeqs: [1], photosComplete: true }) === true, "단품");
assert(shouldAutoFinishPacking({ itemCount: 0, sessionPackedSeqs: [], photosComplete: true }) === false, "빈 목록");

const scanBase = {
  items,
  prefixes,
  photoDoneCount: 2,
  photoDoneSeqs: [1, 2],
  packedSeqs: [] as number[],
};

assert(resolveOutboundPackScan({ ...scanBase, scanned: "" }).ok === false, "빈 스캔 거절");
assert(
  (resolveOutboundPackScan({ ...scanBase, scanned: "123456789012-01", photoDoneCount: 0, photoDoneSeqs: [] }) as { reason: string }).reason ===
    "PHOTOS_INCOMPLETE",
  "사진 전에 스캔 차단"
);
assert(
  (resolveOutboundPackScan({ ...scanBase, scanned: "123456789012" }) as { reason: string }).reason === "WAYBILL",
  "송장 스캔 거절"
);
assert(
  (resolveOutboundPackScan({ ...scanBase, scanned: "999-01" }) as { reason: string }).reason === "UNKNOWN",
  "다른 주문 거절"
);
assert(
  (resolveOutboundPackScan({ ...scanBase, scanned: "123456789012-01", packedSeqs: [1] }) as { reason: string }).reason ===
    "ALREADY_PACKED",
  "중복 담기 거절"
);
assert(
  (resolveOutboundPackScan({
    ...scanBase,
    scanned: "123456789012-02",
    photoDoneCount: 2,
    photoDoneSeqs: [1],
  }) as { reason: string }).reason === "PHOTO_MISSING",
  "해당 항목 사진 없으면 담기 불가"
);

const okScan = resolveOutboundPackScan({ ...scanBase, scanned: "123456789012-01" });
assert(okScan.ok === true && okScan.ok && okScan.seq === 1, "사진 완료 후 1번 담기");

const okPrefix = resolveOutboundPackScan({
  items: [{ seq: 1 }, { seq: 2 }],
  prefixes,
  scanned: "ORD-9-02",
  photoDoneCount: 2,
  photoDoneSeqs: [1, 2],
  packedSeqs: [1],
});
assert(okPrefix.ok === true && okPrefix.ok && okPrefix.seq === 2, "접두어 바코드로 2번 담기");

assert(packScanFailMessage("EMPTY") === null, "빈 스캔은 메시지 없음");
assert(packScanFailMessage("PHOTOS_INCOMPLETE", { doneCount: 1, totalCount: 2 })?.includes("1/2") === true, "사진 미완 문구");

let packed: number[] = [];
const photos = [1, 2];
for (const code of ["123456789012-01", "123456789012-02"]) {
  const step = resolveOutboundPackScan({
    ...scanBase,
    scanned: code,
    photoDoneSeqs: photos,
    packedSeqs: packed,
  });
  assert(step.ok === true, `시나리오 담기 ${code}`);
  if (step.ok) packed = [...packed, step.seq];
}
assert(
  shouldAutoFinishPacking({ itemCount: 2, sessionPackedSeqs: packed, photosComplete: true }) === true,
  "전 항목 담으면 촬영 종료"
);

console.log("barcode.test.ts passed");
