import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../core/enums/action_type.dart';
import 'log_service.dart';
import 'network_monitor_service.dart';

/// 네트워크 에러 타입
enum NetworkErrorType {
  noConnection,
  timeout,
  serverError,
  unknown,
}

/// 사용자 친화적 에러 클래스
class UserFriendlyException implements Exception {
  final String message;
  final String? technicalDetails;
  final NetworkErrorType errorType;
  final bool canRetry;

  UserFriendlyException({
    required this.message,
    this.technicalDetails,
    this.errorType = NetworkErrorType.unknown,
    this.canRetry = true,
  });

  @override
  String toString() => message;

  /// 네트워크 에러를 사용자 친화적 메시지로 변환
  static UserFriendlyException fromError(dynamic error) {
    final errorString = error.toString().toLowerCase();

    // DNS 조회 실패 (호스트를 찾을 수 없음)
    if (errorString.contains('failed host lookup') ||
        errorString.contains('no address associated with hostname') ||
        errorString.contains('socketexception')) {
      return UserFriendlyException(
        message: '네트워크 연결을 확인해주세요',
        technicalDetails: error.toString(),
        errorType: NetworkErrorType.noConnection,
        canRetry: true,
      );
    }

    // 타임아웃
    if (errorString.contains('timeout') || errorString.contains('timed out')) {
      return UserFriendlyException(
        message: '서버 응답이 지연되고 있습니다.\n잠시 후 다시 시도해주세요',
        technicalDetails: error.toString(),
        errorType: NetworkErrorType.timeout,
        canRetry: true,
      );
    }

    // 서버 에러
    if (errorString.contains('500') ||
        errorString.contains('502') ||
        errorString.contains('503')) {
      return UserFriendlyException(
        message: '서버에 일시적인 문제가 발생했습니다.\n잠시 후 다시 시도해주세요',
        technicalDetails: error.toString(),
        errorType: NetworkErrorType.serverError,
        canRetry: true,
      );
    }

    // 기타 에러
    return UserFriendlyException(
      message: '일시적인 오류가 발생했습니다.\n잠시 후 다시 시도해주세요',
      technicalDetails: error.toString(),
      errorType: NetworkErrorType.unknown,
      canRetry: true,
    );
  }
}

/// 주문 서비스
class OrderService {
  final _supabase = Supabase.instance.client;
  final _logService = LogService();
  final _networkMonitor = NetworkMonitorService();

  /// 재시도 가능한 API 호출 래퍼
  Future<T> _retryableCall<T>(
    Future<T> Function() apiCall, {
    int maxRetries = 2,
    Duration retryDelay = const Duration(seconds: 1),
  }) async {
    int attempts = 0;

    while (true) {
      try {
        attempts++;
        return await apiCall();
      } catch (e) {
        final isNetworkError =
            e.toString().toLowerCase().contains('socketexception') ||
                e.toString().toLowerCase().contains('failed host lookup') ||
                e.toString().toLowerCase().contains('no address associated');

        // 네트워크 에러이고 재시도 가능한 경우
        if (isNetworkError && attempts < maxRetries) {
          debugPrint('🔄 네트워크 오류 - 재시도 중 ($attempts/$maxRetries)...');

          // 네트워크 상태 새로고침
          await _networkMonitor.refreshConnectionStatus();

          // 잠시 대기 후 재시도
          await Future.delayed(retryDelay * attempts);
          continue;
        }

        // 재시도 실패 또는 다른 에러
        rethrow;
      }
    }
  }

