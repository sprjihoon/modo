// probe_update.mjs로 더럽혀진 테스트 주문 원복
import 'dotenv/config';
import { readFileSync, existsSync } from 'node:fs';
if (!process.env.SUPABASE_URL && existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\r\n]*)"?$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: SRK, Authorization: `Bearer ${SRK}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' };

// payment_key가 'TEST_KEY' 또는 'TEST_KEY_2'인 row 원복
const r = await fetch(`${URL}/rest/v1/orders?or=(payment_key.eq.TEST_KEY,payment_key.eq.TEST_KEY_2)`, {
  method: 'PATCH',
  headers: H,
  body: JSON.stringify({ payment_key: null, paid_at: null, canceled_at: null, status: 'PENDING', payment_status: 'PENDING' }),
});
console.log('cleanup status:', r.status);
console.log('cleanup body:', await r.text());
