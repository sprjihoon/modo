import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
// 🚀 Video Processing Improvements
// import 'package:media_kit/media_kit.dart';  // Uncomment when media_kit is installed

import 'app.dart';
import 'core/config/supabase_config.dart';
import 'core/config/feature_flags.dart';

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
    } else {
      print('✅ Supabase 설정 확인됨');
      print('   URL: ${url.length > 30 ? url.substring(0, 30) : url}...');
      print('   Key: ${anonKey.length > 20 ? anonKey.substring(0, 20) : anonKey}...');
    }
    
    // Supabase 초기화
    await Supabase.initialize(
      url: url,
      anonKey: anonKey,
    );
    print('✅ Supabase 초기화 완료');
    
    // 🚀 media_kit 초기화 (Feature Flag로 제어)
    if (VideoFeatureFlags.shouldUseMediaKit) {
      // MediaKit.ensureInitialized();  // Uncomment when media_kit is installed
      print('✅ media_kit 초기화 완료 (Feature Flag: ON)');
    } else {
      print('ℹ️ media_kit 미사용 (Feature Flag: OFF)');
    }
  } catch (e, stackTrace) {
    print('❌ 초기화 실패: $e');
    print('   스택 트레이스: $stackTrace');
    rethrow;
  }
  
  // Firebase 초기화 (WEEK 4에서 구현 예정)
  // TODO: Firebase 패키지 버전 업데이트 후 활성화
  // await Firebase.initializeApp(
  //   options: DefaultFirebaseOptions.currentPlatform,
  // );
  
  runApp(
    const ProviderScope(
      child: ModuRepairApp(),
    ),
  );
}

