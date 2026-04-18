// 테스트: 기존 주문을 PENDING_CUSTOMER 상태로 설정 후 RETURN 처리 검증
// 사용할 주문: 2896717e (INBOUND, PAID, 10,000원, no payment_key)
import { readFileSync, existsSync } from 'node:fs';
if (!process.env.SUPABASE_URL && existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\r\n]*)"?$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;
const headers = { apikey: SRK, Authorization: `Bearer ${SRK}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };

// 테스트 주문: 2896717e-22e5-4a9a-9624-86f4fc107d5a (10,000원, user_id=93f046c1)
const ORDER_ID = '2896717e-22e5-4a9a-9624-86f4fc107d5a';
const USER_ID = '93f046c1-fd61-4f73-b5c2-018d79c742a9';

// Step 1: 현재 상태 확인
const before = await fetch(`${URL}/rest/v1/orders?id=eq.${ORDER_ID}&select=id,status,payment_status,extra_charge_status,extra_charge_data,payment_key`, { headers }).then(r => r.json());
console.log('=== [BEFORE] ===');
console.log(JSON.stringify(before[0], null, 2));

// Step 2: extra_charge_status를 PENDING_CUSTOMER로 설정 (admin이 추가요금 등록한 것처럼)
// RPC 사용 대신 직접 update (service role)
const setupResult = await fetch(`${URL}/rest/v1/orders?id=eq.${ORDER_ID}`, {
  method: 'PATCH',
  headers,
  body: JSON.stringify({
    extra_charge_status: 'PENDING_CUSTOMER',
    extra_charge_data: {
      requestedAt: new Date().toISOString(),
      managerId: 'test_admin',
      price: 3000,
      note: '테스트 추가요금 - 부분환불 검증용',
    },
    status: 'HOLD',
  }),
}).then(r => r.json());
console.log('\n=== [SETUP] extra_charge_status = PENDING_CUSTOMER ===');
console.log(JSON.stringify(setupResult[0]?.extra_charge_status, null, 2));

// Step 3: process_customer_decision('RETURN') 호출
const rpcResult = await fetch(`${URL}/rest/v1/rpc/process_customer_decision`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ p_order_id: ORDER_ID, p_action: 'RETURN', p_customer_id: USER_ID }),
}).then(r => r.json());
console.log('\n=== [RPC process_customer_decision RETURN] ===');
console.log(JSON.stringify(rpcResult, null, 2));

// Step 4: 상태 확인
const after = await fetch(`${URL}/rest/v1/orders?id=eq.${ORDER_ID}&select=id,status,payment_status,extra_charge_status,extra_charge_data,payment_key,canceled_at,cancellation_reason`, { headers }).then(r => r.json());
console.log('\n=== [AFTER] ===');
console.log(JSON.stringify(after[0], null, 2));

// Step 5: payment_key 없어서 Toss 환불 미발생 → payment_logs 확인
const logs = await fetch(`${URL}/rest/v1/payment_logs?order_id=eq.${ORDER_ID}&select=*`, { headers }).then(r => r.json());
console.log('\n=== [payment_logs] ===');
console.log(JSON.stringify(logs, null, 2));

console.log('\n=== 검증 결과 ===');
const a = after[0];
console.log('extra_charge_status:', a.extra_charge_status === 'RETURN_REQUESTED' ? 'OK (RETURN_REQUESTED)' : 'FAIL: ' + a.extra_charge_status);
console.log('order status:', a.status === 'RETURN_PENDING' ? 'OK (RETURN_PENDING)' : 'FAIL: ' + a.status);
console.log('payment_key:', a.payment_key || '(없음 - Toss 환불 skip 예상)');
console.log('payment_logs:', logs.length, '건');
