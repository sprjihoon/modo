// 9가지 케이스 시드 (fetch 기반, 의존성 없음)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rzrwediccbamxluegnex.supabase.co';
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SRK) { console.error('SUPABASE_SERVICE_ROLE_KEY required'); process.exit(1); }

const HEADERS = {
  apikey: SRK,
  Authorization: `Bearer ${SRK}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};
const REST = (p) => `${SUPABASE_URL}/rest/v1/${p}`;

async function rest(path, opts = {}) {
  const r = await fetch(REST(path), { ...opts, headers: { ...HEADERS, ...(opts.headers || {}) } });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`${r.status} ${path}: ${t}`);
  }
  if (r.status === 204) return null;
  const ct = r.headers.get('content-type') || '';
  return ct.includes('application/json') ? r.json() : r.text();
}

const CAT_NAME = '🧪 9케이스 검증';

async function ensureCategory() {
  const found = await rest(`repair_categories?name=eq.${encodeURIComponent(CAT_NAME)}&select=id`);
  if (found.length) return found[0].id;
  const created = await rest('repair_categories', {
    method: 'POST',
    body: JSON.stringify({ name: CAT_NAME, display_order: 9999, icon_name: 'tshirt', is_active: true }),
  });
  return created[0].id;
}

async function cleanCategory(catId) {
  await rest(`repair_types?category_id=eq.${catId}`, { method: 'DELETE' });
}

async function insertType(row) {
  const created = await rest('repair_types', { method: 'POST', body: JSON.stringify(row) });
  return created[0].id;
}

async function insertSubParts(typeId, parts) {
  const rows = parts.map((p, i) => ({
    repair_type_id: typeId,
    name: p.name,
    price: p.price,
    display_order: i + 1,
  }));
  if (rows.length) await rest('repair_sub_parts', { method: 'POST', body: JSON.stringify(rows) });
}

const cases = [
  { meta: { name: '[1] 단추 달기 (측정X·부속X)', price: 3000, display_order: 1, requires_measurement: false, requires_multiple_inputs: false, input_count: 1, input_labels: ['치수'], has_sub_parts: false, allow_multiple_sub_parts: false, sub_parts_title: null }, parts: [] },
  { meta: { name: '[2] 지퍼 교체 (측정X·부속단일)', price: 18000, display_order: 2, requires_measurement: false, requires_multiple_inputs: false, input_count: 1, input_labels: ['치수'], has_sub_parts: true, allow_multiple_sub_parts: false, sub_parts_title: '교체할 지퍼 위치를 선택하세요' }, parts: [{ name: '앞 지퍼', price: 18000 }, { name: '옆 지퍼', price: 20000 }, { name: '뒤 지퍼 (폴백)', price: 0 }] },
  { meta: { name: '[3] 단추 달기 묶음 (측정X·부속다중)', price: 3000, display_order: 3, requires_measurement: false, requires_multiple_inputs: false, input_count: 1, input_labels: ['치수'], has_sub_parts: true, allow_multiple_sub_parts: true, sub_parts_title: '단추 위치를 모두 선택하세요' }, parts: [{ name: '왼쪽 소매', price: 3000 }, { name: '오른쪽 소매', price: 3000 }, { name: '앞섶', price: 5000 }, { name: '뒤판 (폴백)', price: 0 }] },
  { meta: { name: '[4] 소매기장 줄임 (측정단일·부속X)', price: 12000, display_order: 4, requires_measurement: true, requires_multiple_inputs: false, input_count: 1, input_labels: ['소매기장 (cm)'], has_sub_parts: false, allow_multiple_sub_parts: false, sub_parts_title: null }, parts: [] },
  { meta: { name: '[5] 단품 줄임 (측정단일·부속단일)', price: 18000, display_order: 5, requires_measurement: true, requires_multiple_inputs: false, input_count: 1, input_labels: ['줄일 길이 (cm)'], has_sub_parts: true, allow_multiple_sub_parts: false, sub_parts_title: '줄일 부위를 선택하세요' }, parts: [{ name: '앞섶', price: 18000 }, { name: '뒤판', price: 20000 }, { name: '왼팔 (폴백)', price: 0 }] },
  { meta: { name: '[6] 다부위 줄임 (측정단일·부속다중)', price: 15000, display_order: 6, requires_measurement: true, requires_multiple_inputs: false, input_count: 1, input_labels: ['줄일 길이 (cm)'], has_sub_parts: true, allow_multiple_sub_parts: true, sub_parts_title: '줄일 부위를 모두 선택하세요' }, parts: [{ name: '왼팔', price: 15000 }, { name: '오른팔', price: 15000 }, { name: '앞섶', price: 18000 }, { name: '뒤판 (폴백)', price: 0 }] },
  { meta: { name: '[7] 어깨길이 줄임 (측정다중·부속X)', price: 22000, display_order: 7, requires_measurement: true, requires_multiple_inputs: true, input_count: 2, input_labels: ['왼쪽 어깨 (cm)', '오른쪽 어깨 (cm)'], has_sub_parts: false, allow_multiple_sub_parts: false, sub_parts_title: null }, parts: [] },
  { meta: { name: '[8] 부위별 어깨/팔 (측정다중·부속단일)', price: 25000, display_order: 8, requires_measurement: true, requires_multiple_inputs: true, input_count: 2, input_labels: ['윗단 (cm)', '아랫단 (cm)'], has_sub_parts: true, allow_multiple_sub_parts: false, sub_parts_title: '수선할 부위를 선택하세요' }, parts: [{ name: '왼쪽', price: 25000 }, { name: '오른쪽', price: 25000 }, { name: '양쪽', price: 45000 }] },
  { meta: { name: '[9] 다부위 좌·우 줄임 (측정다중·부속다중)', price: 28000, display_order: 9, requires_measurement: true, requires_multiple_inputs: true, input_count: 2, input_labels: ['상단 (cm)', '하단 (cm)'], has_sub_parts: true, allow_multiple_sub_parts: true, sub_parts_title: '줄일 부위를 모두 선택하세요' }, parts: [{ name: '왼팔', price: 28000 }, { name: '오른팔', price: 28000 }, { name: '앞섶', price: 30000 }, { name: '뒤판 (폴백)', price: 0 }] },
];

async function main() {
  const catId = await ensureCategory();
  console.log('Category:', catId);
  await cleanCategory(catId);
  for (const c of cases) {
    const id = await insertType({ ...c.meta, category_id: catId });
    await insertSubParts(id, c.parts);
    console.log(`✅ Case ${c.meta.display_order}: ${c.meta.name} (${id}) parts=${c.parts.length}`);
  }
  const verify = await rest(`repair_types?category_id=eq.${catId}&select=display_order,name,price,requires_measurement,requires_multiple_inputs,input_count,has_sub_parts,allow_multiple_sub_parts&order=display_order`);
  console.log('\n=== Verification ===');
  console.table(verify);
}
main().catch((e) => { console.error(e); process.exit(1); });