  /// 주문 생성
  Future<Map<String, dynamic>> createOrder({
    required String itemName,
    required String itemDescription,
    required int basePrice,
    required int totalPrice,
    required String pickupAddress,
    required String deliveryAddress,
    String? pickupAddressDetail,
    String? deliveryAddressDetail,
    String? pickupZipcode,
    String? deliveryZipcode,
    List<String>? imageUrls,
    List<Map<String, dynamic>>? imagesWithPins, // 핀 정보 추가
    String? notes,
    String? clothingType, // 의류 타입 추가
    String? repairType, // 수선 타입 추가
    List<String>? repairParts, // 수선 부위들 추가
    String? promotionCodeId, // 프로모션 코드 ID
    int? promotionDiscountAmount, // 프로모션 할인 금액
    int? originalTotalPrice, // 할인 전 원래 금액
    String? recipientName, // 수취인 이름
    String? recipientPhone, // 수취인 전화번호
    DateTime? pickupDate, // 수거 희망일 (DB 저장용, 우체국 API는 날짜 지정 불가)
  }) async {
    try {
      final user = _supabase.auth.currentUser;
      if (user == null) {
        throw Exception('로그인이 필요합니다');
      }

      debugPrint('📋 Auth User ID: ${user.id}');

      // public.users 테이블에서 실제 user_id 조회 (auth_id로 검색)
      var userResponse = await _supabase
          .from('users')
          .select('id, email, name, phone')
          .eq('auth_id', user.id)
          .maybeSingle();

      // 사용자가 public.users 테이블에 없으면 자동 생성
      if (userResponse == null) {
        debugPrint('⚠️ public.users에 사용자 없음, 자동 생성 시도...');
        try {
          final userName = user.userMetadata?['name'] as String? ?? '사용자';
          final userPhone = user.userMetadata?['phone'] as String? ?? '';

          final newUser = await _supabase
              .from('users')
              .insert({
                'auth_id': user.id,
                'email': user.email ?? 'unknown@example.com',
                'name': userName,
                'phone': userPhone,
              })
              .select()
              .single();

          userResponse = newUser;
          debugPrint('✅ public.users에 사용자 자동 생성 완료');
        } catch (e) {
          debugPrint('❌ 사용자 자동 생성 실패: $e');
          throw Exception('사용자 정보를 생성할 수 없습니다. 관리자에게 문의해주세요.');
        }
      }

      final userId = userResponse['id'] as String;
      final userEmail = userResponse['email'] as String? ??
          user.email ??
          'unknown@example.com';

      debugPrint('✅ Public User ID: $userId');

      // 주문 생성 (실제 DB 구조에 맞게)
      final orderNumber = 'ORD${DateTime.now().millisecondsSinceEpoch}';

      final orderData = <String, dynamic>{
        'user_id': userId, // public.users의 id 사용
        'order_number': orderNumber,
        'clothing_type': clothingType ?? '기타',
        'repair_type': repairType ?? '기타',
        'base_price': basePrice,
        'total_price': totalPrice,
        'item_name': itemName,
        'item_description': itemDescription,
        'pickup_address': pickupAddress,
        'pickup_address_detail': pickupAddressDetail,
        'pickup_zipcode': pickupZipcode,
        'delivery_address': deliveryAddress,
        'delivery_address_detail': deliveryAddressDetail,
        'delivery_zipcode': deliveryZipcode,
        'customer_name': recipientName ?? '수취인',
        'customer_email': userEmail,
        'customer_phone': recipientPhone ?? '010-0000-0000',
        'pickup_phone': recipientPhone ?? '010-0000-0000',
        'delivery_phone': recipientPhone ?? '010-0000-0000',
        'notes': notes,
      };

      // 수거 희망일 추가 (우체국 API는 날짜 직접 지정 불가, DB 저장 후 알림 용도)
      if (pickupDate != null) {
        orderData['pickup_date'] = pickupDate.toIso8601String().split('T')[0];
      }

      // 프로모션 코드 정보 추가
      if (promotionCodeId != null) {
        orderData['promotion_code_id'] = promotionCodeId;
        orderData['promotion_discount_amount'] = promotionDiscountAmount ?? 0;
        orderData['original_total_price'] = originalTotalPrice ?? totalPrice;
      }

      // repair_parts 배열 추가
      if (repairParts != null && repairParts.isNotEmpty) {
        orderData['repair_parts'] = repairParts;
      }

      // repair_detail에 상세 정보 저장
      if (itemDescription.isNotEmpty) {
        orderData['repair_detail'] = itemDescription;
      }

      // images에 사진 정보 저장 (jsonb)
      if (imageUrls != null && imageUrls.isNotEmpty) {
        orderData['images'] = {'urls': imageUrls};
      }

      // images_with_pins에 핀 정보 저장 (jsonb)
      if (imagesWithPins != null && imagesWithPins.isNotEmpty) {
        orderData['images_with_pins'] = imagesWithPins;
      }

      debugPrint('📦 주문 데이터 (실제 컬럼): $orderData');

      final order =
          await _supabase.from('orders').insert(orderData).select().single();
      debugPrint('✅ 주문 생성 성공: ${order['id']}');

      return order;
    } catch (e) {
      throw Exception('주문 생성 실패: $e');
    }
  }

