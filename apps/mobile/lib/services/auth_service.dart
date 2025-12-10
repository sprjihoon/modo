import 'package:supabase_flutter/supabase_flutter.dart';

/// Supabase Auth 서비스
class AuthService {
  final _supabase = Supabase.instance.client;

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
      print('📧 이메일 확인 상태: ${response.user?.emailConfirmedAt != null ? "확인됨" : "미확인"}');
      
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
  }) async {
    try {
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

      // 2. 프로필 생성 (users 테이블에 저장)
      try {
        await _supabase.from('users').insert({
          'auth_id': response.user!.id,
          'email': email,
          'name': name,
          'phone': phone,
        });
      } catch (e) {
        // users 테이블이 없거나 에러가 발생해도 계정은 생성됨
        // 나중에 프로필을 업데이트할 수 있음
        print('프로필 생성 실패 (무시 가능): $e');
      }

      return response;
    } on AuthException catch (e) {
      throw Exception('회원가입 실패: ${e.message}');
    } catch (e) {
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
    try {
      await _supabase.auth.signInWithOAuth(
        OAuthProvider.google,
        redirectTo: 'io.flutter.app://',
      );
      return true;
    } catch (e) {
      throw Exception('구글 로그인 실패: $e');
    }
  }

  /// 소셜 로그인 (Naver)
  /// 주의: Supabase에서 Naver는 커스텀 OAuth provider로 설정해야 합니다
  /// Supabase Dashboard > Authentication > Providers에서 Naver를 활성화하고 설정해야 합니다
  /// 현재는 기본 제공되지 않으므로, Supabase Dashboard에서 커스텀 provider로 추가해야 합니다
  Future<bool> signInWithNaver() async {
    try {
      // Naver는 Supabase Dashboard에서 커스텀 OAuth provider로 설정 필요
      // 설정 후 아래 코드를 활성화하세요
      // await _supabase.auth.signInWithOAuth(
      //   OAuthProvider.google, // 임시로 Google 사용, Naver 설정 후 변경 필요
      //   redirectTo: 'io.flutter.app://',
      // );
      throw Exception('네이버 로그인은 Supabase Dashboard에서 커스텀 OAuth provider 설정이 필요합니다');
    } catch (e) {
      throw Exception('네이버 로그인 실패: $e');
    }
  }

  /// 소셜 로그인 (Kakao)
  /// 주의: Supabase에서 Kakao는 커스텀 OAuth provider로 설정해야 합니다
  /// Supabase Dashboard > Authentication > Providers에서 Kakao를 활성화하고 설정해야 합니다
  /// 현재는 기본 제공되지 않으므로, Supabase Dashboard에서 커스텀 provider로 추가해야 합니다
  Future<bool> signInWithKakao() async {
    try {
      // Kakao는 Supabase Dashboard에서 커스텀 OAuth provider로 설정 필요
      // 설정 후 아래 코드를 활성화하세요
      // await _supabase.auth.signInWithOAuth(
      //   OAuthProvider.google, // 임시로 Google 사용, Kakao 설정 후 변경 필요
      //   redirectTo: 'io.flutter.app://',
      // );
      throw Exception('카카오 로그인은 Supabase Dashboard에서 커스텀 OAuth provider 설정이 필요합니다');
    } catch (e) {
      throw Exception('카카오 로그인 실패: $e');
    }
  }

  /// 로그아웃
  Future<void> signOut() async {
    try {
      await _supabase.auth.signOut();
    } catch (e) {
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
  Future<void> deleteAccount() async {
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

      if (response.status != 200) {
        final errorData = response.data;
        final errorMessage = errorData?['error'] ?? '회원 탈퇴에 실패했습니다';
        throw Exception(errorMessage);
      }

      final result = response.data;
      if (result?['success'] != true) {
        throw Exception(result?['error'] ?? '회원 탈퇴에 실패했습니다');
      }

      print('✅ 회원 탈퇴 완료');
      
      // 로그아웃 처리 (계정이 삭제되었으므로 세션도 무효화됨)
      await _supabase.auth.signOut();
    } catch (e) {
      print('❌ 회원 탈퇴 실패: $e');
      throw Exception('회원 탈퇴 실패: $e');
    }
  }

  /// Auth 상태 변경 리스너
  Stream<AuthState> get authStateChanges => _supabase.auth.onAuthStateChange;
}

