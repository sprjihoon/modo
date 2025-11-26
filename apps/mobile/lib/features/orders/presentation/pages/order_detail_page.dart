import 'package:flutter/material.dart';
import 'dart:async';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../services/image_service.dart';
import '../../../../services/order_service.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// 주문 상세 화면
class OrderDetailPage extends ConsumerStatefulWidget {
  final String orderId;

  const OrderDetailPage({
    required this.orderId, super.key,
  });

  @override
  ConsumerState<OrderDetailPage> createState() => _OrderDetailPageState();
}

class _OrderDetailPageState extends ConsumerState<OrderDetailPage> {
  final _orderService = OrderService();
  bool _isLoading = true;
  bool _isCancelling = false; // 취소 중 상태 추가
  Map<String, dynamic>? _orderData;
  Map<String, dynamic>? _shipmentData;
  
  // 실제 사진 데이터 (State로 관리)
  List<Map<String, dynamic>> _images = [];
  
  // Mock 주문 상태 (테스트용 - 변경 가능)
  // BOOKED: 수거예약 - 수정 O, 취소 O
  // INBOUND: 입고완료 - 수정 O, 취소 X
  // PROCESSING: 수선중 - 수정 X, 취소 X
  // READY_TO_SHIP: 출고완료 - 수정 X, 취소 X
  String _currentStatus = 'BOOKED'; 
  
  // 우체국 API 취소 응답 정보 저장
  Map<String, dynamic>? _cancelInfo;
  
  // 입고/출고 영상 URL
  String? _inboundVideoUrl;
  String? _outboundVideoUrl;

  @override
  void initState() {
    super.initState();
    _loadOrderData();
  }