  /// 내 주문 목록 조회
  Future<List<Map<String, dynamic>>> getMyOrders() async {
    try {
      final user = _supabase.auth.currentUser;
      if (user == null) {
        throw Exception('로그인이 필요합니다');
      }

      debugPrint('📋 Auth User ID: ${user.id}');

      // 재시도 로직 적용
      return await _retryableCall(() async {
        // public.users 테이블에서 실제 user_id 조회 (auth_id로 검색)
        final userResponse = await _supabase
            .from('users')
            .select('id')
            .eq('auth_id', user.id)
            .maybeSingle();

        if (userResponse == null) {
          debugPrint('⚠️ public.users에 사용자 정보가 없습니다.');
          throw Exception('사용자 정보를 찾을 수 없습니다. 관리자에게 문의해주세요.');
        }

        final userId = userResponse['id'] as String;
        debugPrint('✅ Public User ID: $userId');

        // 🔒 보안: 본인의 주문만 조회 (user_id 필터링 강제)
        final response = await _supabase
            .from('orders')
            .select('*')
            .eq('user_id', userId) // 🔒 핵심: 본인 주문만!
            .order('created_at', ascending: false);

        debugPrint('✅ 조회된 주문 개수: ${(response as List).length}개');

        // 타입 안전하게 변환
        final orders = (response as List).map((order) {
          final orderMap = Map<String, dynamic>.from(order as Map);
          final trackingNo = orderMap['tracking_no'] as String?;

          return <String, dynamic>{
            ...orderMap,
            'shipments': trackingNo != null
                ? <Map<String, dynamic>>[
                    {
                      'tracking_no': trackingNo,
                      'pickup_tracking_no': trackingNo,
                      'order_id': orderMap['id'],
                    }
                  ]
                : <Map<String, dynamic>>[],
          };
        }).toList();

        return orders;
      });
    } catch (e) {
      debugPrint('❌ 주문 목록 조회 오류: $e');
      throw UserFriendlyException.fromError(e);
    }
  }

  /// 주문 상세 조회
  Future<Map<String, dynamic>> getOrderDetail(String orderId) async {
    try {
      debugPrint('🔍 주문 상세 조회 시작: $orderId');

      final user = _supabase.auth.currentUser;
      if (user == null) {
        throw Exception('로그인이 필요합니다');
      }

      debugPrint('📋 Auth User ID: ${user.id}');

      // 재시도 로직 적용
      return await _retryableCall(() async {
        // public.users 테이블에서 실제 user_id 조회 (auth_id로 검색)
        final userResponse = await _supabase
            .from('users')
            .select('id')
            .eq('auth_id', user.id)
            .maybeSingle();

        if (userResponse == null) {
          debugPrint('⚠️ public.users에 사용자 정보가 없습니다.');
          throw Exception('사용자 정보를 찾을 수 없습니다. 관리자에게 문의해주세요.');
        }

        final userId = userResponse['id'] as String;
        debugPrint('✅ Public User ID: $userId');

        // 🔒 보안: 본인의 주문만 조회 (user_id 필터링 강제)
        final response = await _supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .eq('user_id', userId) // 🔒 핵심: 본인 주문만!
            .maybeSingle();

        // 🔒 접근 권한 검증: 주문이 없거나 본인 소유가 아닌 경우
        if (response == null) {
          debugPrint('❌ 접근 권한 없음: orderId=$orderId, userId=$userId');
          throw Exception('접근 권한이 없습니다. 본인의 주문만 조회할 수 있습니다.');
        }

        debugPrint('✅ 주문 조회 성공: ${response['id']}');
        debugPrint(
            '📋 extra_charge_status: ${response['extra_charge_status']}');

        // 타입 안전하게 변환
        final order = Map<String, dynamic>.from(response as Map);

        // shipments 테이블에서 실제 데이터 조회
        List<Map<String, dynamic>> shipments = [];
        try {
          final shipmentsResponse = await _supabase
              .from('shipments')
              .select('*')
              .eq('order_id', orderId);

          shipments = (shipmentsResponse as List)
              .map((s) => Map<String, dynamic>.from(s as Map))
              .toList();
          debugPrint('✅ Shipments 조회 성공: ${shipments.length}개');
        } catch (shipmentError) {
          debugPrint('⚠️ Shipments 조회 실패 (계속 진행): $shipmentError');
        }

        final result = {
          ...order,
          'shipments': shipments,
        };

        debugPrint('✅ 주문 상세 데이터 준비 완료');
        return result;
      });
    } catch (e) {
      debugPrint('❌ 주문 상세 조회 오류: $e');
      throw UserFriendlyException.fromError(e);
    }
  }

