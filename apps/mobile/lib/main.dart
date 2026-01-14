import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
// 🚀 Video Processing Improvements
import 'package:media_kit/media_kit.dart';

import 'app.dart';
import 'core/config/supabase_config.dart';
import 'core/config/feature_flags.dart';
import 'services/network_monitor_service.dart';

/// 모두의수선 메인 엔트리포인트
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
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
    
    print('✅ Supabase 설정 확인됨');
    print('   URL: ${url.length > 30 ? url.substring(0, 30) : url}...');
    print('   Key: ${anonKey.length > 20 ? anonKey.substring(0, 20) : anonKey}...');
    
    // Supabase 초기화
    await Supabase.initialize(
      url: url,
      anonKey: anonKey,
    );
    print('✅ Supabase 초기화 완료');
    
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
  } catch (e, stackTrace) {
    print('❌ 초기화 실패: $e');
    print('   스택 트레이스: $stackTrace');
    rethrow;
  }
  
  // ============================================
  // 🔔 Firebase 푸시 알림 (현재 비활성화)
  // ============================================
  // 활성화 방법:
  // 1. Firebase 프로젝트 생성 및 앱 등록
  // 2. google-services.json (Android), GoogleService-Info.plist (iOS) 추가
  // 3. pubspec.yaml에 firebase_core, firebase_messaging 추가
  // 4. flutterfire configure 실행
  // 5. 아래 코드 주석 해제
  //
  // try {
  //   await Firebase.initializeApp(
  //     options: DefaultFirebaseOptions.currentPlatform,
  //   );
  //   print('✅ Firebase 초기화 완료');
  // } catch (e) {
  //   print('⚠️ Firebase 초기화 실패 (푸시 알림 비활성화): $e');
  // }
  // ============================================
  
  runApp(
    const ProviderScope(
      child: ModuRepairApp(),
    ),
  );
}

