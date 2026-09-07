import assert from "node:assert/strict";

function toKstYmd(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return `${kst.getUTCFullYear()}${String(kst.getUTCMonth() + 1).padStart(2, "0")}${String(kst.getUTCDate()).padStart(2, "0")}`;
}

function resolveCancelReqYmds(opts: {
  storedReqYmd?: string;
  resDate?: string;
  reqNo?: string;
  pickupRequestedAt?: string;
}): string[] {
  const candidates: string[] = [];
  const push = (value?: string) => {
    if (value && /^\d{8}$/.test(value) && !candidates.includes(value)) {
      candidates.push(value);
    }
  };
  push(opts.storedReqYmd);
  if (opts.resDate && opts.resDate.length >= 8) push(opts.resDate.substring(0, 8));
  if (opts.reqNo && opts.reqNo.length >= 8) push(opts.reqNo.substring(0, 8));
  if (opts.pickupRequestedAt) push(toKstYmd(opts.pickupRequestedAt));
  return candidates;
}

const bookedAt = "2026-09-06T15:06:39.673Z";
assert.equal(toKstYmd(bookedAt), "20260907");
assert.notEqual(new Date(bookedAt).toISOString().slice(0, 10).replace(/-/g, ""), "20260907");

const ymds = resolveCancelReqYmds({
  reqNo: "202609077153253327",
  resDate: "20260907000639",
  pickupRequestedAt: bookedAt,
});
assert.deepEqual(ymds, ["20260907"]);

console.log("epost-req-ymd tests passed");
