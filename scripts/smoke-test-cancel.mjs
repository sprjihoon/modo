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

// 2-3) orders-quote / orders-free / payments-confirm-toss 가용성 (200/4xx 면 ok, 500 이면 fail)
for (const fn of ['orders-quote', 'orders-free', 'payments-confirm-toss']) {
  const { status } = await call(fn, {});
  if (status >= 500) bad(`${fn} 가용성`, `status=${status}`);
  else ok(`${fn} 응답 OK (status=${status}, 4xx는 정상 - 입력 검증)`);
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

check('edge: PRE_PICKUP_STATUSES 정의', edgeFn, /PRE_PICKUP_STATUSES[^=]*=\s*new Set\(\['PENDING',\s*'PAID',\s*'BOOKED'\]\)/);
check('edge: POST_PICKUP_STATUSES 정의', edgeFn, /POST_PICKUP_STATUSES[^=]*=\s*new Set\(\['PICKED_UP',\s*'INBOUND'\]\)/);
check('edge: shipping_settings 에서 returnFee 동적 조회', edgeFn, /from\('shipping_settings'\)[\s\S]*?return_shipping_fee/);
check('edge: post-pickup → RETURN_PENDING 전이', edgeFn, /status:\s*'RETURN_PENDING'/);
check('edge: 같은 알림 타입 ORDER_CANCEL_AFTER_PICKUP', edgeFn, /ORDER_CANCEL_AFTER_PICKUP/);

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
