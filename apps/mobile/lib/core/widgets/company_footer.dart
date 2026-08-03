import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// 사업자 정보 아코디언 푸터
class CompanyFooter extends StatefulWidget {
  const CompanyFooter({super.key});

  @override
  State<CompanyFooter> createState() => _CompanyFooterState();
}

class _CompanyFooterState extends State<CompanyFooter>
    with SingleTickerProviderStateMixin {
  bool _isExpanded = false;
  late AnimationController _controller;
  late Animation<double> _heightAnimation;
  
  Map<String, dynamic>? _companyInfo;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 200),
      vsync: this,
    );
    _heightAnimation = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeInOut,
    );
    _loadCompanyInfo();
  }
  
  Future<void> _loadCompanyInfo() async {
    try {
      debugPrint('🔍 Loading company info from DB...');
      final data = await Supabase.instance.client
          .from('company_info')
          .select()
          .limit(1)
          .maybeSingle();
      
      debugPrint('✅ Company info loaded: $data');
      
      if (mounted) {
        setState(() {
          _companyInfo = data;
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('❌ Failed to load company info: $e');
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Container(
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
                if (_isExpanded) {
                  _controller.forward();
                  // 푸터를 열 때마다 최신 정보 로드
                  _loadCompanyInfo();
                } else {
                  _controller.reverse();
                }
              });
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  Text(
                    _companyInfo?['header_title'] ?? _companyInfo?['company_name']?.toString().split('(')[0].trim() ?? '모두의수선',
                    style: const TextStyle(
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
          SizeTransition(
            sizeFactor: _heightAnimation,
            axisAlignment: -1.0, // 위에서 아래로 확장 (-1.0 = top)
            child: Container(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (_isLoading)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.all(16.0),
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    )
                  else if (_companyInfo != null) ...[
                    // 사업자 정보 (DB에서 로드)
                    _buildInfoRow('회사명', _companyInfo!['company_name'] ?? '모두의수선'),
                    const SizedBox(height: 8),
                    _buildInfoRow('대표자', _companyInfo!['ceo_name'] ?? ''),
                    const SizedBox(height: 8),
                    _buildInfoRow('사업자등록번호', _companyInfo!['business_number'] ?? ''),
                    const SizedBox(height: 8),
                    _buildInfoRow('통신판매업신고번호', _companyInfo!['online_business_number'] ?? ''),
                    const SizedBox(height: 8),
                    _buildInfoRow(
                      '주소',
                      _companyInfo!['address'] ?? '',
                    ),
                    const SizedBox(height: 8),
                    _buildInfoRow('개인정보관리책임자', _companyInfo!['privacy_officer'] ?? ''),
                    const SizedBox(height: 8),
                    _buildInfoRow('이메일', _companyInfo!['email'] ?? ''),
                    const SizedBox(height: 8),
                    _buildInfoRow('고객센터', _companyInfo!['phone'] ?? ''),
                    const SizedBox(height: 16),
                  ] else ...[
                    // 기본 정보 (DB 로드 실패 시)
                    _buildInfoRow('회사명', '모두의수선'),
                    const SizedBox(height: 8),
                    _buildInfoRow('대표자', ''),
                    const SizedBox(height: 8),
                    _buildInfoRow('사업자등록번호', ''),
                    const SizedBox(height: 8),
                    _buildInfoRow('통신판매업신고번호', ''),
                    const SizedBox(height: 8),
                    _buildInfoRow(
                      '주소',
                      '',
                    ),
                    const SizedBox(height: 8),
                    _buildInfoRow('개인정보관리책임자', ''),
                    const SizedBox(height: 8),
                    _buildInfoRow('이메일', ''),
                    const SizedBox(height: 8),
                    _buildInfoRow('고객센터', ''),
                    const SizedBox(height: 16),
                  ],
                  
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
            ),
          ),
        ],
      ),
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

