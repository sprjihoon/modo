import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/widgets/company_footer.dart';

/// 개인정보처리방침 페이지
class PrivacyPolicyPage extends ConsumerWidget {
  const PrivacyPolicyPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('개인정보처리방침'),
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
              '모두의수선 개인정보처리방침',
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
              '제1조 (개인정보의 처리 목적)',
              '회사는 다음의 목적을 위하여 개인정보를 처리합니다:\n'
              '1. 회원 가입 및 관리\n'
              '2. 수선 서비스 제공\n'
              '3. 수거 및 배송 서비스 제공\n'
              '4. 결제 처리 및 정산\n'
              '5. 고객 문의 응대 및 불만 처리\n'
              '6. 마케팅 및 광고 활용 (선택)',
            ),
            
            _buildSection(
              '제2조 (처리하는 개인정보의 항목)',
              '회사는 다음의 개인정보 항목을 처리하고 있습니다:\n\n'
              '필수항목:\n'
              '- 이름, 이메일, 전화번호\n'
              '- 수거/배송 주소\n'
              '- 결제 정보 (카드번호 등)\n\n'
              '선택항목:\n'
              '- 프로필 사진\n'
              '- 마케팅 수신 동의',
            ),
            
            _buildSection(
              '제3조 (개인정보의 처리 및 보유 기간)',
              '1. 회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.\n'
              '2. 각각의 개인정보 처리 및 보유 기간은 다음과 같습니다:\n'
              '   - 회원 정보: 회원 탈퇴 시까지\n'
              '   - 주문 정보: 5년 (전자상거래법)\n'
              '   - 결제 정보: 5년 (전자상거래법)',
            ),
            
            _buildSection(
              '제4조 (개인정보의 제3자 제공)',
              '회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 다음의 경우에는 예외로 합니다:\n'
              '1. 배송을 위한 택배업체 정보 제공\n'
              '2. 결제를 위한 결제대행업체 정보 제공\n'
              '3. 법령에 의하여 제공이 요구되는 경우',
            ),
            
            _buildSection(
              '제5조 (개인정보의 파기)',
              '1. 회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체 없이 해당 개인정보를 파기합니다.\n'
              '2. 개인정보 파기의 절차 및 방법은 다음과 같습니다:\n'
              '   - 전자적 파일: 복구 불가능한 방법으로 영구 삭제\n'
              '   - 종이 문서: 분쇄 또는 소각',
            ),
            
            _buildSection(
              '제6조 (정보주체의 권리·의무)',
              '1. 이용자는 언제든지 등록되어 있는 자신의 개인정보를 조회하거나 수정할 수 있습니다.\n'
              '2. 이용자는 언제든지 회원 탈퇴를 요청할 수 있으며, 회사는 지체 없이 회원 탈퇴를 처리합니다.\n'
              '3. 이용자는 개인정보의 정확성을 유지할 책임이 있으며, 부정확한 정보 입력으로 발생하는 문제의 책임은 이용자에게 있습니다.',
            ),
            
            _buildSection(
              '제7조 (개인정보 보호책임자)',
              '회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제를 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.\n\n'
              '개인정보 보호책임자:\n'
              '- 성명: 홍길동\n'
              '- 이메일: privacy@modusrepair.com\n'
              '- 전화번호: 1588-1234',
            ),
            
            const SizedBox(height: 40),
            
            // 하단 정보
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline, color: Colors.blue.shade700, size: 20),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      '본 방침은 2024년 11월 1일부터 적용됩니다.',
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.blue.shade700,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
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

