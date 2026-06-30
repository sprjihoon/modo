import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:go_router/go_router.dart';
import 'package:portone_flutter/portone_flutter.dart';
import '../../../../core/widgets/modo_app_bar.dart';
import '../../../../services/payment_service.dart';
import '../../../../services/customer_event_service.dart';

/// 포트원 V2 결제 페이지
///
/// 추가 결제 · 일반 결제 모두 사용 가능.
/// 포트원 Flutter SDK (portone_flutter) 로 결제창을 띄우고
/// 결제 완료 후 payments-confirm Edge Function 으로 서버 검증한다.
class PortonePaymentPage extends StatefulWidget {
  /// orderId == payment_intents.id (신규 흐름) 또는 orders.id (레거시)
  final String orderId;
  final int amount;
  final String orderName;
  final String? customerName;
  final String? customerEmail;
  final String? customerPhone;
  final bool isExtraCharge;
  final String? originalOrderId;

  /// 신규 흐름: orderId 가 payment_intents.id 인 경우 true
  final bool isIntentFlow;

  const PortonePaymentPage({
    super.key,
    required this.orderId,
    required this.amount,
    required this.orderName,
    this.customerName,
    this.customerEmail,
    this.customerPhone,
    this.isExtraCharge = false,
    this.originalOrderId,
    this.isIntentFlow = false,
  });

  @override
  State<PortonePaymentPage> createState() => _PortonePaymentPageState();
}

