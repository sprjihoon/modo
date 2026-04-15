import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Naver OAuth code → access_token 교환 후 Supabase 세션 생성
export async function POST(req: NextRequest) {
  try {
    const { code, redirectUri } = await req.json();
    if (!code) {
      return NextResponse.json({ error: "code is required" }, { status: 400 });
    }

    const clientId = process.env.NAVER_CLIENT_ID || "b7QJILomSlfsFL7RuAQs";
    const clientSecret = process.env.NAVER_CLIENT_SECRET || "M_cxR3WuTs";

    // 1. Naver 토큰 교환
    const tokenRes = await fetch("https://nid.naver.com/oauth2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return NextResponse.json(
        { error: tokenData.error_description || "Naver token exchange failed" },
        { status: 400 }
      );
    }

    // 2. Naver 사용자 정보 조회
    const profileRes = await fetch("https://openapi.naver.com/v1/nid/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profileData = await profileRes.json();
    const profile = profileData.response;

    if (!profile) {
      return NextResponse.json({ error: "Failed to get Naver profile" }, { status: 400 });
    }

    // 3. Supabase Edge Function 호출 (naver-auth)
    const supabase = createClient();
    const { data: sessionData, error: fnError } = await supabase.functions.invoke(
      "naver-auth",
      {
        body: {
          accessToken: tokenData.access_token,
          email: profile.email || `naver_${profile.id}@naver.com`,
          name: profile.name || "",
          profileImage: profile.profile_image || "",
          id: profile.id,
        },
      }
    );

    if (fnError) {
      return NextResponse.json({ error: fnError.message }, { status: 500 });
    }

    return NextResponse.json(sessionData);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
