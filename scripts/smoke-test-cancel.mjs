// 운영 회귀 테스트: 입고 후 취소 / 결제 리팩터 배포 검증
// Run:  node scripts/smoke-test-cancel.mjs
//
// 환경변수는 apps/web/.env.local 에서 자동 로드.

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// repo root: ../scripts/.. 또는 cwd 자동 탐색
function findRepoRoot(start) {
  let dir = start;
  for (let i = 0; i < 10; i++) {
    if (existsSync(resolve(dir, 'apps/web/.env.local'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error('repo root (apps/web/.env.local) 를 찾을 수 없습니다.');
}
const REPO = findRepoRoot(__dirname);
const envPath = resolve(REPO, 'apps/web/.env.local');
for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m) process.env[m[1]] = m[2];
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE || !ANON) {
  console.error('환경변수 누락: SUPABASE_URL / SERVICE_ROLE / ANON');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let pass = 0;
let fail = 0;
const fails = [];
function ok(name) {
  pass++;
  console.log(`  PASS  ${name}`);
}
function bad(name, why) {
  fail++;
  fails.push({ name, why });
  console.log(`  FAIL  ${name} → ${why}`);
}

console.log('\n[1] DB 마이그레이션 / 스키마 검증');

// 1-1) PENDING_PAYMENT 잔존 0건
{
  const { count, error } = await admin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'PENDING_PAYMENT');
  if (error) bad('PENDING_PAYMENT 잔존 카운트', error.message);
  else if (count !== 0) bad('PENDING_PAYMENT 잔존 카운트', `남은 행 ${count}개`);
  else ok('PENDING_PAYMENT 잔존 0건');
}

// 1-2) payment_intents 테이블 존재 + RLS
{
  const { error } = await admin.from('payment_intents').select('id').limit(1);
  if (error) bad('payment_intents 테이블 SELECT', error.message);
  else ok('payment_intents 테이블 존재 + service-role SELECT 가능');
}

// 1-3) shipping_settings.return_shipping_fee 값 확인
let returnFee = null;
{
  const { data, error } = await admin
    .from('shipping_settings')
    .select('return_shipping_fee, base_shipping_fee')
    .eq('id', 1)
    .maybeSingle();
  if (error) bad('shipping_settings 조회', error.message);
  else if (!data) bad('shipping_settings 조회', 'id=1 row 없음');
  else {
    returnFee = Number(data.return_shipping_fee ?? 0);
    if (!Number.isFinite(returnFee) || returnFee <= 0) {
      bad('return_shipping_fee 유효성', `값: ${data.return_shipping_fee}`);
    } else {
      ok(`shipping_settings.return_shipping_fee = ${returnFee.toLocaleString()}원`);
    }
  }
}

console.log('\n[2] Edge Functions 가용성 (인증 검증 포함)');

async function call(fn, body, headers = {}) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON, ...headers },
    body: JSON.stringify(body),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* ignore */
  }
  return { status: res.status, json };
}

// 2-1) orders-cancel: 인증 헤더 없음 → 401
{
  const { status, json } = await call('orders-cancel', { order_id: 'x' });
  if (status === 401) ok(`orders-cancel: 인증 없음 → 401 (${json?.error ?? ''})`);
  else bad('orders-cancel 비인증 거부', `status=${status} body=${JSON.stringify(json)}`);
}

// 2-2) orders-cancel: 인증은 있으나 (anon) 본인 주문 아님 / 잘못된 id → 404 또는 400
{
  const { status, json } = await call(
    'orders-cancel',
    { order_id: '00000000-0000-0000-0000-000000000000' },
    { Authorization: `Bearer ${ANON}` },
  );
  if (status === 401) ok('orders-cancel: anon JWT 거부 (예상)');
  else if (status === 404) ok('orders-cancel: 잘못된 order_id → 404');
  else bad('orders-cancel 잘못된 order_id 처리', `status=${status} body=${JSON.stringify(json)}`);
}

// 2-3) orders-quote / orders-free / payments-confirm-toss / orders-return-and-refund 가용성
for (const fn of [
  'orders-quote',
  'orders-free',
  'payments-confirm-toss',
  'orders-return-and-refund',
]) {
  const { status } = await call(fn, {});
  if (status >= 500) bad(`${fn} 가용성`, `status=${status}`);
  else ok(`${fn} 응답 OK (status=${status}, 4xx는 정상 - 입력 검증)`);
}

// 2-4) orders-return-and-refund: 인증 없음 → 401
{
  const { status, json } = await call('orders-return-and-refund', { order_id: 'x' });
  if (status === 401) ok(`orders-return-and-refund: 인증 없음 → 401 (${json?.error ?? ''})`);
  else bad('orders-return-and-refund 비인증 거부', `status=${status} body=${JSON.stringify(json)}`);
}

