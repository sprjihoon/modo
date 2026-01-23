import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'core/theme/app_theme.dart';
import 'core/router/app_router.dart';

/// 모두의수선 메인 앱
class ModoRepairApp extends ConsumerStatefulWidget {
  const ModoRepairApp({super.key});

  @override
  ConsumerState<ModoRepairApp> createState() => _ModoRepairAppState();
}

class _ModoRepairAppState extends ConsumerState<ModoRepairApp> {
  StreamSubscription<AuthState>? _authSubscription;

  @override
  void initState() {
    super.initState();
    _setupAuthListener();
  }

  @override
  void dispose() {
    _authSubscription?.cancel();
    super.dispose();
  }

  /// 🔐 OAuth 로그인 성공 시 자동 네비게이션
  /// GoRouter가 커스텀 URL 스킴(modorepair://)을 파싱하다 크래시하는 문제 해결
  void _setupAuthListener() {
    _authSubscription = Supabase.instance.client.auth.onAuthStateChange.listen((data) async {
      final event = data.event;
      final session = data.session;
      
      debugPrint('🔔 [App] Auth 이벤트: $event');
      
      // 초기 세션도 프로필 완료 여부 체크 필요
      if (event == AuthChangeEvent.initialSession) {
        if (session != null) {
          debugPrint('🔄 [App] 기존 세션 복원 - 프로필 체크 중...');
          // 잠시 대기 후 프로필 확인
          await Future.delayed(const Duration(milliseconds: 500));
          if (!mounted) return;
          
          final targetRoute = await _checkProfileAndGetRoute(session.user.id);
          if (!mounted) return;
          
          // 프로필 미완료면 complete-profile로
          if (targetRoute == '/complete-profile') {
            debugPrint('⚠️ [App] 프로필 미완료 - 추가정보 입력 페이지로 이동');
            final router = ref.read(routerProvider);
            router.go('/complete-profile');
          }
        }
        return;
      }
      
      // OAuth 로그인 성공 시 프로필 완료 여부 확인 후 이동
      // GoRouter 파싱 에러와 무관하게 직접 네비게이션
      if (event == AuthChangeEvent.signedIn && session != null) {
        debugPrint('✅ [App] OAuth 로그인 성공 - 프로필 체크 중...');
        
        // 잠시 대기 후 프로필 확인 (Supabase 처리 완료 대기)
        await Future.delayed(const Duration(milliseconds: 300));
        
        if (!mounted) return;
        
        // 프로필 완료 여부 확인
        final targetRoute = await _checkProfileAndGetRoute(session.user.id);
        
        if (!mounted) return;
        
        final router = ref.read(routerProvider);
        final currentPath = router.routerDelegate.currentConfiguration.uri.path;
        
        // 현재 위치가 login이면 적절한 페이지로 이동
        if (currentPath == '/login' || currentPath == '/') {
          debugPrint('🔀 [App] 이동: $targetRoute');
          router.go(targetRoute);
        }
      }
      
      // 로그아웃 시 로그인 페이지로
      if (event == AuthChangeEvent.signedOut) {
        debugPrint('🚪 [App] 로그아웃 - 로그인 페이지로 이동');
        Future.delayed(const Duration(milliseconds: 100), () {
          if (mounted) {
            final router = ref.read(routerProvider);
            router.go('/login');
          }
        });
      }
    });
  }

  /// 프로필 완료 여부 확인 후 이동할 경로 반환
  Future<String> _checkProfileAndGetRoute(String userId) async {
    try {
      // RPC 함수로 프로필 완료 여부 확인
      final response = await Supabase.instance.client.rpc(
        'check_profile_completed',
        params: {'p_auth_id': userId},
      );
      
      debugPrint('📋 [App] 프로필 체크 결과: $response');
      
      if (response is List && response.isNotEmpty) {
        final result = response.first;
        final isCompleted = result['is_completed'] as bool? ?? false;
        final missingFields = result['missing_fields'] as List? ?? [];
        
        if (!isCompleted) {
          debugPrint('⚠️ [App] 프로필 미완료: $missingFields');
          return '/complete-profile';
        }
      }
      
      return '/home';
    } catch (e) {
      debugPrint('❌ [App] 프로필 체크 실패: $e');
      // 에러 시 일단 홈으로 (기존 사용자일 수 있음)
      return '/home';
    }
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: '모두의수선',
      debugShowCheckedModeBanner: false,
      
      // Theme
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      
      // Routing
      routerConfig: router,
      
      // Localization (추후 구현)
      // localizationsDelegates: [
      //   GlobalMaterialLocalizations.delegate,
      //   GlobalWidgetsLocalizations.delegate,
      //   GlobalCupertinoLocalizations.delegate,
      // ],
      // supportedLocales: [
      //   Locale('ko', 'KR'),
      //   Locale('en', 'US'),
      // ],
    );
  }
}

