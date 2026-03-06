import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_naver_login/flutter_naver_login.dart';
import 'package:flutter_naver_login/interface/types/naver_login_status.dart';
import '../features/auth/domain/models/user_model.dart';
import '../core/enums/user_role.dart';
import '../core/enums/action_type.dart';
import 'log_service.dart';

/// Supabase Auth 서비스
class AuthService {
  final _supabase = Supabase.instance.client;
  final _logService = LogService();

  /// 현재 사용자
  User? get currentUser => _supabase.auth.currentUser;

  /// 현재 세션
  Session? get currentSession => _supabase.auth.currentSession;

  /// 로그인 상태
  bool get isLoggedIn => currentUser != null;

  /// 이메일/비밀번호 로그인
  Future<AuthResponse> signInWithEmail({
    required String email,
    required String password,
  }) async {
    try {
      print('🔐 로그인 시도: $email');

      // Supabase 연결 확인
      if (_supabase.auth.currentSession == null) {
        print('⚠️ 현재 세션이 없습니다 (정상 - 로그인 전)');
      }

      final response = await _supabase.auth.signInWithPassword(
        email: email,
        password: password,
      );

      print('✅ 로그인 성공: ${response.user?.email}');
      print(
          '📧 이메일 확인 상태: ${response.user?.emailConfirmedAt != null ? "확인됨" : "미확인"}');

      // 📊 로그인 액션 로그 기록
      await _logService.log(
        actionType: ActionType.LOGIN,
        metadata: {
          'email': email,
          'loginTime': DateTime.now().toIso8601String()
        },
      );

      return response;
    } on AuthException catch (e) {
      print('❌ AuthException 발생: ${e.message}');
      print('   상태 코드: ${e.statusCode}');

      // 이메일 확인 오류에 대한 더 명확한 메시지
      if (e.message.contains('Email not confirmed') ||
          e.message.contains('email_not_confirmed')) {
        throw Exception('이메일 확인이 필요합니다. 이메일을 확인해주세요.');
      }

      // 잘못된 자격증명
      if (e.message.contains('Invalid login credentials') ||
          e.message.contains('invalid_credentials')) {
        throw Exception('이메일 또는 비밀번호가 올바르지 않습니다.');
      }

      throw Exception('로그인 실패: ${e.message}');
    } catch (e) {
      print('❌ 예상치 못한 오류: $e');
      print('   타입: ${e.runtimeType}');
      throw Exception('로그인 실패: $e');
    }
  }

  /// 회원가입
  Future<AuthResponse> signUpWithEmail({
    required String email,
    required String password,
    required String name,
    required String phone,
    String? role, // 역할 지정 (옵션, 기본값은 'CUSTOMER')
  }) async {
    try {
      print('📝 회원가입 시작: $email');

      // 1. Auth 계정 생성
      final response = await _supabase.auth.signUp(
        email: email,
        password: password,
        data: {
          'name': name,
          'phone': phone,
        },
      );

      if (response.user == null) {
        throw Exception('회원가입 실패: 사용자 생성에 실패했습니다');
      }

      print('✅ Auth 계정 생성 성공: ${response.user!.id}');

      // 2. 프로필 생성 (users 테이블에 저장)
      // 🔒 보안: 기본 role은 'CUSTOMER' (고객용 앱)
      try {
        final userData = {
          'auth_id': response.user!.id,
          'email': email,
          'name': name,
          'phone': phone,
          'role': role ?? 'CUSTOMER', // 🔒 기본값: CUSTOMER
        };

        await _supabase.from('users').insert(userData);
        print('✅ 프로필 생성 성공 (role: ${userData['role']})');
      } catch (e) {
        // users 테이블 INSERT 실패 시
        // 트리거(auto_create_user_profile)가 자동으로 생성하므로 무시 가능
        print('⚠️ 프로필 수동 생성 실패 (트리거가 자동 생성할 것임): $e');

        // 잠시 대기 후 프로필 생성 확인
        await Future.delayed(const Duration(milliseconds: 500));

        try {
          final profile = await _supabase
              .from('users')
              .select('id, role')
              .eq('auth_id', response.user!.id)
              .maybeSingle();

          if (profile != null) {
            print('✅ 트리거로 프로필 자동 생성 확인됨 (role: ${profile['role']})');
          } else {
            print('⚠️ 프로필이 생성되지 않았습니다. 수동으로 재시도합니다.');
            // 재시도
            await _supabase.from('users').insert({
              'auth_id': response.user!.id,
              'email': email,
              'name': name,
              'phone': phone,
              'role': role ?? 'CUSTOMER',
            });
            print('✅ 프로필 재시도 성공');
          }
        } catch (retryError) {
          print('❌ 프로필 확인 실패: $retryError');
        }
      }

      return response;
    } on AuthException catch (e) {
      print('❌ AuthException: ${e.message}');
      throw Exception('회원가입 실패: ${e.message}');
    } catch (e) {
      print('❌ 회원가입 실패: $e');
      throw Exception('회원가입 실패: $e');
    }
  }

