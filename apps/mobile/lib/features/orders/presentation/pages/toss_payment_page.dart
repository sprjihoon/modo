import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:go_router/go_router.dart';
import 'package:tosspayments_widget_sdk_flutter/model/payment_info.dart';
import 'package:tosspayments_widget_sdk_flutter/model/payment_widget_options.dart';
import 'package:tosspayments_widget_sdk_flutter/model/tosspayments_result.dart';
import 'package:tosspayments_widget_sdk_flutter/payment_widget.dart';
import 'package:tosspayments_widget_sdk_flutter/widgets/agreement.dart';
import 'package:tosspayments_widget_sdk_flutter/widgets/payment_method.dart';
import '../../../../services/payment_service.dart';

/// 토스페이먼츠 결제 위젯 페이지
/// 
/// 추가 결제, 일반 결제 등에서 사용할 수 있는 결제 위젯 페이지
class TossPaymentPage extends StatefulWidget {
  final String orderId;
  final int amount;
  final String orderName;
  final String? customerName;
  final String? customerEmail;
  final String? customerPhone;
  final bool isExtraCharge; // 추가 결제 여부
  final String? originalOrderId; // 원본 주문 ID (수거예약 등에 사용)

  const TossPaymentPage({
    super.key,
    required this.orderId,
    required this.amount,
    required this.orderName,
    this.customerName,
    this.customerEmail,
    this.customerPhone,
    this.isExtraCharge = false,
    this.originalOrderId,
  });

  @override
  State<TossPaymentPage> createState() => _TossPaymentPageState();
}

class _TossPaymentPageState extends State<TossPaymentPage> with SingleTickerProviderStateMixin {
  late PaymentWidget _paymentWidget;
  PaymentMethodWidgetControl? _paymentMethodWidgetControl;
  AgreementWidgetControl? _agreementWidgetControl;
  
  bool _isLoading = true;
  bool _isPaymentReady = false;
  bool _showPreparingScreen = true; // 결제 준비 화면 표시 여부
  String? _errorMessage;
  
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;

  // 토스페이먼츠 클라이언트 키 (환경변수에서 로드, 없으면 테스트 키 사용)
  // ⚠️ 프로덕션 배포 전 반드시 환경변수 설정 필요!
  static const String _testClientKey = 'test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm';
  
  static String get _clientKey {
    final key = dotenv.env['TOSS_CLIENT_KEY'];
    if (key == null || key.isEmpty) {
      debugPrint('⚠️ TOSS_CLIENT_KEY 환경변수 미설정 - 테스트 키 사용');
      return _testClientKey;
    }
    return key;
  }
  
  // 위젯 selector 식별자
  static const String _paymentMethodSelector = 'payment-method';
  static const String _agreementSelector = 'agreement';

