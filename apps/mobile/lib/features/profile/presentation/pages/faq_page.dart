import 'package:flutter/material.dart';
import '../../../../core/widgets/modo_app_bar.dart';

class _FaqItem {
  const _FaqItem({required this.question, required this.answer});
  final String question;
  final String answer;
}

/// 웹 `apps/web/lib/faq.ts` 와 동일 문구
const List<_FaqItem> _faqItems = [
  _FaqItem(
    question: '이용 방법이 궁금해요',
    answer:
        '수선 항목을 선택하고 결제한 뒤, 담당자가 연락하여 수거 일정을 잡습니다. 우체국 집배원이 방문 수거하면 수선 전·후 사진을 제공한 뒤 전문 수선이 진행되고, 완료되면 고객님 주소로 배송됩니다.',
  ),
  _FaqItem(
    question: '수선에는 얼마나 걸리나요?',
    answer:
        '결제 후 수거까지 보통 1~2 영업일, 수거 완료 후 수선·발송까지 총 3~5 영업일이 소요됩니다. (주말·공휴일 제외)',
  ),
  _FaqItem(
    question: '수거·배송비는 얼마인가요?',
    answer:
        '왕복 배송비 7,000원이 수선 요금과 별도로 청구됩니다. 도서산간 지역은 추가 배송비가 발생할 수 있으며, 결제 단계에서 안내됩니다.',
  ),
  _FaqItem(
    question: '의류는 어떻게 수거하나요?',
    answer:
        '우체국 방문 수거를 이용합니다. 결제 후 담당자가 연락드리며, 원하시는 날짜에 우체국 집배원이 직접 방문해 수거합니다.',
  ),
  _FaqItem(
    question: '치수는 어떻게 재나요?',
    answer:
        '주문 과정에서 치수 측정 가이드를 제공합니다. ‘수선할 의류’와 ‘평소 잘 맞는 의류’를 준비한 뒤 안내에 따라 측정해 주세요. 가이드는 주문 화면과 이용 가이드에서 확인할 수 있습니다.',
  ),
  _FaqItem(
    question: '취소·환불은 어떻게 되나요?',
    answer:
        '수거 전(예약 단계)에는 전액 환불이 가능합니다. 수거·입고 후에는 왕복 배송비가 차감된 뒤 부분 환불되며 의류는 반송됩니다. 수선 작업이 시작된 이후에는 원칙적으로 취소가 어렵습니다. 회사 귀책(불량, 의뢰 내용과 다른 작업 등)은 전액 환불 또는 무상 재작업을 제공합니다. 환불은 카드사 기준으로 보통 3~7 영업일 소요됩니다.',
  ),
  _FaqItem(
    question: '포인트는 어떻게 사용하나요?',
    answer:
        '결제 화면에서 보유 포인트를 사용할 수 있습니다. 최소 1,000P부터 적용 가능하며, 전액 포인트 결제도 지원합니다. 친구 초대·회원가입 등으로 적립된 포인트도 동일하게 사용할 수 있습니다.',
  ),
  _FaqItem(
    question: '문의는 어디로 하면 되나요?',
    answer:
        '고객센터에서 카카오톡 문의 또는 전화 문의를 이용할 수 있습니다. 운영시간은 평일 기준이며, 점심시간과 주말·공휴일 휴무는 고객센터 화면에 안내된 내용을 확인해 주세요.',
  ),
];

/// 자주 묻는 질문
class FaqPage extends StatefulWidget {
  const FaqPage({super.key});

  @override
  State<FaqPage> createState() => _FaqPageState();
}

class _FaqPageState extends State<FaqPage> {
  int? _expandedIndex = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: const ModoAppBar(title: Text('자주 묻는 질문')),
      body: ListView.separated(
        itemCount: _faqItems.length,
        separatorBuilder: (_, __) => Divider(height: 1, color: Colors.grey.shade100),
        itemBuilder: (context, index) {
          final item = _faqItems[index];
          final open = _expandedIndex == index;
          return Material(
            color: Colors.white,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                InkWell(
                  onTap: () {
                    setState(() {
                      _expandedIndex = open ? null : index;
                    });
                  },
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: RichText(
                            text: TextSpan(
                              children: [
                                const TextSpan(
                                  text: 'Q. ',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFF00C896),
                                  ),
                                ),
                                TextSpan(
                                  text: item.question,
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: Color(0xFF111827),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Icon(
                          open ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                          size: 20,
                          color: Colors.grey.shade400,
                        ),
                      ],
                    ),
                  ),
                ),
                if (open)
                  Container(
                    width: double.infinity,
                    color: const Color(0xFFF9FAFB),
                    padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
                    child: RichText(
                      text: TextSpan(
                        children: [
                          TextSpan(
                            text: 'A. ',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                              color: Colors.grey.shade400,
                            ),
                          ),
                          TextSpan(
                            text: item.answer,
                            style: TextStyle(
                              fontSize: 14,
                              height: 1.5,
                              color: Colors.grey.shade600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}
