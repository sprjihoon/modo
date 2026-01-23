import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../data/providers/auth_provider.dart';

/// 스플래시 화면
class SplashPage extends ConsumerStatefulWidget {
  const SplashPage({super.key});

  @override
  ConsumerState<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends ConsumerState<SplashPage> {
  @override
  void initState() {
    super.initState();
    _checkAuthAndNavigate();
  }

  Future<void> _checkAuthAndNavigate() async {
    // 2초 대기 (스플래시 화면 표시)
    await Future.delayed(const Duration(seconds: 2));
    
    if (!mounted) return;
    
    // 첫 실행 여부 확인 (권한 온보딩)
    final prefs = await SharedPreferences.getInstance();
    final permissionOnboardingCompleted = prefs.getBool('permission_onboarding_completed') ?? false;
    
    if (!permissionOnboardingCompleted) {
      // 첫 실행: 권한 온보딩으로 이동
      if (mounted) {
        context.go('/permission-onboarding');
      }
      return;
    }
    
    // Supabase 인증 상태 확인
    final authService = ref.read(authServiceProvider);
    final isLoggedIn = authService.isLoggedIn;
    
    if (mounted) {
      if (isLoggedIn) {
        // 로그인된 경우 프로필 완료 여부 확인
        final targetRoute = await _checkProfileCompletion();
        if (mounted) {
          context.go(targetRoute);
        }
      } else {
        // 로그인되지 않은 경우 로그인 페이지로 이동
        context.go('/login');
      }
    }
  }

  /// 프로필 완료 여부 확인
  Future<String> _checkProfileCompletion() async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) return '/login';

      final response = await Supabase.instance.client.rpc(
        'check_profile_completed',
        params: {'p_auth_id': user.id},
      );

      debugPrint('📋 [Splash] 프로필 체크: $response');

      if (response is List && response.isNotEmpty) {
        final result = response.first;
        final isCompleted = result['is_completed'] as bool? ?? false;

        if (!isCompleted) {
          debugPrint('⚠️ [Splash] 프로필 미완료 → /complete-profile');
          return '/complete-profile';
        }
      }

      return '/home';
    } catch (e) {
      debugPrint('❌ [Splash] 프로필 체크 실패: $e');
      return '/home'; // 에러 시 홈으로 (기존 사용자일 수 있음)
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.primary,
      body: const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // 로고 (추후 추가)
            Icon(
              Icons.checkroom_outlined,
              size: 80,
              color: Colors.white,
            ),
            SizedBox(height: 24),
            Text(
              '모두의수선',
              style: TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            SizedBox(height: 8),
            Text(
              'MODU\'S REPAIR',
              style: TextStyle(
                fontSize: 14,
                color: Colors.white70,
                letterSpacing: 2,
              ),
            ),
            SizedBox(height: 48),
            CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
            ),
          ],
        ),
      ),
    );
  }
}

