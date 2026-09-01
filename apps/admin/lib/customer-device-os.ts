import { supabaseAdmin } from "./supabase";

export type DeviceOsInfo = {
  label: "iOS" | "Android" | "웹";
  detail: string;
};

export function deviceOsInfo(deviceOs?: string | null): DeviceOsInfo | null {
  if (!deviceOs?.trim()) return null;
  const raw = deviceOs.trim();
  if (/^ios/i.test(raw)) return { label: "iOS", detail: raw };
  if (/^android/i.test(raw)) return { label: "Android", detail: raw };
  if (/web/i.test(raw)) return { label: "웹", detail: raw };
  return null;
}

export type LastAccessInfo = {
  last_device_os?: string;
  last_seen_at?: string;
};

export function formatLastSeenAt(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).replace(/\s/g, "");
}

export async function getLastAccessMap(
  userIds: string[]
): Promise<Record<string, LastAccessInfo>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return {};

  const { data, error } = await supabaseAdmin
    .from("customer_events")
    .select("user_id, device_os, created_at")
    .in("user_id", ids)
    .order("created_at", { ascending: false })
    .limit(Math.min(ids.length * 40, 4000));

  if (error) {
    console.error("최근 접속 조회 실패:", error);
    return {};
  }

  const map: Record<string, LastAccessInfo> = {};
  for (const row of data || []) {
    const userId = row.user_id as string | null;
    if (!userId) continue;
    const current = map[userId] ?? {};
    if (!current.last_seen_at && row.created_at) {
      current.last_seen_at = row.created_at as string;
    }
    const os = row.device_os as string | null;
    if (!current.last_device_os && os) {
      current.last_device_os = os;
    }
    map[userId] = current;
  }
  return map;
}

export async function getLastDeviceOsMap(
  userIds: string[]
): Promise<Record<string, string>> {
  const access = await getLastAccessMap(userIds);
  const map: Record<string, string> = {};
  for (const [userId, info] of Object.entries(access)) {
    if (info.last_device_os) map[userId] = info.last_device_os;
  }
  return map;
}
