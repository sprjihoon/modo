import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../../../core/widgets/modo_app_bar.dart';
import '../../../../services/payment_service.dart';
import '../../../../services/customer_event_service.dart';

/// 포트원 V2 결제 페이지 (WebView 기반)
///
/// portone_flutter 1.0.x 는 Dart 3.10+ 를 요구하므로(현재 3.9.2),
/// PortOne V2 브라우저 SDK 를 WebView 에 로드해 결제창을 띄운다.
/// 결제 완료 후 redirectUrl 로 이동하면 이를 가로채 paymentId 를 추출하고
/// payments-confirm Edge Function 으로 서버 검증한다.
class PortonePaymentPage extends StatefulWidget {
  /// paymentId == payment_intents.id (신규 흐름) 또는 orders.id (레거시) 또는 EXTRA_xxx
  final String orderId;
  final int amount;
  final String orderName;
  final String? customerName;
  final String? customerEmail;
  final String? customerPhone;
  final bool isExtraCharge;
  final String? originalOrderId;
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

class _PortonePaymentPageState extends State<PortonePaymentPage> {
  // redirectUrl: WebView 가 이 URL 로 이동하면 결제 완료로 간주하고 가로챈다.
  static const String _redirectUrl = 'https://modo.io.kr/payment/mobile-callback';

  late final WebViewController _controller;
  bool _isLoading = true;
  bool _handled = false; // 결제 결과 중복 처리 방지
  String? _errorMessage;

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
    debugPrint('⚠️ PORTONE_CHANNEL_KEY 미설정');
    return '';
  }

  @override
  void initState() {
    super.initState();
    CustomerEventService.trackPaymentStart(
      orderId: widget.orderId,
      amount: widget.amount,
    );
    _initWebView();
  }

