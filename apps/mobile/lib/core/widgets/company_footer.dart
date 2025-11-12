import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// 사업자 정보 아코디언 푸터
class CompanyFooter extends StatefulWidget {
  const CompanyFooter({super.key});

  @override
  State<CompanyFooter> createState() => _CompanyFooterState();
}

class _CompanyFooterState extends State<CompanyFooter> {
  bool _isExpanded = false;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(
          top: BorderSide(
            color: Colors.grey.shade200,
            width: 1,
          ),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // 아코디언 헤더
          InkWell(
            onTap: () {
              setState(() {
                _isExpanded = !_isExpanded;
              });
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  const Text(
                    '의식주컴퍼니',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: Colors.black87,
                    ),
                  ),
                  const Spacer(),
                  AnimatedRotation(
                    turns: _isExpanded ? 0.5 : 0,
                    duration: const Duration(milliseconds: 200),
                    child: Icon(
                      Icons.keyboard_arrow_up,
                      color: Colors.grey.shade600,
                      size: 20,
                    ),
                  ),
                ],
              ),
            ),
          ),
          
          // 아코디언 내용
          AnimatedSize(
            duration: const Duration(milliseconds: 200),
            curve: Curves.easeInOut,
            alignment: Alignment.topCenter,
            child: _isExpanded
                ? Container(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // 사업자 정보
                        _buildInfoRow('회사명', '(주) 의식주컴퍼니'),
                        const SizedBox(height: 8),
                        _buildInfoRow('대표자', '조성우'),
                        const SizedBox(height: 8),
                        _buildInfoRow('사업자등록번호', '561-87-00957'),
                        const SizedBox(height: 8),
                        _buildInfoRow('통신판매업신고번호', '2025-경기군포-0146호'),
                        const SizedBox(height: 8),
                        _buildInfoRow(
                          '주소',
                          '경기도 군포시 농심로72번길 3(당정동, 런드리고 글로벌 캠퍼스)',
                        ),
                        const SizedBox(height: 8),
                        _buildInfoRow('우편번호', '15844'),
                        const SizedBox(height: 8),
                        _buildInfoRow('개인정보관리책임자', '최종수'),
                        const SizedBox(height: 8),
                        _buildInfoRow('이메일', 'privacy@lifegoeson.kr'),
                        const SizedBox(height: 8),
                        _buildInfoRow('고객센터', '1833-3429'),
                        const SizedBox(height: 16),
                        
                        // 하단 링크
                        Row(
                          mainAxisAlignment: MainAxisAlignment.start,
                          children: [
                            _buildLink(
                              '사업자 정보',
                              onTap: () {
                                // 사업자 정보는 이미 표시되어 있으므로 아무 동작 없음
                              },
                            ),
                            const SizedBox(width: 16),
                            _buildLink(
                              '이용약관',
                              onTap: () {
                                context.push('/terms');
                              },
                            ),
                            const SizedBox(width: 16),
                            _buildLink(
                              '개인정보처리방침',
                              onTap: () {
                                context.push('/privacy-policy');
                              },
                            ),
                          ],
                        ),
                      ],
                    ),
                  )
                : const SizedBox.shrink(),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 120,
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: Colors.grey.shade600,
            ),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(
              fontSize: 12,
              color: Colors.black87,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildLink(String text, {required VoidCallback onTap}) {
    return InkWell(
      onTap: onTap,
      child: Text(
        text,
        style: TextStyle(
          fontSize: 12,
          color: Colors.grey.shade700,
          decoration: TextDecoration.underline,
          decorationColor: Colors.grey.shade400,
        ),
      ),
    );
  }
}

