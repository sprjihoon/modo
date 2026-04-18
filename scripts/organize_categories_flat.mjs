/**
 * parent_category_id 없이 플랫 구조에서 최적화
 * - "공통사항" 카테고리에 부속품 수선 항목 통합
 * - 빈 상의/하의 대카테고리 삭제 (DDL 없이는 의미없음)
 * - 의류별 display_order 정리
 */

const SUPABASE_URL = 'https://rzrwediccbamxluegnex.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6cndlZGljY2JhbXhsdWVnbmV4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjkzNjQ0NSwiZXhwIjoyMDc4NTEyNDQ1fQ.L3vjKx_Ik3VrArap92KtFBCnRKo7vZ8pB1IwpmU0ao8';

const h = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

const get = (p) => fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: h }).then(r => r.json());
const post = (t, b) => fetch(`${SUPABASE_URL}/rest/v1/${t}`, { method: 'POST', headers: h, body: JSON.stringify(b) }).then(r => r.json());
const patch = (t, f, b) => fetch(`${SUPABASE_URL}/rest/v1/${t}?${f}`, { method: 'PATCH', headers: h, body: JSON.stringify(b) }).then(r => r.json());
const del = (t, f) => fetch(`${SUPABASE_URL}/rest/v1/${t}?${f}`, { method: 'DELETE', headers: h }).then(r => r.ok);

// 현재 상태 로드
const cats = await get('repair_categories?select=*&order=display_order.asc');

// 카테고리 ID 맵
const byName = (name) => cats.find(c => c.name === name);

const CAT = {
  tshirt:   byName('티셔츠'),
  shirt:    byName('셔츠/맨투맨'),
  onepiece: byName('원피스'),
  knit:     byName('니트/스웨터'),
  outer:    byName('아우터'),
  pants:    byName('바지'),
  jeans:    byName('청바지'),
  skirt:    byName('치마'),
  accessUpper: byName('부속품 수선 (상의)'),
  accessLower: byName('부속품 수선 (하의)'),
  common:   byName('공통사항'),
  upper:    byName('상의'),
  lower:    byName('하의'),
};

// ── STEP 1: 부속품 수선 항목을 "공통사항"으로 이동 ──
console.log('\n[STEP 1] 부속품 수선 항목 → 공통사항으로 이동');
const commonId = CAT.common?.id;

if (!commonId) {
  console.log('  ❌ 공통사항 카테고리 없음. 스크립트 중단');
  process.exit(1);
}

// 부속품 수선(상의) 항목 이동
if (CAT.accessUpper?.id) {
  const items = await get(`repair_types?category_id=eq.${CAT.accessUpper.id}&select=id,name`);
  for (const item of items) {
    await patch('repair_types', `id=eq.${item.id}`, { category_id: commonId });
    console.log(`  ✅ [상의] ${item.name} → 공통사항`);
  }
  // 기존 카테고리 삭제
  await del('repair_categories', `id=eq.${CAT.accessUpper.id}`);
  console.log('  🗑  부속품 수선 (상의) 카테고리 삭제');
}

// 부속품 수선(하의) 항목 이동 (중복 항목은 건너뜀)
if (CAT.accessLower?.id) {
  const items = await get(`repair_types?category_id=eq.${CAT.accessLower.id}&select=id,name`);
  const existingCommon = await get(`repair_types?category_id=eq.${commonId}&select=name`);
  const existingNames = new Set(existingCommon.map(e => e.name));

  for (const item of items) {
    if (existingNames.has(item.name)) {
      // 중복 항목은 그냥 삭제
      await del('repair_types', `id=eq.${item.id}`);
      console.log(`  🗑  [하의] ${item.name} (중복 삭제)`);
    } else {
      await patch('repair_types', `id=eq.${item.id}`, { category_id: commonId });
      console.log(`  ✅ [하의] ${item.name} → 공통사항`);
    }
  }
  await del('repair_categories', `id=eq.${CAT.accessLower.id}`);
  console.log('  🗑  부속품 수선 (하의) 카테고리 삭제');
}

// ── STEP 2: 빈 상의/하의 대카테고리 삭제 ──
console.log('\n[STEP 2] 빈 상의/하의 카테고리 정리');
if (CAT.upper?.id) {
  const items = await get(`repair_types?category_id=eq.${CAT.upper.id}&select=id`);
  if (items.length === 0) {
    await del('repair_categories', `id=eq.${CAT.upper.id}`);
    console.log('  🗑  상의 (빈 카테고리) 삭제');
  }
}
if (CAT.lower?.id) {
  const items = await get(`repair_types?category_id=eq.${CAT.lower.id}&select=id`);
  if (items.length === 0) {
    await del('repair_categories', `id=eq.${CAT.lower.id}`);
    console.log('  🗑  하의 (빈 카테고리) 삭제');
  }
}

// ── STEP 3: display_order 정리 (상의계열 → 하의계열 → 공통) ──
console.log('\n[STEP 3] display_order 정리');
const orderMap = [
  { id: CAT.tshirt?.id,   order: 1,  label: '티셔츠' },
  { id: CAT.shirt?.id,    order: 2,  label: '셔츠/맨투맨' },
  { id: CAT.onepiece?.id, order: 3,  label: '원피스' },
  { id: CAT.knit?.id,     order: 4,  label: '니트/스웨터' },
  { id: CAT.outer?.id,    order: 5,  label: '아우터' },
  { id: CAT.pants?.id,    order: 6,  label: '바지' },
  { id: CAT.jeans?.id,    order: 7,  label: '청바지' },
  { id: CAT.skirt?.id,    order: 8,  label: '치마' },
  { id: commonId,         order: 9,  label: '공통사항' },
];

for (const { id, order, label } of orderMap) {
  if (id) {
    await patch('repair_categories', `id=eq.${id}`, { display_order: order, is_active: true });
    console.log(`  ✅ [${order}] ${label}`);
  } else {
    console.log(`  ⚠️  ${label} 카테고리 없음`);
  }
}

// ── 최종 상태 출력 ──
console.log('\n\n=== 최종 카테고리 구조 ===');
const final = await get('repair_categories?select=id,name,display_order,is_active&order=display_order.asc');
const finalTypes = await get('repair_types?select=id,name,price,category_id');

for (const c of final) {
  const items = finalTypes.filter(t => t.category_id === c.id);
  console.log(`\n[${c.display_order}] ${c.name} (${items.length}개 항목)`);
  for (const t of items.slice(0, 5)) {
    console.log(`    - ${t.name}: ${t.price?.toLocaleString()}원`);
  }
  if (items.length > 5) console.log(`    ... 외 ${items.length - 5}개`);
}
console.log(`\n✅ 총 카테고리: ${final.length}개, 수선항목: ${finalTypes.length}개`);