  /// 이메일 중복 체크
  Future<bool> checkEmailDuplicate(String email) async {
    try {
      // Supabase Auth에서 이메일 존재 여부 확인
      // 주의: Supabase는 직접 이메일 중복 체크 API를 제공하지 않음
      // 대신 users 테이블에서 확인
      final response = await _supabase
          .from('users')
          .select('email')
          .eq('email', email)
          .maybeSingle();

      return response != null;
    } catch (e) {
      // 에러 발생 시 false 반환 (중복이 아닌 것으로 간주)
      print('이메일 중복 체크 실패: $e');
      return false;
    }
  }

  /// 전화번호 중복 체크
  Future<bool> checkPhoneDuplicate(String phone) async {
    try {
      final response = await _supabase
          .from('users')
          .select('phone')
          .eq('phone', phone)
          .maybeSingle();

      return response != null;
    } catch (e) {
      print('전화번호 중복 체크 실패: $e');
      return false;
    }
  }

  /// 소셜 로그인 (Google)
  /// Supabase OAuth를 통한 구글 로그인
  Future<bool> signInWithGoogle() async {
    try {
      print('🔐 구글 로그인 시작');

      // Supabase OAuth를 통한 구글 로그인
      final response = await _supabase.auth.signInWithOAuth(
        OAuthProvider.google,
        redirectTo: 'modorepair://login-callback',
        authScreenLaunchMode: LaunchMode.inAppBrowserView,
      );

      if (!response) {
        print('⚠️ 구글 로그인 시작 실패');
        return false;
      }

      print('✅ 구글 OAuth 시작됨 - 브라우저로 이동');

      // 📊 로그인 액션 로그 기록
      await _logService.log(
        actionType: ActionType.LOGIN,
        metadata: {
          'provider': 'google',
          'loginTime': DateTime.now().toIso8601String(),
        },
      );

      return true;
    } catch (e) {
      print('❌ 구글 로그인 실패: $e');
      throw Exception('구글 로그인 실패: $e');
    }
  }

  /// 소셜 로그인 (Naver)
  /// flutter_naver_login 패키지를 사용하여 네이버 로그인 후
  /// Edge Function을 통해 Supabase 세션을 생성합니다
  Future<bool> signInWithNaver() async {
    try {
      print('🔐 네이버 로그인 시작');

      // 0. 네이버 SDK 초기화 확인 (환경 변수 체크)
      final naverClientId = dotenv.env['NAVER_CLIENT_ID'];
      if (naverClientId == null || naverClientId.isEmpty) {
        print('❌ 네이버 로그인 설정이 없습니다 (NAVER_CLIENT_ID 미설정)');
        throw Exception('네이버 로그인이 설정되지 않았습니다. 관리자에게 문의하세요.');
      }

      // 0.5. 기존 토큰 삭제 (Refresh token is not valid 에러 방지)
      try {
        await FlutterNaverLogin.logOutAndDeleteToken();
        print('🧹 기존 네이버 토큰 삭제 완료');
      } catch (e) {
        print('ℹ️ 기존 토큰 삭제 실패 (무시): $e');
      }

      // 1. 네이버 SDK로 로그인 (2.x API)
      final result = await FlutterNaverLogin.logIn();

      if (result.status == NaverLoginStatus.error) {
        print('⚠️ 네이버 로그인 취소 또는 실패: ${result.errorMessage}');
        return false;
      }

      final account = result.account;
      if (account == null) {
        print('⚠️ 네이버 계정 정보를 가져올 수 없습니다');
        return false;
      }

      final email = account.email ?? '';
      final name = account.name ?? '';
      final profileImage = account.profileImage ?? '';
      final userId = account.id ?? '';

      print('✅ 네이버 로그인 성공: $email');

      // 2. 네이버 액세스 토큰 가져오기 (2.x API)
      final tokenResult = await FlutterNaverLogin.getCurrentAccessToken();
      final accessToken = tokenResult.accessToken;

      if (accessToken.isEmpty) {
        throw Exception('네이버 액세스 토큰을 가져올 수 없습니다');
      }

      print('🔑 네이버 토큰 획득 완료');

      // 3. Edge Function 호출하여 Supabase 세션 생성
      final response = await _supabase.functions.invoke(
        'naver-auth',
        body: {
          'accessToken': accessToken,
          'email': email,
          'name': name,
          'profileImage': profileImage,
          'id': userId,
        },
      );

      print('📋 Edge Function 응답: status=${response.status}');

      if (response.status != 200) {
        final errorData = response.data;
        final errorMessage = errorData?['error'] ?? '네이버 로그인 처리에 실패했습니다';
        throw Exception(errorMessage);
      }

      // 4. Edge Function에서 반환한 세션으로 로그인
      final sessionData = response.data;
      final sessionAccessToken = sessionData?['access_token'] as String?;
      final sessionRefreshToken = sessionData?['refresh_token'] as String?;

      if (sessionAccessToken != null && sessionRefreshToken != null) {
        // setSession은 refresh_token을 인자로 받음
        await _supabase.auth.setSession(sessionRefreshToken);
        print('✅ Supabase 세션 설정 완료');
      } else {
        print('⚠️ 세션 토큰이 없습니다. 응답: $sessionData');
        throw Exception('로그인 세션을 생성할 수 없습니다. 다시 시도해주세요.');
      }

      // 📊 로그인 액션 로그 기록
      await _logService.log(
        actionType: ActionType.LOGIN,
        metadata: {
          'provider': 'naver',
          'email': email,
          'loginTime': DateTime.now().toIso8601String(),
        },
      );

      print('✅ 네이버 로그인 완료');
      return true;
    } on Exception catch (e) {
      print('❌ 네이버 로그인 실패: $e');

      // 네이버 로그아웃 (실패 시 정리)
      try {
        await FlutterNaverLogin.logOut();
      } catch (_) {}

      throw Exception('네이버 로그인 실패: $e');
    }
  }