class _PortonePaymentPageState extends State<PortonePaymentPage>
    with SingleTickerProviderStateMixin {
  bool _isRequesting = false;
  String? _errorMessage;

  late AnimationController _animController;
  late Animation<double> _fadeAnim;

  // ── 포트원 설정 ──────────────────────────────────────────────

  static String get _storeId {
    final v = dotenv.env['PORTONE_STORE_ID'];
    if (v != null && v.isNotEmpty) return v;
    if (kReleaseMode) {
      throw StateError('PORTONE_STORE_ID 환경변수가 설정되지 않았습니다. (릴리즈 빌드)');
    }
    return 'store-869df247-ae7f-4504-962a-299e69a6e255';
  }

  static String get _channelKey {
    final v = dotenv.env['PORTONE_CHANNEL_KEY'];
    if (v != null && v.isNotEmpty) return v;
    if (kReleaseMode) {
      throw StateError('PORTONE_CHANNEL_KEY 환경변수가 설정되지 않았습니다. (릴리즈 빌드)');
    }
    debugPrint('⚠️ PORTONE_CHANNEL_KEY 미설정 — 테스트 채널키 없음');
    return '';
  }

  // ─────────────────────────────────────────────────────────────

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    );
    _fadeAnim = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _animController, curve: Curves.easeInOut),
    );
    _animController.forward();

    CustomerEventService.trackPaymentStart(
      orderId: widget.orderId,
      amount: widget.amount,
    );
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  // ── 결제 요청 ─────────────────────────────────────────────────

  Future<void> _requestPayment() async {
    if (_isRequesting) return;
    setState(() {
      _isRequesting = true;
      _errorMessage = null;
    });

    try {
      final storeId = _storeId;
      final channelKey = _channelKey;

      await PortOneManager.shared.requestPayment(
        request: PaymentRequest(
          storeId: storeId,
          channelKey: channelKey,
          paymentId: widget.orderId,
          orderName: widget.orderName,
          totalAmount: widget.amount,
          currency: Currency.krw,
          payMethod: PayMethod.card,
          customer: Customer(
            fullName: widget.customerName ?? '',
            email: widget.customerEmail ?? '',
            phoneNumber:
                (widget.customerPhone ?? '').replaceAll('-', ''),
          ),
        ),
        callback: (response) async {
          if (response.code != null) {
            // 결제 실패 / 취소
            final msg = response.message ?? '결제에 실패했습니다.';
            if (response.code != 'FAILURE_TYPE_PG') {
              CustomerEventService.trackPaymentFail(
                orderId: widget.orderId,
                amount: widget.amount,
                errorMessage: msg,
              );
              if (mounted) _showError(msg);
            }
            if (mounted) setState(() => _isRequesting = false);
            return;
          }

          // 결제 성공 → 서버 검증
          final paymentId = response.paymentId ?? widget.orderId;
          await _confirmPayment(paymentId);
        },
      );
    } catch (e) {
      if (mounted) {
        _showError('결제 요청 중 오류가 발생했습니다: $e');
        setState(() => _isRequesting = false);
      }
    }
  }

  Future<void> _confirmPayment(String paymentId) async {
    try {
      final service = PaymentService();
      final result = await service.confirmPortonePayment(
        paymentId: paymentId,
        orderId: widget.orderId,
        amount: widget.amount,
        isExtraCharge: widget.isExtraCharge,
        originalOrderId: widget.originalOrderId,
        triggerIntentFlow: widget.isIntentFlow,
      );

      if (mounted) {
        CustomerEventService.trackPaymentSuccess(
          orderId: widget.orderId,
          amount: widget.amount,
          transactionId: paymentId,
        );
        _showSuccessDialog(result);
      }
    } catch (e) {
      CustomerEventService.trackPaymentFail(
        orderId: widget.orderId,
        amount: widget.amount,
        errorMessage: e.toString(),
      );
      if (mounted) {
        _showError('결제 검증 실패: $e');
        setState(() => _isRequesting = false);
      }
    }
  }

  // ── 다이얼로그 ────────────────────────────────────────────────

  void _showSuccessDialog(Map<String, dynamic> result) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.green.shade50,
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.check_circle,
                  color: Colors.green.shade600, size: 28),
            ),
            const SizedBox(width: 12),
            const Text('결제 완료'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _infoRow('결제 금액', _formatAmount(widget.amount)),
            const SizedBox(height: 8),
            _infoRow('결제 수단', result['method']?.toString() ?? 'CARD'),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                widget.isExtraCharge
                    ? '추가 결제가 완료되었습니다.\n작업이 재개됩니다.'
                    : '택배 수거 → 입고 확인 → 수선 작업 → 배송 완료',
                style: TextStyle(
                  fontSize: 13,
                  color: Colors.grey.shade800,
                  height: 1.4,
                ),
              ),
            ),
          ],
        ),
        actions: [
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                Navigator.of(ctx).pop();
                context.pop(true);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blue.shade600,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8)),
              ),
              child: const Text('확인',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            ),
          ),
        ],
      ),
    );
  }

  void _showError(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: Colors.red.shade600),
    );
  }

  // ── UI 헬퍼 ──────────────────────────────────────────────────

  Widget _infoRow(String label, String value) => Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style:
                  TextStyle(fontSize: 14, color: Colors.grey.shade600)),
          Text(value,
              style: const TextStyle(
                  fontSize: 14, fontWeight: FontWeight.w600)),
        ],
      );

  String _formatAmount(int amount) {
    return '${amount.toString().replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (m) => '${m[1]},',
        )}원';
  }

  // ── 빌드 ─────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const ModoAppBar(
        title: Text('결제하기'),
        foregroundColor: Colors.black87,
      ),
      body: FadeTransition(
        opacity: _fadeAnim,
        child: SafeArea(
          child: Column(
            children: [
              // 결제 정보 헤더
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 20, vertical: 16),
                decoration: BoxDecoration(
                  color: Colors.grey.shade50,
                  border: Border(
                      bottom:
                          BorderSide(color: Colors.grey.shade200)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.orderName,
                      style: const TextStyle(
                          fontSize: 16, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('결제 금액',
                            style: TextStyle(
                                color: Colors.grey.shade600,
                                fontSize: 14)),
                        Text(
                          _formatAmount(widget.amount),
                          style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF0064FF)),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const Spacer(),

              // 결제수단 안내
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 20),
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey.shade200),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.04),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    Icon(Icons.credit_card_rounded,
                        size: 48, color: Colors.grey.shade400),
                    const SizedBox(height: 12),
                    Text(
                      '결제 버튼을 누르면\n결제창이 열립니다',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey.shade600,
                          height: 1.5),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '카드 · 카카오페이 · 네이버페이 등',
                      style: TextStyle(
                          fontSize: 12, color: Colors.grey.shade400),
                    ),
                  ],
                ),
              ),

              const Spacer(),

              if (_errorMessage != null)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Text(
                    _errorMessage!,
                    style: TextStyle(
                        color: Colors.red.shade600, fontSize: 13),
                    textAlign: TextAlign.center,
                  ),
                ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: ElevatedButton(
            onPressed: _isRequesting ? null : _requestPayment,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0064FF),
              foregroundColor: Colors.white,
              disabledBackgroundColor: Colors.grey.shade300,
              padding: const EdgeInsets.symmetric(vertical: 16),
              minimumSize: const Size.fromHeight(52),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
              elevation: 0,
            ),
            child: _isRequesting
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor:
                          AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  )
                : Text(
                    '${_formatAmount(widget.amount)} 결제하기',
                    style: const TextStyle(
                        fontSize: 16, fontWeight: FontWeight.w600),
                  ),
          ),
        ),
      ),
    );
  }
}
