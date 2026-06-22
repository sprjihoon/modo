/**
 * 토스페이먼츠 PG 심사용 테스트 계정 생성
 * Usage: cd apps/web && node scripts/create-pg-test-user.mjs
 */
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_REF = "rzrwediccbamxluegnex";
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;

function getApiKeys() {
  const edgeDir = path.join(__dirname, "../../edge");
  const raw = execSync(
    `supabase projects api-keys --project-ref ${PROJECT_REF} -o json`,
    { cwd: edgeDir, encoding: "utf8" }
  );
  const keys = JSON.parse(raw);
  const serviceKey = keys.find((k) => k.name === "service_role")?.api_key;
  const anonKey = keys.find((k) => k.name === "anon")?.api_key;
  if (!serviceKey || !anonKey) {
    throw new Error("Failed to load Supabase API keys via CLI");
  }
  return { serviceKey, anonKey };
}

const EMAIL = "pgtest@modo.io.kr";
const PASSWORD = "123456789";
const NAME = "토스심사";
const PHONE = "01012345678";

const { serviceKey, anonKey } = getApiKeys();

const supabase = createClient(SUPABASE_URL, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: listData, error: listError } = await supabase.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});
if (listError) {
  console.error("listUsers failed:", listError.message);
  process.exit(1);
}

let authId = listData.users.find((u) => u.email === EMAIL)?.id;

if (authId) {
  const { error } = await supabase.auth.admin.updateUserById(authId, {
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name: NAME, phone: PHONE },
  });
  if (error) {
    console.error("updateUser failed:", error.message);
    process.exit(1);
  }
  console.log("Updated existing auth user:", EMAIL);
} else {
  const { data, error } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name: NAME, phone: PHONE },
  });
  if (error) {
    console.error("createUser failed:", error.message);
    process.exit(1);
  }
  authId = data.user.id;
  console.log("Created auth user:", EMAIL, authId);
}

const { data: profile } = await supabase
  .from("users")
  .select("id, role, name")
  .eq("auth_id", authId)
  .maybeSingle();

if (!profile) {
  const { error } = await supabase.from("users").insert({
    auth_id: authId,
    email: EMAIL,
    name: NAME,
    phone: PHONE,
    role: "CUSTOMER",
    profile_completed: true,
    terms_agreed_at: new Date().toISOString(),
    privacy_agreed_at: new Date().toISOString(),
  });
  if (error) {
    console.error("users insert failed:", error.message);
    process.exit(1);
  }
  console.log("Created users profile");
} else {
  console.log("users profile OK:", profile.name, profile.role);
}

const client = createClient(SUPABASE_URL, anonKey);
const { error: signInError } = await client.auth.signInWithPassword({
  email: EMAIL,
  password: PASSWORD,
});
if (signInError) {
  console.error("Sign-in test FAILED:", signInError.message);
  process.exit(1);
}
console.log("Sign-in test OK");

console.log("\n--- PG 심사용 테스트 계정 ---");
console.log("로그인 URL: https://modo.io.kr/login");
console.log("이메일(아이디):", EMAIL);
console.log("비밀번호:", PASSWORD);
console.log("----------------------------\n");