  Future<void> _loadOrderData({bool showLoading = true}) async {
    try {
      if (showLoading) {
        setState(() => _isLoading = true);
      }
      
      debugPrint('📦 주문 상세 조회 시작: ${widget.orderId}');
      
      // 주문 상세 정보 조회 (타임아웃 추가)
      final order = await _orderService.getOrderDetail(widget.orderId)
          .timeout(
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
          final pins = pinsData.map((p) {
            if (p is Map<String, dynamic>) {
              return p;
            } else if (p is Map) {
              return Map<String, dynamic>.from(p);
            }
            return null;
          }).whereType<Map<String, dynamic>>().toList();
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
          images = urls.map((url) => {
            'url': url.toString(),
            'pinsCount': 0,
            'pins': <dynamic>[],
          }).toList();
        }
      }
      
      setState(() {
        _orderData = order;
        _shipmentData = shipment;
        _currentStatus = order['status'] as String? ?? 'BOOKED';
        _images = images;
        _isLoading = false;
      });
      
      // 입고/출고 영상 URL 조회 (비동기, 별도 처리)
      _loadVideoUrls();
    } catch (e, stackTrace) {
      debugPrint('❌ 주문 상세 조회 실패: $e');
      debugPrint('스택 트레이스: $stackTrace');
      
      if (mounted) {
        // 에러 메시지 표시
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
        
        // 로딩 상태 해제
        setState(() => _isLoading = false);
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
        appBar: AppBar(
          title: const Text('주문 상세'),
          elevation: 0,
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
    final canEdit = _currentStatus == 'BOOKED' || _currentStatus == 'INBOUND'; // 수선 전에만 수정 가능
    
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: const Text('주문 상세'),
        elevation: 0,
        actions: [
          // 상태 변경 버튼 (테스트용)
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert),
            tooltip: '상태 변경 (테스트)',
            onSelected: (status) {
              setState(() {
                _currentStatus = status;
              });
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('상태: $status'),
                  backgroundColor: const Color(0xFF00C896),
                  duration: const Duration(seconds: 1),
                ),
              );
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'BOOKED',
                child: Text('수거예약 (수정O/취소O)'),
              ),
              const PopupMenuItem(
                value: 'INBOUND',
                child: Text('입고완료 (수정O/취소X)'),
              ),
              const PopupMenuItem(
                value: 'PROCESSING',
                child: Text('수선중 (수정X/취소X)'),
              ),
              const PopupMenuItem(
                value: 'READY_TO_SHIP',
                child: Text('출고완료 (수정X/취소X)'),
              ),
            ],
          ),
          IconButton(
            icon: const Icon(Icons.share_outlined),
            onPressed: () {
              // TODO: 공유 기능
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 상태 배너
            _buildStatusBanner(context),
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
                  if (canEdit)
                    _buildEditablePhotosSection(context),
                  if (canEdit)
                    const SizedBox(height: 16),
                  
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
      bottomNavigationBar: _buildBottomBar(context),
    );
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
    final steps = [
      {'status': 'BOOKED', 'label': '수거예약', 'completed': true, 'icon': Icons.schedule_outlined},
      {'status': 'INBOUND', 'label': '입고완료', 'completed': true, 'icon': Icons.inventory_outlined},
      {'status': 'PROCESSING', 'label': '수선중', 'completed': true, 'icon': Icons.content_cut_rounded},
      {'status': 'READY_TO_SHIP', 'label': '출고완료', 'completed': false, 'icon': Icons.done_all_outlined},
      {'status': 'DELIVERED', 'label': '배송완료', 'completed': false, 'icon': Icons.check_circle_outline},
    ];

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
                  final prevCompleted = steps[(index - 1) ~/ 2]['completed'] as bool;
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
          _buildInfoRow('주문번호', _formatOrderNumber(_orderData?['order_number'] ?? widget.orderId)),
          _buildInfoRow('수선 항목', _orderData?['item_name'] ?? '수선 항목'),
          _buildInfoRow('주문일시', _formatDateTime(_orderData?['created_at'])),
          Divider(height: 24, color: Colors.grey.shade200),
          _buildInfoRow('결제금액', _formatPrice(_orderData?['total_price']), isHighlight: true),
          _buildInfoRow('결제방법', '신용카드'), // TODO: 실제 결제 방법 표시
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
              color: isHighlight ? Colors.grey.shade900 : Colors.grey.shade800,
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

  /// 주소 포맷팅
  String _formatAddress(dynamic address, dynamic detail) {
    final addr = address?.toString() ?? '';
    final det = detail?.toString();
    if (det != null && det.isNotEmpty && det != '없음') {
      return '$addr $det';
    }
    return addr.isNotEmpty ? addr : '주소 없음';
  }

  /// 송장번호 카드 빌더
  Widget _buildTrackingCard(
    BuildContext context,
    String label,
    String trackingNo,
    IconData icon,
    Color color,
    String description,
  ) {
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
          const SizedBox(height: 12),
          // 배송추적 버튼
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              icon: Icon(Icons.track_changes_outlined, size: 18, color: color),
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
                  child: const Icon(Icons.camera_alt_rounded, color: Color(0xFF00C896)),
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
                  child: const Icon(Icons.photo_library_rounded, color: Colors.blue),
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
        title: const Text('사진 삭제', style: TextStyle(fontWeight: FontWeight.bold)),
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
                  child: const Icon(Icons.camera_alt_rounded, color: Color(0xFF00C896)),
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
                  child: const Icon(Icons.photo_library_rounded, color: Colors.blue),
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
          content: Text('${index + 1}번 사진의 핀이 수정되었습니다 (${_images[index]['pinsCount']}개)'),
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
                              child: Icon(Icons.image_outlined, size: 40, color: Colors.grey),
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
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
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
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
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
          if (_images.any((img) => (img['pins'] as List?)?.isNotEmpty ?? false)) ...[
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
                      Icon(Icons.push_pin, size: 16, color: Colors.blue.shade700),
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
                  }).toList(),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  /// 사진 카드 (비활성화)
  Widget _buildPhotoCard(BuildContext context, Map<String, dynamic> image, int index) {
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
                    child: Icon(Icons.image_outlined, size: 40, color: Colors.grey),
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
                  child: const Icon(Icons.photo_library_rounded, color: Colors.blue),
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
          
          // 개별 영상
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _buildVideoCard(context, '입고 영상', true, hasInboundVideo),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildVideoCard(context, '출고 영상', false, hasOutboundVideo),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildVideoCard(BuildContext context, String title, bool isInbound, bool hasVideo) {
    return InkWell(
      onTap: hasVideo
          ? () {
              // TODO: 영상 재생
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
    return InkWell(
      onTap: hasBoth
          ? () {
              context.push('/comparison-video', extra: {
                'inboundUrl': _inboundVideoUrl,
                'outboundUrl': _outboundVideoUrl,
              });
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
                      color: hasBoth ? Colors.grey.shade900 : Colors.grey.shade600,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    hasBoth ? '좌우 나란히 재생됩니다' : '입고/출고 영상 준비 중',
                    style: TextStyle(
                      fontSize: 13,
                      color: hasBoth ? Colors.grey.shade600 : Colors.grey.shade500,
                    ),
                  ),
                  if (hasBoth) ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
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
              color: hasBoth ? Theme.of(context).colorScheme.primary : Colors.grey.shade400,
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _loadVideoUrls() async {
    try {
      final fwbn =
          _shipmentData?['delivery_tracking_no'] ?? _shipmentData?['tracking_no'] ?? _shipmentData?['outbound_tracking_no'];
      if (fwbn == null || (fwbn is String && fwbn.isEmpty)) {
        return;
      }

      final supabase = Supabase.instance.client;
      final videos = await supabase
          .from('media')
          .select('type, path, provider')
          .eq('final_waybill_no', fwbn)
          .inFilter('type', ['inbound_video', 'outbound_video'])
          .order('created_at', ascending: false);

      String? inboundUrl;
      String? outboundUrl;

      for (final video in videos) {
        final type = video['type'] as String?;
        final path = video['path'] as String? ?? '';
        final provider = video['provider'] as String? ?? '';
        
        String? url;
        if (path.startsWith('http')) {
          url = path;
        } else if (provider == 'cloudflare' && path.isNotEmpty) {
          // Cloudflare Stream HLS URL
          url = 'https://videodelivery.net/$path/manifest/video.m3u8';
        }

        if (type == 'inbound_video' && url != null) {
          inboundUrl = url;
        } else if (type == 'outbound_video' && url != null) {
          outboundUrl = url;
        }
      }

      if (mounted) {
        setState(() {
          _inboundVideoUrl = inboundUrl;
          _outboundVideoUrl = outboundUrl;
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
          // 1. 회수 송장번호
          if (_shipmentData?['pickup_tracking_no'] != null)
          _buildTrackingCard(
            context,
            '회수 송장번호',
              _shipmentData!['pickup_tracking_no'] as String,
            Icons.local_shipping_outlined,
            Colors.blue,
            '수거 시 사용',
          ),
          if (_shipmentData?['pickup_tracking_no'] != null)
          const SizedBox(height: 12),
          
          // 2. 발송 송장번호
          if (_shipmentData?['delivery_tracking_no'] != null)
          _buildTrackingCard(
            context,
            '발송 송장번호',
              _shipmentData!['delivery_tracking_no'] as String,
            Icons.send_outlined,
            const Color(0xFF00C896),
            '배송 시 사용',
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
                  Icon(Icons.info_outline, color: Colors.grey.shade600, size: 20),
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
          
          _buildInfoRow('택배사', _shipmentData?['carrier'] == 'EPOST' ? '우체국 택배' : '우체국 택배'),
          _buildInfoRow('수거지', _formatAddress(
            _orderData?['pickup_address'],
            _orderData?['pickup_address_detail'],
          )),
          _buildInfoRow('배송지', _formatAddress(
            _orderData?['delivery_address'],
            _orderData?['delivery_address_detail'],
          )),
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
            ? _buildBookedButtons(context)
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
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.red),
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
            onPressed: () {
              // TODO: 고객센터 연결
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
            onPressed: () {
              // TODO: 고객센터 연결
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

  /// 기본 버튼 (문의하기 + 배송 추적)
  Widget _buildDefaultButtons(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            icon: const Icon(Icons.headset_mic_outlined, size: 20),
            label: const Text('문의하기'),
            onPressed: () {
              // TODO: 고객센터 연결
            },
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
          final errorMessage = e.toString().replaceAll('Exception: ', '').replaceAll('우체국 전산 취소 실패: ', '');
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

