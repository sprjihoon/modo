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
const H = { apikey: SRK, Authorization: `Bearer ${SRK}` };

async function get(p) {
  const r = await fetch(`${URL}/rest/v1/${p}`, { headers: H });
  if (!r.ok) return { error: r.status, body: await r.text() };
  return r.json();
}

// 1. orders 한 행 가져와서 모든 컬럼 키 출력
const o = await get('orders?select=*&limit=1');
console.log('\n=== orders columns ===');
if (Array.isArray(o) && o[0]) {
  console.log(Object.keys(o[0]).sort());
} else console.log(o);

// 2. PAID 주문 한 건 자세히
const paidSample = await get('orders?payment_status=eq.PAID&select=*&limit=3&order=created_at.desc');
console.log('\n=== PAID 샘플 3건 (주요 필드) ===');
if (Array.isArray(paidSample)) {
  for (const p of paidSample) {
    const keys = Object.keys(p).filter(k =>
      k.includes('payment') || k.includes('paid') || k.includes('status') ||
      k.includes('cancel') || k === 'id' || k === 'order_number' || k === 'total_price'
    );
    const sub = {};
    keys.forEach(k => sub[k] = p[k]);
    console.log(sub);
  }
}

// 3. 테이블 존재 확인 - 결제 관련 후보들
const candidates = ['payments', 'payment_logs', 'payment_methods', 'extra_charges', 'extra_charge_data',
  'additional_payments', 'extra_charge_requests', 'webhook_logs', 'toss_webhooks',
  'payment_events', 'order_payments'];
console.log('\n=== 테이블 존재 체크 ===');
for (const t of candidates) {
  const r = await fetch(`${URL}/rest/v1/${t}?limit=0`, { headers: H });
  console.log(`  ${t}: ${r.ok ? 'OK' : r.status}`);
}

// 4. payments 테이블 구조
const pay = await get('payments?select=*&limit=1');
console.log('\n=== payments columns ===');
if (Array.isArray(pay) && pay[0]) console.log(Object.keys(pay[0]).sort());
else console.log(pay);

// 5. payments 분포
const payAll = await get('payments?select=status,provider&limit=500');
if (Array.isArray(payAll)) {
  const dist = {};
  payAll.forEach(p => { const k = `${p.provider}/${p.status}`; dist[k] = (dist[k]||0)+1; });
  console.log('payments status 분포:', dist);
}
