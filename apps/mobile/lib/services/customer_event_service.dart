import 'package:supabase_flutter/supabase_flutter.dart';
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:device_info_plus/device_info_plus.dart';
import 'package:package_info_plus/package_info_plus.dart';

/// 고객 이벤트 타입
enum CustomerEventType {
  // 장바구니 관련
  CART_ADD,
  CART_REMOVE,
  CART_UPDATE,
  CART_CLEAR,

  // 주문 관련
  ORDER_START,
  ORDER_INFO_FILL,
  ORDER_ADDRESS_FILL,
  ORDER_PAYMENT_START,
  ORDER_PAYMENT_SUCCESS,
  ORDER_PAYMENT_FAIL,
  ORDER_COMPLETE,

  // 수거 신청 관련
  PICKUP_REQUEST_START,
  PICKUP_REQUEST_COMPLETE,
  PICKUP_REQUEST_CANCEL,

  // 페이지 뷰
  PAGE_VIEW,
  PRODUCT_VIEW,
  REPAIR_MENU_VIEW,

  // 이미지 업로드
  IMAGE_UPLOAD_START,
  IMAGE_UPLOAD_COMPLETE,
  PIN_ADD,
  PIN_REMOVE,

  // 추가금 관련
  EXTRA_CHARGE_VIEW,
  EXTRA_CHARGE_ACCEPT,
  EXTRA_CHARGE_REJECT,

  // 리뷰 관련
  REVIEW_START,
  REVIEW_SUBMIT,

  // 기타
  APP_OPEN,
  APP_CLOSE,
  SEARCH,
  FILTER_APPLY,
  BANNER_CLICK,
  NOTIFICATION_CLICK,
}

/// 고객 이벤트 추적 서비스
/// 
/// 사용 예시:
/// ```dart
/// await CustomerEventService.trackEvent(
///   eventType: CustomerEventType.CART_ADD,
///   eventName: 'iPhone 지퍼 수리 추가',
///   targetId: 'repair-item-123',
///   targetType: 'repair_item',
///   metadata: {
///     'price': 5000,
///     'quantity': 1,
///   },
/// );
/// ```
class CustomerEventService {
  static final _supabase = Supabase.instance.client;
  static String? _sessionId;
  static String? _deviceModel;
  static String? _deviceOs;
  static String? _appVersion;

  /// 세션 ID 생성 또는 가져오기
  static String get sessionId {
    if (_sessionId == null) {
      _sessionId = DateTime.now().millisecondsSinceEpoch.toString();
    }
    return _sessionId!;
  }

  /// 디바이스 정보 초기화
  static Future<void> initializeDeviceInfo() async {
    try {
      final deviceInfo = DeviceInfoPlugin();
      final packageInfo = await PackageInfo.fromPlatform();
      _appVersion = packageInfo.version;

      if (kIsWeb) {
        final webInfo = await deviceInfo.webBrowserInfo;
        _deviceModel = webInfo.browserName.name;
        _deviceOs = 'Web';
      } else if (Platform.isAndroid) {
        final androidInfo = await deviceInfo.androidInfo;
        _deviceModel = '${androidInfo.manufacturer} ${androidInfo.model}';
        _deviceOs = 'Android ${androidInfo.version.release}';
      } else if (Platform.isIOS) {
        final iosInfo = await deviceInfo.iosInfo;
        _deviceModel = iosInfo.model;
        _deviceOs = 'iOS ${iosInfo.systemVersion}';
      }
    } catch (e) {
      print('디바이스 정보 초기화 실패: $e');
    }
  }

