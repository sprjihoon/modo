// 현재 카테고리 및 수선항목 현황 출력
import 'dotenv/config';
import { readFileSync, existsSync } from 'node:fs';
if (!process.env.SUPABASE_URL && existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\r\n]*)"?$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

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
