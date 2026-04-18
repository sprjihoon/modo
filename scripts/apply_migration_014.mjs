import 'dotenv/config';
import { readFileSync, existsSync } from 'node:fs';

if (!process.env.SUPABASE_URL && existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\r\n]*)"?$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const SQL_PATH = 'apps/sql/migrations/014_add_parent_category_to_repair_categories.sql';
const sql = readFileSync(SQL_PATH, 'utf8');
const URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const PAT = process.env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_PAT;
const REF = (URL || '').match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
console.log('project ref:', REF);

if (PAT && REF) {
  console.log('Supabase Management API로 마이그레이션 적용 중...');
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  console.log('status:', r.status);
  const body = await r.text();
  console.log('body:', body.substring(0, 1000));
  if (r.ok) {
    console.log('\n✅ 마이그레이션 완료 - parent_category_id 컬럼 추가됨');
    process.exit(0);
  }
  process.exit(1);
}

console.log('\nSUPABASE_ACCESS_TOKEN 없음. Supabase Studio SQL Editor에서 직접 실행하세요:');
console.log('  ', SQL_PATH);
process.exit(2);
