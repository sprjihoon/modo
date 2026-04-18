/**
 * 수선 카테고리 계층화 스크립트
 * 1. parent_category_id 컬럼 추가 (DDL)
 * 2. 대카테고리(상의/하의/공통사항) 생성
 * 3. 기존 카테고리 → 대카테고리 하위로 분류
 * 4. 테스트 카테고리 정리
 */

const SUPABASE_URL = 'https://rzrwediccbamxluegnex.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6cndlZGljY2JhbXhsdWVnbmV4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjkzNjQ0NSwiZXhwIjoyMDc4NTEyNDQ1fQ.L3vjKx_Ik3VrArap92KtFBCnRKo7vZ8pB1IwpmU0ao8';
const PROJECT_REF = 'rzrwediccbamxluegnex';

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

// ── 헬퍼 ──
const get = (path) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers }).then(r => r.json());

const post = (table, body) =>
  fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST', headers, body: JSON.stringify(body),
  }).then(r => r.json());

const patch = (table, filter, body) =>
  fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: 'PATCH', headers, body: JSON.stringify(body),
  }).then(r => r.json());

const del = (table, filter) =>
  fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: 'DELETE', headers,
  }).then(r => r.ok ? '삭제됨' : r.text());

// Management API (DDL)
const runSQL = async (sql) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  return { ok: r.ok, status: r.status, body: await r.text() };
};

// ── STEP 1: DDL - parent_category_id 컬럼 추가 ──
console.log('\n[STEP 1] parent_category_id 컬럼 추가 시도...');
const ddlResult = await runSQL(`
  ALTER TABLE public.repair_categories
    ADD COLUMN IF NOT EXISTS parent_category_id UUID REFERENCES public.repair_categories(id) ON DELETE SET NULL;
  CREATE INDEX IF NOT EXISTS idx_repair_categories_parent_id
    ON public.repair_categories(parent_category_id);
`);
console.log(`  Management API 응답: ${ddlResult.status}`);
if (ddlResult.ok) {
  console.log('  ✅ DDL 성공');
} else {
  console.log(`  ⚠️  DDL 실패 (PAT 필요): ${ddlResult.body.substring(0, 200)}`);
  console.log('  → Supabase Studio에서 수동 실행 필요');
  console.log('  → 지금은 데이터 준비만 진행합니다\n');
}

// ── 현재 상태 로드 ──
const cats = await get('repair_categories?select=*&order=display_order.asc');
const hasParent = cats.length > 0 && 'parent_category_id' in cats[0];
console.log(`\n[INFO] parent_category_id 컬럼 존재: ${hasParent}`);
console.log(`[INFO] 현재 카테고리 수: ${cats.length}개`);

// ── 테스트/빈 카테고리 정리 ──
const testCatIds = [
  '2056eec7-c694-494a-b170-b998c01ddb60', // ㅇㄴㅁㄹ
  'b5d8015f-fae1-4e4a-93ea-c31886c15ff7', // 테스트
  'e7182d7a-868b-495f-a7e7-1f472b6d3c3e', // 테스트카테고리
  '99f6e860-4a51-458a-9d9b-2339f0c94fe2', // SVG테스트
  '2cf39122-3ea6-41d7-b160-3ea94b643ca0', // 자동테스트카테고리
  'ff85a54e-7798-4af6-842b-5a218af97429', // 테스트22
  '7387d1ab-1fe1-4632-a87f-3b0974ade499', // 🧪 9케이스 검증
];

console.log('\n[STEP 2] 테스트 카테고리 수선항목 삭제...');
for (const id of testCatIds) {
  await del('repair_types', `category_id=eq.${id}`);
  await del('repair_categories', `id=eq.${id}`);
}
console.log('  ✅ 테스트 카테고리 정리 완료');

// ── 대카테고리 생성 ──
console.log('\n[STEP 3] 대카테고리 생성...');

// 기존 대카테고리가 있는지 확인
const existingCats = await get('repair_categories?select=*&order=display_order.asc');
const find = (name) => existingCats.find(c => c.name === name);

let mainUpper = find('상의');
let mainLower = find('하의');
let mainCommon = find('공통사항');

if (!mainUpper) {
  const r = await post('repair_categories', { name: '상의', display_order: 1, is_active: true });
  mainUpper = Array.isArray(r) ? r[0] : r;
  console.log(`  ✅ 상의 생성: ${mainUpper?.id}`);
} else {
  await patch('repair_categories', `id=eq.${mainUpper.id}`, { display_order: 1 });
  console.log(`  ✓ 상의 이미 존재: ${mainUpper.id}`);
}

