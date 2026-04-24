import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:video_player/video_player.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:provider/provider.dart' as provider;

import '../../../../core/widgets/modo_app_bar.dart';
import '../../../../services/image_service.dart';
import '../../../../services/order_service.dart';
import '../../../../services/shipping_settings_service.dart';
import '../../../../core/enums/extra_charge_status.dart';
import '../../providers/extra_charge_provider.dart';
import '../../domain/models/extra_charge_data.dart';
import '../../../profile/presentation/widgets/daum_postcode_widget.dart';

/// 주문 상세 화면
class OrderDetailPage extends ConsumerStatefulWidget {
  final String orderId;

  const OrderDetailPage({
    required this.orderId,
    super.key,
  });

  @override
  ConsumerState<OrderDetailPage> createState() => _OrderDetailPageState();
}

class _OrderDetailPageState extends ConsumerState<OrderDetailPage>
    with WidgetsBindingObserver {
  final _orderService = OrderService();
  bool _isLoading = true;
  bool _isCancelling = false; // 취소 중 상태 추가
  Map<String, dynamic>? _orderData;
  Map<String, dynamic>? _shipmentData;

  // 실제 사진 데이터 (State로 관리)
  List<Map<String, dynamic>> _images = [];

  // 주문 상태 (서버에서 로드)
  // BOOKED: 수거예약 - 수정 O, 취소 O (전액 환불 + 우체국 취소)
  // PICKED_UP: 수거완료 - 수정 X, 취소 O (왕복 배송비 차감 후 부분환불 + 반송)
  // INBOUND: 입고완료 - 수정 O, 취소 O (왕복 배송비 차감 후 부분환불 + 반송)
  // PROCESSING: 수선중 - 수정 X, 취소 X (고객센터 문의)
  // READY_TO_SHIP: 출고완료 - 수정 X, 취소 X (고객센터 문의)
  String _currentStatus = 'BOOKED';

  // 우체국 API 취소 응답 정보 저장
  Map<String, dynamic>? _cancelInfo;

  // 배송지/메모 수정
  bool _isSavingDelivery = false;

  /// 배송추적 treatStusCd (00:신청준비, 01:소포신청, 02:운송장출력, 03:집하완료, 04:배송중, 05:배송완료)
  /// 00~02: 수거준비(취소 가능), 03~05: 접수/발송/도착(취소 불가 → 문의하기)
  String? _pickupTreatStusCd;

  // 입고/출고 영상 URL (단일)
  String? _inboundVideoUrl;
  String? _outboundVideoUrl;

  // 여러 아이템의 영상 쌍 (순차 재생용)
  List<Map<String, String>> _videoItems = [];

  // 주기적 새로고침을 위한 타이머
  // 네트워크 에러 메시지 (UI에 배너로 표시)
  String? _networkErrorMessage;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _loadOrderData();
    // 배송비 설정을 백그라운드로 갱신 (화면 빌드 시점에는 캐시값 사용)
    ShippingSettingsService().get();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  /// 앱이 포그라운드로 돌아올 때 데이터 갱신
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && mounted) {
      _loadOrderData(showLoading: false);
    }
  }

  Future<void> _loadOrderData({bool showLoading = true}) async {
    try {
      if (showLoading) {
        setState(() => _isLoading = true);
      }

      // 기존 에러 메시지 초기화 및 SnackBar 제거
      if (_networkErrorMessage != null && mounted) {
        setState(() => _networkErrorMessage = null);
        ScaffoldMessenger.of(context).clearSnackBars();
      }

      debugPrint('📦 주문 상세 조회 시작: ${widget.orderId}');

      // 🔒 보안: 주문 상세 정보 조회 (소유자 검증 포함)
      final order = await _orderService.getOrderDetail(widget.orderId).timeout(
        const Duration(seconds: 30),
        onTimeout: () {
          throw Exception('주문 정보 조회 시간 초과 (30초)');
        },
      );

      debugPrint('✅ 주문 상세 조회 성공: ${order['id']}');

      // shipments 정보 추출
      final shipments = order['shipments'] as List<dynamic>?;
      final shipment = shipments != null && shipments.isNotEmpty
          ? shipments.first as Map<String, dynamic>
          : null;

      // 실제 사진 데이터 로드
      List<Map<String, dynamic>> images = [];

      // images_with_pins 또는 images 필드에서 사진 정보 가져오기
      final imagesWithPins = order['images_with_pins'] as List<dynamic>?;
      if (imagesWithPins != null && imagesWithPins.isNotEmpty) {
        images = imagesWithPins.map((img) {
          final imgMap = Map<String, dynamic>.from(img as Map);
          final pinsData = imgMap['pins'] as List<dynamic>? ?? [];
          // pins를 Map<String, dynamic>으로 변환 (ImagePin.fromJson을 위해)
          final pins = pinsData
              .map((p) {
                if (p is Map<String, dynamic>) {
                  return p;
                } else if (p is Map) {
                  return Map<String, dynamic>.from(p);
                }
                return null;
              })
              .whereType<Map<String, dynamic>>()
              .toList();
          return {
            'url': imgMap['imagePath'] ?? imgMap['url'] ?? '',
            'pinsCount': pins.length,
            'pins': pins, // Map<String, dynamic> 리스트로 저장
          };
        }).toList();
      } else {
        // images 필드에서 URL 배열 가져오기
        final imageUrls = order['images'] as Map<String, dynamic>?;
        if (imageUrls != null) {
          final urls = imageUrls['urls'] as List<dynamic>? ?? [];
          images = urls
              .map(
                (url) => {
                  'url': url.toString(),
                  'pinsCount': 0,
                  'pins': <dynamic>[],
                },
              )
              .toList();
        }
      }

      final newStatus = order['status'] as String? ?? 'BOOKED';
      final statusChanged = _currentStatus != newStatus;
      
      debugPrint('📊 주문 상태: $newStatus (이전: $_currentStatus)');

      setState(() {
        _orderData = order;
        _shipmentData = shipment;
        _currentStatus = newStatus;
        _images = images;
        _isLoading = false;
        // BOOKED가 아니면 수거 treatStusCd 초기화
        if (newStatus != 'BOOKED') {
          _pickupTreatStusCd = null;
        }
      });
      
      debugPrint('🔘 취소 가능 여부: $_isPickupCancellable (treatStusCd: $_pickupTreatStusCd)');

      // 상태 변경 알림 (배송완료 등)
      if (statusChanged && mounted) {
        if (newStatus == 'DELIVERED') {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('배송이 완료되었습니다! 포인트가 적립되었습니다.'),
              backgroundColor: Color(0xFF00C896),
              duration: Duration(seconds: 3),
            ),
          );
        } else if (newStatus == 'INBOUND') {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('입고가 완료되었습니다.'),
              backgroundColor: Colors.blue,
              duration: Duration(seconds: 2),
            ),
          );
        } else if (newStatus == 'PROCESSING') {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('수선이 시작되었습니다.'),
              backgroundColor: Colors.orange,
              duration: Duration(seconds: 2),
            ),
          );
        } else if (newStatus == 'READY_TO_SHIP') {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('출고가 완료되었습니다. 배송을 시작합니다.'),
              backgroundColor: Colors.green,
              duration: Duration(seconds: 2),
            ),
          );
        }
      }

      // 입고/출고 영상 URL 조회 (비동기, 별도 처리)
      _loadVideoUrls();

      // 🚚 배송/수거 완료 자동 체크
      // - BOOKED: 수거 완료 시 → INBOUND로 변경
      // - READY_TO_SHIP: 배송 완료 시 → DELIVERED로 변경
      if (newStatus == 'BOOKED' || newStatus == 'READY_TO_SHIP') {
        _checkDeliveryCompletion(newStatus);
      }

      // 📦 BOOKED 상태: 배송추적 API로 treatStusCd 조회 (수거준비인지 접수/발송/도착인지 판단)
      if (newStatus == 'BOOKED' && shipment != null && mounted) {
        _fetchPickupTreatStusCd(shipment);
      }
    } catch (e, stackTrace) {
      debugPrint('❌ 주문 상세 조회 실패: $e');
      debugPrint('스택 트레이스: $stackTrace');

      // 🔒 보안: 접근 권한 없음 처리
      final errorMessage = e.toString();
      final isAccessDenied = errorMessage.contains('접근 권한이 없습니다') ||
          errorMessage.contains('본인의 주문만');

      if (mounted) {
        // 로딩 상태 해제
        setState(() => _isLoading = false);

        if (isAccessDenied) {
          // 🔒 접근 권한 없음: 즉시 뒤로가기
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('⛔ 접근 권한이 없습니다. 본인의 주문만 조회할 수 있습니다.'),
              backgroundColor: Colors.red,
              duration: Duration(seconds: 3),
            ),
          );

          // 0.5초 후 자동으로 뒤로가기 (사용자가 메시지를 읽을 시간 제공)
          Future.delayed(const Duration(milliseconds: 500), () {
            if (mounted) {
              context.pop(); // 즉시 뒤로가기 (보안 위협 차단)
            }
          });
        } else if (_orderData != null) {
          // 이미 데이터가 있는 경우 (자동 새로고침 실패): 상태 변수에만 저장
          // 네트워크 재연결 시 자동으로 성공하면 에러 메시지가 사라짐
          setState(() {
            _networkErrorMessage = '네트워크 연결을 확인해주세요';
          });
        } else {
          // 최초 로드 실패: SnackBar로 재시도 안내
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('주문 정보 조회 실패: ${e.toString()}'),
              backgroundColor: Colors.red,
              duration: const Duration(seconds: 5),
              action: SnackBarAction(
                label: '다시 시도',
                textColor: Colors.white,
                onPressed: () {
                  _loadOrderData();
                },
              ),
            ),
          );
        }
      } else {
        // mounted가 false면 setState 호출하지 않음
        _isLoading = false;
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: const ModoAppBar(
          title: Text('주문 상세'),
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const CircularProgressIndicator(),
              const SizedBox(height: 16),
              Text(
                '주문 정보를 불러오는 중...',
                style: TextStyle(
                  color: Colors.grey.shade600,
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 24),
              TextButton(
                onPressed: () {
                  _loadOrderData();
                },
                child: const Text('다시 시도'),
              ),
            ],
          ),
        ),
      );
    }

    // TODO: 실제 주문 상태는 Supabase에서 가져오기
    final canEdit = _currentStatus == 'BOOKED' ||
        _currentStatus == 'INBOUND'; // 수선 전에만 수정 가능

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: ModoAppBar(
        title: const Text('주문 상세'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: '새로고침',
            onPressed: () => _loadOrderData(),
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 상태 배너
            _buildStatusBanner(context),

            // 🆕 추가 결제 요청 카드 (PENDING_CUSTOMER 상태일 때만 표시)
            _buildExtraChargeCard(context),

            const SizedBox(height: 16),

            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // 타임라인
                  _buildTimeline(context),
                  const SizedBox(height: 16),

                  // 주문 정보
                  _buildOrderInfo(context),
                  const SizedBox(height: 16),

                  // 사진 및 수선 부위 (수정 가능)
                  if (canEdit) _buildEditablePhotosSection(context),
                  if (canEdit) const SizedBox(height: 16),

                  // 영상 섹션
                  _buildVideoSection(context),
                  const SizedBox(height: 16),

                  // 배송 정보
                  _buildShippingInfo(context),
                  const SizedBox(height: 80),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // 네트워크 에러 배너 (재연결 시 자동으로 사라짐)
          if (_networkErrorMessage != null)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              color: Colors.red.shade50,
              child: Row(
                children: [
                  Icon(Icons.wifi_off, color: Colors.red.shade700, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _networkErrorMessage!,
                      style: TextStyle(
                        color: Colors.red.shade700,
                        fontSize: 13,
                      ),
                    ),
                  ),
                  TextButton(
                    onPressed: () => _loadOrderData(),
                    style: TextButton.styleFrom(
                      foregroundColor: Colors.red.shade700,
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: const Text('다시 시도'),
                  ),
                ],
              ),
            ),
          _buildBottomBar(context),
        ],
      ),
    );
  }

  /// 🆕 추가 결제 요청 카드 빌드
  Widget _buildExtraChargeCard(BuildContext context) {
    // extra_charge_status 확인
    final extraChargeStatusStr = _orderData?['extra_charge_status'] as String?;
    if (extraChargeStatusStr == null ||
        extraChargeStatusStr != 'PENDING_CUSTOMER') {
      return const SizedBox.shrink();
    }

    // extra_charge_data 파싱
    final extraChargeDataJson = _orderData?['extra_charge_data'];
    ExtraChargeData? extraChargeData;
    if (extraChargeDataJson != null &&
        extraChargeDataJson is Map<String, dynamic>) {
      extraChargeData = ExtraChargeData.fromJson(extraChargeDataJson);
    }

    final price = extraChargeData?.managerPrice ?? 0;
    final note = extraChargeData?.managerNote ?? '추가 작업이 필요합니다';
    final memo = extraChargeData?.workerMemo ?? '';
    final orderName = _orderData?['item_name'] as String? ?? '수선';

    return Card(
      margin: const EdgeInsets.all(16),
      elevation: 4,
      color: Colors.orange[50],
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.orange[300]!, width: 2),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 헤더
            Row(
              children: [
                Icon(
                  Icons.warning_amber_rounded,
                  color: Colors.orange[700],
                  size: 28,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '💳 추가 결제 요청',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Colors.orange[900],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // 안내 문구
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                note,
                style: const TextStyle(fontSize: 14),
              ),
            ),
            const SizedBox(height: 12),

            // 추가 금액
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.orange[100],
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    '추가 청구 금액',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Text(
                    '${_formatNumberWithComma(price)}원',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Colors.orange[900],
                    ),
                  ),
                ],
              ),
            ),

            // 현장 메모 (있으면 표시)
            if (memo.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                '현장 메모: $memo',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey[700],
                ),
              ),
            ],

            const SizedBox(height: 16),

            // 액션 버튼들
            Column(
              children: [
                // 결제하기 버튼 (토스페이먼츠로 이동)
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () =>
                        _handleExtraChargePay(context, price, orderName),
                    icon: const Icon(Icons.payment),
                    label: Text('${_formatNumberWithComma(price)}원 결제하기'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0064FF),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 8),

                // 그냥 진행 / 반송하기 버튼
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => _handleExtraChargeSkip(context),
                        icon: const Icon(Icons.arrow_forward, size: 18),
                        label: const Text('그냥 진행'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.green,
                          side: const BorderSide(color: Colors.green),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => _handleExtraChargeReturn(context),
                        icon: const Icon(Icons.keyboard_return, size: 18),
                        label: const Text('반송하기'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.red,
                          side: const BorderSide(color: Colors.red),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),

            const SizedBox(height: 12),

            // 안내 메시지
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(6),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.info_outline,
                    size: 16,
                    color: Colors.grey[600],
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      '• 그냥 진행: 추가 작업 없이 원안대로 진행합니다\n• 반송: 왕복 배송비 ${_formatPrice(ShippingSettingsService().current.returnShippingFee)}원이 차감됩니다',
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.grey[700],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// 숫자에 콤마 추가
  String _formatNumberWithComma(int number) {
    return number.toString().replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (Match m) => '${m[1]},',
        );
  }

  /// 추가 결제하기 (토스페이먼츠로 이동)
  Future<void> _handleExtraChargePay(
      BuildContext context, int price, String orderName) async {
    // 결제 확인 다이얼로그
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('추가 결제'),
        content: Text('${_formatNumberWithComma(price)}원을 결제하시겠습니까?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text('취소', style: TextStyle(color: Colors.grey.shade600)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0064FF),
              foregroundColor: Colors.white,
            ),
            child: const Text('결제'),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    // 토스페이먼츠 결제 페이지로 이동
    final result = await context.push<bool>(
      '/toss-payment',
      extra: {
        'orderId':
            'EXTRA_${widget.orderId}_${DateTime.now().millisecondsSinceEpoch}',
        'amount': price,
        'orderName': '$orderName 추가 결제',
        'isExtraCharge': true,
        'originalOrderId': widget.orderId,
      },
    );

    // 결제 완료 시 주문 데이터 새로고침
    if (result == true && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('✅ 추가 결제가 완료되었습니다. 작업을 재개합니다.'),
          backgroundColor: Colors.green,
        ),
      );
      await _loadOrderData();
    }
  }

  /// 그냥 진행 (추가 작업 없이)
  Future<void> _handleExtraChargeSkip(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('원안대로 진행'),
        content: const Text('추가 작업 없이 원안대로 진행하시겠습니까?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text('취소', style: TextStyle(color: Colors.grey.shade600)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green,
              foregroundColor: Colors.white,
            ),
            child: const Text('진행'),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    // 로딩 표시
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => const Center(child: CircularProgressIndicator()),
    );

    try {
      final extraChargeProvider =
          provider.Provider.of<ExtraChargeProvider>(context, listen: false);
      final success = await extraChargeProvider.processCustomerDecision(
        orderId: widget.orderId,
        action: CustomerDecisionAction.SKIP,
      );

      if (!mounted) return;
      Navigator.of(context).pop(); // 로딩 닫기

      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('원안대로 진행합니다'),
            backgroundColor: Colors.green,
          ),
        );
        await _loadOrderData();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(extraChargeProvider.errorMessage ?? '처리 실패'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      Navigator.of(context).pop(); // 로딩 닫기
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('오류 발생: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  /// 반송하기
  Future<void> _handleExtraChargeReturn(BuildContext context) async {
    final returnFee = ShippingSettingsService().current.returnShippingFee;
    final formattedReturnFee = _formatPrice(returnFee);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('반송 요청'),
        content: Text(
          '반송을 요청하시겠습니까?\n\n'
          '⚠️ 왕복 배송비 ${formattedReturnFee}원이 차감됩니다.\n'
          '이 금액은 환불 시 공제됩니다.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text('취소', style: TextStyle(color: Colors.grey.shade600)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            child: const Text('반송 요청'),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    // 로딩 표시
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => const Center(child: CircularProgressIndicator()),
    );

    try {
      final extraChargeProvider =
          provider.Provider.of<ExtraChargeProvider>(context, listen: false);
      final success = await extraChargeProvider.processCustomerDecision(
        orderId: widget.orderId,
        action: CustomerDecisionAction.RETURN,
      );

      if (!mounted) return;
      Navigator.of(context).pop(); // 로딩 닫기

      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('반송 요청 완료. 배송비 ${formattedReturnFee}원이 차감됩니다'),
            backgroundColor: Colors.orange,
          ),
        );
        await _loadOrderData();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(extraChargeProvider.errorMessage ?? '반송 요청 실패'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      Navigator.of(context).pop(); // 로딩 닫기
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('오류 발생: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Widget _buildStatusBanner(BuildContext context) {
    final isCancelled = _currentStatus == 'CANCELLED';
    final itemName = _orderData?['item_name'] as String? ?? '수선 항목';

    // 취소된 경우 다른 스타일
    if (isCancelled) {
      return Container(
        margin: const EdgeInsets.all(16),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.grey.shade300,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.grey.shade400, width: 2),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey.shade400,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(
                Icons.cancel_outlined,
                color: Colors.white,
                size: 32,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    itemName,
                    style: TextStyle(
                      color: Colors.grey.shade800,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.red.shade100,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.red.shade300),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.cancel_outlined,
                          size: 14,
                          color: Colors.red.shade700,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '수거 취소됨',
                          style: TextStyle(
                            color: Colors.red.shade700,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    // 정상 상태 배너
    final statusMap = {
      'BOOKED': {'label': '수거예약', 'icon': Icons.schedule_outlined},
      'INBOUND': {'label': '입고완료', 'icon': Icons.inventory_outlined},
      'PROCESSING': {'label': '수선중', 'icon': Icons.content_cut_rounded},
      'READY_TO_SHIP': {'label': '출고완료', 'icon': Icons.done_all_outlined},
      'DELIVERED': {'label': '배송완료', 'icon': Icons.check_circle_outline},
    };

    final statusInfo = statusMap[_currentStatus] ?? statusMap['BOOKED']!;
    final statusLabel = statusInfo['label'] as String;
    final statusIcon = statusInfo['icon'] as IconData;

    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Theme.of(context).colorScheme.primary,
            Theme.of(context).colorScheme.secondary,
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Theme.of(context).colorScheme.primary.withOpacity(0.3),
            blurRadius: 15,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              statusIcon,
              color: Colors.white,
              size: 32,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  itemName,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.3),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    statusLabel,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTimeline(BuildContext context) {
    // 가상 6단계 인덱스: 수거예약(0) → 수거완료(1) → 입고완료(2) → 수선중(3) → 출고완료(4) → 배송완료(5)
    // 수거완료는 DB 상태값이 아닌 우체국 treatStusCd(03 집하완료 이상)로 판단
    final dbStatusVirtualIndex = {
      'BOOKED': 0,
      'INBOUND': 2,
      'PROCESSING': 3,
      'READY_TO_SHIP': 4,
      'DELIVERED': 5,
    };

    int currentVirtualIndex = dbStatusVirtualIndex[_currentStatus] ?? 0;

    // BOOKED 상태일 때 우체국 집하완료(03 이상)면 수거완료(1) 단계로 진입
    if (_currentStatus == 'BOOKED') {
      final code = _pickupTreatStusCd;
      if (code == '03' || code == '04' || code == '05') {
        currentVirtualIndex = 1;
      }
    }

    final steps = [
      {'label': '수거예약', 'icon': Icons.schedule_outlined},
      {'label': '수거완료', 'icon': Icons.local_shipping_outlined},
      {'label': '입고완료', 'icon': Icons.inventory_outlined},
      {'label': '수선중', 'icon': Icons.content_cut_rounded},
      {'label': '출고완료', 'icon': Icons.done_all_outlined},
      {'label': '배송완료', 'icon': Icons.check_circle_outline},
    ];

    // 각 단계의 완료 여부 계산
    for (int i = 0; i < steps.length; i++) {
      steps[i]['completed'] = currentVirtualIndex >= i;
    }

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.timeline_outlined,
                color: Theme.of(context).colorScheme.primary,
                size: 24,
              ),
              const SizedBox(width: 8),
              Text(
                '진행 상황',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey.shade800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: List.generate(steps.length * 2 - 1, (index) {
                if (index.isEven) {
                  final stepIndex = index ~/ 2;
                  final step = steps[stepIndex];
                  final isCompleted = step['completed'] as bool;
                  final isCurrent = stepIndex == currentVirtualIndex;
                  return Column(
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: isCompleted
                              ? Theme.of(context).colorScheme.primary
                              : Colors.grey.shade300,
                          shape: BoxShape.circle,
                          border: isCurrent
                              ? Border.all(
                                  color: Theme.of(context)
                                      .colorScheme
                                      .primary
                                      .withOpacity(0.5),
                                  width: 3,
                                )
                              : null,
                          boxShadow: isCompleted
                              ? [
                                  BoxShadow(
                                    color: Theme.of(context)
                                        .colorScheme
                                        .primary
                                        .withOpacity(0.3),
                                    blurRadius: 8,
                                    offset: const Offset(0, 4),
                                  ),
                                ]
                              : null,
                        ),
                        child: Icon(
                          step['icon'] as IconData,
                          color: Colors.white,
                          size: 24,
                        ),
                      ),
                      const SizedBox(height: 8),
                      SizedBox(
                        width: 70,
                        child: Text(
                          step['label'] as String,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: isCompleted
                                ? FontWeight.bold
                                : FontWeight.normal,
                            color: isCompleted
                                ? Colors.grey.shade800
                                : Colors.grey.shade600,
                          ),
                        ),
                      ),
                    ],
                  );
                } else {
                  final prevCompleted =
                      steps[(index - 1) ~/ 2]['completed'] as bool;
                  return Container(
                    width: 40,
                    height: 3,
                    margin: const EdgeInsets.only(bottom: 40),
                    decoration: BoxDecoration(
                      color: prevCompleted
                          ? Theme.of(context).colorScheme.primary
                          : Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  );
                }
              }),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOrderInfo(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.receipt_long_outlined,
                color: Theme.of(context).colorScheme.primary,
                size: 24,
              ),
              const SizedBox(width: 8),
              Text(
                '주문 정보',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey.shade800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildInfoRow(
              '주문번호',
              _formatOrderNumber(
                  _orderData?['order_number'] ?? widget.orderId)),
          _buildInfoRow('수선 항목', _orderData?['item_name'] ?? '수선 항목'),
          _buildInfoRow('주문일시', _formatDateTime(_orderData?['created_at'])),
          Divider(height: 24, color: Colors.grey.shade200),
          // 배송비 내역이 있는 경우 항목별 표시
          if (_orderData?['shipping_fee'] != null) ...[
            _buildInfoRow(
              '수선비',
              _formatPrice(_orderData?['base_price'] ?? ((_orderData?['total_price'] as int? ?? 0) - (_orderData?['shipping_fee'] as int? ?? 0))),
            ),
            _buildInfoRow('왕복배송비', _formatPrice(_orderData?['shipping_fee'])),
          ],
          _buildInfoRow('결제금액', _formatPrice(_orderData?['total_price']),
              isHighlight: true),
          _buildInfoRow(
              '결제방법', _getPaymentMethodDisplay(_orderData?['payment_method'])),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value, {bool isHighlight = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: isHighlight ? 15 : 14,
              color: Colors.grey.shade600,
              fontWeight: isHighlight ? FontWeight.w600 : FontWeight.normal,
            ),
          ),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.right,
              overflow: TextOverflow.ellipsis,
              maxLines: 1,
              style: TextStyle(
                fontSize: isHighlight ? 16 : 14,
                fontWeight: isHighlight ? FontWeight.bold : FontWeight.w500,
                color:
                    isHighlight ? Colors.grey.shade900 : Colors.grey.shade800,
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// 주문번호 포맷팅 (짧게 표시)
  String _formatOrderNumber(dynamic orderNumber) {
    if (orderNumber == null) return '주문번호 없음';
    final str = orderNumber.toString();
    // UUID인 경우 마지막 8자리만 표시
    if (str.length > 20) {
      return '...${str.substring(str.length - 8)}';
    }
    // order_number 필드가 있으면 그대로 사용
    return str;
  }

  /// 날짜 포맷팅
  String _formatDateTime(dynamic dateTime) {
    if (dateTime == null) return '날짜 없음';
    try {
      final dt = DateTime.parse(dateTime.toString());
      return '${dt.year}.${dt.month.toString().padLeft(2, '0')}.${dt.day.toString().padLeft(2, '0')} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (e) {
      return dateTime.toString();
    }
  }

  /// 가격 포맷팅
  String _formatPrice(dynamic price) {
    if (price == null) return '₩0';
    final numPrice = price is num ? price : int.tryParse(price.toString()) ?? 0;
    return '₩${numPrice.toString().replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (Match m) => '${m[1]},',
        )}';
  }

  /// 결제 방법 표시 텍스트
  String _getPaymentMethodDisplay(dynamic paymentMethod) {
    if (paymentMethod == null) return '미결제';

    final method = paymentMethod.toString().toUpperCase();
    switch (method) {
      case 'CARD':
        return '신용카드';
      case 'VIRTUAL_ACCOUNT':
        return '가상계좌';
      case 'TRANSFER':
        return '계좌이체';
      case 'MOBILE':
        return '휴대폰결제';
      case 'BILLING':
        return '정기결제';
      case 'TOSS':
        return '토스페이';
      case 'NAVERPAY':
        return '네이버페이';
      case 'KAKAOPAY':
        return '카카오페이';
      default:
        return paymentMethod.toString();
    }
  }

  /// 주소 포맷팅
  String _formatAddress(dynamic address, dynamic detail) {
    final addr = address?.toString() ?? '';
    final det = detail?.toString();
    if (det != null && det.isNotEmpty && det != '없음') {
      return '$addr $det';
    }
    return addr.isNotEmpty ? addr : '주소 없음';
  }

  /// 고객센터 연결 (카카오톡으로 바로 연결)
  Future<void> _openCustomerService(BuildContext context) async {
    // 주문 정보 포맷팅 및 클립보드에 복사
    final orderInfo = _formatOrderInfoForChat();
    await Clipboard.setData(ClipboardData(text: orderInfo));

    // 카카오톡 채널 URL
    const kakaoChannelId = '_dLhAX';
    final kakaoChannelChatUrl =
        Uri.parse('https://pf.kakao.com/$kakaoChannelId/chat');
    final kakaoAppUrl =
        Uri.parse('kakaoplus://plusfriend/chat/$kakaoChannelId');

    // 바로 카카오톡 앱 열기
    try {
      if (await canLaunchUrl(kakaoAppUrl)) {
        await launchUrl(kakaoAppUrl, mode: LaunchMode.externalApplication);
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('주문 정보가 복사되었습니다. 채팅창에서 붙여넣기 해주세요.'),
              duration: Duration(seconds: 3),
            ),
          );
        }
      } else if (await canLaunchUrl(kakaoChannelChatUrl)) {
        await launchUrl(kakaoChannelChatUrl,
            mode: LaunchMode.externalApplication);
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('주문 정보가 복사되었습니다. 채팅창에서 붙여넣기 해주세요.'),
              duration: Duration(seconds: 3),
            ),
          );
        }
      } else {
        throw Exception('카카오톡을 열 수 없습니다');
      }
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('카카오톡을 열 수 없습니다. 앱이 설치되어 있는지 확인해주세요.'),
          backgroundColor: Colors.red.shade400,
        ),
      );
    }
  }

  /// 주문 정보를 채팅용 텍스트로 포맷팅
  String _formatOrderInfoForChat() {
    final buffer = StringBuffer();
    buffer.writeln('안녕하세요, 모두의수선 고객입니다.');
    buffer.writeln();
    buffer.writeln('📦 문의 주문 정보');
    buffer.writeln('─────────────');

    // 주문번호
    final orderNumber = _orderData?['order_number'] ?? widget.orderId;
    buffer.writeln('주문번호: $orderNumber');

    // 의류/수선 정보
    final clothingType = _orderData?['clothing_type'] ?? '-';
    final repairType = _orderData?['repair_type'] ?? '-';
    buffer.writeln('의류: $clothingType');
    buffer.writeln('수선: $repairType');

    // 상태
    final statusTextMap = {
      'BOOKED': '수거예약',
      'INBOUND': '입고완료',
      'PROCESSING': '수선중',
      'READY_TO_SHIP': '출고완료',
      'DELIVERED': '배송완료',
      'CANCELLED': '취소됨',
    };
    buffer.writeln('상태: ${statusTextMap[_currentStatus] ?? _currentStatus}');

    // 송장번호 (있으면)
    final trackingNo = _shipmentData?['pickup_tracking_no'] ??
        _shipmentData?['delivery_tracking_no'] ??
        _shipmentData?['tracking_no'];
    if (trackingNo != null) {
      buffer.writeln('송장번호: $trackingNo');
    }

    buffer.writeln('─────────────');
    buffer.writeln();
    buffer.writeln('문의 내용:');

    return buffer.toString();
  }

  /// 송장번호 카드 빌더
  /// [showTrackingButton] - 배송추적 버튼 표시 여부 (기본값: true)
  Widget _buildTrackingCard(
    BuildContext context,
    String label,
    String trackingNo,
    IconData icon,
    Color color,
    String description, {
    bool showTrackingButton = true,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: color.withOpacity(0.3),
          width: 1.5,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: color, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey.shade600,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      description,
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.grey.shade500,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: Icon(
                  Icons.copy_rounded,
                  color: color,
                  size: 20,
                ),
                onPressed: () {
                  Clipboard.setData(ClipboardData(text: trackingNo));
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('$label이(가) 복사되었습니다'),
                      backgroundColor: color,
                      behavior: SnackBarBehavior.floating,
                      duration: const Duration(seconds: 2),
                    ),
                  );
                },
              ),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    trackingNo,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      fontFamily: 'monospace',
                      color: Colors.grey.shade800,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
              ],
            ),
          ),
          // 배송추적 버튼 (조건부 표시)
          if (showTrackingButton) ...[
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                icon:
                    Icon(Icons.track_changes_outlined, size: 18, color: color),
                label: const Text('배송추적'),
                onPressed: () => _openTracking(trackingNo),
                style: OutlinedButton.styleFrom(
                  foregroundColor: color,
                  side: BorderSide(color: color),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  /// 배송추적 페이지 열기 (앱 내에서)
  void _openTracking(String trackingNo) async {
    try {
      // 배송추적 페이지로 이동
      if (mounted) {
        context.push('/orders/${widget.orderId}/tracking/$trackingNo');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('배송추적을 열 수 없습니다: $e'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  /// 사진 추가 (사용하지 않음)
  Future<void> _addPhoto() async {
    // 사진 선택 바텀시트
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                margin: const EdgeInsets.only(top: 12, bottom: 20),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 20),
                child: Text(
                  '사진 추가',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(height: 24),
              ListTile(
                leading: Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: const Color(0xFF00C896).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.camera_alt_rounded,
                      color: Color(0xFF00C896)),
                ),
                title: const Text('카메라로 촬영'),
                onTap: () => Navigator.pop(context, ImageSource.camera),
              ),
              ListTile(
                leading: Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: Colors.blue.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.photo_library_rounded,
                      color: Colors.blue),
                ),
                title: const Text('갤러리에서 선택'),
                onTap: () => Navigator.pop(context, ImageSource.gallery),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );

    if (source != null && mounted) {
      try {
        final imageService = ImageService();

        // 로딩 표시
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('이미지를 업로드하는 중...'),
            duration: Duration(seconds: 2),
          ),
        );

        // 실제 이미지 선택 및 업로드
        final imageUrl = await imageService.pickAndUploadImage(
          source: source,
          bucket: 'order-images',
          folder: 'repairs',
        );

        // 사용자가 취소한 경우
        if (imageUrl == null) return;

        setState(() {
          _images.add({
            'url': imageUrl,
            'pinsCount': 0,
            'pins': [],
          });
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('사진이 추가되었습니다 (${_images.length}장)'),
            backgroundColor: const Color(0xFF00C896),
          ),
        );
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('이미지 업로드 실패: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// 사진 삭제
  Future<void> _deletePhoto(int index) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title:
            const Text('사진 삭제', style: TextStyle(fontWeight: FontWeight.bold)),
        content: Text(
          '${index + 1}번 사진을 삭제하시겠습니까?\n핀 정보도 함께 삭제됩니다.',
          style: const TextStyle(height: 1.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('취소', style: TextStyle(color: Colors.grey.shade600)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            child: const Text('삭제'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      setState(() {
        _images.removeAt(index);
      });

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('사진이 삭제되었습니다'),
          backgroundColor: Colors.orange,
        ),
      );
    }
  }

  /// 사진 변경
  Future<void> _changePhoto(int index) async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                margin: const EdgeInsets.only(top: 12, bottom: 20),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Text(
                  '${index + 1}번 사진 변경',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(height: 24),
              ListTile(
                leading: Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: const Color(0xFF00C896).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.camera_alt_rounded,
                      color: Color(0xFF00C896)),
                ),
                title: const Text('카메라로 촬영'),
                onTap: () => Navigator.pop(context, ImageSource.camera),
              ),
              ListTile(
                leading: Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: Colors.blue.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.photo_library_rounded,
                      color: Colors.blue),
                ),
                title: const Text('갤러리에서 선택'),
                onTap: () => Navigator.pop(context, ImageSource.gallery),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );

    if (source != null && mounted) {
      try {
        final imageService = ImageService();

        // 로딩 표시
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('이미지를 업로드하는 중...'),
            duration: Duration(seconds: 2),
          ),
        );

        // 실제 이미지 선택 및 업로드
        final imageUrl = await imageService.pickAndUploadImage(
          source: source,
          bucket: 'order-images',
          folder: 'repairs',
        );

        // 사용자가 취소한 경우
        if (imageUrl == null) return;

        setState(() {
          _images[index] = {
            'url': imageUrl,
            'pinsCount': 0, // 사진 변경 시 핀 초기화
            'pins': [],
          };
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${index + 1}번 사진이 변경되었습니다'),
            backgroundColor: const Color(0xFF00C896),
          ),
        );
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('이미지 업로드 실패: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// 핀 수정 (특정 사진)
  Future<void> _editPins(int index) async {
    final result = await context.push<Map<String, dynamic>>(
      '/image-annotation',
      extra: {
        'imagePath': _images[index]['url'],
        'pins': _images[index]['pins'] ?? [],
        'onComplete': null,
      },
    );

    if (result != null && mounted) {
      setState(() {
        _images[index]['pins'] = result['pins'] ?? [];
        _images[index]['pinsCount'] = (result['pins'] as List?)?.length ?? 0;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
              '${index + 1}번 사진의 핀이 수정되었습니다 (${_images[index]['pinsCount']}개)'),
          backgroundColor: const Color(0xFF00C896),
        ),
      );
    }
  }

  /// 첨부 사진 및 수선 부위 섹션 (읽기 전용)
  Widget _buildEditablePhotosSection(BuildContext context) {
    if (_images.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.image_outlined,
                color: Theme.of(context).colorScheme.primary,
                size: 24,
              ),
              const SizedBox(width: 8),
              Text(
                '첨부 사진 및 수선 부위',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey.shade800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // 사진 목록 (읽기 전용)
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1,
            ),
            itemCount: _images.length,
            itemBuilder: (context, index) {
              final image = _images[index];
              final pins = image['pins'] as List<dynamic>? ?? [];

              return Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey.shade300),
                ),
                child: Stack(
                  children: [
                    // 사진
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.network(
                        image['url'] as String,
                        width: double.infinity,
                        height: double.infinity,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) {
                          return Container(
                            color: Colors.grey.shade200,
                            child: const Center(
                              child: Icon(Icons.image_outlined,
                                  size: 40, color: Colors.grey),
                            ),
                          );
                        },
                      ),
                    ),

                    // 핀 개수 배지
                    if (pins.isNotEmpty)
                      Positioned(
                        top: 8,
                        right: 8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.red.shade600,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.push_pin,
                                size: 12,
                                color: Colors.white,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                '${pins.length}',
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),

                    // 사진 번호
                    Positioned(
                      bottom: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.black.withOpacity(0.7),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          '사진 ${index + 1}',
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),

          // 핀 메모 목록 (아래 위치, 상단 섹션 제거됨)
          if (_images
              .any((img) => (img['pins'] as List?)?.isNotEmpty ?? false)) ...[
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
                  Row(
                    children: [
                      Icon(Icons.push_pin,
                          size: 16, color: Colors.blue.shade700),
                      const SizedBox(width: 6),
                      Text(
                        '수선 부위 메모',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: Colors.blue.shade800,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  ..._images.asMap().entries.expand((entry) {
                    final imageIndex = entry.key;
                    final image = entry.value;
                    final pins = image['pins'] as List<dynamic>? ?? [];

                    return pins.asMap().entries.map((pinEntry) {
                      final pinIndex = pinEntry.key;
                      final pin = pinEntry.value as Map<String, dynamic>;
                      final memo = pin['memo'] as String? ?? '';

                      if (memo.isEmpty) return const SizedBox.shrink();

                      return Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              width: 18,
                              height: 18,
                              decoration: BoxDecoration(
                                color: Colors.red.shade600,
                                shape: BoxShape.circle,
                              ),
                              child: Center(
                                child: Text(
                                  '${pinIndex + 1}',
                                  style: const TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                '$memo (사진 ${imageIndex + 1})',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey.shade800,
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    });
                  }),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  /// 사진 카드 (비활성화)
  Widget _buildPhotoCard(
      BuildContext context, Map<String, dynamic> image, int index) {
    return GestureDetector(
      onTap: () => _editPins(index), // 탭하면 핀 수정
      onLongPress: () => _showPhotoOptions(context, index), // 길게 누르면 메뉴
      child: Container(
        width: 120,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade300),
        ),
        child: Stack(
          children: [
            // 사진
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Image.network(
                image['url'] as String,
                width: 120,
                height: 120,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return Container(
                    color: Colors.grey.shade200,
                    child: const Center(
                      child: Icon(Icons.image_outlined,
                          size: 40, color: Colors.grey),
                    ),
                  );
                },
              ),
            ),

            // 핀 개수 배지
            Positioned(
              top: 8,
              right: 8,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.7),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.push_pin,
                      size: 12,
                      color: Colors.white,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${image['pinsCount']}',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // 순서 번호
            Positioned(
              bottom: 8,
              left: 8,
              child: Container(
                width: 24,
                height: 24,
                decoration: const BoxDecoration(
                  color: Color(0xFF00C896),
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Text(
                    '${index + 1}',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
            ),

            // 삭제 버튼 (X)
            Positioned(
              top: 4,
              left: 4,
              child: InkWell(
                onTap: () => _deletePhoto(index),
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: Colors.red,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.2),
                        blurRadius: 4,
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.close,
                    size: 16,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// 사진 옵션 메뉴
  void _showPhotoOptions(BuildContext context, int index) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                margin: const EdgeInsets.only(top: 12, bottom: 20),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Text(
                  '${index + 1}번 사진',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(height: 24),
              ListTile(
                leading: Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: Colors.orange.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.edit_outlined, color: Colors.orange),
                ),
                title: const Text('핀 수정'),
                subtitle: const Text('수선 부위 표시 수정'),
                onTap: () {
                  Navigator.pop(context);
                  _editPins(index);
                },
              ),
              ListTile(
                leading: Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: Colors.blue.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.photo_library_rounded,
                      color: Colors.blue),
                ),
                title: const Text('사진 변경'),
                subtitle: const Text('다른 사진으로 교체'),
                onTap: () {
                  Navigator.pop(context);
                  _changePhoto(index);
                },
              ),
              ListTile(
                leading: Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.delete_outline, color: Colors.red),
                ),
                title: const Text('사진 삭제'),
                subtitle: const Text('핀 정보도 함께 삭제'),
                onTap: () {
                  Navigator.pop(context);
                  _deletePhoto(index);
                },
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildVideoSection(BuildContext context) {
    // media 테이블에서 조회한 영상 URL 사용
    final hasInboundVideo = _inboundVideoUrl != null;
    final hasOutboundVideo = _outboundVideoUrl != null;
    final hasBothVideos = hasInboundVideo && hasOutboundVideo;

    // 영상이 하나도 없으면 섹션 숨기기
    if (!hasInboundVideo && !hasOutboundVideo) {
      return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.videocam_outlined,
                color: Theme.of(context).colorScheme.primary,
                size: 24,
              ),
              const SizedBox(width: 8),
              Text(
                '입출고 영상',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey.shade800,
                ),
              ),
            ],
          ),

          // 전후 비교 영상 (우선 표시)
          if (hasBothVideos) ...[
            const SizedBox(height: 16),
            _buildComparisonVideoCard(context),
          ],

          // 개별 영상 (전후 비교 영상이 있을 때는 숨기기)
          if (!hasBothVideos) ...[
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child:
                      _buildVideoCard(context, '입고 영상', true, hasInboundVideo),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildVideoCard(
                      context, '출고 영상', false, hasOutboundVideo),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildVideoCard(
      BuildContext context, String title, bool isInbound, bool hasVideo) {
    return InkWell(
      onTap: hasVideo
          ? () {
              // 개별 영상 재생
              final videoUrl = isInbound ? _inboundVideoUrl : _outboundVideoUrl;
              if (videoUrl != null && videoUrl.isNotEmpty) {
                // VideoPlayerDialog 사용 (리소스 누수 방지)
                showDialog(
                  context: context,
                  builder: (context) => _VideoPlayerDialog(
                    title: title,
                    videoUrl: videoUrl,
                  ),
                );
              }
            }
          : null,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        height: 140,
        decoration: BoxDecoration(
          color: hasVideo
              ? Theme.of(context).colorScheme.primary.withOpacity(0.05)
              : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: hasVideo
                ? Theme.of(context).colorScheme.primary.withOpacity(0.2)
                : Colors.grey.shade300,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: hasVideo
                    ? Theme.of(context).colorScheme.primary
                    : Colors.grey.shade400,
                shape: BoxShape.circle,
              ),
              child: Icon(
                hasVideo ? Icons.play_arrow_rounded : Icons.schedule,
                size: 32,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              title,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: hasVideo ? Colors.grey.shade800 : Colors.grey.shade600,
              ),
            ),
            if (!hasVideo) ...[
              const SizedBox(height: 4),
              Text(
                '준비 중',
                style: TextStyle(
                  fontSize: 11,
                  color: Colors.grey.shade500,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildComparisonVideoCard(BuildContext context) {
    final hasBoth = _inboundVideoUrl != null && _outboundVideoUrl != null;
    final hasMultipleItems = _videoItems.length > 1;

    return InkWell(
      onTap: hasBoth
          ? () {
              if (hasMultipleItems) {
                // 여러 아이템: 순차 재생
                debugPrint('🎬 ${_videoItems.length}개 아이템 순차 재생');
                context.push(
                  '/comparison-video',
                  extra: {
                    'videoItems': _videoItems,
                  },
                );
              } else {
                // 단일 아이템: 기존 방식
                debugPrint('🎬 단일 아이템 재생');
                context.push(
                  '/comparison-video',
                  extra: {
                    'inboundUrl': _inboundVideoUrl,
                    'outboundUrl': _outboundVideoUrl,
                  },
                );
              }
            }
          : null,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: hasBoth
              ? LinearGradient(
                  colors: [
                    Theme.of(context).colorScheme.primary.withOpacity(0.1),
                    Theme.of(context).colorScheme.primary.withOpacity(0.05),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                )
              : null,
          color: hasBoth ? null : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: hasBoth
                ? Theme.of(context).colorScheme.primary.withOpacity(0.3)
                : Colors.grey.shade300,
            width: 2,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: hasBoth
                    ? Theme.of(context).colorScheme.primary
                    : Colors.grey.shade400,
                shape: BoxShape.circle,
              ),
              child: Icon(
                hasBoth ? Icons.compare_arrows_outlined : Icons.schedule,
                size: 36,
                color: Colors.white,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '전후 비교 영상',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color:
                          hasBoth ? Colors.grey.shade900 : Colors.grey.shade600,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    hasBoth ? '좌우 나란히 재생됩니다' : '입고/출고 영상 준비 중',
                    style: TextStyle(
                      fontSize: 13,
                      color:
                          hasBoth ? Colors.grey.shade600 : Colors.grey.shade500,
                    ),
                  ),
                  if (hasBoth) ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.primary,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Text(
                        '재생하기',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            Icon(
              Icons.arrow_forward_ios,
              size: 20,
              color: hasBoth
                  ? Theme.of(context).colorScheme.primary
                  : Colors.grey.shade400,
            ),
          ],
        ),
      ),
    );
  }

  /// 🚚 배송/수거 완료 자동 체크
  /// - BOOKED 상태: 수거 송장으로 추적 → 수거 완료 시 INBOUND로 변경
  /// - READY_TO_SHIP 상태: 배송 송장으로 추적 → 배송 완료 시 DELIVERED로 변경
  Future<void> _checkDeliveryCompletion(String currentStatus) async {
    try {
      // 상태에 따라 적절한 송장번호 선택
      String? trackingNo;
      String trackingType;

      if (currentStatus == 'BOOKED') {
        // 수거 중: 수거 송장번호 사용
        trackingNo = _shipmentData?['pickup_tracking_no']?.toString();
        trackingType = '수거';
      } else {
        // 배송 중: 배송 송장번호 사용
        trackingNo = _shipmentData?['delivery_tracking_no']?.toString();
        trackingType = '배송';
      }

      if (trackingNo == null || trackingNo.isEmpty) {
        debugPrint('⚠️ $trackingType 추적 체크: 송장번호 없음');
        return;
      }

      debugPrint('🚚 $trackingType 완료 자동 체크 시작: $trackingNo');

      // 배송 추적 API 호출 (이 API에서 완료 감지 시 자동으로 DB 업데이트)
      final trackingData = await _orderService.trackShipment(trackingNo);

      // 완료 감지되었는지 확인 (successResponse 래핑 처리)
      final inner =
          trackingData['data'] as Map<String, dynamic>? ?? trackingData;
      final epost = inner['epost'] as Map<String, dynamic>?;
      final treatStusCd = epost?['treatStusCd'] as String?;

      if (treatStusCd == '05') {
        debugPrint('✅ $trackingType 완료 감지됨! 상태 업데이트 완료');

        // 주문 데이터 새로고침 (상태 변경 반영)
        if (mounted) {
          await _loadOrderData(showLoading: false);

          // 상태에 따른 알림 메시지
          final message = currentStatus == 'BOOKED'
              ? '📦 수거가 완료되어 입고되었습니다!'
              : '🎉 배송이 완료되었습니다!';

          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(message),
              backgroundColor: const Color(0xFF00C896),
              duration: const Duration(seconds: 3),
            ),
          );
        }
      } else {
        debugPrint(
            '📦 $trackingType 상태: ${epost?['treatStusNm'] ?? '확인 중'} (코드: $treatStusCd)');
      }
    } catch (e) {
      debugPrint('⚠️ 추적 체크 실패 (무시): $e');
      // 실패해도 무시 - 사용자 경험에 영향 없음
    }
  }

  /// 수거 송장의 treatStusCd 조회 (취소 버튼 노출 여부 판단용)
  /// 00/01/02: 수거준비 → 취소 가능, 03/04/05: 접수/발송/도착 → 문의하기만
  Future<void> _fetchPickupTreatStusCd(Map<String, dynamic> shipment) async {
    try {
      final pickupNo =
          shipment['pickup_tracking_no'] ?? shipment['tracking_no'];
      if (pickupNo == null || pickupNo.toString().isEmpty) return;

      final trackingData =
          await _orderService.trackShipment(pickupNo.toString());
      // successResponse 래핑: data.data 또는 data에 epost 있을 수 있음
      final inner =
          trackingData['data'] as Map<String, dynamic>? ?? trackingData;
      final epost = inner['epost'] as Map<String, dynamic>?;
      final code = epost?['treatStusCd'] as String?;

      if (mounted) {
        setState(() => _pickupTreatStusCd = code);
        debugPrint('📦 수거 treatStusCd: $code (00~02=취소가능, 03~05=문의하기)');
      }
    } catch (e) {
      debugPrint('⚠️ 수거 treatStusCd 조회 실패: $e');
      if (mounted) {
        setState(() => _pickupTreatStusCd = null);
      }
    }
  }

  /// 수거 취소 가능 여부 판단
  /// - BOOKED 상태에서는 기본적으로 취소 가능
  /// - 배송추적 결과가 03(집하완료) 이상이면 취소 불가능 → 문의하기만
  /// - 조회 전/실패 시에도 취소 가능 (우체국 API에서 최종 검증)
  bool get _isPickupCancellable {
    // 배송추적 조회 전이거나 실패한 경우 → 취소 가능 (우체국 API에서 최종 검증)
    if (_pickupTreatStusCd == null) return true;

    // 03(집하완료), 04(배송중), 05(배송완료) → 취소 불가능
    if (_pickupTreatStusCd == '03' ||
        _pickupTreatStusCd == '04' ||
        _pickupTreatStusCd == '05') {
      return false;
    }

    // 00(신청준비), 01(소포신청), 02(운송장출력) → 취소 가능
    return true;
  }

  Future<void> _loadVideoUrls() async {
    try {
      debugPrint('🔍 shipmentData: ${_shipmentData?.keys.toList()}');
      debugPrint(
          '🔍 pickup_tracking_no: ${_shipmentData?['pickup_tracking_no']}');
      debugPrint(
          '🔍 delivery_tracking_no: ${_shipmentData?['delivery_tracking_no']}');

      // 모든 가능한 송장번호로 조회 (유연한 매칭)
      final candidates = [
        _shipmentData?['pickup_tracking_no'], // 수거 송장 (입고 영상용)
        _shipmentData?['delivery_tracking_no'], // 출고 송장 (출고 영상용)
        _shipmentData?['tracking_no'], // 기본 송장
        _shipmentData?['outbound_tracking_no'], // 호환성
        _orderData?['id'], // orderId (폴백)
      ]
          .where((v) => v != null && (v is String) && v.isNotEmpty)
          .toSet()
          .toList(); // 중복 제거

      if (candidates.isEmpty) {
        debugPrint('❌ final_waybill_no 후보가 없습니다');
        return;
      }

      debugPrint('🔍 영상 조회 시도 (${candidates.length}개 후보): $candidates');

      final supabase = Supabase.instance.client;
      final videos = await supabase
          .from('media')
          .select('type, path, provider, final_waybill_no, sequence')
          .inFilter('final_waybill_no', candidates)
          .inFilter('type', ['inbound_video', 'outbound_video']).order(
              'sequence',
              ascending: true); // sequence 순서대로

      debugPrint('📹 조회된 영상: ${videos.length}개');
      if (videos.isNotEmpty) {
        debugPrint(
            '📹 영상 상세: ${videos.map((v) => '${v['type']}#${v['sequence']}(${v['final_waybill_no']})').join(', ')}');
      }

      // sequence별로 영상 그룹화
      final Map<int, Map<String, String>> videosBySequence = {};
      String? firstInboundUrl;
      String? firstOutboundUrl;

      for (final video in videos) {
        final type = video['type'] as String?;
        final path = video['path'] as String? ?? '';
        final provider = video['provider'] as String? ?? '';
        final sequence = video['sequence'] as int? ?? 1;

        String? url;
        if (path.startsWith('http')) {
          url = path;
        } else if (provider == 'cloudflare' && path.isNotEmpty) {
          // Cloudflare Stream HLS URL
          url = 'https://videodelivery.net/$path/manifest/video.m3u8';
        }

        if (url != null) {
          // sequence별로 저장
          videosBySequence[sequence] ??= {};

          if (type == 'inbound_video') {
            videosBySequence[sequence]!['inbound'] = url;
            firstInboundUrl ??= url; // 첫 번째 입고 영상
          } else if (type == 'outbound_video') {
            videosBySequence[sequence]!['outbound'] = url;
            firstOutboundUrl ??= url; // 첫 번째 출고 영상
          }
        }
      }

      // 모든 아이템의 영상 쌍을 리스트로 변환
      final videoItems = <Map<String, String>>[];
      final sortedSequences = videosBySequence.keys.toList()..sort();

      for (final seq in sortedSequences) {
        final inbound = videosBySequence[seq]!['inbound'];
        final outbound = videosBySequence[seq]!['outbound'];

        // 입고/출고 둘 다 있는 경우만 추가
        if (inbound != null && outbound != null) {
          videoItems.add({
            'inbound': inbound,
            'outbound': outbound,
          });
        }
      }

      debugPrint('🎬 완성된 영상 쌍: ${videoItems.length}개');

      if (mounted) {
        setState(() {
          _inboundVideoUrl = firstInboundUrl;
          _outboundVideoUrl = firstOutboundUrl;
          _videoItems = videoItems;
        });
      }
    } catch (e) {
      debugPrint('입고/출고 영상 조회 실패: $e');
    }
  }

  Widget _buildShippingInfo(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.local_shipping_outlined,
                color: Theme.of(context).colorScheme.primary,
                size: 24,
              ),
              const SizedBox(width: 8),
              Text(
                '배송 정보',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey.shade800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // 송장번호 카드 (2개)
          // 입고 완료(INBOUND), 수선중(PROCESSING) 상태에서는 배송추적 버튼 숨김
          // 1. 회수 송장번호 - 입고 완료 후에는 배송추적 불필요
          if (_shipmentData?['pickup_tracking_no'] != null)
            _buildTrackingCard(
              context,
              '회수 송장번호',
              _shipmentData!['pickup_tracking_no'] as String,
              Icons.local_shipping_outlined,
              Colors.blue,
              '수거 시 사용',
              showTrackingButton: _currentStatus == 'BOOKED',
            ),
          if (_shipmentData?['pickup_tracking_no'] != null)
            const SizedBox(height: 12),

          // 2. 발송 송장번호 - 출고 완료(READY_TO_SHIP) 이후에만 배송추적 표시
          if (_shipmentData?['delivery_tracking_no'] != null)
            _buildTrackingCard(
              context,
              '발송 송장번호',
              _shipmentData!['delivery_tracking_no'] as String,
              Icons.send_outlined,
              const Color(0xFF00C896),
              '배송 시 사용',
              showTrackingButton:
                  _currentStatus == 'READY_TO_SHIP' ||
                  _currentStatus == 'DELIVERED',
            ),
          if (_shipmentData?['delivery_tracking_no'] != null)
            const SizedBox(height: 12),

          // 송장번호가 없을 때 안내
          if ((_shipmentData?['pickup_tracking_no'] == null) &&
              (_shipmentData?['delivery_tracking_no'] == null))
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.grey.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline,
                      color: Colors.grey.shade600, size: 20),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      '송장번호가 아직 발급되지 않았습니다.',
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey.shade600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 16),

          _buildInfoRow('택배사',
              _shipmentData?['carrier'] == 'EPOST' ? '우체국 택배' : '우체국 택배'),
          _buildInfoRow(
            '수거지',
            _formatAddress(
              _orderData?['pickup_address'],
              _orderData?['pickup_address_detail'],
            ),
          ),
          _buildDeliveryAddressRow(context),
          if (_orderData?['notes'] != null &&
              (_orderData!['notes'] as String).isNotEmpty) ...[
            const SizedBox(height: 8),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: 80,
                  child: Text(
                    '배송 메모',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey.shade500,
                    ),
                  ),
                ),
                Expanded(
                  child: Text(
                    _orderData!['notes'] as String,
                    style: const TextStyle(fontSize: 14),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildDeliveryAddressRow(BuildContext context) {
    final addr = _formatAddress(
      _orderData?['delivery_address'],
      _orderData?['delivery_address_detail'],
    );
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(
              '배송지',
              style: TextStyle(fontSize: 14, color: Colors.grey.shade500),
            ),
          ),
          Expanded(
            child: Text(addr, style: const TextStyle(fontSize: 14)),
          ),
          if (_canEditDelivery)
            GestureDetector(
              onTap: () => _showDeliveryEditSheet(context),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF00C896).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.edit_outlined, size: 13, color: Color(0xFF00C896)),
                    SizedBox(width: 4),
                    Text(
                      '수정',
                      style: TextStyle(
                        fontSize: 12,
                        color: Color(0xFF00C896),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildBottomBar(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, -5),
          ),
        ],
      ),
      child: SafeArea(
        child: _currentStatus == 'CANCELLED'
            ? _buildCancelledButtons(context)
            : _currentStatus == 'BOOKED'
                ? (_isPickupCancellable
                    ? _buildBookedButtons(context)
                    : _buildDefaultButtons(context))
                : (_currentStatus == 'PICKED_UP' || _currentStatus == 'INBOUND')
                    ? _buildPostPickupCancelButtons(context)
                    : _buildDefaultButtons(context),
      ),
    );
  }

  /// BOOKED 상태일 때 버튼 (수거 취소 가능)
  Widget _buildBookedButtons(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            icon: _isCancelling
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.red),
                  )
                : const Icon(Icons.cancel_outlined, size: 20),
            label: Text(_isCancelling ? '취소 중...' : '수거 취소'),
            onPressed: _isCancelling ? null : () => _showCancelDialog(context),
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.red,
              side: const BorderSide(color: Colors.red),
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: ElevatedButton.icon(
            icon: const Icon(Icons.headset_mic_outlined, size: 20),
            label: const Text('문의하기'),
            onPressed: () => _openCustomerService(context),
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              elevation: 0,
            ),
          ),
        ),
      ],
    );
  }

  /// 수거완료(PICKED_UP) / 입고완료(INBOUND) 상태 버튼.
  /// 의류가 이미 우리 손에 있으므로 우체국 수거 취소가 아니라
  /// "주문 취소 → 부분환불 + 반송 워크플로우" 로 처리한다.
  Widget _buildPostPickupCancelButtons(BuildContext context) {
    final returnFee =
        ShippingSettingsService().current.returnShippingFee;
    final remoteAreaFee =
        (_orderData?['remote_area_fee'] as num?)?.toInt() ?? 0;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                icon: _isCancelling
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.red),
                      )
                    : const Icon(Icons.cancel_outlined, size: 20),
                label: Text(_isCancelling ? '취소 중...' : '주문 취소'),
                onPressed: _isCancelling
                    ? null
                    : () => _showPostPickupCancelDialog(context),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.red,
                  side: const BorderSide(color: Colors.red),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: ElevatedButton.icon(
                icon: const Icon(Icons.headset_mic_outlined, size: 20),
                label: const Text('문의하기'),
                onPressed: () => _openCustomerService(context),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  elevation: 0,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: Text(
            remoteAreaFee > 0
                ? '입고된 상태에서 취소 시 왕복 배송비 ${_formatPrice(returnFee)}원 + 도서산간 ${_formatPrice(remoteAreaFee)}원이 차감되고 나머지 금액이 환불됩니다.'
                : '입고된 상태에서 취소 시 왕복 배송비 ${_formatPrice(returnFee)}원이 차감되고 나머지 금액이 환불됩니다.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 11,
              color: Colors.grey.shade500,
              height: 1.4,
            ),
          ),
        ),
      ],
    );
  }

  /// 취소된 상태일 때 버튼
  Widget _buildCancelledButtons(BuildContext context) {
    final canceledYn = _cancelInfo?['canceledYn'] as String?;

    // 우체국 API 응답에 따른 버튼 텍스트
    // canceledYn 값:
    // - 'Y': 우체국 전산에도 취소 반영됨 ✅ (실제 취소 성공)
    // - 'N': 우체국 전산 취소 실패 (이미 집하되었거나 취소 불가능)
    // - 'D': 우체국 전산에서 삭제됨
    // - null/빈값: 우체국 API 응답 없음 (비정상 상황 - 발생하지 않아야 함)
    String buttonText = '수거 취소됨';
    Color buttonColor = Colors.grey.shade600;
    IconData buttonIcon = Icons.cancel_outlined;

    if (canceledYn == 'Y') {
      // 우체국 전산에도 취소 반영됨 - 실제 취소 성공
      buttonText = '수거 취소됨';
      buttonColor = Colors.grey.shade600;
      buttonIcon = Icons.check_circle_outline;
    } else if (canceledYn == 'N') {
      // 우체국 전산 취소 실패 (이미 집하되었거나 취소 불가능)
      buttonText = '수거 취소됨 (우체국 전산 실패)';
      buttonColor = Colors.orange.shade700;
      buttonIcon = Icons.warning_amber_rounded;
    } else if (canceledYn == 'D') {
      // 우체국 전산에서 삭제됨
      buttonText = '수거 취소됨';
      buttonColor = Colors.grey.shade600;
      buttonIcon = Icons.delete_outline;
    } else {
      // 우체국 API 응답 없음 (비정상 상황)
      // 이 경우는 발생하지 않아야 하지만, 혹시 발생하면 DB만 취소된 상태
      buttonText = '수거 취소됨';
      buttonColor = Colors.grey.shade600;
      buttonIcon = Icons.cancel_outlined;
    }

    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            icon: Icon(buttonIcon, size: 20, color: buttonColor),
            label: Text(
              buttonText,
              style: TextStyle(color: buttonColor),
            ),
            onPressed: null, // 비활성화
            style: OutlinedButton.styleFrom(
              foregroundColor: buttonColor,
              side: BorderSide(color: buttonColor),
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: ElevatedButton.icon(
            icon: const Icon(Icons.headset_mic_outlined, size: 20),
            label: const Text('문의하기'),
            onPressed: () => _openCustomerService(context),
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              elevation: 0,
            ),
          ),
        ),
      ],
    );
  }

  /// 기본 버튼 (문의하기 + 배송 추적)
  /// 입고 완료(INBOUND), 수선중(PROCESSING) 상태에서는 배송추적 버튼 숨김
  Widget _buildDefaultButtons(BuildContext context) {
    // 입고 완료 ~ 출고 전 상태에서는 배송추적이 필요 없음
    final hideTrackingButton =
        _currentStatus == 'INBOUND' || _currentStatus == 'PROCESSING';

    if (hideTrackingButton) {
      // 문의하기 버튼만 표시 (전체 너비)
      return SizedBox(
        width: double.infinity,
        child: ElevatedButton.icon(
          icon: const Icon(Icons.headset_mic_outlined, size: 20),
          label: const Text('문의하기'),
          onPressed: () => _openCustomerService(context),
          style: ElevatedButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            elevation: 0,
          ),
        ),
      );
    }

    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            icon: const Icon(Icons.headset_mic_outlined, size: 20),
            label: const Text('문의하기'),
            onPressed: () => _openCustomerService(context),
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: ElevatedButton.icon(
            icon: const Icon(Icons.gps_fixed, size: 20),
            label: const Text('배송 추적'),
            onPressed: () {
              final trackingNo = _shipmentData?['pickup_tracking_no'] ??
                  _shipmentData?['delivery_tracking_no'] ??
                  _shipmentData?['tracking_no'];
              if (trackingNo != null) {
                _openTracking(trackingNo.toString());
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('송장번호가 없습니다'),
                    backgroundColor: Colors.orange,
                  ),
                );
              }
            },
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              elevation: 0,
            ),
          ),
        ),
      ],
    );
  }

  /// 출고완료 전까지만 배송지 수정 가능
  bool get _canEditDelivery =>
      !['READY_TO_SHIP', 'DELIVERED', 'CANCELLED'].contains(_currentStatus);

  /// 배송지/메모 수정 바텀시트
  Future<void> _showDeliveryEditSheet(BuildContext context) async {
    final zipcode = _orderData?['delivery_zipcode'] as String? ?? '';
    final address = _orderData?['delivery_address'] as String? ?? '';
    final addressDetail = _orderData?['delivery_address_detail'] as String? ?? '';
    final notes = _orderData?['notes'] as String? ?? '';

    final zipcodeController = TextEditingController(text: zipcode);
    final addressController = TextEditingController(text: address);
    final detailController = TextEditingController(text: addressDetail);
    final notesController = TextEditingController(text: notes);
    final detailFocus = FocusNode();

    Future<void> searchAddress(StateSetter setModalState) async {
      final result = await showDialog<Map<String, String>>(
        context: context,
        builder: (context) => Dialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
          child: const DaumPostcodeWidget(),
        ),
      );
      if (result != null) {
        setModalState(() {
          zipcodeController.text = result['zonecode'] ?? '';
          addressController.text = result['address'] ?? '';
        });
        await Future.delayed(const Duration(milliseconds: 300));
        if (context.mounted) detailFocus.requestFocus();
      }
    }

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(context).viewInsets.bottom + 20,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 헤더
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      '배송지 수정',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // 배송 주소
                const Text(
                  '배송 주소',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.grey),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        decoration: BoxDecoration(
                          color: Colors.grey.shade50,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.grey.shade200),
                        ),
                        child: Text(
                          addressController.text.isEmpty
                              ? '주소를 검색해주세요'
                              : '${zipcodeController.text.isNotEmpty ? '[${zipcodeController.text}] ' : ''}${addressController.text}',
                          style: TextStyle(
                            fontSize: 14,
                            color: addressController.text.isEmpty
                                ? Colors.grey.shade400
                                : Colors.grey.shade800,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton.icon(
                      icon: const Icon(Icons.search, size: 18),
                      label: const Text('검색'),
                      onPressed: () => searchAddress(setModalState),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 0,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // 상세 주소
                const Text(
                  '상세 주소',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.grey),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: detailController,
                  focusNode: detailFocus,
                  decoration: InputDecoration(
                    hintText: '동, 호수 등 상세주소 입력',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: Colors.grey.shade200),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: Colors.grey.shade200),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Color(0xFF00C896)),
                    ),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  ),
                ),
                const SizedBox(height: 12),

                // 배송 메모
                const Text(
                  '배송 메모',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.grey),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: notesController,
                  maxLines: 3,
                  decoration: InputDecoration(
                    hintText: '배송 시 요청사항 (예: 문 앞에 놓아주세요)',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: Colors.grey.shade200),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: Colors.grey.shade200),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Color(0xFF00C896)),
                    ),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  ),
                ),
                const SizedBox(height: 20),

                // 저장 버튼
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _isSavingDelivery
                        ? null
                        : () async {
                            if (addressController.text.trim().isEmpty) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('배송 주소를 입력해주세요.'),
                                  backgroundColor: Colors.red,
                                ),
                              );
                              return;
                            }
                            Navigator.of(context).pop();
                            await _saveDeliveryInfo(
                              zipcode: zipcodeController.text.trim(),
                              address: addressController.text.trim(),
                              addressDetail: detailController.text.trim(),
                              notes: notesController.text.trim(),
                            );
                          },
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 0,
                    ),
                    child: const Text('저장하기', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );

    zipcodeController.dispose();
    addressController.dispose();
    detailController.dispose();
    notesController.dispose();
    detailFocus.dispose();
  }

  /// 배송지 정보 Supabase 저장
  Future<void> _saveDeliveryInfo({
    required String zipcode,
    required String address,
    required String addressDetail,
    required String notes,
  }) async {
    if (!mounted) return;
    setState(() => _isSavingDelivery = true);
    try {
      final supabase = Supabase.instance.client;
      await supabase.from('orders').update({
        'delivery_address': address,
        'delivery_address_detail': addressDetail.isEmpty ? null : addressDetail,
        'delivery_zipcode': zipcode.isEmpty ? null : zipcode,
        'notes': notes.isEmpty ? null : notes,
        'delivery_address_updated_at': DateTime.now().toUtc().toIso8601String(),
      }).eq('id', widget.orderId);

      if (mounted) {
        setState(() {
          _orderData = {
            ..._orderData ?? {},
            'delivery_address': address,
            'delivery_address_detail': addressDetail.isEmpty ? null : addressDetail,
            'delivery_zipcode': zipcode.isEmpty ? null : zipcode,
            'notes': notes.isEmpty ? null : notes,
          };
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('배송지가 수정되었습니다.'),
            backgroundColor: Color(0xFF00C896),
            duration: Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('저장 중 오류가 발생했습니다. 다시 시도해주세요.'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSavingDelivery = false);
    }
  }

  /// 수거 취소 확인 다이얼로그
  void _showCancelDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: const Text(
          '수거 취소',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        content: const Text(
          '수거 예약을 취소하시겠습니까?\n취소 후에는 다시 예약하셔야 합니다.',
          style: TextStyle(height: 1.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text(
              '닫기',
              style: TextStyle(color: Colors.grey.shade600),
            ),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop();
              _handleCancelOrder(context);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: const Text('취소하기'),
          ),
        ],
      ),
    );
  }

  /// 입고 후(PICKED_UP / INBOUND) 취소 확인 다이얼로그.
  /// 왕복 배송비가 차감되고 부분환불 + 의류 반송이 진행됨을 명확히 안내.
  Future<void> _showPostPickupCancelDialog(BuildContext context) async {
    // 배송비 설정은 캐시값 우선 표시하고 백그라운드로 갱신.
    final settings = ShippingSettingsService().current;
    // 백그라운드 새로고침 (다이얼로그 안 데이터가 약간 오래된 경우 대비)
    unawaited(ShippingSettingsService().get());

    final returnFee = settings.returnShippingFee;
    final totalPrice = (_orderData?['total_price'] as num?)?.toInt() ?? 0;
    // 도서산간 차감액: orders.remote_area_fee 컬럼은 결제 시 이미 왕복(편도×2)으로
    // 저장된 값이므로 별도 ×2 없이 그대로 더한다.
    // (저장 위치: web/lib/order-pricing.ts, edge/orders-quote/index.ts 에서 ×2 처리)
    final remoteAreaFee = (_orderData?['remote_area_fee'] as num?)?.toInt() ?? 0;
    final totalDeduction = returnFee + (remoteAreaFee > 0 ? remoteAreaFee : 0);
    final refundAmount = (totalPrice - totalDeduction).clamp(0, totalPrice);
    final paymentStatus = _orderData?['payment_status'] as String?;
    final isPaid = paymentStatus == 'PAID' ||
        paymentStatus == 'COMPLETED' ||
        paymentStatus == 'DONE';

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: const Text(
          '주문 취소 / 반송',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              '의류가 이미 입고된 상태입니다. 취소를 진행하면 의류는 반송되고 일부 금액만 환불됩니다.',
              style: TextStyle(height: 1.5),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Column(
                children: [
                  if (isPaid) ...[
                    _buildCancelInfoRow(
                      '결제 금액',
                      '${_formatPrice(totalPrice)}원',
                    ),
                    const SizedBox(height: 6),
                  ],
                  _buildCancelInfoRow(
                    '왕복 배송비 차감',
                    '- ${_formatPrice(returnFee)}원',
                    valueColor: Colors.red.shade600,
                  ),
                  if (remoteAreaFee > 0) ...[
                    const SizedBox(height: 6),
                    _buildCancelInfoRow(
                      '🏝 도서산간 배송비 차감 (왕복)',
                      '- ${_formatPrice(remoteAreaFee)}원',
                      valueColor: Colors.orange.shade700,
                    ),
                  ],
                  if (isPaid) ...[
                    const Divider(height: 16),
                    _buildCancelInfoRow(
                      '환불 금액',
                      '${_formatPrice(refundAmount)}원',
                      isHighlight: true,
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 12),
            Text(
              '의류는 등록하신 배송 주소로 반송됩니다.',
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey.shade600,
                height: 1.4,
              ),
            ),
            if (remoteAreaFee > 0) ...[
              const SizedBox(height: 4),
              Text(
                '도서산간 배송비는 편도 단가 × 2 (왕복) 기준입니다.',
                style: TextStyle(
                  fontSize: 11,
                  color: Colors.orange.shade700,
                  height: 1.4,
                ),
              ),
            ],
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(
              '닫기',
              style: TextStyle(color: Colors.grey.shade600),
            ),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: const Text('취소하고 반송'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      await _handlePostPickupCancel(context);
    }
  }

  Widget _buildCancelInfoRow(
    String label,
    String value, {
    Color? valueColor,
    bool isHighlight = false,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: isHighlight ? 14 : 13,
            color: isHighlight ? Colors.black87 : Colors.grey.shade700,
            fontWeight: isHighlight ? FontWeight.bold : FontWeight.normal,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: isHighlight ? 15 : 13,
            color: valueColor ??
                (isHighlight ? const Color(0xFF00C896) : Colors.black87),
            fontWeight: isHighlight ? FontWeight.bold : FontWeight.w600,
          ),
        ),
      ],
    );
  }

  /// 입고 후 취소 처리 (orders-cancel Edge Function 호출).
  Future<void> _handlePostPickupCancel(BuildContext context) async {
    try {
      if (!mounted) return;
      setState(() => _isCancelling = true);

      final result = await _orderService.cancelOrder(
        widget.orderId,
        reason: '고객 요청 - 입고 후 취소',
      );

      if (!mounted) return;

      final message = result['message'] as String? ?? '취소가 처리되었습니다';
      final refundProcessed = result['refundProcessed'] == true;
      final refundError = result['refundError'] as String?;

      Color messageColor = Colors.green;
      if (refundError != null && refundError.isNotEmpty && !refundProcessed) {
        messageColor = Colors.orange;
      }

      try {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(message),
            backgroundColor: messageColor,
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 6),
            action: SnackBarAction(
              label: '확인',
              textColor: Colors.white,
              onPressed: () {},
            ),
          ),
        );
      } catch (snackError) {
        debugPrint('⚠️ ScaffoldMessenger 접근 실패: $snackError');
      }

      // 취소 성공 시 상태 즉시 업데이트 (서버 새로고침 전 빠른 반영)
      if (mounted) {
        setState(() {
          if (refundProcessed || refundError == null) {
            _currentStatus = 'RETURN_PENDING';
          }
          _isCancelling = false;
        });
      }

      try {
        await _loadOrderData(showLoading: false);
      } catch (e) {
        debugPrint('⚠️ 주문 데이터 새로고침 실패: $e');
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isCancelling = false);
      }
      if (!mounted) return;

      try {
        final errorMessage = e.toString().replaceAll('Exception: ', '');
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('주문 취소 실패: $errorMessage'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 5),
            action: SnackBarAction(
              label: '확인',
              textColor: Colors.white,
              onPressed: () {},
            ),
          ),
        );
      } catch (snackError) {
        debugPrint('⚠️ ScaffoldMessenger 접근 실패 (에러 표시 중): $snackError');
      }
    }
  }

  /// 주문 취소 처리 (다이얼로그 없이 버튼 상태로 표시)
  Future<void> _handleCancelOrder(BuildContext context) async {
    try {
      // 취소 중 상태 표시
      if (!mounted) return;
      setState(() {
        _isCancelling = true;
      });

      // 실제 API 호출하여 수거 취소
      final result = await _orderService.cancelShipment(widget.orderId);

      if (!mounted) return;

      // 성공 메시지
      final message = result['message'] as String? ?? '수거 예약이 취소되었습니다';
      final epostResult = result['epost_result'] as Map<String, dynamic>?;
      final canceledYn = epostResult?['canceledYn'] as String?;
      final cancelDate = epostResult?['cancelDate'] as String?;

      String detailMessage = message;
      Color messageColor = Colors.orange;

      if (canceledYn == 'Y') {
        detailMessage += '\n✅ 우체국 전산에도 취소되었습니다.';
        if (cancelDate != null && cancelDate.isNotEmpty) {
          // cancelDate 형식: YYYYMMDDHHmmss -> YYYY.MM.DD HH:mm 형식으로 변환
          try {
            final year = cancelDate.substring(0, 4);
            final month = cancelDate.substring(4, 6);
            final day = cancelDate.substring(6, 8);
            final hour = cancelDate.substring(8, 10);
            final minute = cancelDate.substring(10, 12);
            detailMessage += '\n취소 일시: $year.$month.$day $hour:$minute';
          } catch (e) {
            detailMessage += '\n취소 일시: $cancelDate';
          }
        }
        messageColor = Colors.green;
      } else if (canceledYn == 'N') {
        final notCancelReason = epostResult?['notCancelReason'] as String?;
        detailMessage += '\n⚠️ 우체국 전산 취소는 실패했습니다.';
        if (notCancelReason != null && notCancelReason.isNotEmpty) {
          detailMessage += '\n사유: $notCancelReason';
        }
        messageColor = Colors.orange;
      } else if (canceledYn == 'D') {
        detailMessage += '\n🗑️ 우체국 전산에서 삭제되었습니다.';
        if (cancelDate != null && cancelDate.isNotEmpty) {
          try {
            final year = cancelDate.substring(0, 4);
            final month = cancelDate.substring(4, 6);
            final day = cancelDate.substring(6, 8);
            final hour = cancelDate.substring(8, 10);
            final minute = cancelDate.substring(10, 12);
            detailMessage += '\n취소 일시: $year.$month.$day $hour:$minute';
          } catch (e) {
            detailMessage += '\n취소 일시: $cancelDate';
          }
        }
        messageColor = Colors.blue;
      }

      // 성공 메시지 표시 (안전하게)
      if (mounted) {
        try {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(detailMessage),
              backgroundColor: messageColor,
              behavior: SnackBarBehavior.floating,
              duration: const Duration(seconds: 5),
              action: SnackBarAction(
                label: '확인',
                textColor: Colors.white,
                onPressed: () {},
              ),
            ),
          );
        } catch (snackError) {
          debugPrint('⚠️ ScaffoldMessenger 접근 실패 (이미 dispose됨): $snackError');
        }
      }

      // 우체국 API 취소 응답 정보 저장 및 상태 업데이트
      if (mounted) {
        setState(() {
          _cancelInfo = {
            'canceledYn': canceledYn,
            'cancelDate': cancelDate,
            'notCancelReason': epostResult?['notCancelReason'],
            'cancelRegiNo': epostResult?['cancelRegiNo'],
          };

          // 우체국 API 응답이 있을 때만 취소 상태로 표시
          if (canceledYn != null && canceledYn != '') {
            _currentStatus = 'CANCELLED';
          } else {
            _currentStatus = 'CANCELLED';
          }

          _isCancelling = false; // 취소 완료
        });
      }

      // 주문 데이터 새로고침 (로딩 표시 없이)
      if (mounted) {
        try {
          await _loadOrderData(showLoading: false);
        } catch (e) {
          debugPrint('⚠️ 주문 데이터 새로고침 실패: $e');
        }
      }
    } catch (e) {
      // 에러 발생 시 취소 중 상태 해제
      if (mounted) {
        setState(() {
          _isCancelling = false;
        });
      }

      if (!mounted) return;

      // 에러 메시지 표시
      if (mounted) {
        try {
          final errorMessage = e
              .toString()
              .replaceAll('Exception: ', '')
              .replaceAll('우체국 전산 취소 실패: ', '');
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('수거 취소 실패: $errorMessage'),
              backgroundColor: Colors.red,
              behavior: SnackBarBehavior.floating,
              duration: const Duration(seconds: 5),
              action: SnackBarAction(
                label: '확인',
                textColor: Colors.white,
                onPressed: () {},
              ),
            ),
          );
        } catch (snackError) {
          debugPrint('⚠️ ScaffoldMessenger 접근 실패 (에러 표시 중): $snackError');
        }
      }
    }
  }
}

