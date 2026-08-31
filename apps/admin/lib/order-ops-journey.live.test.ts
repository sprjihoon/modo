/**
 * 주문→입고→출고 여정 목업 1건을 DB에 넣었다가
 * 관리자 조회와 같은 로직으로 확인한 뒤 삭제한다.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  collectMediaLookupKeys,
  filterAdminOrderVideos,
  groupRepairPhotos,
} from "./admin-media";
import { journeyMediaRows, runHappyPathJourney } from "./order-ops-journey";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

function loadEnvFile(filePath: string) {
  try {
    const text = readFileSync(filePath, "utf8");
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value.replace(/\\r\\n$/, "").trim();
    }
  } catch {
    // optional
  }
}

loadEnvFile(resolve(__dirname, "../.env.local"));
loadEnvFile(resolve(__dirname, "../../mobile/.env"));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  throw new Error("Supabase URL/KEY가 없어 라이브 목업을 넣을 수 없습니다.");
}

const db = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const stamp = `${Date.now()}`;
const seed = {
  orderId: `MOCK-JOURNEY-${stamp}-ORD`,
  orderNumber: `MOCK-JOURNEY-${stamp}`,
  pickupTrackingNo: `MOCK-JOURNEY-${stamp}-IN`,
  deliveryTrackingNo: `MOCK-JOURNEY-${stamp}-OUT`,
  itemCount: 2,
};

async function cleanup() {
  const { error } = await db
    .from("media")
    .delete()
    .like("path", `${seed.orderId}%`);
  if (error) throw new Error(`목업 삭제 실패: ${error.message}`);
}

async function remainingCount() {
  const { count, error } = await db
    .from("media")
    .select("id", { count: "exact", head: true })
    .like("path", `${seed.orderId}%`);
  if (error) throw new Error(`잔여 조회 실패: ${error.message}`);
  return count ?? 0;
}

async function main() {
  const { order, steps } = runHappyPathJourney(seed);
  let inserted = false;
  try {
    const rows = journeyMediaRows(order).map((row) => ({
      ...row,
      provider: row.type.endsWith("photo") ? "supabase" : "cloudflare",
    }));

    const { error: insertError } = await db.from("media").insert(rows);
    if (insertError) throw new Error(`목업 삽입 실패: ${insertError.message}`);
    inserted = true;

    const keys = collectMediaLookupKeys({
      orderId: order.orderId,
      orderTrackingNo: order.trackingNo,
      pickupTrackingNo: order.pickupTrackingNo,
      deliveryTrackingNo: order.deliveryTrackingNo,
      shipmentTrackingNo: order.trackingNo,
    });

    const { data, error: selectError } = await db
      .from("media")
      .select("id, final_waybill_no, type, path, sequence, expires_at, provider")
      .in("final_waybill_no", keys);
    if (selectError) throw new Error(`목업 조회 실패: ${selectError.message}`);

    const videos = filterAdminOrderVideos(data || []);
    const photos = groupRepairPhotos(data || [], (path) => path);
    const saved = (data || []).filter((row) => String(row.path).startsWith(seed.orderId));

    assert(order.status === "READY_TO_SHIP", "여정 최종 상태");
    assert(saved.length === 6, `여정 미디어 6건 (사진4+영상2), 실제 ${saved.length}`);
    assert(videos.filter((v) => String(v.path).startsWith(seed.orderId)).length === 2, "입고+출고 영상");
    assert(photos[1]?.before && photos[1]?.after && photos[2]?.before && photos[2]?.after, "항목별 수선 전후");
    assert(videos.some((v) => v.type === "inbound_video"), "관리자 입고영상");
    assert(videos.some((v) => v.type === "outbound_video"), "관리자 출고영상");

    console.log("order-ops-journey.live.test.ts: mock verified");
    console.log(steps.join(" → "));
  } finally {
    if (inserted) {
      await cleanup();
      const left = await remainingCount();
      assert(left === 0, `목업이 남아 있음: ${left}건`);
      console.log("order-ops-journey.live.test.ts: mock removed");
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
