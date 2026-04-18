// Run 012_add_payment_columns_and_logs.sql on production via Supabase Management API
// (Service Role 키로는 DDL 직접 실행 불가 → Management API의 SQL endpoint 사용)
// 또는 statement-by-statement로 PostgREST RPC 호출이 가능하면 그쪽도 지원하도록.
// 안전하게: 가능한 채널을 모두 시도하고 실패 시 사용자에게 수동 실행 안내.
import 'dotenv/config';
import { readFileSync, existsSync } from 'node:fs';

if (!process.env.SUPABASE_URL && existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\r\n]*)"?$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const SQL_PATH = 'apps/sql/migrations/012_add_payment_columns_and_logs.sql';
const sql = readFileSync(SQL_PATH, 'utf8');
const URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PAT = process.env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_PAT;
const REF = (URL || '').match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
console.log('project ref:', REF);

if (PAT && REF) {
  console.log('Using Supabase Management API…');
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  console.log('status:', r.status);
  const body = await r.text();
  console.log('body:', body.substring(0, 1000));
  if (r.ok) {
    console.log('\n✅ migration applied');
    process.exit(0);
  }
  process.exit(1);
}

console.log('\nManagement API token (SUPABASE_ACCESS_TOKEN/PAT) 없음.');
console.log('대안: psql 또는 Supabase Studio SQL Editor에서 다음 파일을 실행하세요:');
console.log('  ', SQL_PATH);
console.log('\n또는 환경변수 설정 후 재실행:');
console.log('  $env:SUPABASE_ACCESS_TOKEN="<personal access token>"');
console.log('  node scripts/apply_migration_012.mjs');
process.exit(2);