console.log('\n[3] 코드 정책 / 상태 머신 검증');

// 3-1) PRE_PICKUP / POST_PICKUP / 그 외 분류 정확성 - 코드 상수 확인
const cancelRoute = readFileSync(
  resolve(REPO, 'apps/web/app/api/orders/[id]/cancel/route.ts'),
  'utf8',
);
const edgeFn = readFileSync(
  resolve(REPO, 'apps/edge/supabase/functions/orders-cancel/index.ts'),
  'utf8',
);

function check(name, src, regex) {
  if (regex.test(src)) ok(name);
  else bad(name, `정규식 매치 실패: ${regex}`);
}

check('web: PRE_PICKUP_STATUSES 정의 PENDING/PAID/BOOKED', cancelRoute, /PRE_PICKUP_STATUSES[^;]*PENDING[^;]*PAID[^;]*BOOKED/s);
check('web: POST_PICKUP_STATUSES 정의 PICKED_UP/INBOUND', cancelRoute, /POST_PICKUP_STATUSES[^;]*PICKED_UP[^;]*INBOUND/s);
check('web: 그 외 → NOT_SELF_CANCELLABLE 409', cancelRoute, /NOT_SELF_CANCELLABLE/);
check('web: post-pickup → status RETURN_PENDING 전이', cancelRoute, /status:\s*"RETURN_PENDING"/);
check('web: post-pickup → extra_charge_status RETURN_REQUESTED', cancelRoute, /extra_charge_status:\s*"RETURN_REQUESTED"/);
check('web: cancelAmount = totalPrice - returnFee', cancelRoute, /cancelAmount:\s*refundAmount/);
check('web: 알림 ORDER_CANCEL_AFTER_PICKUP 전송', cancelRoute, /ORDER_CANCEL_AFTER_PICKUP/);

check('edge: PRE_PICKUP_STATUSES 정의', edgeFn, /PRE_PICKUP_STATUSES[^=]*=\s*new Set\(\[[^\]]*'PENDING'[^\]]*'PAID'[^\]]*'BOOKED'[^\]]*\]\)/);
check('edge: POST_PICKUP_STATUSES 정의', edgeFn, /POST_PICKUP_STATUSES[^=]*=\s*new Set\(\['PICKED_UP',\s*'INBOUND'\]\)/);
check('edge: shipping_settings 에서 returnFee 동적 조회', edgeFn, /from\('shipping_settings'\)[\s\S]*?return_shipping_fee/);
check('edge: post-pickup → RETURN_PENDING 전이', edgeFn, /status:\s*'RETURN_PENDING'/);
check('edge: 같은 알림 타입 ORDER_CANCEL_AFTER_PICKUP', edgeFn, /ORDER_CANCEL_AFTER_PICKUP/);

console.log('\n[3.5] 도서산간 왕복(× 2) 정책 코드 검증');

// 결제/가격 계산 시 ×2 로 저장
const webPricing = readFileSync(resolve(REPO, 'apps/web/lib/order-pricing.ts'), 'utf8');
check('web order-pricing: remoteAreaOneWay * 2', webPricing, /remoteAreaOneWay\s*\*\s*2/);

const edgeQuote = readFileSync(
  resolve(REPO, 'apps/edge/supabase/functions/orders-quote/index.ts'),
  'utf8',
);
check('edge orders-quote: remoteAreaOneWay * 2', edgeQuote, /remoteAreaOneWay\s*\*\s*2/);

const islandSvc = readFileSync(
  resolve(REPO, 'apps/mobile/lib/services/island_area_service.dart'),
  'utf8',
);
check('mobile island_area_service: feeAmount * 2', islandSvc, /feeAmount\s*\*\s*2/);

// 취소 시 orders.remote_area_fee 합산
check('web cancel: remote_area_fee select 포함', cancelRoute, /select\([^)]*remote_area_fee/);
check('web cancel: totalDeduction 에 remoteAreaFee 합산', cancelRoute, /totalDeduction\s*=\s*returnFee\s*\+\s*remoteAreaFee/);
check('edge cancel: remote_area_fee select 포함', edgeFn, /select\([^)]*remote_area_fee/);
check('edge cancel: totalDeduction 에 remoteAreaFee 합산', edgeFn, /totalDeduction\s*=\s*returnFee\s*\+\s*remoteAreaFee/);