if (!mainLower) {
  const r = await post('repair_categories', { name: '하의', display_order: 2, is_active: true });
  mainLower = Array.isArray(r) ? r[0] : r;
  console.log(`  ✅ 하의 생성: ${mainLower?.id}`);
} else {
  await patch('repair_categories', `id=eq.${mainLower.id}`, { display_order: 2 });
  console.log(`  ✓ 하의 이미 존재: ${mainLower.id}`);
}

if (!mainCommon) {
  const r = await post('repair_categories', { name: '공통사항', display_order: 3, is_active: true });
  mainCommon = Array.isArray(r) ? r[0] : r;
  console.log(`  ✅ 공통사항 생성: ${mainCommon?.id}`);
} else {
  await patch('repair_categories', `id=eq.${mainCommon.id}`, { display_order: 3 });
  console.log(`  ✓ 공통사항 이미 존재: ${mainCommon.id}`);
}

if (!hasParent) {
  console.log('\n⚠️  parent_category_id 컬럼이 없어 계층 구조를 설정할 수 없습니다.');
  console.log('   Supabase Studio → SQL Editor에서 아래 SQL을 실행한 후 이 스크립트를 다시 실행하세요:\n');
  console.log('   ALTER TABLE public.repair_categories');
  console.log('     ADD COLUMN IF NOT EXISTS parent_category_id UUID REFERENCES public.repair_categories(id) ON DELETE SET NULL;');
  console.log('   CREATE INDEX IF NOT EXISTS idx_repair_categories_parent_id');
  console.log('     ON public.repair_categories(parent_category_id);\n');
  process.exit(0);
}

// ── parent_category_id 설정 ──
console.log('\n[STEP 4] 소카테고리 → 대카테고리 연결...');

// 상의 하위: 티셔츠, 셔츠/맨투맨, 원피스, 니트/스웨터, 아우터, 부속품 수선(상의)
const upperIds = [
  'f245a903-5494-4026-91d9-d30106333016', // 티셔츠
  '9f61bdf4-fb1f-4566-8b6f-937f0e134844', // 셔츠/맨투맨
  '7b18f52f-4d8d-49ab-bf9c-cb1647e8fe7e', // 원피스
  'f1849062-4724-4523-a787-c8eae4082d83', // 니트/스웨터
  'fbb34040-8e0c-49f7-a9ca-2546b4799b9a', // 아우터
];

// 하의 하위: 바지, 청바지, 치마, 부속품 수선(하의)
const lowerIds = [
  'f1dc38e8-cabf-4b28-a111-d2fa01e04a54', // 바지
  '93653dc3-4e6c-4316-8d9a-31b845ef4df5', // 청바지
  '56fac729-7bae-4e35-8d68-eb943527d188', // 치마
];

// 공통사항 하위: 부속품 수선(상의+하의) → 합쳐서 "부속품 수선"으로
const commonIds = [
  '3985cdd6-6c35-4c1d-b19c-b0294d591933', // 부속품 수선 (상의)
  '34a3677e-596e-4979-8693-c0f2f4ac4b10', // 부속품 수선 (하의)
];

// display_order도 정리
for (const [idx, id] of upperIds.entries()) {
  const r = await patch('repair_categories', `id=eq.${id}`, {
    parent_category_id: mainUpper.id,
    display_order: idx + 1,
  });
  const cat = existingCats.find(c => c.id === id);
  console.log(`  ✅ ${cat?.name} → 상의 하위 (order: ${idx + 1})`);
}

for (const [idx, id] of lowerIds.entries()) {
  await patch('repair_categories', `id=eq.${id}`, {
    parent_category_id: mainLower.id,
    display_order: idx + 1,
  });
  const cat = existingCats.find(c => c.id === id);
  console.log(`  ✅ ${cat?.name} → 하의 하위 (order: ${idx + 1})`);
}

for (const [idx, id] of commonIds.entries()) {
  await patch('repair_categories', `id=eq.${id}`, {
    parent_category_id: mainCommon.id,
    display_order: idx + 1,
  });
  const cat = existingCats.find(c => c.id === id);
  console.log(`  ✅ ${cat?.name} → 공통사항 하위 (order: ${idx + 1})`);
}

console.log('\n✅ 완료! 최종 상태:');
const finalCats = await get('repair_categories?select=*&order=display_order.asc');
for (const c of finalCats) {
  const isMain = !c.parent_category_id;
  const indent = isMain ? '' : '  ↳ ';
  const parent = isMain ? '' : `(${finalCats.find(p => p.id === c.parent_category_id)?.name})`;
  console.log(`  [${c.display_order}] ${indent}${c.name} ${parent}`);
}
