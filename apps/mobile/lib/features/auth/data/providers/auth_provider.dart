import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../services/auth_service.dart';
import '../../domain/models/user_model.dart';
import '../../../../core/enums/user_role.dart';

/// AuthService Provider
final authServiceProvider = Provider<AuthService>((ref) {
  return AuthService();
});

/// 현재 사용자 Provider (Supabase Auth) - 실시간 auth 상태 감지
final currentUserProvider = StreamProvider<User?>((ref) {
  final authService = ref.watch(authServiceProvider);
  return authService.authStateChanges.map((event) => event.session?.user);
});

/// 로그인 상태 Provider - currentUserProvider 기반으로 실시간 반영
final isLoggedInProvider = Provider<bool>((ref) {
  final currentUserAsync = ref.watch(currentUserProvider);
  return currentUserAsync.when(
    data: (user) => user != null,
    loading: () => false,
    error: (_, __) => false,
  );
});

/// 사용자 프로필 Provider (users 테이블에서 UserModel로 가져옴)
/// currentUserProvider를 watch하여 auth 상태 변경 시 자동으로 다시 fetch
final userProfileProvider = FutureProvider<UserModel?>((ref) async {
  // currentUserProvider를 watch하여 auth 상태 변경 감지
  final currentUserAsync = ref.watch(currentUserProvider);
  
  return currentUserAsync.when(
    data: (user) async {
      if (user == null) {
        return null;
      }
      
      try {
        final supabase = Supabase.instance.client;
        final response = await supabase
            .from('users')
            .select('*')
            .eq('auth_id', user.id)
            .maybeSingle();
        
        if (response != null) {
          return UserModel.fromJson(response);
        }
        
        return null;
      } catch (e) {
        print('사용자 프로필 가져오기 실패: $e');
        return null;
      }
    },
    loading: () => null,
    error: (_, __) => null,
  );
});

/// 사용자 역할 Provider (role만 추출)
final userRoleProvider = Provider<UserRole?>((ref) {
  final userProfile = ref.watch(userProfileProvider);
  return userProfile.when(
    data: (user) => user?.role,
    loading: () => null,
    error: (_, __) => null,
  );
});

/// 관리자 권한 확인 Provider
final isAdminProvider = Provider<bool>((ref) {
  final role = ref.watch(userRoleProvider);
  return role?.isAdmin ?? false;
});

/// 관리자 또는 매니저 권한 확인 Provider
final isManagerOrAboveProvider = Provider<bool>((ref) {
  final role = ref.watch(userRoleProvider);
  return role?.isManagerOrAbove ?? false;
});

