import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/widgets/company_footer.dart';

/// 이용약관 페이지
class TermsPage extends ConsumerWidget {
  const TermsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('이용약관'),
        elevation: 0,
        backgroundColor: Colors.white,
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
            const Text(
              '모두의수선 서비스 이용약관',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '시행일: 2024년 11월 1일',
              style: TextStyle(
                fontSize: 13,
                color: Colors.grey.shade600,
              ),
            ),
            const SizedBox(height: 32),
            
            _buildSection(
              '제1조 (목적)',
              '본 약관은 모두의수선(이하 "회사")이 제공하는 의류 수선 서비스(이하 "서비스")의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.',
            ),
            
            _buildSection(
              '제2조 (용어의 정의)',
              '1. "서비스"란 회사가 제공하는 비대면 의류 수선 중개 플랫폼을 의미합니다.\n'
              '2. "이용자"란 본 약관에 따라 회사가 제공하는 서비스를 이용하는 회원 및 비회원을 말합니다.\n'
              '3. "회원"이란 회사에 개인정보를 제공하여 회원등록을 한 자로서, 회사의 정보를 지속적으로 제공받으며 서비스를 계속 이용할 수 있는 자를 말합니다.',
            ),
            
            _buildSection(
              '제3조 (약관의 게시 및 변경)',
              '1. 회사는 본 약관의 내용을 이용자가 쉽게 알 수 있도록 서비스 초기 화면에 게시합니다.\n'
              '2. 회사는 필요한 경우 관련 법령을 위배하지 않는 범위에서 본 약관을 변경할 수 있습니다.\n'
              '3. 변경된 약관은 서비스 화면에 공지하며, 공지 후 7일이 경과한 시점부터 효력이 발생합니다.',
            ),
            
            _buildSection(
              '제4조 (회원가입)',
              '1. 이용자는 회사가 정한 가입 양식에 따라 회원정보를 기입한 후 본 약관에 동의한다는 의사표시를 함으로써 회원가입을 신청합니다.\n'
              '2. 회사는 제1항과 같이 회원으로 가입할 것을 신청한 이용자 중 다음 각 호에 해당하지 않는 한 회원으로 등록합니다:\n'
              '   - 등록 내용에 허위, 기재누락, 오기가 있는 경우\n'
              '   - 기타 회원으로 등록하는 것이 회사의 기술상 현저히 지장이 있다고 판단되는 경우',
            ),
            
            _buildSection(
              '제5조 (서비스의 제공)',
              '1. 회사는 다음과 같은 서비스를 제공합니다:\n'
              '   - 의류 수선 신청 및 접수\n'
              '   - 수거 및 배송 서비스\n'
              '   - 수선 진행 상황 조회\n'
              '   - 결제 및 영수증 발급\n'
              '2. 서비스는 연중무휴, 1일 24시간 제공함을 원칙으로 합니다.\n'
              '3. 회사는 시스템 점검, 보수, 교체 등 부득이한 사유가 발생한 경우 서비스의 제공을 일시적으로 중단할 수 있습니다.',
            ),
            
            _buildSection(
              '제6조 (개인정보보호)',
              '회사는 관련 법령이 정하는 바에 따라 이용자의 개인정보를 보호하기 위해 노력합니다. 개인정보의 보호 및 이용에 대해서는 관련 법령 및 회사의 개인정보처리방침이 적용됩니다.',
            ),
            
            _buildSection(
              '제7조 (책임의 한계)',
              '1. 회사는 천재지변, 전쟁, 기간통신사업자의 서비스 중지 등 불가항력적인 사유로 서비스를 제공할 수 없는 경우 책임이 면제됩니다.\n'
              '2. 회사는 이용자의 귀책사유로 인한 서비스 이용의 장애에 대하여 책임을 지지 않습니다.\n'
              '3. 회사는 이용자가 게재한 정보의 신뢰도, 정확성 등 내용에 관해서는 책임을 지지 않습니다.',
            ),
            
            _buildSection(
              '제8조 (분쟁해결)',
              '1. 회사는 이용자로부터 제출되는 불만사항 및 의견을 최우선적으로 처리합니다.\n'
              '2. 회사와 이용자 간 발생한 분쟁은 전자거래기본법 제28조 및 동 시행령 제15조에 의하여 설치된 전자거래분쟁조정위원회의 조정에 따를 수 있습니다.',
            ),
            
            const SizedBox(height: 40),
                ],
              ),
            ),
          ),
          // 사업자 정보 푸터 (하단 고정)
          const CompanyFooter(),
        ],
      ),
    );
  }

  Widget _buildSection(String title, String content) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            content,
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey.shade700,
              height: 1.6,
            ),
          ),
        ],
      ),
    );
  }
}