  @override
  void initState() {
    super.initState();
    
    // 애니메이션 설정
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeInOut),
    );
    _animationController.forward();
    
    _initPaymentWidget();
  }
  
  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  void _initPaymentWidget() {
    // 결제 위젯 인스턴스 생성
    _paymentWidget = PaymentWidget(
      clientKey: _clientKey,
      customerKey: PaymentWidget.anonymous, // 비회원 결제
    );
    
    setState(() {
      _isLoading = false;
    });
    
    // 1.5초 후 준비 화면 숨기고 위젯 렌더링 시작
    Future.delayed(const Duration(milliseconds: 1500), () {
      if (mounted) {
        setState(() {
          _showPreparingScreen = false;
        });
        // 준비 화면이 사라진 후 다음 프레임에서 위젯 렌더링
        WidgetsBinding.instance.addPostFrameCallback((_) {
          _renderPaymentWidgets();
        });
      }
    });
  }

  Future<void> _renderPaymentWidgets() async {
    try {
      setState(() {
        _isLoading = true;
      });

      // 결제수단 위젯 렌더링
      _paymentMethodWidgetControl = await _paymentWidget.renderPaymentMethods(
        selector: _paymentMethodSelector,
        amount: Amount(
          value: widget.amount,
          currency: Currency.KRW,
          country: 'KR',
        ),
      );

      // 약관 동의 위젯 렌더링
      _agreementWidgetControl = await _paymentWidget.renderAgreement(
        selector: _agreementSelector,
        options: RenderAgreementOptions(variantKey: 'AGREEMENT'),
      );

      setState(() {
        _isLoading = false;
        _isPaymentReady = true;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = '결제 위젯 렌더링 실패: $e';
      });
    }
  }

  Future<void> _requestPayment() async {
    if (!_isPaymentReady) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('결제 위젯이 준비되지 않았습니다')),
      );
      return;
    }

    try {
      setState(() {
        _isLoading = true;
      });

      // 결제 요청
      final result = await _paymentWidget.requestPayment(
        paymentInfo: PaymentInfo(
          orderId: widget.orderId,
          orderName: widget.orderName,
          customerName: widget.customerName,
          customerEmail: widget.customerEmail,
          customerMobilePhone: widget.customerPhone,
          appScheme: 'modorepair://', // iOS/Android 앱으로 복귀하기 위한 URL scheme
        ),
      );

      if (result.success != null) {
        // 결제 성공 - 서버에 승인 요청
        await _confirmPayment(result.success!);
      } else if (result.fail != null) {
        // 결제 실패
        _showError(result.fail!.errorMessage);
      }
    } catch (e) {
      _showError('결제 요청 중 오류가 발생했습니다: $e');
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _confirmPayment(Success success) async {
    try {
      final paymentService = PaymentService();
      
      // 서버에 결제 승인 요청
      final result = await paymentService.confirmTossPayment(
        paymentKey: success.paymentKey,
        orderId: success.orderId,
        amount: success.amount.toInt(),
        isExtraCharge: widget.isExtraCharge,
      );

      if (mounted) {
        // 결제 완료 - 결과 페이지로 이동
        _showSuccessDialog(result);
      }
    } catch (e) {
      _showError('결제 승인 실패: $e');
    }
  }

  void _showSuccessDialog(Map<String, dynamic> result) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.green.shade50,
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.check_circle,
                color: Colors.green.shade600,
                size: 28,
              ),
            ),
            const SizedBox(width: 12),
            const Text('결제 완료'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildInfoRow('주문번호', widget.orderId),
            const SizedBox(height: 8),
            _buildInfoRow('결제금액', '${widget.amount.toString().replaceAllMapped(
              RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
              (Match m) => '${m[1]},',
            )}원'),
            const SizedBox(height: 8),
            _buildInfoRow('결제수단', result['method'] ?? '-'),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '결제 완료 후 수선된 의류를 받으시기까지\n약 5영업일이 소요됩니다.',
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.grey.shade800,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '택배 수거 → 입고 확인 → 수선 작업 → 배송 완료',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.blue.shade700,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                Navigator.of(context).pop();
                // 이전 화면으로 돌아가기 (결제 완료 상태로)
                context.pop(true);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blue.shade600,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: const Text(
                '확인',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            color: Colors.grey.shade600,
            fontSize: 14,
          ),
        ),
        Text(
          value,
          style: const TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 14,
          ),
        ),
      ],
    );
  }

  void _showError(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: Colors.red.shade600,
        ),
      );
    }
  }

  /// 결제수단 로딩 스켈레톤
  Widget _buildLoadingSkeleton() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        children: [
          // 결제수단 옵션들 스켈레톤
          for (int i = 0; i < 4; i++) ...[
            if (i > 0) const SizedBox(height: 12),
            Row(
              children: [
                Container(
                  width: 48,
                  height: 32,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade200,
                    borderRadius: BorderRadius.circular(6),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Container(
                    height: 16,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade200,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ),
                const SizedBox(width: 40),
              ],
            ),
          ],
        ],
      ),
    );
  }

  /// 약관 로딩 스켈레톤
  Widget _buildAgreementSkeleton() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 20,
                height: 20,
                decoration: BoxDecoration(
                  color: Colors.grey.shade200,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Container(
                  height: 14,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade200,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Container(
                width: 20,
                height: 20,
                decoration: BoxDecoration(
                  color: Colors.grey.shade200,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
              const SizedBox(width: 12),
              Container(
                width: 150,
                height: 14,
                decoration: BoxDecoration(
                  color: Colors.grey.shade200,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// 결제 준비 화면
  Widget _buildPreparingScreen() {
    final formattedAmount = widget.amount.toString().replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (Match m) => '${m[1]},',
    );
    
    return FadeTransition(
      opacity: _fadeAnimation,
      child: Container(
        color: Colors.white,
        child: SafeArea(
          child: Column(
            children: [
              // 상단 여백
              const SizedBox(height: 80),
              
              // 토스 로고 애니메이션
              TweenAnimationBuilder<double>(
                tween: Tween(begin: 0.8, end: 1.0),
                duration: const Duration(milliseconds: 600),
                curve: Curves.elasticOut,
                builder: (context, value, child) {
                  return Transform.scale(
                    scale: value,
                    child: Container(
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        color: const Color(0xFF0064FF).withOpacity(0.1),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.credit_card,
                        size: 40,
                        color: Color(0xFF0064FF),
                      ),
                    ),
                  );
                },
              ),
              
              const SizedBox(height: 32),
              
              // 결제 준비 중 텍스트
              const Text(
                '결제를 준비하고 있습니다',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Colors.black87,
                ),
              ),
              
              const SizedBox(height: 12),
              
              Text(
                '잠시만 기다려주세요',
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey.shade600,
                ),
              ),
              
              const SizedBox(height: 40),
              
              // 로딩 인디케이터
              SizedBox(
                width: 32,
                height: 32,
                child: CircularProgressIndicator(
                  strokeWidth: 3,
                  valueColor: AlwaysStoppedAnimation<Color>(
                    const Color(0xFF0064FF).withOpacity(0.7),
                  ),
                ),
              ),
              
              const Spacer(),
              
              // 결제 정보 미리보기
              Container(
                margin: const EdgeInsets.all(20),
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '결제 상품',
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey.shade600,
                          ),
                        ),
                        Flexible(
                          child: Text(
                            widget.orderName,
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '결제 금액',
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey.shade600,
                          ),
                        ),
                        Text(
                          '$formattedAmount원',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF0064FF),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // 결제 준비 화면 표시
    if (_showPreparingScreen) {
      return Scaffold(
        body: _buildPreparingScreen(),
      );
    }
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('결제하기'),
        centerTitle: true,
        backgroundColor: Colors.white,
        foregroundColor: Colors.black87,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios),
          onPressed: () => context.pop(),
        ),
      ),
      body: _errorMessage != null
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.error_outline,
                    size: 64,
                    color: Colors.red.shade300,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    _errorMessage!,
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.red.shade600),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: () {
                      setState(() {
                        _errorMessage = null;
                        _isLoading = false;
                      });
                      _initPaymentWidget();
                    },
                    child: const Text('다시 시도'),
                  ),
                ],
              ),
            )
          : Column(
              children: [
                // 결제 정보 헤더
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade50,
                    border: Border(
                      bottom: BorderSide(color: Colors.grey.shade200),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.orderName,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            '결제 금액',
                            style: TextStyle(
                              color: Colors.grey,
                              fontSize: 14,
                            ),
                          ),
                          Text(
                            '${widget.amount.toString().replaceAllMapped(
                              RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
                              (Match m) => '${m[1]},',
                            )}원',
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: Colors.blue,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                
                // 토스페이먼츠 결제수단 위젯 - WebView 자체 스크롤 사용
                Expanded(
                  child: PaymentMethodWidget(
                    paymentWidget: _paymentWidget,
                    selector: _paymentMethodSelector,
                    onCustomPaymentMethodSelected: (paymentMethodKey) {
                      debugPrint('결제수단 선택됨: $paymentMethodKey');
                    },
                    onCustomPaymentMethodUnselected: (paymentMethodKey) {
                      debugPrint('결제수단 해제됨: $paymentMethodKey');
                    },
                  ),
                ),
                
                // 약관 동의 위젯 - 하단 고정
                AgreementWidget(
                  paymentWidget: _paymentWidget,
                  selector: _agreementSelector,
                ),
              ],
            ),
      
      // 결제 버튼
      bottomNavigationBar: _errorMessage == null
          ? SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // 로딩 중이거나 위젯 준비 안됨
                    if (!_isPaymentReady || _isLoading)
                      ElevatedButton(
                        onPressed: null,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.grey.shade400,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          minimumSize: const Size.fromHeight(52),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          elevation: 0,
                        ),
                        child: _isLoading
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                ),
                              )
                            : const Text(
                                '결제수단 불러오는 중...',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                      ),
                    
                    // 결제 버튼
                    if (_isPaymentReady && !_isLoading)
                      ElevatedButton(
                        onPressed: _requestPayment,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0064FF),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          minimumSize: const Size.fromHeight(52),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          elevation: 0,
                        ),
                        child: Text(
                          '${widget.amount.toString().replaceAllMapped(
                              RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
                              (Match m) => '${m[1]},',
                            )}원 결제하기',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            )
          : null,
    );
  }
}
