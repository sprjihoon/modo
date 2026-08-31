/**
 * 관리자 사진/영상 조회 라이브 검증.
 * media 목업 1건을 넣었다가, 주문 상세와 같은 로직으로 확인한 뒤 반드시 삭제한다.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  collectMediaLookupKeys,
  filterAdminOrderVideos,
  groupRepairPhotos,
} from "./admin-media";

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
const pickup = `MOCK-ADMIN-VERIFY-${stamp}-IN`;
const delivery = `MOCK-ADMIN-VERIFY-${stamp}-OUT`;
const tracking = `MOCK-ADMIN-VERIFY-${stamp}-TN`;
const orderId = `MOCK-ADMIN-VERIFY-${stamp}-ORD`;
const prefix = `MOCK-ADMIN-VERIFY-${stamp}`;

async function cleanup() {
  const { error } = await db
    .from("media")
    .delete()
    .like("final_waybill_no", `${prefix}%`);
  if (error) throw new Error(`목업 삭제 실패: ${error.message}`);
}

async function remainingCount() {
  const { count, error } = await db
    .from("media")
    .select("id", { count: "exact", head: true })
    .like("final_waybill_no", `${prefix}%`);
  if (error) throw new Error(`잔여 조회 실패: ${error.message}`);
  return count ?? 0;
}

async function main() {
  let inserted = false;
  try {
    const expiresLater = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
    const expiresPast = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { error: insertError } = await db.from("media").insert([
      {
        final_waybill_no: pickup,
        type: "before_photo",
        provider: "supabase",
        path: `${orderId}/before_photo_1_mock.jpg`,
        sequence: 1,
      },
      {
        final_waybill_no: pickup,
        type: "before_photo",
        provider: "supabase",
        path: `${orderId}/before_photo_2_mock.jpg`,
        sequence: 2,
      },
      {
        final_waybill_no: tracking,
        type: "after_photo",
        provider: "supabase",
        path: `${orderId}/after_photo_1_mock.jpg`,
        sequence: 1,
      },
      {
        final_waybill_no: tracking,
        type: "after_photo",
        provider: "supabase",
        path: `${orderId}/after_photo_2_mock.jpg`,
        sequence: 2,
      },
      {
        final_waybill_no: pickup,
        type: "inbound_video",
        provider: "cloudflare",
        path: `${prefix}-inbound-uid`,
        sequence: 1,
        expires_at: expiresLater,
      },
      {
        final_waybill_no: delivery,
        type: "outbound_video",
        provider: "cloudflare",
        path: `${prefix}-outbound-uid`,
        sequence: 1,
        expires_at: expiresLater,
      },
      {
        final_waybill_no: delivery,
        type: "outbound_video",
        provider: "cloudflare",
        path: `${prefix}-expired-uid`,
        sequence: 9,
        expires_at: expiresPast,
      },
      {
        final_waybill_no: pickup,
        type: "box_open_video",
        provider: "cloudflare",
        path: `${prefix}-box-uid`,
        sequence: 0,
      },
    ]);
    if (insertError) throw new Error(`목업 삽입 실패: ${insertError.message}`);
    inserted = true;

    const keys = collectMediaLookupKeys({
      orderId,
      orderTrackingNo: tracking,
      pickupTrackingNo: pickup,
      deliveryTrackingNo: delivery,
      shipmentTrackingNo: tracking,
    });

    const { data: rows, error: selectError } = await db
      .from("media")
      .select("id, final_waybill_no, type, path, sequence, expires_at, provider")
      .in("final_waybill_no", keys)
      .order("type")
      .order("sequence");
    if (selectError) throw new Error(`목업 조회 실패: ${selectError.message}`);

    const videos = filterAdminOrderVideos(rows || []);
    const photos = groupRepairPhotos(rows || [], (path) => `https://mock.cdn/${path}`);

    assert((rows || []).length === 8, `저장 8건이어야 함 (실제 ${(rows || []).length})`);
    assert(videos.length === 2, `유효 영상 2건이어야 함 (실제 ${videos.length})`);
    assert(videos.some((v) => v.type === "inbound_video" && v.path === `${prefix}-inbound-uid`), "입고영상");
    assert(videos.some((v) => v.type === "outbound_video" && v.path === `${prefix}-outbound-uid`), "출고영상");
    assert(videos.every((v) => v.path !== `${prefix}-expired-uid`), "만료 출고영상 제외");
    assert(videos.every((v) => v.type !== "box_open_video"), "박스오픈은 주문 상세 영상에서 제외");
    assert(photos[1]?.before?.includes("before_photo_1_mock") === true, "1번 수선전");
    assert(photos[1]?.after?.includes("after_photo_1_mock") === true, "1번 수선후");
    assert(photos[2]?.before?.includes("before_photo_2_mock") === true, "2번 수선전");
    assert(photos[2]?.after?.includes("after_photo_2_mock") === true, "2번 수선후");

    console.log("admin-media.live.test.ts: mock verified");
  } finally {
    if (inserted) {
      await cleanup();
      const left = await remainingCount();
      assert(left === 0, `목업이 남아 있음: ${left}건`);
      console.log("admin-media.live.test.ts: mock removed");
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
