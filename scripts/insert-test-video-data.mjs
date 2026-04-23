/**
 * 수선 전후 영상 테스트 데이터 삽입 스크립트
 * 
 * 실행: node scripts/insert-test-video-data.mjs
 */

import 'dotenv/config';
import { readFileSync, existsSync } from 'node:fs';
if (!process.env.SUPABASE_URL && existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\r\n]*)"?$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

// 공개 샘플 영상 URL (MDN CC0 라이선스 - 공개 접근 가능)
const SAMPLE_INBOUND_VIDEO = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
const SAMPLE_OUTBOUND_VIDEO = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4";

// 이다해 주문 - 입고완료 상태, 수거 송장: 7890100598112
const TARGET_TRACKING_NO = "7890100598112";

async function query(table, method, body) {
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  const res = await fetch(url, {
    method,
    headers: {
      "apikey": SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) };
  } catch {
    return { ok: res.ok, status: res.status, data: text };
  }
}

async function main() {
  console.log("🔍 기존 미디어 레코드 확인...");

  // 기존 테스트 레코드 삭제
  const deleteRes = await fetch(
    `${SUPABASE_URL}/rest/v1/media?final_waybill_no=eq.${TARGET_TRACKING_NO}&type=in.(inbound_video,outbound_video)`,
    {
      method: "DELETE",
      headers: {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      },
    }
  );
  console.log(`🗑️  기존 레코드 삭제: ${deleteRes.status}`);

  // 입고 영상 삽입 (sequence=1)
  console.log("\n📹 입고 영상 삽입 중...");
  const inboundRes = await query("media", "POST", {
    type: "inbound_video",
    path: SAMPLE_INBOUND_VIDEO,
    provider: "direct",
    final_waybill_no: TARGET_TRACKING_NO,
    sequence: 1,
    order_id: null,
  });
  if (inboundRes.ok) {
    console.log("✅ 입고 영상 삽입 성공:", inboundRes.data?.[0]?.id ?? inboundRes.data);
  } else {
    console.error("❌ 입고 영상 삽입 실패:", inboundRes.data);
    // id 컬럼 없이 재시도
    const retry = await query("media", "POST", {
      type: "inbound_video",
      path: SAMPLE_INBOUND_VIDEO,
      provider: "direct",
      final_waybill_no: TARGET_TRACKING_NO,
      sequence: 1,
    });
    console.log("  재시도:", retry.ok ? "✅ 성공" : "❌ 실패", retry.data);
  }

  // 출고 영상 삽입 (sequence=1)
  console.log("\n📹 출고 영상 삽입 중...");
  const outboundRes = await query("media", "POST", {
    type: "outbound_video",
    path: SAMPLE_OUTBOUND_VIDEO,
    provider: "direct",
    final_waybill_no: TARGET_TRACKING_NO,
    sequence: 1,
    order_id: null,
  });
  if (outboundRes.ok) {
    console.log("✅ 출고 영상 삽입 성공:", outboundRes.data?.[0]?.id ?? outboundRes.data);
  } else {
    console.error("❌ 출고 영상 삽입 실패:", outboundRes.data);
    const retry = await query("media", "POST", {
      type: "outbound_video",
      path: SAMPLE_OUTBOUND_VIDEO,
      provider: "direct",
      final_waybill_no: TARGET_TRACKING_NO,
      sequence: 1,
    });
    console.log("  재시도:", retry.ok ? "✅ 성공" : "❌ 실패", retry.data);
  }

  // 확인
  console.log("\n🔍 삽입된 레코드 조회...");
  const checkRes = await fetch(
    `${SUPABASE_URL}/rest/v1/media?final_waybill_no=eq.${TARGET_TRACKING_NO}&type=in.(inbound_video,outbound_video)&select=id,type,path,sequence,final_waybill_no`,
    {
      headers: {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      },
    }
  );
  const records = await checkRes.json();
  console.log("📋 삽입된 레코드:");
  for (const r of records) {
    console.log(`  [${r.type}] seq=${r.sequence} id=${r.id}`);
    console.log(`    path: ${r.path}`);
  }

  console.log("\n✅ 완료!");
  console.log(`\n🌐 웹에서 확인: https://modo.mom/orders/[이다해 주문 UUID]`);
  console.log(`   (admin 대시보드에서 이다해 주문의 UUID를 찾아 접속하세요)`);
}

main().catch(console.error);