  /// 네이버 로그아웃
  Future<void> signOutNaver() async {
    try {
      await FlutterNaverLogin.logOut();
      print('✅ 네이버 로그아웃 완료');
    } catch (e) {
      print('⚠️ 네이버 로그아웃 실패 (무시됨): $e');
    }
  }

  /// 소셜 로그인 (Kakao)
  /// Supabase OAuth를 통한 카카오 로그인
  Future<bool> signInWithKakao() async {
    try {
      print('🔐 카카오 로그인 시작');

      // Supabase OAuth를 통한 카카오 로그인
      // 비즈 앱 전환 완료 - account_email 포함 모든 동의항목 요청 가능
      final response = await _supabase.auth.signInWithOAuth(
        OAuthProvider.kakao,
        redirectTo: 'modorepair://login-callback',
        authScreenLaunchMode: LaunchMode.inAppBrowserView,
      );

      if (!response) {
        print('⚠️ 카카오 로그인 시작 실패');
        return false;
      }

      print('✅ 카카오 OAuth 시작됨 - 브라우저로 이동');

      // 📊 로그인 액션 로그 기록
      await _logService.log(
        actionType: ActionType.LOGIN,
        metadata: {
          'provider': 'kakao',
          'loginTime': DateTime.now().toIso8601String(),
        },
      );

      return true;
    } catch (e) {
      print('❌ 카카오 로그인 실패: $e');
      throw Exception('카카오 로그인 실패: $e');
    }
  }

  /// 소셜 로그인 (Apple)
  /// Supabase OAuth를 통한 애플 로그인
  /// ⚠️ Apple Developer 계정 설정 필요:
  /// 1. App ID에서 "Sign In with Apple" 활성화
  /// 2. Service ID 생성 (웹 로그인용)
  /// 3. Supabase Dashboard > Auth > Providers > Apple 설정
  Future<bool> signInWithApple() async {
    try {
      print('🔐 애플 로그인 시작');

      // Supabase OAuth를 통한 애플 로그인
      final response = await _supabase.auth.signInWithOAuth(
        OAuthProvider.apple,
        redirectTo: 'modorepair://login-callback',
        authScreenLaunchMode: LaunchMode.inAppBrowserView,
      );

      if (!response) {
        print('⚠️ 애플 로그인 시작 실패');
        return false;
      }

      print('✅ 애플 OAuth 시작됨 - 브라우저로 이동');

      // 📊 로그인 액션 로그 기록
      await _logService.log(
        actionType: ActionType.LOGIN,
        metadata: {
          'provider': 'apple',
          'loginTime': DateTime.now().toIso8601String(),
        },
      );

      return true;
    } catch (e) {
      print('❌ 애플 로그인 실패: $e');
      throw Exception('애플 로그인 실패: $e');
    }
  }

  /// 로그아웃
  Future<void> signOut() async {
    try {
      // 📊 로그아웃 액션 로그 기록 (로그아웃 전에 기록, 실패해도 로그아웃 진행)
      try {
        await _logService.log(
          actionType: ActionType.LOGOUT,
          metadata: {'logoutTime': DateTime.now().toIso8601String()},
        );
      } catch (logError) {
        print('⚠️ 로그아웃 로그 기록 실패 (무시됨): $logError');
      }

      // SignOutScope.local: 현재 디바이스에서만 로그아웃 (더 빠름)
      await _supabase.auth.signOut(scope: SignOutScope.local);

      print('✅ 로그아웃 완료');
    } catch (e) {
      print('❌ 로그아웃 실패: $e');
      // 에러가 발생해도 로컬 세션은 클리어 시도
      try {
        await _supabase.auth.signOut(scope: SignOutScope.local);
      } catch (_) {}
      throw Exception('로그아웃 실패: $e');
    }
  }

