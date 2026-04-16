// naver-auth/index.ts
// 네이버 로그인 처리 Edge Function
// 네이버 액세스 토큰을 검증하고 Supabase 사용자를 생성/로그인합니다

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const NAVER_USERINFO_URL = "https://openapi.naver.com/v1/nid/me";

interface NaverUserInfo {
  resultcode: string;
  message: string;
  response: {
    id: string;
    email?: string;
    name?: string;
    profile_image?: string;
    nickname?: string;
    mobile?: string;
  };
}

interface RequestBody {
  accessToken: string;
  email?: string;
  name?: string;
  profileImage?: string;
  id?: string;
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { accessToken, email, name, profileImage, id } = body;

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "accessToken이 필요합니다" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("🔐 네이버 인증 시작");

    // 1. 네이버 API로 토큰 검증 및 사용자 정보 가져오기
    const naverResponse = await fetch(NAVER_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!naverResponse.ok) {
      console.error("❌ 네이버 API 호출 실패:", naverResponse.status);
      return new Response(
        JSON.stringify({ error: "네이버 토큰 검증에 실패했습니다" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const naverUserInfo: NaverUserInfo = await naverResponse.json();
    console.log("✅ 네이버 사용자 정보:", naverUserInfo.response?.email);

    if (naverUserInfo.resultcode !== "00") {
      return new Response(
        JSON.stringify({
          error: `네이버 API 오류: ${naverUserInfo.message}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const naverUser = naverUserInfo.response;
    const userEmail = naverUser.email || email;
    const userName = naverUser.name || naverUser.nickname || name || "네이버 사용자";
    const userProfileImage = naverUser.profile_image || profileImage;
    const naverId = naverUser.id || id;

    if (!userEmail) {
      return new Response(
        JSON.stringify({
          error: "이메일 정보를 가져올 수 없습니다. 네이버 계정에 이메일이 등록되어 있는지 확인해주세요.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Supabase Admin Client 생성
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 3. 기존 사용자 확인 (네이버 ID 또는 이메일로)
    let userId: string | null = null;

    // 먼저 users 테이블에서 naver_id로 검색
    const { data: existingUserByNaverId } = await supabaseAdmin
      .from("users")
      .select("auth_id")
      .eq("naver_id", naverId)
      .maybeSingle();

    if (existingUserByNaverId) {
      userId = existingUserByNaverId.auth_id;
      console.log("✅ 기존 네이버 사용자 발견 (naver_id):", userId);
    } else {
      // 이메일로 검색
      const { data: existingUserByEmail } = await supabaseAdmin
        .from("users")
        .select("auth_id")
        .eq("email", userEmail)
        .maybeSingle();

      if (existingUserByEmail) {
        userId = existingUserByEmail.auth_id;
        console.log("✅ 기존 사용자 발견 (email):", userId);

        // naver_id 업데이트
        await supabaseAdmin
          .from("users")
          .update({ naver_id: naverId })
          .eq("auth_id", userId);
      }
    }

    // 4. 사용자가 없으면 새로 생성
    if (!userId) {
      console.log("📝 새 사용자 생성 중...");

      // Auth 사용자 생성 (임시 비밀번호 사용)
      const tempPassword = `naver_${naverId}_${Date.now()}_${Math.random()
        .toString(36)
        .substring(7)}`;

      const { data: newAuthUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email: userEmail,
          password: tempPassword,
          email_confirm: true, // 이메일 확인 없이 바로 사용
          user_metadata: {
            name: userName,
            provider: "naver",
            naver_id: naverId,
            avatar_url: userProfileImage,
          },
        });

      if (createError) {
        console.error("❌ Auth 사용자 생성 실패:", createError);

        // 이미 존재하는 이메일인 경우
        if (createError.message.includes("already registered")) {
          // 기존 Auth 사용자 가져오기
          const { data: authUsers } =
            await supabaseAdmin.auth.admin.listUsers();
          const existingAuthUser = authUsers?.users?.find(
            (u) => u.email === userEmail
          );

          if (existingAuthUser) {
            userId = existingAuthUser.id;
            console.log("✅ 기존 Auth 사용자 연결:", userId);

            // users 테이블에 naver_id 추가/업데이트
            await supabaseAdmin.from("users").upsert(
              {
                auth_id: userId,
                email: userEmail,
                name: userName,
                naver_id: naverId,
                role: "CUSTOMER",
              },
              {
                onConflict: "auth_id",
              }
            );
          } else {
            return new Response(
              JSON.stringify({
                error: "이미 등록된 이메일입니다. 다른 방법으로 로그인해주세요.",
              }),
              {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }
        } else {
          throw createError;
        }
      } else if (newAuthUser?.user) {
        userId = newAuthUser.user.id;
        console.log("✅ 새 Auth 사용자 생성:", userId);

        // users 테이블에 프로필 생성
        const { error: profileError } = await supabaseAdmin
          .from("users")
          .insert({
            auth_id: userId,
            email: userEmail,
            name: userName,
            naver_id: naverId,
            role: "CUSTOMER",
            phone: naverUser.mobile || null,
          });

        if (profileError) {
          console.warn("⚠️ 프로필 생성 실패 (트리거가 처리할 수 있음):", profileError);
        }
      }
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "사용자 처리에 실패했습니다" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 5. 세션 생성 (Magic Link → OTP 검증 방식)
    console.log("🔑 세션 생성 중...");

    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Magic link 생성 후 token_hash 추출하여 OTP 검증
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: userEmail,
      });

    if (linkError || !linkData?.properties?.action_link) {
      console.error("❌ Magic link 생성 실패:", linkError);
      // 폴백: signInWithPassword 방식
      const tempPassword = `Naver_${naverId}_2024!secure`;
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: tempPassword,
      });
      const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: signInData, error: signInError } =
        await supabaseClient.auth.signInWithPassword({
          email: userEmail,
          password: tempPassword,
        });
      if (signInError || !signInData.session) {
        console.error("❌ 폴백 세션 생성도 실패:", signInError);
        return new Response(
          JSON.stringify({ error: "세션 생성에 실패했습니다. 다시 시도해주세요." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({
          success: true,
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
          expires_in: signInData.session.expires_in,
          user_id: userId,
          email: userEmail,
          name: userName,
          provider: "naver",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // action_link에서 token_hash 추출
    const actionUrl = new URL(linkData.properties.action_link);
    const tokenHash = actionUrl.searchParams.get("token_hash");

    if (!tokenHash) {
      console.error("❌ token_hash 추출 실패:", linkData.properties.action_link);
      return new Response(
        JSON.stringify({ error: "인증 토큰을 생성할 수 없습니다." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // OTP 검증으로 실제 세션 획득
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: otpData, error: otpError } =
      await supabaseClient.auth.verifyOtp({
        token_hash: tokenHash,
        type: "magiclink",
      });

    if (otpError || !otpData.session) {
      console.error("❌ OTP 검증 실패:", otpError);
      return new Response(
        JSON.stringify({ error: "세션 검증에 실패했습니다. 다시 시도해주세요." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ 세션 생성 완료 (magic link 방식)");

    return new Response(
      JSON.stringify({
        success: true,
        access_token: otpData.session.access_token,
        refresh_token: otpData.session.refresh_token,
        expires_in: otpData.session.expires_in,
        user_id: userId,
        email: userEmail,
        name: userName,
        provider: "naver",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ 네이버 인증 오류:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "서버 오류가 발생했습니다",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

