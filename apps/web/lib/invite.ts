const COOKIE_KEY = "modo_invite_code";
const STORAGE_KEY = "modo_invite_code";

export function normalizeInviteCode(code?: string | null): string {
  return (code || "").trim().toUpperCase();
}

/** 초대 코드를 쿠키·localStorage에 저장 (OAuth 콜백용) */
export function stashInviteCode(code?: string | null) {
  const normalized = normalizeInviteCode(code);
  if (!normalized) return;
  try {
    localStorage.setItem(STORAGE_KEY, normalized);
  } catch {
    /* ignore */
  }
  try {
    const maxAge = 60 * 60 * 24 * 7;
    document.cookie = `${COOKIE_KEY}=${encodeURIComponent(normalized)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

export function readStashedInviteCode(): string {
  try {
    const fromLs = normalizeInviteCode(localStorage.getItem(STORAGE_KEY));
    if (fromLs) return fromLs;
  } catch {
    /* ignore */
  }
  try {
    const match = document.cookie
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${COOKIE_KEY}=`));
    if (match) {
      return normalizeInviteCode(decodeURIComponent(match.split("=")[1] || ""));
    }
  } catch {
    /* ignore */
  }
  return "";
}

export function clearStashedInviteCode() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  try {
    document.cookie = `${COOKIE_KEY}=; path=/; max-age=0; SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

export async function applyStashedInviteCode(): Promise<boolean> {
  const code = readStashedInviteCode();
  if (!code) return false;
  try {
    const res = await fetch("/api/invite/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (res.ok) {
      clearStashedInviteCode();
      return true;
    }
    const data = await res.json().catch(() => ({}));
    // 이미 적용/잘못된 코드면 스태시 제거
    if (data?.reason === "already_applied" || data?.reason === "invalid_code" || data?.reason === "self_invite") {
      clearStashedInviteCode();
    }
  } catch {
    /* ignore */
  }
  return false;
}