  /// 배송추적 조회 (Edge Function 호출)
  Future<Map<String, dynamic>> trackShipment(String trackingNo) async {
    try {
      debugPrint('📦 배송추적 조회 시작: $trackingNo');

      // POST 요청으로 body에 tracking_no 전달
      final response = await _supabase.functions.invoke(
        'shipments-track',
        body: {'tracking_no': trackingNo},
      );

      debugPrint('✅ 배송추적 응답: ${response.data}');

      if (response.data != null) {
        // 응답이 성공인지 확인
        final data = Map<String, dynamic>.from(response.data);
        if (data.containsKey('error')) {
          throw Exception(data['error'] as String? ?? '배송추적 정보를 가져올 수 없습니다');
        }
        return data;
      } else {
        throw Exception('배송추적 정보를 가져올 수 없습니다');
      }
    } on FunctionException catch (e) {
      debugPrint('❌ FunctionException: ${e.status} - ${e.toString()}');
      if (e.status == 404) {
        throw Exception('배송추적 기능이 아직 배포되지 않았습니다. 관리자에게 문의하세요.');
      }
      throw Exception('배송추적 조회 실패: ${e.toString()}');
    } catch (e) {
      debugPrint('❌ 배송추적 조회 오류: $e');
      throw Exception('배송추적 조회 실패: $e');
    }
  }

  /// 수거 취소 (Edge Function 호출)
  Future<Map<String, dynamic>> cancelShipment(String orderId,
      {bool deleteAfterCancel = true}) async {
    try {
      debugPrint('🚫 수거 취소 시작: $orderId');

      final response = await _supabase.functions.invoke(
        'shipments-cancel',
        body: {
          'order_id': orderId,
          'delete_after_cancel': deleteAfterCancel,
        },
      );

      debugPrint('✅ 수거 취소 응답: ${response.data}');

      if (response.data != null) {
        final data = Map<String, dynamic>.from(response.data);
        if (data.containsKey('error')) {
          throw Exception(data['error'] as String? ?? '수거 취소 실패');
        }
        return data;
      } else {
        throw Exception('수거 취소 정보를 가져올 수 없습니다');
      }
    } on FunctionException catch (e) {
      debugPrint('❌ FunctionException: ${e.status} - ${e.toString()}');
      if (e.status == 404) {
        throw Exception('수거 취소 기능이 아직 배포되지 않았습니다. 관리자에게 문의하세요.');
      }
      throw Exception('수거 취소 실패: ${e.toString()}');
    } catch (e) {
      debugPrint('❌ 수거 취소 오류: $e');
      throw Exception('수거 취소 실패: $e');
    }
  }

