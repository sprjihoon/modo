// 추가요금 반송 테스트에 적합한 주문 조회
// 조건: payment_status=PAID + total_price >= 7000 + extra_charge_status IS NULL or PENDING_CUSTOMER
import { readFileSync, existsSync } from 'node:fs';
if (!process.env.SUPABASE_URL && existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\r\n]*)"?$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;

const headers = { apikey: SRK, Authorization: `Bearer ${SRK}` };

// 1) PAID + total >= 7000 + 취소 안된 주문
const r = await fetch(
  `${URL}/rest/v1/orders?select=id,order_number,status,payment_status,payment_key,total_price,extra_charge_status,user_id&payment_status=eq.PAID&status=neq.CANCELLED&total_price=gte.7000&order=created_at.desc&limit=10`,
  { headers }
).then(r => r.json());

console.log('== PAID + >=7000원 주문 ==');
for (const o of r) {
  console.log(JSON.stringify({
    id: o.id,
    order_number: o.order_number,
    status: o.status,
    payment_status: o.payment_status,
    has_payment_key: !!o.payment_key,
    total_price: o.total_price,
    extra_charge_status: o.extra_charge_status,
    user_id: o.user_id,
  }));
}

// 2) 이미 PENDING_CUSTOMER인 주문
const r2 = await fetch(
  `${URL}/rest/v1/orders?select=id,order_number,status,payment_status,payment_key,total_price,extra_charge_status,user_id&extra_charge_status=eq.PENDING_CUSTOMER&limit=5`,
  { headers }
).then(r => r.json());

console.log('\n== 이미 PENDING_CUSTOMER인 주문 ==');
for (const o of r2) {
  console.log(JSON.stringify({
    id: o.id,
    order_number: o.order_number,
    status: o.status,
    payment_status: o.payment_status,
    has_payment_key: !!o.payment_key,
    total_price: o.total_price,
  }));
}
