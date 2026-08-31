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

export async function getLastDeviceOsMap(
  userIds: string[]
): Promise<Record<string, string>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return {};

  const { data, error } = await supabaseAdmin
    .from("customer_events")
    .select("user_id, device_os, created_at")
    .in("user_id", ids)
    .not("device_os", "is", null)
    .order("created_at", { ascending: false })
    .limit(Math.min(ids.length * 30, 4000));

  if (error) {
    console.error("최근 OS 조회 실패:", error);
    return {};
  }

  const map: Record<string, string> = {};
  for (const row of data || []) {
    const userId = row.user_id as string | null;
    const os = row.device_os as string | null;
    if (userId && os && !map[userId]) {
      map[userId] = os;
    }
  }
  return map;
}