  /// 이벤트 추적
  /// 
  /// [eventType]: 이벤트 타입
  /// [eventName]: 이벤트 이름 (선택)
  /// [pageUrl]: 페이지 URL (선택)
  /// [pageTitle]: 페이지 제목 (선택)
  /// [targetId]: 대상 ID (주문 ID, 상품 ID 등)
  /// [targetType]: 대상 타입 ('order', 'product', 'cart' 등)
  /// [metadata]: 추가 정보 (금액, 수량 등)
  static Future<void> trackEvent({
    required CustomerEventType eventType,
    String? eventName,
    String? pageUrl,
    String? pageTitle,
    String? referrer,
    String? targetId,
    String? targetType,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      // 현재 사용자 ID 가져오기
      final user = _supabase.auth.currentUser;
      final userId = user?.id;

      // 디바이스 타입 감지
      String deviceType;
      if (kIsWeb) {
        deviceType = 'desktop';
      } else if (Platform.isAndroid || Platform.isIOS) {
        deviceType = 'mobile';
      } else {
        deviceType = 'unknown';
      }

      // 이벤트 데이터 생성
      final eventData = {
        'user_id': userId,
        'session_id': sessionId,
        'event_type': eventType.name,
        'event_name': eventName,
        'page_url': pageUrl,
        'page_title': pageTitle,
        'referrer': referrer,
        'target_id': targetId,
        'target_type': targetType,
        'metadata': metadata ?? {},
        'device_type': deviceType,
        'device_os': _deviceOs,
        'device_model': _deviceModel,
        'app_version': _appVersion,
      };

      // Supabase에 이벤트 기록
      await _supabase.from('customer_events').insert(eventData);

      print('✅ 이벤트 기록: ${eventType.name}${eventName != null ? ' - $eventName' : ''}');
    } catch (e) {
      // 이벤트 기록 실패는 앱 기능에 영향을 주지 않도록 에러만 출력
      print('⚠️ 이벤트 기록 실패: $e');
    }
  }

  // ===== 편의 메서드들 =====

  /// 장바구니 추가 이벤트
  static Future<void> trackCartAdd({
    required String itemName,
    required String targetId,
    int? quantity,
    int? price,
  }) async {
    await trackEvent(
      eventType: CustomerEventType.CART_ADD,
      eventName: itemName,
      targetId: targetId,
      targetType: 'cart_item',
      metadata: {
        'quantity': quantity,
        'price': price,
      },
    );
  }

  /// 장바구니 삭제 이벤트
  static Future<void> trackCartRemove({
    required String itemName,
    required String targetId,
  }) async {
    await trackEvent(
      eventType: CustomerEventType.CART_REMOVE,
      eventName: itemName,
      targetId: targetId,
      targetType: 'cart_item',
    );
  }

  /// 주문 시작 이벤트
  static Future<void> trackOrderStart({
    String? orderId,
    int? totalAmount,
    int? itemCount,
  }) async {
    await trackEvent(
      eventType: CustomerEventType.ORDER_START,
      targetId: orderId,
      targetType: 'order',
      metadata: {
        'total_amount': totalAmount,
        'item_count': itemCount,
      },
    );
  }

  /// 결제 시도 이벤트
  static Future<void> trackPaymentStart({
    required String orderId,
    required int amount,
    String? paymentMethod,
  }) async {
    await trackEvent(
      eventType: CustomerEventType.ORDER_PAYMENT_START,
      targetId: orderId,
      targetType: 'order',
      metadata: {
        'amount': amount,
        'payment_method': paymentMethod,
      },
    );
  }

  /// 결제 성공 이벤트
  static Future<void> trackPaymentSuccess({
    required String orderId,
    required int amount,
    String? transactionId,
  }) async {
    await trackEvent(
      eventType: CustomerEventType.ORDER_PAYMENT_SUCCESS,
      targetId: orderId,
      targetType: 'order',
      metadata: {
        'amount': amount,
        'transaction_id': transactionId,
      },
    );
  }

  /// 결제 실패 이벤트
  static Future<void> trackPaymentFail({
    required String orderId,
    required int amount,
    String? errorMessage,
  }) async {
    await trackEvent(
      eventType: CustomerEventType.ORDER_PAYMENT_FAIL,
      targetId: orderId,
      targetType: 'order',
      metadata: {
        'amount': amount,
        'error_message': errorMessage,
      },
    );
  }

  /// 수거 신청 시작 이벤트
  static Future<void> trackPickupRequestStart() async {
    await trackEvent(
      eventType: CustomerEventType.PICKUP_REQUEST_START,
    );
  }

