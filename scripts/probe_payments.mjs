// 결제 후처리/환불/추가요금 상태 진단
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
if (!URL || !SRK) { console.error('env missing'); process.exit(1); }

const H = { apikey: SRK, Authorization: `Bearer ${SRK}` };
const get = async (p) => {
  const r = await fetch(`${URL}/rest/v1/${p}`, { headers: H });
  if (!r.ok) { console.error(p, r.status, await r.text()); return null; }
  return r.json();
};

// 1. payment_logs 최근 30 - order_id 패턴 분석
console.log('\n=== payment_logs (recent 30) ===');
const logs = await get('payment_logs?select=order_id,payment_key,amount,status,provider,approved_at&order=approved_at.desc.nullslast&limit=30');
if (logs) {
  const patterns = { uuid: 0, MODO_: 0, EXTRA_: 0, other: 0, null: 0 };
  for (const l of logs) {
    const id = l.order_id;
    if (!id) patterns.null++;
    else if (/^[0-9a-f]{8}-/.test(id)) patterns.uuid++;
    else if (id.startsWith('MODO_')) patterns.MODO_++;
    else if (id.startsWith('EXTRA_')) patterns.EXTRA_++;
    else patterns.other++;
  }
  console.log('order_id 패턴 분포:', patterns);
  console.log('샘플 (최근 5):');
  logs.slice(0, 5).forEach(l => console.log(`  ${l.status} ${l.amount}원 ${l.order_id?.substring(0, 40)} @ ${l.approved_at}`));
}

// 2. orders - 모바일 결제 추정 (paid_at 있고, paymentKey 형식으로 식별 가능)
console.log('\n=== orders.payment_status 분포 ===');
const ps = await get('orders?select=payment_status&limit=1000');
if (ps) {
  const dist = {};
  ps.forEach(o => { dist[o.payment_status || 'null'] = (dist[o.payment_status || 'null'] || 0) + 1; });
  console.log(dist);
}

// 3. orders 최근 PAID 30개
console.log('\n=== orders 최근 PAID 10 ===');
const paid = await get('orders?payment_status=eq.PAID&select=id,order_number,total_price,payment_key,paid_at,created_at&order=paid_at.desc.nullslast&limit=10');
if (paid) {
  for (const o of paid) {
    console.log(`  ${o.order_number} ${o.total_price}원 pk=${o.payment_key?.substring(0,20)} paid=${o.paid_at}`);
  }
}

// 4. extra_charge_status 분포
console.log('\n=== orders.extra_charge_status 분포 ===');
const ec = await get('orders?extra_charge_status=not.is.null&select=extra_charge_status,id&limit=1000');
if (ec) {
  const dist = {};
  ec.forEach(o => { dist[o.extra_charge_status] = (dist[o.extra_charge_status] || 0) + 1; });
  console.log(dist);
}

// 5. extra_charge_requests 테이블 존재 여부 + 상태
console.log('\n=== extra_charge_requests 테이블 ===');
const ecr = await get('extra_charge_requests?select=id,status&limit=20');
if (ecr) {
  console.log(`row count(<=20): ${ecr.length}`);
  const dist = {};
  ecr.forEach(o => { dist[o.status] = (dist[o.status] || 0) + 1; });
  console.log(dist);
}

// 6. additional_payments 테이블
console.log('\n=== additional_payments 테이블 ===');
const ap = await get('additional_payments?select=id,status&limit=20');
if (ap) {
  console.log(`row count(<=20): ${ap.length}`);
  const dist = {};
  ap.forEach(o => { dist[o.status] = (dist[o.status] || 0) + 1; });
  console.log(dist);
}

// 7. orders 최근 CANCELLED
console.log('\n=== orders 최근 CANCELLED/CANCELED 10 ===');
const cancelled = await get('orders?or=(status.eq.CANCELLED,status.eq.CANCELED,payment_status.eq.CANCELED,payment_status.eq.PARTIAL_CANCELED)&select=id,order_number,status,payment_status,canceled_at,paid_at,total_price&order=created_at.desc&limit=10');
if (cancelled) {
  for (const o of cancelled) {
    console.log(`  ${o.order_number} status=${o.status} pay=${o.payment_status} canceled=${o.canceled_at} paid=${o.paid_at} ${o.total_price}원`);
  }
}

// 8. webhook_logs 최근 5
console.log('\n=== webhook_logs 최근 5 ===');
const wl = await get('webhook_logs?select=event_type,received_at,order_id&order=received_at.desc.nullslast&limit=5');
if (wl) wl.forEach(w => console.log(`  ${w.event_type} ${w.received_at} ${w.order_id}`));

console.log('\nDone.');
