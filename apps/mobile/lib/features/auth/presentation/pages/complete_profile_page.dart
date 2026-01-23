import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/widgets/company_footer.dart';

/// 소셜 로그인 후 추가 정보 입력 페이지
/// 이용약관 동의 + 전화번호 입력 (법적 필수사항)
class CompleteProfilePage extends ConsumerStatefulWidget {
  const CompleteProfilePage({super.key});

  @override
  ConsumerState<CompleteProfilePage> createState() => _CompleteProfilePageState();
}

class _CompleteProfilePageState extends ConsumerState<CompleteProfilePage> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  
  bool _isLoading = false;
  bool _agreeToTerms = false;
  bool _agreeToPrivacy = false;
  bool _agreeToMarketing = false;
  bool _agreeToAll = false;
  
  String? _providerName;

  @override
  void initState() {
    super.initState();
    _loadUserInfo();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  /// 소셜 로그인에서 가져온 정보 로드
  Future<void> _loadUserInfo() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) {
      // 로그인 안 됨 - 로그인 페이지로
      if (mounted) context.go('/login');
      return;
    }

    // OAuth provider 정보
    final provider = user.appMetadata['provider'] as String?;
    setState(() {
      _providerName = provider == 'kakao' ? '카카오' : 
                      provider == 'google' ? '구글' : 
                      provider ?? '소셜';
    });

    // 이름 정보 (OAuth에서 가져온 것)
    final name = user.userMetadata?['full_name'] ?? 
                 user.userMetadata?['name'] ?? 
                 user.userMetadata?['nickname'] ?? '';
    _nameController.text = name;

    // 전화번호 (있으면)
    final phone = user.userMetadata?['phone'] ?? '';
    _phoneController.text = phone;
  }

  /// 전체 동의 토글
  void _toggleAgreeAll(bool? value) {
    setState(() {
      _agreeToAll = value ?? false;
      _agreeToTerms = _agreeToAll;
      _agreeToPrivacy = _agreeToAll;
      _agreeToMarketing = _agreeToAll;
    });
  }

  /// 개별 동의 토글 시 전체동의 상태 업데이트
  void _updateAgreeAllState() {
    setState(() {
      _agreeToAll = _agreeToTerms && _agreeToPrivacy && _agreeToMarketing;
    });
  }

  /// 프로필 완료 처리
  Future<void> _handleComplete() async {
    if (!_formKey.currentState!.validate()) return;

    if (!_agreeToTerms || !_agreeToPrivacy) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('필수 약관에 동의해주세요'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) throw Exception('로그인 정보가 없습니다');

      final name = _nameController.text.trim();
      final phone = _phoneController.text.trim();

      // RPC 함수 호출하여 프로필 완료 처리
      final response = await Supabase.instance.client.rpc(
        'complete_user_profile',
        params: {
          'p_auth_id': user.id,
          'p_name': name,
          'p_phone': phone,
          'p_terms_agreed': _agreeToTerms,
          'p_privacy_agreed': _agreeToPrivacy,
          'p_marketing_agreed': _agreeToMarketing,
        },
      );

      if (response == true || response == 'true') {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('회원가입이 완료되었습니다! 🎉'),
              backgroundColor: Color(0xFF00C896),
            ),
          );
          context.go('/home');
        }
      } else {
        throw Exception('프로필 저장에 실패했습니다');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('오류: ${e.toString().replaceAll('Exception: ', '')}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        automaticallyImplyLeading: false,
        title: const Text(
          '추가 정보 입력',
          style: TextStyle(
            color: Colors.black,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: SafeArea(
              child: Form(
                key: _formKey,
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(24.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // 환영 메시지
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              const Color(0xFF00C896).withOpacity(0.1),
                              const Color(0xFF00C896).withOpacity(0.05),
                            ],
                          ),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Column(
                          children: [
                            const Icon(
                              Icons.waving_hand,
                              size: 48,
                              color: Color(0xFF00C896),
                            ),
                            const SizedBox(height: 12),
                            Text(
                              '$_providerName 로그인 성공!',
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: Colors.black87,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              '서비스 이용을 위해\n아래 정보를 입력해주세요',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 14,
                                color: Colors.grey.shade600,
                                height: 1.4,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 32),

                      // 이름 입력
                      TextFormField(
                        controller: _nameController,
                        decoration: InputDecoration(
                          labelText: '이름',
                          hintText: '실명을 입력해주세요',
                          prefixIcon: const Icon(
                            Icons.person_outline,
                            color: Color(0xFF00C896),
                          ),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          filled: true,
                          fillColor: Colors.grey.shade50,
                        ),
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return '이름을 입력해주세요';
                          }
                          if (value.trim() == '사용자') {
                            return '실명을 입력해주세요';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),

                      // 전화번호 입력
                      TextFormField(
                        controller: _phoneController,
                        keyboardType: TextInputType.phone,
                        decoration: InputDecoration(
                          labelText: '전화번호',
                          hintText: '010-1234-5678',
                          prefixIcon: const Icon(
                            Icons.phone_outlined,
                            color: Color(0xFF00C896),
                          ),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          filled: true,
                          fillColor: Colors.grey.shade50,
                          helperText: '수거/배송 안내를 위해 필요합니다',
                        ),
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return '전화번호를 입력해주세요';
                          }
                          // 간단한 전화번호 형식 검증
                          final phoneRegex = RegExp(r'^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$');
                          if (!phoneRegex.hasMatch(value.replaceAll('-', ''))) {
                            return '올바른 전화번호 형식이 아닙니다';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 32),

                      // 약관 동의 섹션
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.grey.shade50,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.grey.shade200),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // 전체 동의
                            InkWell(
                              onTap: () => _toggleAgreeAll(!_agreeToAll),
                              child: Row(
                                children: [
                                  SizedBox(
                                    width: 24,
                                    height: 24,
                                    child: Checkbox(
                                      value: _agreeToAll,
                                      onChanged: _toggleAgreeAll,
                                      activeColor: const Color(0xFF00C896),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  const Expanded(
                                    child: Text(
                                      '전체 동의',
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const Divider(height: 24),

                            // 이용약관 동의 (필수)
                            _buildAgreementRow(
                              title: '이용약관 동의',
                              isRequired: true,
                              value: _agreeToTerms,
                              onChanged: (value) {
                                setState(() => _agreeToTerms = value ?? false);
                                _updateAgreeAllState();
                              },
                              onViewTap: () => context.push('/terms'),
                            ),
                            const SizedBox(height: 12),

                            // 개인정보처리방침 동의 (필수)
                            _buildAgreementRow(
                              title: '개인정보처리방침 동의',
                              isRequired: true,
                              value: _agreeToPrivacy,
                              onChanged: (value) {
                                setState(() => _agreeToPrivacy = value ?? false);
                                _updateAgreeAllState();
                              },
                              onViewTap: () => context.push('/privacy-policy'),
                            ),
                            const SizedBox(height: 12),

                            // 마케팅 수신 동의 (선택)
                            _buildAgreementRow(
                              title: '마케팅 정보 수신 동의',
                              isRequired: false,
                              value: _agreeToMarketing,
                              onChanged: (value) {
                                setState(() => _agreeToMarketing = value ?? false);
                                _updateAgreeAllState();
                              },
                              onViewTap: null,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 32),

                      // 가입 완료 버튼
                      ElevatedButton(
                        onPressed: _isLoading ? null : _handleComplete,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF00C896),
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          elevation: 0,
                        ),
                        child: _isLoading
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                ),
                              )
                            : const Text(
                                '가입 완료',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                      ),
                      const SizedBox(height: 16),

                      // 로그아웃 링크
                      TextButton(
                        onPressed: () async {
                          await Supabase.instance.client.auth.signOut();
                          if (mounted) context.go('/login');
                        },
                        child: Text(
                          '다른 계정으로 로그인',
                          style: TextStyle(
                            color: Colors.grey.shade600,
                            fontSize: 14,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          const CompanyFooter(),
        ],
      ),
    );
  }

  /// 약관 동의 행 위젯
  Widget _buildAgreementRow({
    required String title,
    required bool isRequired,
    required bool value,
    required ValueChanged<bool?> onChanged,
    VoidCallback? onViewTap,
  }) {
    return Row(
      children: [
        SizedBox(
          width: 24,
          height: 24,
          child: Checkbox(
            value: value,
            onChanged: onChanged,
            activeColor: const Color(0xFF00C896),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            '$title ${isRequired ? "(필수)" : "(선택)"}',
            style: TextStyle(
              fontSize: 14,
              color: isRequired ? Colors.black87 : Colors.grey.shade600,
            ),
          ),
        ),
        if (onViewTap != null)
          TextButton(
            onPressed: onViewTap,
            style: TextButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            child: const Text(
              '보기',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.bold,
                color: Color(0xFF00C896),
              ),
            ),
          ),
      ],
    );
  }
}