  /// 수거 신청 완료 이벤트
  static Future<void> trackPickupRequestComplete({
    required String orderId,
  }) async {
    await trackEvent(
      eventType: CustomerEventType.PICKUP_REQUEST_COMPLETE,
      targetId: orderId,
      targetType: 'order',
    );
  }

  /// 페이지 뷰 이벤트
  static Future<void> trackPageView({
    required String pageTitle,
    String? pageUrl,
  }) async {
    await trackEvent(
      eventType: CustomerEventType.PAGE_VIEW,
      pageTitle: pageTitle,
      pageUrl: pageUrl,
    );
  }

  /// 상품 조회 이벤트
  static Future<void> trackProductView({
    required String productName,
    required String productId,
  }) async {
    await trackEvent(
      eventType: CustomerEventType.PRODUCT_VIEW,
      eventName: productName,
      targetId: productId,
      targetType: 'product',
    );
  }

  /// 수선 메뉴 조회 이벤트
  static Future<void> trackRepairMenuView({
    required String menuName,
    required String menuId,
  }) async {
    await trackEvent(
      eventType: CustomerEventType.REPAIR_MENU_VIEW,
      eventName: menuName,
      targetId: menuId,
      targetType: 'repair_menu',
    );
  }

  /// 이미지 업로드 시작 이벤트
  static Future<void> trackImageUploadStart({
    required String orderId,
  }) async {
    await trackEvent(
      eventType: CustomerEventType.IMAGE_UPLOAD_START,
      targetId: orderId,
      targetType: 'order',
    );
  }

  /// 이미지 업로드 완료 이벤트
  static Future<void> trackImageUploadComplete({
    required String orderId,
    int? imageCount,
  }) async {
    await trackEvent(
      eventType: CustomerEventType.IMAGE_UPLOAD_COMPLETE,
      targetId: orderId,
      targetType: 'order',
      metadata: {
        'image_count': imageCount,
      },
    );
  }

  /// 핀 추가 이벤트
  static Future<void> trackPinAdd({
    required String orderId,
    required String imageId,
  }) async {
    await trackEvent(
      eventType: CustomerEventType.PIN_ADD,
      targetId: orderId,
      targetType: 'order',
      metadata: {
        'image_id': imageId,
      },
    );
  }

  /// 추가금 확인 이벤트
  static Future<void> trackExtraChargeView({
    required String orderId,
    required int amount,
  }) async {
    await trackEvent(
      eventType: CustomerEventType.EXTRA_CHARGE_VIEW,
      targetId: orderId,
      targetType: 'order',
      metadata: {
        'amount': amount,
      },
    );
  }

  /// 추가금 승인 이벤트
  static Future<void> trackExtraChargeAccept({
    required String orderId,
    required int amount,
  }) async {
    await trackEvent(
      eventType: CustomerEventType.EXTRA_CHARGE_ACCEPT,
      targetId: orderId,
      targetType: 'order',
      metadata: {
        'amount': amount,
      },
    );
  }

  /// 추가금 거부 이벤트
  static Future<void> trackExtraChargeReject({
    required String orderId,
    required int amount,
    String? reason,
  }) async {
    await trackEvent(
      eventType: CustomerEventType.EXTRA_CHARGE_REJECT,
      targetId: orderId,
      targetType: 'order',
      metadata: {
        'amount': amount,
        'reason': reason,
      },
    );
  }

  /// 앱 실행 이벤트
  static Future<void> trackAppOpen() async {
    await trackEvent(
      eventType: CustomerEventType.APP_OPEN,
    );
  }

  /// 배너 클릭 이벤트
  static Future<void> trackBannerClick({
    required String bannerId,
    required String bannerTitle,
  }) async {
    await trackEvent(
      eventType: CustomerEventType.BANNER_CLICK,
      eventName: bannerTitle,
      targetId: bannerId,
      targetType: 'banner',
    );
  }

  /// 검색 이벤트
  static Future<void> trackSearch({
    required String query,
    int? resultCount,
  }) async {
    await trackEvent(
      eventType: CustomerEventType.SEARCH,
      metadata: {
        'query': query,
        'result_count': resultCount,
      },
    );
  }
}

