import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
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
  final CompanyInfoService _companyInfoService = CompanyInfoService();
  
  String _customerServicePhone = '070-8211-1500'; // 모두의수선 고객센터 기본값

  @override
  void initState() {
    super.initState();
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

  /// 카카오톡 채널 채팅 열기 (바로 채팅창으로 이동)
  Future<void> _openKakaoChat() async {
    // 카카오톡 채널 URL
    final kakaoChannelChatUrl = Uri.parse('https://pf.kakao.com/$_kakaoChannelId/chat');
    final kakaoAppUrl = Uri.parse('kakaoplus://plusfriend/chat/$_kakaoChannelId');
    
    // 바로 카카오톡 앱 열기 (다이얼로그 없이)
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
                      onPressed: _openKakaoChat,
                      icon: const Text('💬', style: TextStyle(fontSize: 18)),
                      label: const Text(
                        '카카오톡 문의',
                        style: TextStyle(
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
