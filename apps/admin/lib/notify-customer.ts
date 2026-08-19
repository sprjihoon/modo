import type { SupabaseClient } from "@supabase/supabase-js";

export async function notifyCustomer(
  supabase: SupabaseClient,
  params: {
    userId: string | null | undefined;
    orderId: string;
    title: string;
    body: string;
    type: string;
  }
): Promise<void> {
  if (!params.userId) return;

  const { error: insertError } = await supabase.from("notifications").insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    body: params.body,
    order_id: params.orderId,
  });
  if (insertError) {
    console.warn("notifyCustomer insert failed:", insertError.message);
  }

  try {
    const { data: userRow } = await supabase
      .from("users")
      .select("fcm_token")
      .eq("id", params.userId)
      .maybeSingle();

    if (!userRow?.fcm_token) return;

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) return;

    await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        userId: params.userId,
        orderId: params.orderId,
        title: params.title,
        body: params.body,
        fcmToken: userRow.fcm_token,
      }),
    });
  } catch (e) {
    console.warn("notifyCustomer push failed:", e);
  }
}
