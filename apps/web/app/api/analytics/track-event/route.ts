import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const {
      eventType, eventName, pageUrl, pageTitle,
      targetId, targetType, metadata, sessionId,
    } = body;

    if (!eventType) {
      return NextResponse.json({ error: "eventType is required" }, { status: 400 });
    }

    const srk = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!srk) {
      return NextResponse.json({ error: "not configured" }, { status: 500 });
    }

    const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, srk);

    // auth.users.id → public.users.id 변환
    let publicUserId: string | null = null;
    if (user?.id) {
      const { data: userRow } = await admin
        .from("users")
        .select("id")
        .eq("auth_id", user.id)
        .maybeSingle();
      publicUserId = userRow?.id ?? null;
    }

    await admin.from("customer_events").insert({
      user_id: publicUserId,
      session_id: sessionId ?? null,
      event_type: eventType,
      event_name: eventName ?? null,
      page_url: pageUrl ?? null,
      page_title: pageTitle ?? null,
      target_id: targetId ?? null,
      target_type: targetType ?? null,
      metadata: metadata ?? {},
      device_type: "desktop",
      device_os: "Web",
      app_version: "web",
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