  /// 수거예약 (Edge Function 호출)
  Future<Map<String, dynamic>> bookShipment({
    required String orderId,
    required String pickupAddress,
    required String pickupPhone,
    required String deliveryAddress,
    required String deliveryPhone,
    required String customerName,
    String? pickupZipcode, // 수거지 우편번호
    String? deliveryZipcode, // 배송지 우편번호 (필수)
    String? deliveryMessage, // 배송 요청사항 (우체국 API delivMsg로 전달)
    bool testMode = false, // 실제 우체국 API 사용: false, Mock: true
  }) async {
    try {
      debugPrint('📦 수거예약 시작 (testMode: $testMode)');
      debugPrint('📍 배송지 우편번호: $deliveryZipcode');

      final body = <String, dynamic>{
        'order_id': orderId,
        'pickup_address': pickupAddress,
        'pickup_phone': pickupPhone,
        'delivery_address': deliveryAddress,
        'delivery_phone': deliveryPhone,
        'customer_name': customerName,
        'test_mode': testMode, // 실제 API 사용 여부
      };

      // 우편번호 추가 (배송지 우편번호는 필수)
      if (pickupZipcode != null && pickupZipcode.isNotEmpty) {
        body['pickup_zipcode'] = pickupZipcode;
      }
      if (deliveryZipcode != null && deliveryZipcode.isNotEmpty) {
        body['delivery_zipcode'] = deliveryZipcode;
      } else {
        debugPrint('⚠️ 배송지 우편번호가 없습니다!');
      }

      // 배송 요청사항 추가 (우체국 API delivMsg로 전달)
      if (deliveryMessage != null && deliveryMessage.trim().isNotEmpty) {
        body['delivery_message'] = deliveryMessage.trim();
        debugPrint('📝 배송 요청사항: $deliveryMessage');
      }

      final response = await _supabase.functions.invoke(
        'shipments-book',
        body: body,
      );

      if (response.data['success'] != true) {
        throw Exception(response.data['error'] ?? '수거예약 실패');
      }

      return response.data['data'];
    } catch (e) {
      throw Exception('수거예약 실패: $e');
    }
  }

  /// 배송지 알림 확인 (토요배송 휴무, 도서산간 등)
  Future<Map<String, dynamic>> checkDeliveryNotice({
    required String zipcode,
    String? address,
  }) async {
    try {
      debugPrint('🔍 배송지 알림 확인 시작: $zipcode');

      final response = await _supabase.functions.invoke(
        'check-delivery-notice',
        body: {
          'zipcode': zipcode,
          if (address != null) 'address': address,
        },
      );

      if (response.data['success'] != true) {
        throw Exception(response.data['error'] ?? '배송지 확인 실패');
      }

      return response.data as Map<String, dynamic>;
    } catch (e) {
      debugPrint('❌ 배송지 알림 확인 실패: $e');
      // 실패해도 빈 객체 반환 (계속 진행)
      return {
        'success': false,
        'shouldShowAlert': false,
      };
    }
  }

  /// 이미지 업로드 (Supabase Storage)
  ///
  /// 주의: Supabase Dashboard에서 'order-images' 버킷 생성 필요
  /// Storage > New Bucket > 'order-images' (Public 설정)
  Future<String> uploadImage(String filePath) async {
    try {
      final user = _supabase.auth.currentUser;
      if (user == null) {
        throw Exception('로그인이 필요합니다');
      }

      // 파일명 생성 (중복 방지)
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final random = DateTime.now().microsecond;
      final extension = filePath.split('.').last.toLowerCase();
      final fileName = '${user.id}_${timestamp}_$random.$extension';
      final storagePath = 'orders/$fileName';

      // 파일 경로가 로컬 파일인지 확인
      if (filePath.startsWith('/') || filePath.startsWith('file://')) {
        // 실제 파일 업로드 시도
        try {
          // dart:io File 사용
          final file = await _readFileAsBytes(filePath);

          await _supabase.storage
              .from('order-images')
              .uploadBinary(storagePath, file);

          // 공개 URL 가져오기
          final imageUrl =
              _supabase.storage.from('order-images').getPublicUrl(storagePath);

          debugPrint('✅ 이미지 업로드 성공: $imageUrl');
          return imageUrl;
        } catch (storageError) {
          debugPrint('⚠️ Storage 업로드 실패 (버킷 미설정?): $storageError');
          // Storage 실패 시 로컬 경로 반환 (임시)
          debugPrint('⚠️ 로컬 경로로 대체: $filePath');
          return filePath;
        }
      }

      // 이미 URL인 경우 그대로 반환
      if (filePath.startsWith('http')) {
        return filePath;
      }

      // 그 외의 경우 로컬 경로 반환
      debugPrint('ℹ️ 파일 경로 그대로 사용: $filePath');
      return filePath;
    } catch (e) {
      throw Exception('이미지 업로드 실패: $e');
    }
  }

