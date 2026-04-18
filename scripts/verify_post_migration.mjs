// 마이그레이션 + Edge function 적용 후 라이브 검증
import 'dotenv/config';
import { readFileSync, existsSync } from 'node:fs';
if (!process.env.SUPABASE_URL && existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\r\n]*)"?$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const H = { apikey: SRK, Authorization: `Bearer ${SRK}` };

console.log('=== 1. 신규 테이블 / 컬럼 ===');
for (const t of ['payment_logs', 'webhook_logs']) {
  const r = await fetch(`${URL}/rest/v1/${t}?limit=0`, { headers: H });
  console.log(`  table ${t}: ${r.ok ? 'OK' : r.status}`);
}
const o = await fetch(`${URL}/rest/v1/orders?select=*&limit=1`, { headers: H }).then(r => r.json());
const cols = ['payment_key', 'paid_at', 'canceled_at', 'cancellation_reason'];
for (const c of cols) {
  console.log(`  orders.${c}: ${c in o[0] ? 'OK' : 'MISSING'}`);
}

console.log('\n=== 2. Edge function payments-confirm-toss 응답 ===');
// 잘못된 호출 (필수 파라미터 없음)로 정상 에러 반환 확인
const r1 = await fetch(`${URL}/functions/v1/payments-confirm-toss`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON}` },
  body: JSON.stringify({}),
});
console.log('  파라미터 누락:', r1.status, await r1.text());

// 잘못된 UUID 형태
const r2 = await fetch(`${URL}/functions/v1/payments-confirm-toss`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON}` },
  body: JSON.stringify({ payment_key: 'pk_test_x', order_id: 'NOT_UUID', amount: 1000 }),
});
console.log('  비-UUID order_id:', r2.status, await r2.text());

// MODO_ 형태 (UUID 없음)
const r3 = await fetch(`${URL}/functions/v1/payments-confirm-toss`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON}` },
  body: JSON.stringify({ payment_key: 'pk_test_x', order_id: 'MODO_garbage_xx', amount: 1000 }),
});
console.log('  MODO_ 패턴(UUID없음):', r3.status, await r3.text());

console.log('\n=== 3. 기존 PAID 90건 중 payment_key NULL 비율 ===');
const all = await fetch(`${URL}/rest/v1/orders?payment_status=eq.PAID&select=id,payment_key,paid_at&limit=200`, { headers: H }).then(r => r.json());
const nullKey = all.filter(o => !o.payment_key).length;
const nullPaid = all.filter(o => !o.paid_at).length;
console.log(`  total PAID: ${all.length}, payment_key NULL: ${nullKey}, paid_at NULL: ${nullPaid}`);

console.log('\n검증 완료.');