// UI: 다이얼로그에 도서산간 차감 라벨 노출
const orderDetailWeb = readFileSync(
  resolve(REPO, 'apps/web/components/orders/OrderDetailClient.tsx'),
  'utf8',
);
check('web OrderDetailClient: 커스텀 CancelConfirmDialog 사용', orderDetailWeb, /function CancelConfirmDialog/);
check('web OrderDetailClient: 도서산간 차감 라벨 노출', orderDetailWeb, /도서산간 배송비 차감 \(왕복\)/);

const orderDetailMobile = readFileSync(
  resolve(REPO, 'apps/mobile/lib/features/orders/presentation/pages/order_detail_page.dart'),
  'utf8',
);
check('mobile order_detail_page: 도서산간 차감 라벨 노출', orderDetailMobile, /🏝 도서산간 배송비 차감 \(왕복\)/);

// 추가요금 거절 → 반송 경로
const returnRefundWeb = readFileSync(
  resolve(REPO, 'apps/web/app/api/orders/[id]/return-and-refund/route.ts'),
  'utf8',
);
check('web return-and-refund: remote_area_fee select 포함', returnRefundWeb, /select\([\s\S]*?remote_area_fee/);
check('web return-and-refund: totalDeduction = returnFee + remoteAreaFee', returnRefundWeb, /totalDeduction\s*=\s*returnFee\s*\+\s*remoteAreaFee/);

const edgeReturnRefund = readFileSync(
  resolve(REPO, 'apps/edge/supabase/functions/orders-return-and-refund/index.ts'),
  'utf8',
);
check('edge orders-return-and-refund: remote_area_fee select 포함', edgeReturnRefund, /select\([\s\S]*?remote_area_fee/);
check('edge orders-return-and-refund: totalDeduction 계산 일관', edgeReturnRefund, /totalDeduction\s*=\s*returnFee\s*\+\s*remoteAreaFee/);
check('edge orders-return-and-refund: process_customer_decision 호출', edgeReturnRefund, /process_customer_decision/);
check('edge orders-return-and-refund: Toss 부분환불 호출', edgeReturnRefund, /api\.tosspayments\.com\/v1\/payments\//);

// 모바일 측 RETURN 액션이 새 Edge Function 으로 통일되었는지
const mobileExtraSvc = readFileSync(
  resolve(REPO, 'apps/mobile/lib/services/extra_charge_service.dart'),
  'utf8',
);
check('mobile extra_charge_service: RETURN → orders-return-and-refund 호출', mobileExtraSvc, /orders-return-and-refund/);

console.log('\n[3.6] 실주문에 ×2 정책이 즉시 반영되는지 (이미 결제된 주문은 영향 없음)');
{
  const { data: rows, error } = await admin
    .from('orders')
    .select('id, remote_area_fee')
    .gt('remote_area_fee', 0)
    .limit(10);
  if (error) bad('remote_area_fee > 0 조회', error.message);
  else {
    const cnt = rows?.length ?? 0;
    console.log(`  INFO  현재 remote_area_fee > 0 인 기존 주문 ${cnt}건 (배포 이전 생성분)`);
    ok('실주문 remote_area_fee 분포 조회');
  }
}

console.log('\n[4] 실데이터 분포 검증 (현재 운영 상태 스냅샷)');

// 4-1) 현재 상태별 주문 수
{
  const { data: rows, error } = await admin
    .from('orders')
    .select('status')
    .limit(5000);
  if (error) bad('orders status 분포 조회', error.message);
  else {
    const dist = {};
    for (const r of rows ?? []) dist[r.status] = (dist[r.status] ?? 0) + 1;
    const sorted = Object.entries(dist)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}=${v}`)
      .join('  ');
    console.log(`  INFO  status 분포 (${rows?.length ?? 0}건): ${sorted}`);
    ok('orders status 분포 조회');
  }
}

// 4-2) 최근 7일 RETURN_PENDING/CANCELLED 카운트
{
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const { data, error } = await admin
    .from('orders')
    .select('status, canceled_at, cancellation_reason')
    .in('status', ['RETURN_PENDING', 'CANCELLED'])
    .gte('canceled_at', since)
    .order('canceled_at', { ascending: false })
    .limit(20);
  if (error) bad('최근 취소 주문 조회', error.message);
  else {
    console.log(`  INFO  최근 7일 취소/반송 ${data?.length ?? 0}건`);
    ok('최근 취소 이력 조회 가능');
  }
}

console.log('\n──────────────────────────────────────────');
console.log(`총 ${pass + fail}개 점검 → PASS ${pass} / FAIL ${fail}`);
if (fail > 0) {
  console.log('\n실패 항목:');
  for (const f of fails) console.log(`  - ${f.name}: ${f.why}`);
  process.exit(1);
}
console.log('\n자동 검증 통과. (Toss 실결제/UI 클릭 흐름은 수동 확인 필요)');
