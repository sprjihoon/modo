import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
const __dirname = dirname(fileURLToPath(import.meta.url));
function findRoot(s) {
  let d = s;
  for (let i = 0; i < 10; i++) {
    if (existsSync(resolve(d, 'apps/web/.env.local'))) return d;
    const p = dirname(d);
    if (p === d) break;
    d = p;
  }
  throw new Error();
}
const REPO = findRoot(__dirname);
for (const line of readFileSync(resolve(REPO, 'apps/web/.env.local'), 'utf8').split(/\r?\n/)) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m) process.env[m[1]] = m[2];
}
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const { data: rows, error } = await admin
  .from('orders')
  .select('id, order_number, item_name, total_price, created_at, user_id')
  .eq('status', 'PENDING_PAYMENT');
if (error) {
  console.error(error);
  process.exit(1);
}
console.log(`잔존 PENDING_PAYMENT ${rows.length}건:`);
for (const r of rows) {
  console.log(
    `  ${r.order_number ?? r.id.slice(0, 8)}  ${r.item_name ?? '-'}  ₩${r.total_price ?? 0}  ${r.created_at}`,
  );
}
if (rows.length === 0) process.exit(0);

if (process.argv.includes('--apply')) {
  const ids = rows.map((r) => r.id);
  const { error: delErr } = await admin
    .from('orders')
    .delete()
    .in('id', ids);
  if (delErr) {
    console.error('delete failed:', delErr);
    process.exit(1);
  }
  console.log(`✅ ${ids.length}건 삭제 완료`);
} else {
  console.log('\n(dry-run) 실제 삭제하려면 `--apply` 옵션을 추가하세요.');
}
