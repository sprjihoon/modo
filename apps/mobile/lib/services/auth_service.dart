import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:firebase_auth/firebase_auth.dart' as firebase_auth;
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
      print('📧 이메일 확인 상태: ${response.user?.emailConfirmedAt != null ? "확인됨" : "미확인"}');
      
      // 📊 로그인 액션 로그 기록
      await _logService.log(
        actionType: ActionType.LOGIN,
        metadata: {'email': email, 'loginTime': DateTime.now().toIso8601String()},
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
          'role': role ?? 'CUSTOMER',  // 🔒 기본값: CUSTOMER
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

  /// 소셜 로그인 (Google) - Firebase Auth 사용
  Future<bool> signInWithGoogle() async {
    try {
      print('🔐 Google 로그인 시작');
      
      // 1. Google Sign In 시작
      final GoogleSignIn googleSignIn = GoogleSignIn(
        scopes: ['email', 'profile'],
      );
      
      final GoogleSignInAccount? googleUser = await googleSignIn.signIn();
      
      if (googleUser == null) {
        print('⚠️ Google 로그인 취소됨');
        return false;
      }
      
      print('✅ Google 계정 선택: ${googleUser.email}');
      
      // 2. Google 인증 토큰 가져오기
      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;
      
      // 3. Firebase Auth로 로그인
      final credential = firebase_auth.GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );
      
      final firebase_auth.UserCredential firebaseUser = 
          await firebase_auth.FirebaseAuth.instance.signInWithCredential(credential);
      
      print('✅ Firebase 로그인 성공: ${firebaseUser.user?.email}');
      
      // 4. Supabase에도 로그인 (ID Token 사용)
      if (googleAuth.idToken != null) {
        try {
          final response = await _supabase.auth.signInWithIdToken(
            provider: OAuthProvider.google,
            idToken: googleAuth.idToken!,
            accessToken: googleAuth.accessToken,
          );
          
          print('✅ Supabase 로그인 성공: ${response.user?.email}');
          
          // 5. Supabase users 테이블에 프로필 생성/업데이트
          if (response.user != null) {
            await _createOrUpdateGoogleUserProfile(
              authId: response.user!.id,
              email: googleUser.email,
              name: googleUser.displayName ?? '사용자',
            );
          }
        } catch (supabaseError) {
          print('⚠️ Supabase 로그인 실패 (Firebase만 사용): $supabaseError');
          // Firebase 로그인은 성공했으므로 계속 진행
        }
      }
      
      // 📊 로그인 액션 로그 기록
      await _logService.log(
        actionType: ActionType.LOGIN,
        metadata: {
          'provider': 'google',
          'email': googleUser.email,
          'loginTime': DateTime.now().toIso8601String(),
        },
      );
      
      return true;
    } catch (e) {
      print('❌ Google 로그인 실패: $e');
      throw Exception('구글 로그인 실패: $e');
    }
  }
  
  /// Google 사용자 프로필 생성 또는 업데이트
  Future<void> _createOrUpdateGoogleUserProfile({
    required String authId,
    required String email,
    required String name,
  }) async {
    try {
      // 기존 프로필 확인
      final existingProfile = await _supabase
          .from('users')
          .select('id')
          .eq('auth_id', authId)
          .maybeSingle();
      
      if (existingProfile != null) {
        // 기존 사용자 - 업데이트
        print('✅ 기존 Google 사용자 프로필 확인됨');
      } else {
        // 신규 사용자 - 프로필 생성
        await _supabase.from('users').insert({
          'auth_id': authId,
          'email': email,
          'name': name,
          'role': 'CUSTOMER',
        });
        print('✅ 신규 Google 사용자 프로필 생성됨');
      }
    } catch (e) {
      print('⚠️ Google 사용자 프로필 처리 실패: $e');
      // 프로필 생성 실패해도 로그인은 성공 처리
    }
  }

  /// 소셜 로그인 (Naver)
  /// 주의: Supabase에서 Naver는 커스텀 OAuth provider로 설정해야 합니다
  /// Supabase Dashboard > Authentication > Providers에서 Naver를 활성화하고 설정해야 합니다
  /// 현재는 기본 제공되지 않으므로, Supabase Dashboard에서 커스텀 provider로 추가해야 합니다
  Future<bool> signInWithNaver() async {
    // 네이버 로그인은 현재 지원하지 않습니다.
    // Supabase Dashboard에서 커스텀 OAuth provider 설정 후 활성화 예정
    debugPrint('⚠️ 네이버 로그인: 현재 준비 중입니다.');
    return false;
    
    // TODO: Naver OAuth 설정 후 아래 코드 활성화
    // try {
    //   await _supabase.auth.signInWithOAuth(
    //     OAuthProvider.naver,
    //     redirectTo: 'io.flutter.app://',
    //   );
    //   return true;
    // } catch (e) {
    //   debugPrint('네이버 로그인 실패: $e');
    //   return false;
    // }
  }

  /// 소셜 로그인 (Kakao)
  /// 주의: Supabase에서 Kakao는 커스텀 OAuth provider로 설정해야 합니다
  /// Supabase Dashboard > Authentication > Providers에서 Kakao를 활성화하고 설정해야 합니다
  /// 현재는 기본 제공되지 않으므로, Supabase Dashboard에서 커스텀 provider로 추가해야 합니다
  Future<bool> signInWithKakao() async {
    // 카카오 로그인은 현재 지원하지 않습니다.
    // Supabase Dashboard에서 커스텀 OAuth provider 설정 후 활성화 예정
    debugPrint('⚠️ 카카오 로그인: 현재 준비 중입니다.');
    return false;
    
    // TODO: Kakao OAuth 설정 후 아래 코드 활성화
    // try {
    //   await _supabase.auth.signInWithOAuth(
    //     OAuthProvider.kakao,
    //     redirectTo: 'io.flutter.app://',
    //   );
    //   return true;
    // } catch (e) {
    //   debugPrint('카카오 로그인 실패: $e');
    //   return false;
    // }
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

