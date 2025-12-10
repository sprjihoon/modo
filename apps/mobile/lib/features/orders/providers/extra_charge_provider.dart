import 'package:flutter/foundation.dart';
import '../../../core/enums/extra_charge_status.dart';
import '../../../services/extra_charge_service.dart';
import '../domain/models/extra_charge_data.dart';

/// 추가 과금(Extra Charge) 상태 관리 Provider
class ExtraChargeProvider with ChangeNotifier {
  final ExtraChargeService _service = ExtraChargeService();

  bool _isLoading = false;
  String? _errorMessage;
  
  // 관리자용: 승인 대기 중인 주문 목록
  List<Map<String, dynamic>> _pendingManagerOrders = [];
  
  // 고객용: 내 결제 대기 중인 주문
  Map<String, dynamic>? _myPendingOrder;

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  List<Map<String, dynamic>> get pendingManagerOrders => _pendingManagerOrders;
  Map<String, dynamic>? get myPendingOrder => _myPendingOrder;

  /// 로딩 상태 변경
  void _setLoading(bool value) {
    _isLoading = value;
    notifyListeners();
  }

  /// 에러 메시지 설정
  void _setError(String? message) {
    _errorMessage = message;
    if (message != null) {
      notifyListeners();
    }
  }

  /// 에러 초기화
  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  /// [스마트 요청 기능] 추가 작업 요청
  /// 
  /// 작업자: memo만 입력
  /// 관리자: memo + price + note 입력
  Future<bool> requestExtraWork({
    required String orderId,
    required String memo,
    int? price,
    String? note,
  }) async {
    try {
      _setLoading(true);
      _setError(null);

      final result = await _service.requestExtraWork(
        orderId: orderId,
        memo: memo,
        price: price,
        note: note,
      );

      debugPrint('✅ requestExtraWork 성공: $result');
      
      _setLoading(false);
      return true;
    } catch (e) {
      debugPrint('❌ requestExtraWork 실패: $e');
      _setError(e.toString());
      _setLoading(false);
      return false;
    }
  }

  /// [관리자 승인 기능] 작업자의 요청을 승인
  Future<bool> approveWorkerRequest({
    required String orderId,
    required int price,
    required String note,
  }) async {
    try {
      _setLoading(true);
      _setError(null);

      final result = await _service.approveWorkerRequest(
        orderId: orderId,
        price: price,
        note: note,
      );

      debugPrint('✅ approveWorkerRequest 성공: $result');
      
      // 승인 후 목록 갱신
      await loadPendingManagerOrders();
      
      _setLoading(false);
      return true;
    } catch (e) {
      debugPrint('❌ approveWorkerRequest 실패: $e');
      _setError(e.toString());
      _setLoading(false);
      return false;
    }
  }

  /// [고객 결정 기능] 고객의 선택 처리
  Future<bool> processCustomerDecision({
    required String orderId,
    required CustomerDecisionAction action,
  }) async {
    try {
      _setLoading(true);
      _setError(null);

      final result = await _service.processCustomerDecision(
        orderId: orderId,
        action: action,
      );

      debugPrint('✅ processCustomerDecision 성공: $result');
      
      // 처리 후 내 대기 주문 갱신
      await loadMyPendingOrder();
      
      _setLoading(false);
      return true;
    } catch (e) {
      debugPrint('❌ processCustomerDecision 실패: $e');
      _setError(e.toString());
      _setLoading(false);
      return false;
    }
  }

  /// 관리자 승인 대기 주문 목록 로드
  Future<void> loadPendingManagerOrders() async {
    try {
      _setLoading(true);
      _setError(null);

      final orders = await _service.getPendingManagerOrders();
      _pendingManagerOrders = orders;

      debugPrint('✅ 승인 대기 주문 ${orders.length}개 로드');
      
      _setLoading(false);
    } catch (e) {
      debugPrint('❌ loadPendingManagerOrders 실패: $e');
      _setError(e.toString());
      _setLoading(false);
    }
  }

  /// 고객 결제 대기 주문 로드
  Future<void> loadMyPendingOrder() async {
    try {
      _setError(null);

      final order = await _service.getMyPendingCustomerOrder();
      _myPendingOrder = order;

      if (order != null) {
        debugPrint('✅ 결제 대기 주문 발견: ${order['id']}');
      } else {
        debugPrint('⚠️ 결제 대기 주문 없음');
      }
      
      notifyListeners();
    } catch (e) {
      debugPrint('❌ loadMyPendingOrder 실패: $e');
      _setError(e.toString());
    }
  }

  /// 특정 주문의 추가 과금 정보 가져오기
  Future<ExtraChargeData> getExtraChargeData(String orderId) async {
    try {
      return await _service.getExtraChargeData(orderId);
    } catch (e) {
      debugPrint('❌ getExtraChargeData 실패: $e');
      return ExtraChargeData.empty;
    }
  }

  /// 주문 상세 데이터에서 추가 과금 정보 파싱
  ExtraChargeStatus parseExtraChargeStatus(Map<String, dynamic> orderData) {
    final statusString = orderData['extra_charge_status'] as String?;
    if (statusString == null) {
      return ExtraChargeStatus.NONE;
    }
    return ExtraChargeStatus.fromString(statusString);
  }

  ExtraChargeData parseExtraChargeData(Map<String, dynamic> orderData) {
    final dataJson = orderData['extra_charge_data'];
    if (dataJson == null) {
      return ExtraChargeData.empty;
    }
    
    if (dataJson is Map<String, dynamic>) {
      return ExtraChargeData.fromJson(dataJson);
    }
    
    return ExtraChargeData.empty;
  }
}

