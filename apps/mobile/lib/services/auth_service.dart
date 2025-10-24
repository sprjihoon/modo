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
      final response = await _supabase.auth.signInWithPassword(
        email: email,
        password: password,
      );
      
      return response;
    } catch (e) {
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
      );

      if (response.user == null) {
        throw Exception('회원가입 실패');
      }

      // 2. 프로필 생성
      await _supabase.from('users').insert({
        'auth_id': response.user!.id,
        'email': email,
        'name': name,
        'phone': phone,
      });

      return response;
    } catch (e) {
      throw Exception('회원가입 실패: $e');
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
      await _supabase.auth.resetPasswordForEmail(email);
    } catch (e) {
      throw Exception('비밀번호 재설정 실패: $e');
    }
  }

  /// Auth 상태 변경 리스너
  Stream<AuthState> get authStateChanges => _supabase.auth.onAuthStateChange;
}