  /// 파일을 바이트 배열로 읽기
  Future<Uint8List> _readFileAsBytes(String filePath) async {
    // dart:io를 직접 import하지 않고 platform 채널 사용
    // 또는 image_picker에서 받은 XFile 사용 권장
    throw UnimplementedError('파일 읽기는 image_picker의 XFile.readAsBytes() 사용 권장');
  }

  /// 여러 이미지 업로드
  Future<List<String>> uploadImages(List<String> filePaths) async {
    final uploadedUrls = <String>[];

    for (final filePath in filePaths) {
      try {
        final url = await uploadImage(filePath);
        uploadedUrls.add(url);
      } catch (e) {
        debugPrint('이미지 업로드 실패: $filePath, 에러: $e');
        // 실패한 이미지는 건너뛰고 계속 진행
      }
    }

    return uploadedUrls;
  }

  // ========================================
  // 📊 액션 로깅 메서드들
  // ========================================

  /// 입고 스캔 로그 기록
  ///
  /// [orderId] 주문 ID
  /// [trackingNo] 송장번호 (선택)
  Future<void> logScanInbound({
    required String orderId,
    String? trackingNo,
  }) async {
    await _logService.log(
      actionType: ActionType.SCAN_INBOUND,
      targetId: orderId,
      metadata: {
        'scannedAt': DateTime.now().toIso8601String(),
        if (trackingNo != null) 'trackingNo': trackingNo,
      },
    );
  }

  /// 출고 스캔 로그 기록
  ///
  /// [orderId] 주문 ID
  /// [trackingNo] 송장번호 (선택)
  Future<void> logScanOutbound({
    required String orderId,
    String? trackingNo,
  }) async {
    await _logService.log(
      actionType: ActionType.SCAN_OUTBOUND,
      targetId: orderId,
      metadata: {
        'scannedAt': DateTime.now().toIso8601String(),
        if (trackingNo != null) 'trackingNo': trackingNo,
      },
    );
  }

  /// 작업 시작 로그 기록
  ///
  /// [orderId] 주문 ID
  /// [workItemId] 작업 아이템 ID (선택)
  /// [workItemName] 작업 아이템 이름 (선택)
  Future<void> logWorkStart({
    required String orderId,
    String? workItemId,
    String? workItemName,
  }) async {
    await _logService.log(
      actionType: ActionType.WORK_START,
      targetId: orderId,
      metadata: {
        'startedAt': DateTime.now().toIso8601String(),
        if (workItemId != null) 'workItemId': workItemId,
        if (workItemName != null) 'workItemName': workItemName,
      },
    );
  }

  /// 작업 완료 로그 기록
  ///
  /// [orderId] 주문 ID
  /// [workItemId] 작업 아이템 ID (선택)
  /// [workItemName] 작업 아이템 이름 (선택)
  /// [duration] 작업 소요 시간 (초) (선택)
  Future<void> logWorkComplete({
    required String orderId,
    String? workItemId,
    String? workItemName,
    int? duration,
  }) async {
    await _logService.log(
      actionType: ActionType.WORK_COMPLETE,
      targetId: orderId,
      metadata: {
        'completedAt': DateTime.now().toIso8601String(),
        if (workItemId != null) 'workItemId': workItemId,
        if (workItemName != null) 'workItemName': workItemName,
        if (duration != null) 'durationSeconds': duration,
      },
    );
  }

  /// 반품 처리 로그 기록
  ///
  /// [orderId] 주문 ID
  /// [reason] 반품 사유 (선택)
  Future<void> logReturnProcess({
    required String orderId,
    String? reason,
  }) async {
    await _logService.log(
      actionType: ActionType.RETURN_PROCESS,
      targetId: orderId,
      metadata: {
        'processedAt': DateTime.now().toIso8601String(),
        if (reason != null) 'reason': reason,
      },
    );
  }
}
