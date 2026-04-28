import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:provider/provider.dart' as provider_pkg;
import 'package:supabase_flutter/supabase_flutter.dart';
// Firebase Core - 푸시 알림용 (Google 로그인 비활성화 상태)
import 'package:firebase_core/firebase_core.dart';
// 🚀 Video Processing Improvements
import 'package:media_kit/media_kit.dart';
// 네이버 로그인
import 'package:flutter_naver_login/flutter_naver_login.dart';

import 'app.dart';
import 'features/orders/providers/extra_charge_provider.dart';
import 'core/config/supabase_config.dart';
import 'core/config/feature_flags.dart';
import 'services/network_monitor_service.dart';
import 'services/shipping_settings_service.dart';
import 'services/customer_event_service.dart';

/// 모두의수선 메인 엔트리포인트
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // 🔥 Firebase 초기화 (Google 로그인, 푸시 알림에 필요)
  try {
    await Firebase.initializeApp();
    print('✅ Firebase 초기화 완료');
  } catch (e) {
    print('⚠️ Firebase 초기화 실패 (카카오 로그인은 정상 작동): $e');
    // Firebase 초기화 실패해도 앱은 계속 실행 (카카오/Supabase 로그인은 정상 작동)
  }
  
  // 🚀 Feature Flags 상태 출력
  VideoFeatureFlags.printStatus();
  
  try {
    // 환경변수 로드
    await dotenv.load(fileName: '.env');
    print('✅ .env 파일 로드 완료');
    
    // Supabase 설정 확인
    final url = SupabaseConfig.url;
    final anonKey = SupabaseConfig.anonKey;
    
    if (url.isEmpty || anonKey.isEmpty) {
      print('❌ Supabase 설정이 비어있습니다!');
      print('   SUPABASE_URL: ${url.isEmpty ? "없음" : "설정됨"}');
      print('   SUPABASE_ANON_KEY: ${anonKey.isEmpty ? "없음" : "설정됨"}');
      print('   apps/mobile/.env 파일을 확인하세요.');
      
      // 환경변수 없이는 앱 실행 불가 - 에러 화면 표시
      runApp(
        MaterialApp(
          home: Scaffold(
            backgroundColor: Colors.red.shade50,
            body: Center(
              child: Padding(
                padding: const EdgeInsets.all(32.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.error_outline, size: 80, color: Colors.red.shade400),
                    const SizedBox(height: 24),
                    const Text(
                      '앱 초기화 실패',
                      style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Supabase 환경변수가 설정되지 않았습니다.\n.env 파일을 확인해주세요.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 16, color: Colors.grey.shade700),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'SUPABASE_URL: ${url.isEmpty ? "❌ 없음" : "✅ 설정됨"}\n'
                      'SUPABASE_ANON_KEY: ${anonKey.isEmpty ? "❌ 없음" : "✅ 설정됨"}',
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 14, fontFamily: 'monospace'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
      return; // 앱 초기화 중단
    }
    
    assert(() { debugPrint('✅ Supabase 설정 확인됨 (URL: ${url.substring(0, url.length > 30 ? 30 : url.length)}...)'); return true; }());
    
    // Supabase 초기화 (OAuth 딥링크 처리 포함)
    // ⚠️ 카카오 OAuth는 implicit flow 사용 (PKCE가 제대로 작동하지 않는 경우)
    await Supabase.initialize(
      url: url,
      anonKey: anonKey,
      authOptions: const FlutterAuthClientOptions(
        authFlowType: AuthFlowType.implicit,
      ),
      debug: kDebugMode,
    );
    
    // 🔗 딥링크 리스너 설정 (OAuth 콜백 처리)
    Supabase.instance.client.auth.onAuthStateChange.listen((data) {
      final event = data.event;
      final session = data.session;
      print('🔔 Auth 상태 변경: $event');
      if (session != null) {
        print('✅ 세션 획득: ${session.user.email ?? session.user.id}');
      }
    });
    
    print('✅ Supabase 초기화 완료 (OAuth 딥링크 지원)');
    
    // 🟢 네이버 로그인 SDK 초기화 (2.x 버전은 Android/iOS 설정 파일에서 자동 초기화)
    final naverClientId = dotenv.env['NAVER_CLIENT_ID'];
    if (naverClientId != null && naverClientId.isNotEmpty) {
      print('✅ 네이버 로그인 설정 확인됨 (SDK는 네이티브 설정에서 자동 초기화)');
    } else {
      print('ℹ️ 네이버 로그인 설정 없음 (NAVER_CLIENT_ID 미설정)');
    }
    
    // 🚀 media_kit 초기화 (Feature Flag로 제어)
    if (VideoFeatureFlags.shouldUseMediaKit) {
      MediaKit.ensureInitialized();
      print('✅ media_kit 초기화 완료 (Feature Flag: ON)');
    } else {
      print('ℹ️ media_kit 미사용 (Feature Flag: OFF)');
    }
    
    // 📡 네트워크 모니터링 서비스 초기화
    await NetworkMonitorService().initialize();
    print('✅ Network monitoring 초기화 완료');

    // 💰 배송비 글로벌 설정 프리로드 (관리자 페이지에서 변경 가능)
    // 실패해도 폴백값으로 동작하므로 await 하지 않고 백그라운드 실행
    // ignore: unawaited_futures
    ShippingSettingsService().refresh();

    // 📊 고객 행동 분석 초기화
    await CustomerEventService.initializeDeviceInfo();
    // ignore: unawaited_futures
    CustomerEventService.trackAppOpen();
  } catch (e, stackTrace) {
    print('❌ 초기화 실패: $e');
    print('   스택 트레이스: $stackTrace');
    rethrow;
  }
  
  // ============================================
  // 🔔 Firebase 초기화는 main() 시작 부분에서 처리됨
  // ============================================
  
  runApp(
    // provider 패키지의 MultiProvider (ExtraChargeProvider 등)
    provider_pkg.MultiProvider(
      providers: [
        provider_pkg.ChangeNotifierProvider(create: (_) => ExtraChargeProvider()),
      ],
      child: const ProviderScope(
        child: ModoRepairApp(),
      ),
    ),
  );
}

