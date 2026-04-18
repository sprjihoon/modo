// 마이그레이션 013 검증: payment_status enum에 'CANCELED' / 'PARTIAL_CANCELED' update 가능한지
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
if (!URL || !SRK) { console.error('env 누락'); process.exit(1); }

const headers = {
  'apikey': SRK,
  'Authorization': `Bearer ${SRK}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

// 1) 실제 주문 1건 조회
const ord = await fetch(`${URL}/rest/v1/orders?select=id,payment_status&limit=1`, { headers }).then(r => r.json());
if (!Array.isArray(ord) || ord.length === 0) { console.error('주문 없음'); process.exit(1); }
const target = ord[0];
console.log('대상 주문:', target);
const original = target.payment_status;

async function tryUpdate(value) {
  const r = await fetch(`${URL}/rest/v1/orders?id=eq.${target.id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ payment_status: value }),
  });
  const txt = await r.text();
  return { status: r.status, body: txt.slice(0, 200) };
}

console.log('\n[테스트] payment_status = CANCELED');
const r1 = await tryUpdate('CANCELED');
console.log(r1);

console.log('\n[테스트] payment_status = PARTIAL_CANCELED');
const r2 = await tryUpdate('PARTIAL_CANCELED');
console.log(r2);

console.log('\n[복원] payment_status = ' + original);
const r3 = await tryUpdate(original);
console.log(r3);

console.log('\n결과:');
console.log('  CANCELED         →', r1.status === 200 ? 'OK' : 'FAIL');
console.log('  PARTIAL_CANCELED →', r2.status === 200 ? 'OK' : 'FAIL');
console.log('  복원             →', r3.status === 200 ? 'OK' : 'FAIL');