  /// 비밀번호 재설정 이메일 전송
  Future<void> resetPassword(String email) async {
    try {
      await _supabase.auth.resetPasswordForEmail(
        email,
        redirectTo: 'io.flutter.app://reset-password',
      );
    } on AuthException catch (e) {
      throw Exception('비밀번호 재설정 실패: ${e.message}');
    } catch (e) {
      throw Exception('비밀번호 재설정 실패: $e');
    }
  }

  /// 사용자 프로필 업데이트
  Future<void> updateProfile({
    required String name,
    required String phone,
  }) async {
    try {
      final currentUser = this.currentUser;
      if (currentUser == null) {
        throw Exception('로그인이 필요합니다');
      }

      // 전화번호 중복 체크 (자신의 전화번호가 아닌 경우)
      final existingPhone = await checkPhoneDuplicate(phone);
      if (existingPhone) {
        // 현재 사용자의 전화번호인지 확인
        final myProfile = await _supabase
            .from('users')
            .select('phone')
            .eq('auth_id', currentUser.id)
            .maybeSingle();

        if (myProfile == null || myProfile['phone'] != phone) {
          throw Exception('이미 사용 중인 전화번호입니다');
        }
      }

      // 프로필 업데이트
      final response = await _supabase
          .from('users')
          .update({
            'name': name,
            'phone': phone,
            'updated_at': DateTime.now().toIso8601String(),
          })
          .eq('auth_id', currentUser.id)
          .select()
          .single();

      print('✅ 프로필 업데이트 성공: ${response['name']}');
    } catch (e) {
      print('❌ 프로필 업데이트 실패: $e');
      if (e.toString().contains('이미 사용 중인')) {
        rethrow;
      }
      throw Exception('프로필 업데이트 실패: $e');
    }
  }

  /// 회원 탈퇴
  /// Edge Function을 호출하여 계정 및 모든 관련 데이터를 삭제합니다
  /// 반환값: 성공 시 true
  Future<bool> deleteAccount() async {
    try {
      final currentUser = this.currentUser;
      if (currentUser == null) {
        throw Exception('로그인이 필요합니다');
      }

      print('🗑️ 회원 탈퇴 요청 시작');

      // Edge Function 호출
      final response = await _supabase.functions.invoke(
        'delete-account',
      );

      print('📋 회원 탈퇴 응답: status=${response.status}, data=${response.data}');

      if (response.status != 200) {
        final errorData = response.data;
        final errorMessage = errorData?['error'] ?? '회원 탈퇴에 실패했습니다';
        throw Exception(errorMessage);
      }

      print('✅ 회원 탈퇴 완료 - 로컬 세션 정리 중...');

      // 로컬 세션만 정리 (auth listener 트리거하지 않도록 조용히 처리)
      try {
        await _supabase.auth.signOut(scope: SignOutScope.local);
      } catch (signOutError) {
        // 계정이 이미 삭제되었으므로 signOut 에러는 무시
        print('⚠️ signOut 에러 (무시됨 - 계정 이미 삭제): $signOutError');
      }

      print('✅ 회원 탈퇴 및 세션 정리 완료');
      return true;
    } catch (e) {
      print('❌ 회원 탈퇴 실패: $e');
      throw Exception('회원 탈퇴 실패: $e');
    }
  }

  /// Auth 상태 변경 리스너
  Stream<AuthState> get authStateChanges => _supabase.auth.onAuthStateChange;

  /// 현재 사용자 프로필 가져오기 (UserModel)
  Future<UserModel?> getUserProfile() async {
    try {
      final currentUser = this.currentUser;
      if (currentUser == null) {
        return null;
      }

      final response = await _supabase
          .from('users')
          .select('*')
          .eq('auth_id', currentUser.id)
          .maybeSingle();

      if (response != null) {
        print('✅ 사용자 프로필 조회 성공: ${response['name']} (역할: ${response['role']})');
        return UserModel.fromJson(response);
      }

      return null;
    } catch (e) {
      print('❌ 사용자 프로필 조회 실패: $e');
      return null;
    }
  }

  /// 사용자 역할 가져오기
  Future<UserRole?> getUserRole() async {
    try {
      final profile = await getUserProfile();
      return profile?.role;
    } catch (e) {
      print('❌ 사용자 역할 조회 실패: $e');
      return null;
    }
  }
}