/// 비디오 플레이어 다이얼로그 (리소스 관리를 위한 StatefulWidget)
class _VideoPlayerDialog extends StatefulWidget {
  final String title;
  final String videoUrl;

  const _VideoPlayerDialog({
    required this.title,
    required this.videoUrl,
  });

  @override
  State<_VideoPlayerDialog> createState() => _VideoPlayerDialogState();
}

class _VideoPlayerDialogState extends State<_VideoPlayerDialog> {
  late VideoPlayerController _controller;
  bool _isInitialized = false;
  bool _hasError = false;

  @override
  void initState() {
    super.initState();
    _initializeController();
  }

  Future<void> _initializeController() async {
    _controller = VideoPlayerController.networkUrl(Uri.parse(widget.videoUrl));
    try {
      await _controller.initialize();
      if (mounted) {
        setState(() {
          _isInitialized = true;
        });
        _controller.play(); // 자동 재생
      }
    } catch (e) {
      debugPrint('❌ 비디오 초기화 실패: $e');
      if (mounted) {
        setState(() {
          _hasError = true;
        });
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose(); // 리소스 해제
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.black,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          AppBar(
            title: Text(widget.title),
            backgroundColor: Colors.black,
            foregroundColor: Colors.white,
            leading: IconButton(
              icon: const Icon(Icons.close),
              onPressed: () => Navigator.of(context).pop(),
            ),
          ),
          AspectRatio(
            aspectRatio: 16 / 9,
            child: _hasError
                ? const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.error_outline, color: Colors.red, size: 48),
                        SizedBox(height: 8),
                        Text(
                          '영상을 불러올 수 없습니다',
                          style: TextStyle(color: Colors.white),
                        ),
                      ],
                    ),
                  )
                : _isInitialized
                    ? Stack(
                        alignment: Alignment.center,
                        children: [
                          VideoPlayer(_controller),
                          // 재생/일시정지 버튼
                          GestureDetector(
                            onTap: () {
                              setState(() {
                                if (_controller.value.isPlaying) {
                                  _controller.pause();
                                } else {
                                  _controller.play();
                                }
                              });
                            },
                            child: Container(
                              color: Colors.transparent,
                              child: Center(
                                child: AnimatedOpacity(
                                  opacity: _controller.value.isPlaying ? 0 : 1,
                                  duration: const Duration(milliseconds: 300),
                                  child: Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: Colors.black54,
                                      borderRadius: BorderRadius.circular(50),
                                    ),
                                    child: Icon(
                                      _controller.value.isPlaying
                                          ? Icons.pause
                                          : Icons.play_arrow,
                                      color: Colors.white,
                                      size: 48,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      )
                    : const Center(
                        child: CircularProgressIndicator(color: Colors.white),
                      ),
          ),
          // 재생 컨트롤 바
          if (_isInitialized)
            Container(
              color: Colors.black,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: VideoProgressIndicator(
                _controller,
                allowScrubbing: true,
                colors: const VideoProgressColors(
                  playedColor: Colors.blue,
                  bufferedColor: Colors.grey,
                  backgroundColor: Colors.white24,
                ),
              ),
            ),
        ],
      ),
    );
  }
}
