// Toss 테스트 API를 직접 호출하여 부분환불 검증
// 1) 먼저 테스트 결제를 직접 confirm (toss 테스트 환경에서 가능)
// 2) confirm으로 받은 paymentKey로 부분환불 테스트
import { readFileSync, existsSync } from 'node:fs';
if (!process.env.SUPABASE_URL && existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\r\n]*)"?$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const TOSS_SECRET = process.env.TOSS_SECRET_KEY;
if (!TOSS_SECRET) { console.error('TOSS_SECRET_KEY 없음'); process.exit(1); }

const isTest = TOSS_SECRET.startsWith('test_sk_');
console.log('키 타입:', isTest ? '테스트키 ✅' : '실키 ⚠️');

const encoded = Buffer.from(`${TOSS_SECRET}:`).toString('base64');

// Toss 테스트에서 실제로 카드 결제를 완료한 paymentKey가 있어야 cancel 테스트 가능.
// 프로그래밍으로 테스트 결제를 만들려면 Toss 위젯 -> confirm 사이클이 필요 (브라우저 필요).
// 대신, 토스에서 제공하는 테스트용 paymentKey 형식으로 cancel 호출 시 어떤 오류가 나는지 확인.

// 실제 존재하지 않는 paymentKey로 cancel 시도 → 오류 내용 확인
const fakePaymentKey = 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq'; // 존재하지 않는 키
const r = await fetch(`https://api.tosspayments.com/v1/payments/${fakePaymentKey}/cancel`, {
  method: 'POST',
  headers: {
    Authorization: `Basic ${encoded}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ cancelReason: '테스트', cancelAmount: 4000 }),
});
const body = await r.json();
console.log('\n[Toss 가짜 paymentKey cancel 응답]');
console.log('status:', r.status);
console.log('body:', JSON.stringify(body, null, 2));

// 결론: payment_key가 있는 실제 트랜잭션에 대해서만 cancel이 작동함.
// 브라우저 UI를 통해 결제 완료 후 paymentKey를 직접 전달받아야 함.
console.log('\n=== 결론 ===');
console.log('Toss 부분환불은 "브라우저에서 실제 결제 완료 → paymentKey 획득" 후에만 테스트 가능.');
console.log('현재 DB의 기존 주문은 모두 payment_key=NULL (migration 012 이전 결제).');
console.log('신규 주문(브라우저 결제 포함) 생성 후 return-and-refund API를 호출해야 Toss 환불까지 검증 가능.');
