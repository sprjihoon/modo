// 현재 카테고리 및 수선항목 현황 출력
const SUPABASE_URL = 'https://rzrwediccbamxluegnex.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6cndlZGljY2JhbXhsdWVnbmV4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjkzNjQ0NSwiZXhwIjoyMDc4NTEyNDQ1fQ.L3vjKx_Ik3VrArap92KtFBCnRKo7vZ8pB1IwpmU0ao8';

const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

const cats = await fetch(`${SUPABASE_URL}/rest/v1/repair_categories?select=*&order=display_order.asc`, { headers }).then(r => r.json());
const types = await fetch(`${SUPABASE_URL}/rest/v1/repair_types?select=id,name,price,category_id,display_order&order=display_order.asc`, { headers }).then(r => r.json());

console.log('\n=== 현재 카테고리 ===');
for (const c of cats) {
  const items = types.filter(t => t.category_id === c.id);
  console.log(`[${c.display_order}] ${c.name} (id: ${c.id})`);
  console.log(`  parent_category_id 컬럼 존재: ${'parent_category_id' in c}`);
  for (const t of items) {
    console.log(`    - ${t.name}: ${t.price?.toLocaleString()}원`);
  }
}

const uncategorized = types.filter(t => !cats.find(c => c.id === t.category_id));
if (uncategorized.length > 0) {
  console.log('\n=== 미분류 수선항목 ===');
  for (const t of uncategorized) {
    console.log(`  - ${t.name} (category_id: ${t.category_id})`);
  }
}

console.log(`\n총 카테고리: ${cats.length}개, 수선항목: ${types.length}개`);
