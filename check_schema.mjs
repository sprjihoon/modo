const SUPABASE_URL = 'https://rzrwediccbamxluegnex.supabase.co';
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;
const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers: { apikey: SRK, Authorization: `Bearer ${SRK}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ sql: "select column_name,data_type,udt_name from information_schema.columns where table_name='orders' and column_name='repair_parts'" }),
});
console.log(r.status, await r.text());
