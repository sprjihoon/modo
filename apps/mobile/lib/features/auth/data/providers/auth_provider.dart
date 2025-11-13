import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../services/auth_service.dart';

/// AuthService Provider
final authServiceProvider = Provider<AuthService>((ref) {
  return AuthService();
});

/// 현재 사용자 Provider
final currentUserProvider = StreamProvider<User?>((ref) {
  final authService = ref.watch(authServiceProvider);
  return authService.authStateChanges.map((event) => event.session?.user);
});

/// 로그인 상태 Provider
final isLoggedInProvider = Provider<bool>((ref) {
  final authService = ref.watch(authServiceProvider);
  return authService.isLoggedIn;
});

/// 사용자 프로필 Provider (users 테이블에서 가져옴)
final userProfileProvider = FutureProvider<Map<String, dynamic>?>((ref) async {
  final authService = ref.watch(authServiceProvider);
  final currentUser = authService.currentUser;
  
  if (currentUser == null) {
    return null;
  }
  
  try {
    final supabase = Supabase.instance.client;
    final response = await supabase
        .from('users')
        .select('name, email, phone')
        .eq('auth_id', currentUser.id)
        .maybeSingle();
    
    return response;
  } catch (e) {
    print('사용자 프로필 가져오기 실패: $e');
    // 에러 발생 시 Auth의 user metadata에서 이름 가져오기 시도
    final name = currentUser.userMetadata?['name'] as String?;
    if (name != null) {
      return {'name': name, 'email': currentUser.email ?? ''};
    }
    return null;
  }
});

