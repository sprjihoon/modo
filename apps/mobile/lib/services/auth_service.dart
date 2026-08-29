import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_naver_login/flutter_naver_login.dart';
import 'package:flutter_naver_login/interface/types/naver_login_status.dart';
import 'package:flutter_web_auth_2/flutter_web_auth_2.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../core/auth/password_account.dart';
import '../features/auth/domain/models/user_model.dart';
import '../core/enums/user_role.dart';
import '../core/enums/action_type.dart';
import 'log_service.dart';
import 'point_service.dart';

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

  /// 이메일/비밀번호 계정이면 비밀번호 변경 가능.
  bool get canChangePassword {
    final user = currentUser;
    if (user == null) return false;
    final fromIdentities = user.identities?.map((i) => i.provider) ?? const [];
    final providers = <String>{...fromIdentities};
    final meta = user.appMetadata['providers'];
    if (meta is List) {
      providers.addAll(meta.map((e) => e.toString()));
    }
    final single = user.appMetadata['provider'];
    if (single is String) providers.add(single);
    return canChangePasswordFromProviders(providers);
  }

  /// 현재 비밀번호 확인 후 새 비밀번호로 변경.
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    final user = currentUser;
    final email = user?.email;
    if (user == null || email == null || email.isEmpty) {
      throw Exception('로그인이 필요합니다');
    }
    if (!canChangePassword) {
      throw Exception('소셜 로그인 계정은 비밀번호를 변경할 수 없습니다');
    }

    try {
      await _supabase.auth.signInWithPassword(
        email: email,
        password: currentPassword,
      );
    } on AuthException {
      throw Exception('현재 비밀번호가 올바르지 않습니다');
    }

    try {
      await _supabase.auth.updateUser(
        UserAttributes(password: newPassword),
      );
    } on AuthException {
      throw Exception('비밀번호 변경에 실패했습니다');
    }
  }

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
      final nowIso = DateTime.now().toUtc().toIso8601String();
      try {
        final userData = {
          'auth_id': response.user!.id,
          'email': email,
          'name': name,
          'phone': phone,
          'role': role ?? 'CUSTOMER', // 🔒 기본값: CUSTOMER
          'login_provider': 'email',
          'terms_agreed_at': nowIso,
          'privacy_agreed_at': nowIso,
          'profile_completed': true,
        };

        await _supabase.from('users').upsert(userData, onConflict: 'auth_id');
        print('✅ 프로필 생성 성공 (role: ${userData['role']})');
      } catch (e) {
        print('⚠️ 프로필 upsert 실패, update로 보정: $e');
        try {
          await _supabase.from('users').update({
            'name': name,
            'phone': phone,
            'terms_agreed_at': nowIso,
            'privacy_agreed_at': nowIso,
            'profile_completed': true,
            'login_provider': 'email',
          }).eq('auth_id', response.user!.id);
          print('✅ 프로필 보정 성공');
        } catch (retryError) {
          print('❌ 프로필 확인 실패: $retryError');
        }
      }

      // 회원가입 축하 포인트 (DB 트리거 + 멱등 안전망)
      try {
        await PointService().grantSignupReward();
      } catch (e) {
        print('⚠️ 가입 포인트 지급 호출 실패(무시): $e');
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
  Future<bool> signInWithGoogle() async {
    return _signInWithOAuthWebSession(
      provider: OAuthProvider.google,
      label: 'Google',
    );
  }

  /// 소셜 로그인 (Naver)
  /// flutter_naver_login 패키지를 사용하여 네이버 로그인 후
  /// Edge Function을 통해 Supabase 세션을 생성합니다
  Future<bool> signInWithNaver() async {
    try {
      print('🔐 네이버 로그인 시작');

      final naverClientId = dotenv.env['NAVER_CLIENT_ID'];
      if (naverClientId == null || naverClientId.isEmpty) {
        print('❌ 네이버 로그인 설정이 없습니다 (NAVER_CLIENT_ID 미설정)');
        throw Exception('네이버 로그인이 설정되지 않았습니다. 관리자에게 문의하세요.');
      }

      // 기존 유효 토큰이 있으면 앱 전환 없이 재사용
      // (매 로그인마다 logOutAndDeleteToken 하면 네이버앱 SSO 후 빈 결과로 복귀하는 경우가 있음)
      String accessToken = '';
      String email = '';
      String name = '';
      String profileImage = '';
      String userId = '';

      try {
        if (await FlutterNaverLogin.isLoggedIn()) {
          final existing = await FlutterNaverLogin.getCurrentAccessToken();
          if (existing.accessToken.isNotEmpty) {
            final account = await FlutterNaverLogin.getCurrentAccount();
            accessToken = existing.accessToken;
            email = account.email ?? '';
            name = account.name ?? '';
            profileImage = account.profileImage ?? '';
            userId = account.id ?? '';
            print('♻️ 기존 네이버 토큰 재사용');
          }
        }
      } catch (e) {
        print('ℹ️ 기존 네이버 세션 확인 실패(무시): $e');
      }

      if (accessToken.isEmpty) {
        var result = await FlutterNaverLogin.logIn();
        final err = (result.errorMessage ?? '').toLowerCase();
        final needsReset = result.status == NaverLoginStatus.error &&
            (err.contains('refresh') || err.contains('token'));

        if (needsReset) {
          print('🧹 만료 토큰 정리 후 재시도');
          try {
            await FlutterNaverLogin.logOutAndDeleteToken();
          } catch (_) {}
          result = await FlutterNaverLogin.logIn();
        }

        if (result.status != NaverLoginStatus.loggedIn) {
          print(
            '⚠️ 네이버 로그인 취소 또는 실패: status=${result.status}, msg=${result.errorMessage}',
          );
          return false;
        }

        accessToken = result.accessToken?.accessToken ?? '';
        if (accessToken.isEmpty) {
          final tokenResult = await FlutterNaverLogin.getCurrentAccessToken();
          accessToken = tokenResult.accessToken;
        }

        var account = result.account;
        if (account == null ||
            ((account.email == null || account.email!.isEmpty) &&
                (account.id == null || account.id!.isEmpty))) {
          try {
            account = await FlutterNaverLogin.getCurrentAccount();
          } catch (_) {}
        }

        email = account?.email ?? '';
        name = account?.name ?? '';
        profileImage = account?.profileImage ?? '';
        userId = account?.id ?? '';
      }

      if (accessToken.isEmpty) {
        throw Exception('네이버 액세스 토큰을 가져올 수 없습니다');
      }

      print('✅ 네이버 로그인 성공: ${email.isEmpty ? '(email from API)' : email}');
      print('🔑 네이버 토큰 획득 완료');

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

      final sessionData = response.data;
      final sessionRefreshToken = sessionData?['refresh_token'] as String?;

      if (sessionRefreshToken == null || sessionRefreshToken.isEmpty) {
        print('⚠️ 세션 토큰이 없습니다. 응답: $sessionData');
        throw Exception('로그인 세션을 생성할 수 없습니다. 다시 시도해주세요.');
      }

      await _supabase.auth.setSession(sessionRefreshToken);
      print('✅ Supabase 세션 설정 완료');

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
  Future<bool> signInWithKakao() async {
    return _signInWithOAuthWebSession(
      provider: OAuthProvider.kakao,
      label: '카카오',
    );
  }

  /// Kakao/Google: 인증 시트가 콜백을 받을 때까지 기다린 뒤 세션을 만든다.
  /// `signInWithOAuth`는 브라우저만 열고 바로 true를 줘서 로딩이 멈추지 않았다.
  Future<bool> _signInWithOAuthWebSession({
    required OAuthProvider provider,
    required String label,
  }) async {
    try {
      print('🔐 $label 로그인 시작');
      const redirect = 'modorepair://login-callback';
      final oauth = await _supabase.auth.getOAuthSignInUrl(
        provider: provider,
        redirectTo: redirect,
      );

      final result = await FlutterWebAuth2.authenticate(
        url: oauth.url,
        callbackUrlScheme: 'modorepair',
      );

      await _supabase.auth.getSessionFromUrl(Uri.parse(result));

      if (currentSession == null) {
        print('⚠️ $label 웹 세션 없음');
        return false;
      }

      await _logService.log(
        actionType: ActionType.LOGIN,
        metadata: {
          'provider': provider.name,
          'method': 'web_session',
          'loginTime': DateTime.now().toIso8601String(),
        },
      );

      print('✅ $label 로그인 성공: ${currentUser?.email ?? currentUser?.id}');
      return true;
    } on PlatformException catch (e) {
      final code = e.code.toLowerCase();
      if (code.contains('cancel') || code.contains('canceled')) {
        print('ℹ️ $label 로그인 취소');
        return false;
      }
      print('❌ $label 웹 세션 실패: $e');
      throw Exception('$label 로그인을 완료하지 못했습니다');
    } catch (e) {
      print('❌ $label 로그인 실패: $e');
      throw Exception('$label 로그인 실패: $e');
    }
  }

  /// iPad(shortestSide >= 600). 네이티브 SIWA가 iPad에서
  /// AuthorizationError 1000(unknown)으로 실패함 — 심사 기기 iPad Air M3.
  bool _isIosTablet() {
    if (kIsWeb || !Platform.isIOS) return false;
    final views = ui.PlatformDispatcher.instance.views;
    if (views.isEmpty) return false;
    final view = views.first;
    final dpr = view.devicePixelRatio == 0 ? 1.0 : view.devicePixelRatio;
    return view.physicalSize.shortestSide / dpr >= 600;
  }

  /// 소셜 로그인 (Apple)
  /// iPhone: 네이티브 Sign in with Apple → Supabase id_token
  /// iPad: ASWebAuthenticationSession (네이티브가 error 1000으로 실패,
  ///   외부 Safari는 앱 복귀가 불안정)
  /// 네이티브 실패 시에도 같은 시트로 폴백. 완료/취소 후 항상 앱으로 돌아옴.
  Future<bool> signInWithApple() async {
    print('🔐 애플 로그인 시작');

    if (!kIsWeb && Platform.isIOS && !_isIosTablet()) {
      try {
        return await _signInWithAppleNative();
      } on SignInWithAppleAuthorizationException catch (e) {
        if (e.code == AuthorizationErrorCode.canceled) {
          print('ℹ️ 애플 로그인 취소');
          return false;
        }
        print('⚠️ 애플 네이티브 실패 (${e.code}), 인증 시트로 재시도');
      } catch (e) {
        print('⚠️ 애플 네이티브 실패, 인증 시트로 재시도: $e');
      }
      return await _signInWithAppleWebSession();
    }

    return await _signInWithAppleWebSession();
  }

  /// iOS ASWebAuthenticationSession / Android Chrome Custom Tab.
  /// 콜백 스킴으로 세션을 받고 앱으로 복귀한다.
  Future<bool> _signInWithAppleWebSession() async {
    try {
      const redirect = 'modorepair://login-callback';
      final oauth = await _supabase.auth.getOAuthSignInUrl(
        provider: OAuthProvider.apple,
        redirectTo: redirect,
      );

      final result = await FlutterWebAuth2.authenticate(
        url: oauth.url,
        callbackUrlScheme: 'modorepair',
      );

      await _supabase.auth.getSessionFromUrl(Uri.parse(result));

      if (currentSession == null) {
        print('⚠️ 애플 웹 세션 없음');
        return false;
      }

      await _logService.log(
        actionType: ActionType.LOGIN,
        metadata: {
          'provider': 'apple',
          'method': 'web_session',
          'loginTime': DateTime.now().toIso8601String(),
        },
      );

      print('✅ 애플 웹 세션 로그인 성공: ${currentUser?.email}');
      return true;
    } on PlatformException catch (e) {
      final code = e.code.toLowerCase();
      if (code.contains('cancel')) {
        print('ℹ️ 애플 로그인 취소');
        return false;
      }
      print('❌ 애플 웹 세션 실패: $e');
      throw Exception('Apple 로그인을 완료하지 못했습니다');
    } catch (e) {
      print('❌ 애플 웹 세션 실패: $e');
      throw Exception('Apple 로그인을 완료하지 못했습니다');
    }
  }

  Future<bool> _signInWithAppleNative() async {
    final rawNonce = _supabase.auth.generateRawNonce();
    final hashedNonce = sha256.convert(utf8.encode(rawNonce)).toString();

    final credential = await SignInWithApple.getAppleIDCredential(
      scopes: [
        AppleIDAuthorizationScopes.email,
        AppleIDAuthorizationScopes.fullName,
      ],
      nonce: hashedNonce,
    );

    final idToken = credential.identityToken;
    if (idToken == null) {
      throw Exception('Apple identity token이 없습니다');
    }

    final response = await _supabase.auth.signInWithIdToken(
      provider: OAuthProvider.apple,
      idToken: idToken,
      nonce: rawNonce,
    );

    if (response.session == null) {
      print('⚠️ 애플 네이티브 로그인 세션 없음');
      return false;
    }

    // 최초 로그인 시 이름 메타데이터 보강
    final given = credential.givenName;
    final family = credential.familyName;
    if ((given != null && given.isNotEmpty) ||
        (family != null && family.isNotEmpty)) {
      final fullName = [family, given].whereType<String>().join(' ').trim();
      if (fullName.isNotEmpty) {
        try {
          await _supabase.auth.updateUser(
            UserAttributes(data: {'full_name': fullName, 'name': fullName}),
          );
        } catch (_) {}
      }
    }

    await _logService.log(
      actionType: ActionType.LOGIN,
      metadata: {
        'provider': 'apple',
        'method': 'native',
        'loginTime': DateTime.now().toIso8601String(),
      },
    );

    print('✅ 애플 네이티브 로그인 성공: ${response.user?.email}');
    return true;
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
      // 비밀번호 재설정은 웹에서 처리 (modo.io.kr)
      await _supabase.auth.resetPasswordForEmail(
        email,
        redirectTo: 'https://modo.io.kr/auth/reset-password',
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
