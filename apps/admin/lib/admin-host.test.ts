import { isAllowedAdminHost, isVercelCronRequest } from "./admin-host";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const headers = (init: Record<string, string>) => ({
  get(name: string) {
    return init[name.toLowerCase()] ?? null;
  },
});

assert(isAllowedAdminHost("admin.modo.mom"), "커스텀 도메인");
assert(isAllowedAdminHost("admin.modorepair.com"), "레거시 어드민 도메인");
assert(isAllowedAdminHost("localhost:3000"), "로컬");
assert(
  isAllowedAdminHost("modo-oddpfafqf-springs-projects-072b5dfd.vercel.app"),
  "실제 Vercel 크론 호스트"
);
assert(!isAllowedAdminHost("other-abc.vercel.app"), "다른 프로젝트 차단");
assert(!isAllowedAdminHost("evil.vercel.app"), "무관 vercel.app 차단");
assert(!isAllowedAdminHost("modo.mom"), "고객 도메인 차단");
assert(isAllowedAdminHost("evil.example.com", { cron: true }), "크론은 배포 호스트 통과");

assert(isVercelCronRequest(headers({ "user-agent": "vercel-cron/1.0" })), "UA");
assert(isVercelCronRequest(headers({ "x-vercel-cron": "1" })), "헤더");
assert(isVercelCronRequest(headers({ "x-vercel-cron": "true" })), "헤더 true");
assert(!isVercelCronRequest(headers({ "user-agent": "Mozilla/5.0" })), "일반 브라우저");

console.log("admin-host.test.ts: ok");
