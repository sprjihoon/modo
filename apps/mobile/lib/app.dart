import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'core/theme/app_theme.dart';
import 'core/router/app_router.dart';
import 'services/network_monitor_service.dart';

/// 앱 라이프사이클 상태 Provider
final appLifecycleProvider =
    StateProvider<AppLifecycleState>((ref) => AppLifecycleState.resumed);

/// 네트워크 재연결 이벤트 Provider (포그라운드 복귀 시 트리거)
final networkReconnectProvider = StateProvider<int>((ref) => 0);

/// 모두의수선 메인 앱
class ModoRepairApp extends ConsumerStatefulWidget {
  const ModoRepairApp({super.key});

  @override
  ConsumerState<ModoRepairApp> createState() => _ModoRepairAppState();
}

class _ModoRepairAppState extends ConsumerState<ModoRepairApp>
    with WidgetsBindingObserver {
  StreamSubscription<AuthState>? _authSubscription;
  final _networkMonitor = NetworkMonitorService();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _setupAuthListener();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _authSubscription?.cancel();
    super.dispose();
  }

  /// 앱 라이프사이클 변경 감지
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    super.didChangeAppLifecycleState(state);
    debugPrint('📱 [App] 라이프사이클 변경: $state');

    // Provider에 상태 저장
    ref.read(appLifecycleProvider.notifier).state = state;

    // 백그라운드에서 포그라운드로 복귀 시
    if (state == AppLifecycleState.resumed) {
      _onAppResumed();
    }
  }

  /// 앱이 포그라운드로 복귀했을 때 처리
  Future<void> _onAppResumed() async {
    debugPrint('🔄 [App] 포그라운드 복귀 - 네트워크 상태 확인 중...');

    // 네트워크 상태 재확인
    await _networkMonitor.refreshConnectionStatus();

    if (_networkMonitor.isConnected) {
      debugPrint('✅ [App] 네트워크 연결 확인됨');
      // 재연결 이벤트 트리거 (데이터 새로고침용)
      ref.read(networkReconnectProvider.notifier).state++;
    } else {
      debugPrint('⚠️ [App] 네트워크 연결 없음');
    }
  }

  /// 🔐 OAuth 로그인 성공 시 자동 네비게이션
  /// GoRouter가 커스텀 URL 스킴(modorepair://)을 파싱하다 크래시하는 문제 해결
  void _setupAuthListener() {
    _authSubscription =
        Supabase.instance.client.auth.onAuthStateChange.listen((data) async {
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
        debugPrint('🚪 [App] 로그아웃 감지');
        // profile_page에서 이미 로그인 페이지로 이동했을 수 있으므로
        // 현재 경로가 login이 아닐 때만 이동 (세션 만료 등의 케이스)
        final router = ref.read(routerProvider);
        final currentPath = router.routerDelegate.currentConfiguration.uri.path;

        if (currentPath != '/login' && mounted) {
          debugPrint('🚪 [App] 로그인 페이지로 이동');
          Future.delayed(const Duration(milliseconds: 100), () {
            if (mounted) {
              try {
                router.go('/login');
              } catch (e) {
                debugPrint('❌ [App] 로그아웃 네비게이션 실패: $e');
              }
            }
          });
        }
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
