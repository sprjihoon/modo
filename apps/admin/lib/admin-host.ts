/** 어드민으로 열 수 있는 커스텀 도메인 */
export const ALLOWED_ADMIN_DOMAINS = new Set(["admin.modo.mom", "admin.modorepair.com"]);

/**
 * Vercel 프리뷰/배포 URL prefix.
 * 프로젝트명이 `modo` 이라 `modo-<hash>-<team>.vercel.app` 형태다.
 * (예전 기본값 `modo-admin` 은 실제 배포 호스트와 달라 크론이 404 였다.)
 */
export const DEFAULT_VERCEL_PREFIX = "modo-";

export function isVercelCronRequest(headers: { get(name: string): string | null }): boolean {
  const ua = headers.get("user-agent") || "";
  if (ua.toLowerCase().includes("vercel-cron")) return true;
  const cron = headers.get("x-vercel-cron");
  return cron === "1" || cron === "true";
}

export function isAllowedAdminHost(
  hostname: string,
  options?: { vercelPrefix?: string; cron?: boolean }
): boolean {
  const host = hostname.split(":")[0]?.toLowerCase() ?? "";
  if (options?.cron) return true;
  if (ALLOWED_ADMIN_DOMAINS.has(host)) return true;
  if (host === "localhost") return true;
  const prefix = options?.vercelPrefix || process.env.ADMIN_VERCEL_PROJECT_PREFIX || DEFAULT_VERCEL_PREFIX;
  return host.endsWith(".vercel.app") && host.startsWith(prefix);
}
