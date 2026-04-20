import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// 배송비 글로벌 설정 (관리자 페이지에서 설정 가능)
@immutable
class ShippingSettings {
  final int baseShippingFee;
  final int remoteAreaFee;
  final int returnShippingFee;

  const ShippingSettings({
    required this.baseShippingFee,
    required this.remoteAreaFee,
    required this.returnShippingFee,
  });

  static const ShippingSettings fallback = ShippingSettings(
    baseShippingFee: 7000,
    remoteAreaFee: 400,
    returnShippingFee: 7000,
  );

  factory ShippingSettings.fromMap(Map<String, dynamic> map) => ShippingSettings(
        baseShippingFee:
            (map['base_shipping_fee'] as num?)?.toInt() ?? fallback.baseShippingFee,
        remoteAreaFee:
            (map['remote_area_fee'] as num?)?.toInt() ?? fallback.remoteAreaFee,
        returnShippingFee:
            (map['return_shipping_fee'] as num?)?.toInt() ?? fallback.returnShippingFee,
      );
}

/// 배송비 설정 조회 서비스
/// - shipping_settings 테이블(싱글톤 id=1)에서 값을 가져온다.
/// - 60초 in-memory 캐시
class ShippingSettingsService {
  static final ShippingSettingsService _instance =
      ShippingSettingsService._internal();
  factory ShippingSettingsService() => _instance;
  ShippingSettingsService._internal();

  final _supabase = Supabase.instance.client;

  ShippingSettings _cached = ShippingSettings.fallback;
  DateTime _cachedAt = DateTime.fromMillisecondsSinceEpoch(0);
  static const _cacheTtl = Duration(seconds: 60);

  /// 현재까지 가져온 마지막 값 (동기 접근, 폴백 포함)
  ShippingSettings get current => _cached;

  /// 강제로 다시 로드
  Future<ShippingSettings> refresh() async {
    try {
      final row = await _supabase
          .from('shipping_settings')
          .select('base_shipping_fee, remote_area_fee, return_shipping_fee')
          .eq('id', 1)
          .maybeSingle();
      if (row != null) {
        _cached = ShippingSettings.fromMap(Map<String, dynamic>.from(row as Map));
      } else {
        _cached = ShippingSettings.fallback;
      }
      _cachedAt = DateTime.now();
      return _cached;
    } catch (e) {
      debugPrint('⚠️ shipping_settings 조회 실패 (폴백 사용): $e');
      _cachedAt = DateTime.now();
      return _cached;
    }
  }

  /// 캐시가 유효하면 캐시값, 아니면 새로 로드
  Future<ShippingSettings> get() async {
    if (DateTime.now().difference(_cachedAt) < _cacheTtl) {
      return _cached;
    }
    return refresh();
  }
}