  void _initWebView() {
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.white)
      ..addJavaScriptChannel(
        'PortOneChannel',
        onMessageReceived: (msg) => _onJsMessage(msg.message),
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (_) {
            if (mounted) setState(() => _isLoading = false);
          },
          onNavigationRequest: _onNavigationRequest,
          onWebResourceError: (err) {
            debugPrint('WebView 오류: ${err.description}');
          },
        ),
      )
      ..loadHtmlString(_buildHtml());
  }

  // ── 결제 결과 처리 ────────────────────────────────────────────

  NavigationDecision _onNavigationRequest(NavigationRequest request) {
    final url = request.url;

    // redirectUrl 가로채기 → 결제 완료
    if (url.startsWith(_redirectUrl)) {
      _handleRedirect(Uri.parse(url));
      return NavigationDecision.prevent;
    }

    // http/https 는 WebView 내에서 처리
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return NavigationDecision.navigate;
    }

    // 외부 앱 스킴 (카카오페이, 네이버페이, 카드사 앱, intent:// 등) → 외부 실행
    _launchExternalScheme(url);
    return NavigationDecision.prevent;
  }

  Future<void> _launchExternalScheme(String url) async {
    try {
      var target = url;
      // Android intent:// 스킴 처리
      if (url.startsWith('intent://')) {
        final fallback = RegExp(r'S\.browser_fallback_url=([^;]+)')
            .firstMatch(url)
            ?.group(1);
        if (fallback != null) {
          target = Uri.decodeFull(fallback);
        } else {
          final scheme = RegExp(r'scheme=([^;]+)').firstMatch(url)?.group(1);
          final body = url.substring(
              'intent://'.length, url.indexOf('#Intent;'));
          if (scheme != null) target = '$scheme://$body';
        }
      }
      final uri = Uri.parse(target);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        debugPrint('외부 앱 실행 불가: $target');
      }
    } catch (e) {
      debugPrint('외부 스킴 실행 오류: $e');
    }
  }

  void _onJsMessage(String raw) {
    try {
      final data = jsonDecode(raw) as Map<String, dynamic>;
      final code = data['code'];
      if (code != null) {
        // 실패 / 취소
        final msg = (data['message'] ?? '결제에 실패했습니다.').toString();
        if (code != 'FAILURE_TYPE_PG') {
          _fail(msg);
        } else {
          _fail(msg);
        }
        return;
      }
      // 성공 (데스크톱형 promise 응답)
      final paymentId = (data['paymentId'] ?? widget.orderId).toString();
      _confirm(paymentId);
    } catch (e) {
      _fail('결제 응답 처리 오류: $e');
    }
  }

  void _handleRedirect(Uri uri) {
    final code = uri.queryParameters['code'];
    if (code != null && code.isNotEmpty) {
      final msg = uri.queryParameters['message'] ?? '결제에 실패했습니다.';
      _fail(msg);
      return;
    }
    final paymentId = uri.queryParameters['paymentId'] ?? widget.orderId;
    _confirm(paymentId);
  }

  Future<void> _confirm(String paymentId) async {
    if (_handled) return;
    _handled = true;

    if (mounted) setState(() => _isLoading = true);

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
        setState(() {
          _isLoading = false;
          _errorMessage = '결제 검증 실패: $e';
        });
      }
    }
  }

  void _fail(String message) {
    if (_handled) return;
    _handled = true;
    CustomerEventService.trackPaymentFail(
      orderId: widget.orderId,
      amount: widget.amount,
      errorMessage: message,
    );
    if (mounted) {
      setState(() {
        _isLoading = false;
        _errorMessage = message;
      });
    }
  }

  // ── HTML (PortOne V2 브라우저 SDK) ───────────────────────────

  String _buildHtml() {
    final customerBlock = (widget.customerName != null &&
            widget.customerName!.isNotEmpty)
        ? '''
        customer: {
          fullName: ${jsonEncode(widget.customerName)},
          email: ${jsonEncode(widget.customerEmail ?? '')},
          phoneNumber: ${jsonEncode((widget.customerPhone ?? '').replaceAll('-', ''))}
        },'''
        : '';

    return '''
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<script src="https://cdn.portone.io/v2/browser-sdk.js"></script>
<style>
  body { margin:0; font-family:-apple-system,BlinkMacSystemFont,sans-serif;
         display:flex; align-items:center; justify-content:center; height:100vh; }
  .loading { color:#888; font-size:14px; }
</style>
</head>
<body>
<div class="loading">결제창을 여는 중입니다...</div>
<script>
  function send(obj){
    try { PortOneChannel.postMessage(JSON.stringify(obj)); } catch(e){}
  }
  async function start(){
    try {
      const response = await PortOne.requestPayment({
        storeId: ${jsonEncode(_storeId)},
        channelKey: ${jsonEncode(_channelKey)},
        paymentId: ${jsonEncode(widget.orderId)},
        orderName: ${jsonEncode(widget.orderName)},
        totalAmount: ${widget.amount},
        currency: "CURRENCY_KRW",
        payMethod: "CARD",
        redirectUrl: ${jsonEncode(_redirectUrl)},
        $customerBlock
      });
      if (response) { send(response); }
    } catch (e) {
      send({ code: "ERROR", message: (e && e.message) ? e.message : String(e) });
    }
  }
  window.addEventListener('load', start);
</script>
</body>
</html>
''';
  }

  // ── 다이얼로그 / UI ──────────────────────────────────────────

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
                  style:
                      TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _infoRow(String label, String value) => Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style: TextStyle(fontSize: 14, color: Colors.grey.shade600)),
          Text(value,
              style:
                  const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
        ],
      );

  String _formatAmount(int amount) {
    return '${amount.toString().replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (m) => '${m[1]},',
        )}원';
  }

  void _retry() {
    setState(() {
      _errorMessage = null;
      _handled = false;
      _isLoading = true;
    });
    _controller.loadHtmlString(_buildHtml());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const ModoAppBar(
        title: Text('결제하기'),
        foregroundColor: Colors.black87,
      ),
      body: _errorMessage != null
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.error_outline,
                        size: 64, color: Colors.red.shade300),
                    const SizedBox(height: 16),
                    Text(
                      _errorMessage!,
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.red.shade600),
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: _retry,
                      child: const Text('다시 시도'),
                    ),
                  ],
                ),
              ),
            )
          : Stack(
              children: [
                WebViewWidget(controller: _controller),
                if (_isLoading)
                  Container(
                    color: Colors.white,
                    child: const Center(
                      child: CircularProgressIndicator(
                        valueColor:
                            AlwaysStoppedAnimation<Color>(Color(0xFF0064FF)),
                      ),
                    ),
                  ),
              ],
            ),
    );
  }
}
