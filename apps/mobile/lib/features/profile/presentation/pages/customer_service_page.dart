import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:intl/intl.dart';
import '../../../../services/order_service.dart';
import '../../../../services/company_info_service.dart';

/// 카카오톡 채널 ID (모두의수선)
const String _kakaoChannelId = '_dLhAX';

/// 고객센터 페이지
class CustomerServicePage extends ConsumerStatefulWidget {
  const CustomerServicePage({super.key});

  @override
  ConsumerState<CustomerServicePage> createState() => _CustomerServicePageState();
}

class _CustomerServicePageState extends ConsumerState<CustomerServicePage> {
  final OrderService _orderService = OrderService();
  final CompanyInfoService _companyInfoService = CompanyInfoService();
  
  List<Map<String, dynamic>>? _recentOrders;
  bool _isLoadingOrders = false;
  String _customerServicePhone = '1833-3429'; // 기본값

  @override
  void initState() {
    super.initState();
    _loadRecentOrders();
    _loadCustomerServicePhone();
  }

  /// 고객센터 전화번호 로드
  Future<void> _loadCustomerServicePhone() async {
    final phone = await _companyInfoService.getCustomerServicePhone();
    if (mounted) {
      setState(() {
        _customerServicePhone = phone;
      });
    }
  }

  /// 최근 주문 5개 로드
  Future<void> _loadRecentOrders() async {
    setState(() => _isLoadingOrders = true);
    try {
      final orders = await _orderService.getMyOrders();
      setState(() {
        _recentOrders = orders.take(5).toList();
        _isLoadingOrders = false;
      });
    } catch (e) {
      debugPrint('주문 로드 실패: $e');
      setState(() => _isLoadingOrders = false);
    }
  }

  /// 주문 정보를 텍스트로 변환
  String _formatOrdersForChat() {
    if (_recentOrders == null || _recentOrders!.isEmpty) {
      return '안녕하세요, 모두의수선 고객입니다.\n문의드립니다.';
    }

    final buffer = StringBuffer();
    buffer.writeln('안녕하세요, 모두의수선 고객입니다.');
    buffer.writeln();
    buffer.writeln('📦 최근 주문 내역');
    buffer.writeln('─────────────');
    
    for (var i = 0; i < _recentOrders!.length; i++) {
      final order = _recentOrders![i];
      final orderNumber = order['order_number'] ?? '-';
      final status = _getStatusText(order['status'] ?? '');
      final clothingType = order['clothing_type'] ?? '-';
      final repairType = order['repair_type'] ?? '-';
      final createdAt = order['created_at'] != null
          ? DateFormat('MM/dd').format(DateTime.parse(order['created_at']))
          : '-';
      
      buffer.writeln('${i + 1}. $orderNumber');
      buffer.writeln('   의류: $clothingType | 수선: $repairType');
      buffer.writeln('   상태: $status | 날짜: $createdAt');
      if (i < _recentOrders!.length - 1) buffer.writeln();
    }
    
    buffer.writeln('─────────────');
    buffer.writeln();
    buffer.writeln('문의 내용:');
    
    return buffer.toString();
  }

