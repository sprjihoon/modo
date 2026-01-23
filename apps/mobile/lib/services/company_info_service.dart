import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// 회사 정보 서비스 (싱글톤)
/// 관리자 페이지에서 설정한 고객센터 전화번호 등을 가져옴
class CompanyInfoService {
  static final CompanyInfoService _instance = CompanyInfoService._internal();
  factory CompanyInfoService() => _instance;
  CompanyInfoService._internal();

  final _supabase = Supabase.instance.client;
  
  // 캐시된 회사 정보
  Map<String, dynamic>? _cachedInfo;
  DateTime? _lastFetchTime;
  
  // 캐시 유효 시간 (5분)
  static const _cacheDuration = Duration(minutes: 5);

  /// 회사 정보 조회 (캐시 사용)
  Future<Map<String, dynamic>?> getCompanyInfo({bool forceRefresh = false}) async {
    // 캐시가 유효하면 캐시 반환
    if (!forceRefresh && 
        _cachedInfo != null && 
        _lastFetchTime != null &&
        DateTime.now().difference(_lastFetchTime!) < _cacheDuration) {
      return _cachedInfo;
    }

    try {
      debugPrint('🔍 회사 정보 조회 중...');
      
      final data = await _supabase
          .from('company_info')
          .select()
          .limit(1)
          .maybeSingle();
      
      if (data != null) {
        _cachedInfo = data;
        _lastFetchTime = DateTime.now();
        debugPrint('✅ 회사 정보 로드 성공: ${data['phone']}');
      }
      
      return data;
    } catch (e) {
      debugPrint('❌ 회사 정보 조회 실패: $e');
      return _cachedInfo; // 실패 시 캐시 반환
    }
  }

  /// 고객센터 전화번호 조회
  Future<String> getCustomerServicePhone() async {
    final info = await getCompanyInfo();
    return info?['phone']?.toString() ?? '1833-3429'; // 기본값
  }

  /// 고객센터 이메일 조회
  Future<String> getCustomerServiceEmail() async {
    final info = await getCompanyInfo();
    return info?['email']?.toString() ?? 'support@modorepair.com';
  }

  /// 캐시 초기화
  void clearCache() {
    _cachedInfo = null;
    _lastFetchTime = null;
  }
}

