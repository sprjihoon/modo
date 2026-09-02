import {
  acqColumns,
  cookieWriteValue,
  emptyTouch,
  mergeAcquisition,
  parseAcquisitionJson,
  parseCookieHeader,
  touchFromSearchParams,
} from "./acquisition";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const first = touchFromSearchParams(
  new URLSearchParams("utm_source=naver&utm_medium=search&utm_campaign=수선_검색&utm_term=택배수선")
);
assert(first.source === "naver" && first.term === "택배수선", "UTM 파싱");

const afterOrganic = mergeAcquisition(null, { ...emptyTouch(), referrer: "https://modo.io.kr/" });
assert(!afterOrganic.first.source, "유기 유입은 source 없음");

const afterAd = mergeAcquisition(afterOrganic, first);
assert(afterAd.first.source === "naver" && afterAd.last.source === "naver", "첫 광고가 first/last");

const laterGoogle = mergeAcquisition(afterAd, {
  source: "google",
  medium: "search",
  campaign: "브랜드",
  content: "",
  term: "",
  referrer: "",
});
assert(laterGoogle.first.source === "naver", "first는 유지");
assert(laterGoogle.last.source === "google", "last는 갱신");

const noNew = mergeAcquisition(laterGoogle, emptyTouch());
assert(noNew.first.source === "naver" && noNew.last.source === "google", "빈 유입은 덮지 않음");

const cols = acqColumns(laterGoogle.first);
assert(cols?.acq_source === "naver" && cols.acq_campaign === "수선_검색", "DB 컬럼");
assert(acqColumns(emptyTouch()) === null, "빈 터치는 저장 안 함");

const cookie = `foo=1; modo_acq=${cookieWriteValue(laterGoogle)}; bar=2`;
const parsed = parseCookieHeader(cookie);
assert(parsed?.first.source === "naver" && parsed.last.source === "google", "쿠키 파싱");

const legacy = parseAcquisitionJson(JSON.stringify({ source: "instagram", campaign: "릴스A" }));
assert(legacy?.first.source === "instagram" && legacy.last.campaign === "릴스A", "구형 쿠키");

console.log("acquisition.test.ts ok");