  /// 주문 상태 텍스트
  String _getStatusText(String status) {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return '주문접수';
      case 'PICKUP_SCHEDULED':
        return '수거예정';
      case 'PICKUP_COMPLETED':
        return '수거완료';
      case 'RECEIVED':
        return '입고완료';
      case 'IN_PROGRESS':
        return '작업중';
      case 'COMPLETED':
        return '작업완료';
      case 'DELIVERY_STARTED':
        return '배송시작';
      case 'DELIVERED':
        return '배송완료';
      case 'CANCELLED':
        return '취소됨';
      default:
        return status;
    }
  }

  /// 카카오톡 채널 채팅 열기
  Future<void> _openKakaoChat() async {
    // 주문 정보 준비
    final orderInfo = _formatOrdersForChat();
    
    // 클립보드에 복사
    await Clipboard.setData(ClipboardData(text: orderInfo));
    
    // 카카오톡 채널 URL
    final kakaoChannelChatUrl = Uri.parse('https://pf.kakao.com/$_kakaoChannelId/chat');
    final kakaoAppUrl = Uri.parse('kakaoplus://plusfriend/chat/$_kakaoChannelId');
    
    // 안내 다이얼로그 표시
    if (!mounted) return;
    
    final shouldProceed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: const Color(0xFFFEE500),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Center(
                child: Text('💬', style: TextStyle(fontSize: 20)),
              ),
            ),
            const SizedBox(width: 12),
            const Text('카카오톡 문의'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (_recentOrders != null && _recentOrders!.isNotEmpty) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.green.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.green.shade200),
                ),
                child: Row(
                  children: [
                    Icon(Icons.check_circle, color: Colors.green.shade600, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '최근 주문 ${_recentOrders!.length}건이 복사되었습니다',
                        style: TextStyle(
                          color: Colors.green.shade700,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],
            const Text(
              '카카오톡 채널로 이동합니다.\n채팅창에서 붙여넣기(Ctrl+V)하면\n주문 정보가 자동으로 입력됩니다.',
              style: TextStyle(height: 1.5),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('취소'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFFEE500),
              foregroundColor: Colors.black87,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: const Text('카카오톡으로 이동'),
          ),
        ],
      ),
    );

    if (shouldProceed != true) return;

    // 카카오톡 앱 시도 → 실패시 웹 URL
    try {
      if (await canLaunchUrl(kakaoAppUrl)) {
        await launchUrl(kakaoAppUrl, mode: LaunchMode.externalApplication);
      } else if (await canLaunchUrl(kakaoChannelChatUrl)) {
        await launchUrl(kakaoChannelChatUrl, mode: LaunchMode.externalApplication);
      } else {
        throw Exception('카카오톡을 열 수 없습니다');
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('카카오톡을 열 수 없습니다. 앱이 설치되어 있는지 확인해주세요.'),
          backgroundColor: Colors.red.shade400,
        ),
      );
    }
  }

  /// 전화 걸기
  Future<void> _makePhoneCall() async {
    // 전화번호에서 하이픈 제거
    final phoneNumber = _customerServicePhone.replaceAll('-', '');
    final phoneUrl = Uri.parse('tel:$phoneNumber');
    try {
      if (await canLaunchUrl(phoneUrl)) {
        await launchUrl(phoneUrl);
      } else {
        throw Exception('전화를 걸 수 없습니다');
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('전화 기능을 사용할 수 없습니다'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: const Text('고객센터'),
        elevation: 0,
        backgroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // 연락처 정보
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: Column(
                children: [
                  Icon(
                    Icons.headset_mic,
                    size: 60,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    '고객센터',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '궁금하신 점이 있으시면 언제든지 문의해주세요',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey.shade600,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 24),
                  
                  // 카카오톡 문의 (메인 버튼)
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _isLoadingOrders ? null : _openKakaoChat,
                      icon: _isLoadingOrders
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.black54,
                              ),
                            )
                          : const Text('💬', style: TextStyle(fontSize: 18)),
                      label: Text(
                        _isLoadingOrders ? '주문 정보 로딩 중...' : '카카오톡 문의',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFFEE500),
                        foregroundColor: Colors.black87,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        elevation: 0,
                      ),
                    ),
                  ),
                  
                  // 주문 정보 미리보기
                  if (_recentOrders != null && _recentOrders!.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      '최근 주문 ${_recentOrders!.length}건이 함께 전송됩니다',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey.shade500,
                      ),
                    ),
                  ],
                  
                  const SizedBox(height: 12),
                  
                  // 전화 버튼
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: _makePhoneCall,
                      icon: const Icon(Icons.phone),
                      label: Text('전화 문의 ($_customerServicePhone)'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF00C896),
                        side: const BorderSide(color: Color(0xFF00C896)),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            
            // 운영시간
            Container(
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
                        Icons.access_time,
                        size: 20,
                        color: Colors.grey.shade600,
                      ),
                      const SizedBox(width: 8),
                      const Text(
                        '운영시간',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _buildTimeRow('평일', '09:00 - 18:00'),
                  _buildTimeRow('점심시간', '12:00 - 13:00'),
                  _buildTimeRow('주말 및 공휴일', '휴무'),
                ],
              ),
            ),
            const SizedBox(height: 16),
            
            // FAQ
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: Colors.blue.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.help_outline,
                    size: 22,
                    color: Colors.blue,
                  ),
                ),
                title: const Text(
                  '자주 묻는 질문',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                subtitle: const Text(
                  '궁금한 점을 빠르게 찾아보세요',
                  style: TextStyle(fontSize: 12),
                ),
                trailing: Icon(
                  Icons.arrow_forward_ios,
                  size: 14,
                  color: Colors.grey.shade400,
                ),
                onTap: () {
                  // TODO: FAQ 페이지
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTimeRow(String label, String time) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey.shade600,
            ),
          ),
          Text(
            time,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: Colors.black87,
            ),
          ),
        ],
      ),
    );
  }

}
