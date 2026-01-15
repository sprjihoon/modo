/**
 * 회원 탈퇴 Edge Function
 * 
 * 사용자 계정 및 개인정보를 삭제/익명화합니다.
 * 주문 및 작업 기록은 비즈니스 기록 보관을 위해 유지됩니다.
 * 
 * 처리 과정:
 * 1. 주문의 user_id는 유지 (주문 기록 보관)
 * 2. users 테이블의 개인정보 익명화 (이메일, 이름, 전화번호)
 * 3. auth.users 삭제 (인증 정보 삭제)
 * 
 * POST /delete-account
 * Headers: Authorization: Bearer <user_token>
 * Response: { success: true, message: "..." }
 */

import { createSupabaseClient } from '../_shared/supabase.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { handleCorsOptions } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsOptions();
  }

  try {
    // POST 요청만 허용
    if (req.method !== 'POST') {
      return errorResponse('Method not allowed', 405);
    }

    // 인증된 사용자 확인
    const supabase = createSupabaseClient(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse('인증이 필요합니다', 401, 'UNAUTHORIZED');
    }

    console.log('🗑️ 회원 탈퇴 요청:', {
      userId: user.id,
      email: user.email,
    });

    // 사용자 정보 확인 (public.users)
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('auth_id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('❌ 사용자 프로필 조회 실패:', profileError);
      return errorResponse('사용자 정보를 찾을 수 없습니다', 404, 'USER_NOT_FOUND');
    }

    if (!userProfile) {
      console.warn('⚠️ public.users에 사용자 정보가 없음:', user.id);
      // auth.users만 삭제 진행
    }

    // 주문 중 처리 중인 주문이 있는지 확인
    if (userProfile) {
      const { data: activeOrders, error: ordersError } = await supabase
        .from('orders')
        .select('id, status, order_number')
        .eq('user_id', userProfile.id)
        .in('status', ['PENDING', 'PAID', 'BOOKED', 'INBOUND', 'PROCESSING', 'READY_TO_SHIP']);

      if (ordersError) {
        console.error('❌ 주문 조회 실패:', ordersError);
      } else if (activeOrders && activeOrders.length > 0) {
        console.warn('⚠️ 처리 중인 주문이 있습니다:', activeOrders.length);
        // 처리 중인 주문이 있어도 탈퇴는 진행 (사용자 요청)
        // 필요시 여기서 에러를 반환할 수 있음
        // return errorResponse('처리 중인 주문이 있어 탈퇴할 수 없습니다', 400, 'ACTIVE_ORDERS_EXIST');
      }

      // 1. users 테이블의 개인정보 익명화 (주문 기록은 보관)
      // UUID 기반으로 고유한 익명화 값 생성
      const userIdShort = userProfile.id.replace(/-/g, '').substring(0, 16);
      const anonymizedEmail = `deleted_${userIdShort}@deleted.modorepair.com`;
      const anonymizedName = '탈퇴한 사용자';
      // 전화번호도 UUID 기반으로 고유하게 생성 (중복 방지)
      const anonymizedPhone = `0100000${userIdShort.substring(0, 4)}`;

      const { error: anonymizeError } = await supabase
        .from('users')
        .update({
          email: anonymizedEmail,
          name: anonymizedName,
          phone: anonymizedPhone,
          default_address: null,
          default_address_detail: null,
          default_zipcode: null,
          fcm_token: null,
          // auth_id는 나중에 NULL로 설정 (auth.users 삭제 후)
        })
        .eq('id', userProfile.id);

      if (anonymizeError) {
        console.error('❌ 개인정보 익명화 실패:', anonymizeError);
        return errorResponse('개인정보 익명화에 실패했습니다', 500, 'ANONYMIZE_FAILED');
      }

      console.log('✅ 개인정보 익명화 완료:', {
        userId: userProfile.id,
        originalEmail: userProfile.email,
        anonymizedEmail,
      });

      // 2. 주소 정보 삭제 (개인정보)
      const { error: addressesError } = await supabase
        .from('addresses')
        .delete()
        .eq('user_id', userProfile.id);

      if (addressesError) {
        console.warn('⚠️ 주소 삭제 실패 (무시 가능):', addressesError);
      }

      // 3. 알림 삭제 (개인정보)
      const { error: notificationsError } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userProfile.id);

      if (notificationsError) {
        console.warn('⚠️ 알림 삭제 실패 (무시 가능):', notificationsError);
      }

      // 4. 포인트 거래 내역은 보관하되, 개인정보는 이미 익명화됨
      // (user_id는 유지하여 통계 및 분석에 사용 가능)
    }

    // 5. auth.users 삭제 (인증 정보만 삭제)
    // 주문 및 작업 기록은 user_id로 연결되어 있어 보관됨
    const supabaseAdmin = createSupabaseClient(req);
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error('❌ 계정 삭제 실패:', deleteError);
      return errorResponse('계정 삭제에 실패했습니다', 500, 'DELETE_FAILED');
    }

    // 6. users 테이블의 auth_id를 NULL로 설정 (auth.users가 삭제되었으므로)
    if (userProfile) {
      const { error: updateAuthIdError } = await supabase
        .from('users')
        .update({ auth_id: null })
        .eq('id', userProfile.id);

      if (updateAuthIdError) {
        console.warn('⚠️ auth_id NULL 설정 실패 (무시 가능):', updateAuthIdError);
      }
    }

    console.log('✅ 회원 탈퇴 완료:', {
      userId: user.id,
      email: user.email,
      note: '주문 및 작업 기록은 보관되었습니다',
    });

    return successResponse({
      message: '회원 탈퇴가 완료되었습니다. 주문 및 작업 기록은 비즈니스 기록 보관을 위해 보관됩니다.',
      deleted_at: new Date().toISOString(),
    }, 200);

  } catch (error: any) {
    console.error('❌ 회원 탈퇴 오류:', error);
    return errorResponse(
      error.message || '회원 탈퇴 중 오류가 발생했습니다',
      500,
      'INTERNAL_ERROR'
    );
  }
});

