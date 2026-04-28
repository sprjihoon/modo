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

const { data: settings } = await admin
  .from('shipping_settings')
  .select('*')
  .eq('id', 1)
  .single();
console.log('shipping_settings:', settings);

console.log('\n--- 도서산간 부과된 주문 (remote_area_fee > 0) ---');
const { data: rows } = await admin
  .from('orders')
  .select(
    'id, order_number, status, payment_status, total_price, shipping_fee, remote_area_fee, item_name, created_at',
  )
  .gt('remote_area_fee', 0)
  .order('created_at', { ascending: false })
  .limit(10);
console.log(`${rows?.length ?? 0}건`);
for (const r of rows ?? []) {
  console.log(
    `  ${r.order_number ?? r.id.slice(0, 8)}  status=${r.status}  total=${r.total_price}  ship=${r.shipping_fee}  remote=${r.remote_area_fee}  ${r.item_name}`,
  );
}

console.log('\n--- 컬럼 존재 확인 ---');
const { data: oneRow } = await admin
  .from('orders')
  .select('id, remote_area_fee, shipping_fee, total_price')
  .limit(1)
  .single();
console.log('샘플 1행 컬럼들:', oneRow);
