// 실제로 orders.payment_key 같은 없는 컬럼을 update하면 어떻게 되는지 확인
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
const H = { apikey: SRK, Authorization: `Bearer ${SRK}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };

// 테스트용 - 존재하는 PENDING 주문 한 건 가져오기
const r = await fetch(`${URL}/rest/v1/orders?payment_status=eq.PENDING&select=id,order_number,payment_status&limit=1`, { headers: H });
const list = await r.json();
if (!list[0]) { console.log('no pending order'); process.exit(0); }
const ord = list[0];
console.log('target order:', ord);

// 1. 존재하지 않는 컬럼 update 시도
const r2 = await fetch(`${URL}/rest/v1/orders?id=eq.${ord.id}`, {
  method: 'PATCH',
  headers: H,
  body: JSON.stringify({ payment_key: 'TEST_KEY', paid_at: new Date().toISOString() }),
});
console.log('\n[1] payment_key + paid_at 만 update:');
console.log('   status:', r2.status);
console.log('   body:', (await r2.text()).substring(0, 300));

// 2. 일부 존재 + 일부 없는 컬럼 mix
const r3 = await fetch(`${URL}/rest/v1/orders?id=eq.${ord.id}`, {
  method: 'PATCH',
  headers: H,
  body: JSON.stringify({
    status: ord.payment_status === 'PENDING' ? 'BOOKED' : 'PENDING', // 토글
    payment_status: 'PAID',
    payment_key: 'TEST_KEY_2',
    paid_at: new Date().toISOString(),
  }),
});
console.log('\n[2] mix (status, payment_status, payment_key, paid_at) update:');
console.log('   status:', r3.status);
console.log('   body:', (await r3.text()).substring(0, 400));

// 다시 원복
await fetch(`${URL}/rest/v1/orders?id=eq.${ord.id}`, {
  method: 'PATCH',
  headers: H,
  body: JSON.stringify({ status: 'PENDING', payment_status: 'PENDING' }),
});

// 3. 모든 결제 관련 컬럼만 따로
const r4 = await fetch(`${URL}/rest/v1/orders?id=eq.${ord.id}`, {
  method: 'PATCH',
  headers: H,
  body: JSON.stringify({ payment_status: 'PAID' }),
});
console.log('\n[3] payment_status만:');
console.log('   status:', r4.status);

await fetch(`${URL}/rest/v1/orders?id=eq.${ord.id}`, {
  method: 'PATCH', headers: H,
  body: JSON.stringify({ payment_status: 'PENDING' }),
});

// 4. canceled_at 시도
const r5 = await fetch(`${URL}/rest/v1/orders?id=eq.${ord.id}`, {
  method: 'PATCH',
  headers: H,
  body: JSON.stringify({ canceled_at: new Date().toISOString() }),
});
console.log('\n[4] canceled_at:');
console.log('   status:', r5.status);
console.log('   body:', (await r5.text()).substring(0, 300));
