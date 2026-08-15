import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/widgets/company_footer.dart';
import '../../../../core/widgets/modo_app_bar.dart';
import '../../../auth/data/providers/auth_provider.dart';

/// 회원정보 페이지
class AccountInfoPage extends ConsumerStatefulWidget {
  const AccountInfoPage({super.key});

  @override
  ConsumerState<AccountInfoPage> createState() => _AccountInfoPageState();
}

class _AccountInfoPageState extends ConsumerState<AccountInfoPage> {
  late final TextEditingController _nameController;
  late final TextEditingController _phoneController;
  late final TextEditingController _emailController;
  late final TextEditingController _withdrawConfirmController;
  
  bool _isEditing = false;
  bool _showWithdraw = false;
  bool _isWithdrawing = false;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController();
    _phoneController = TextEditingController();
    _emailController = TextEditingController();
    _withdrawConfirmController = TextEditingController();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _withdrawConfirmController.dispose();
    super.dispose();
  }


  Future<void> _saveChanges() async {
    // 입력값 검증
    final name = _nameController.text.trim();
    final phone = _phoneController.text.trim();

    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('이름을 입력해주세요'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    if (phone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('전화번호를 입력해주세요'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    // 전화번호 형식 검증 (간단한 검증)
    if (!RegExp(r'^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$').hasMatch(phone.replaceAll('-', ''))) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('올바른 전화번호 형식이 아닙니다'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() => _isEditing = false);

    // 로딩 표시
    if (!mounted) return;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: CircularProgressIndicator(),
      ),
    );

    try {
      final authService = ref.read(authServiceProvider);
      
      // 프로필 업데이트
      await authService.updateProfile(
        name: name,
        phone: phone,
      );

      // 프로필 Provider 새로고침
      ref.invalidate(userProfileProvider);

      if (!mounted) return;
      Navigator.of(context).pop(); // 로딩 다이얼로그 닫기

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('회원정보가 수정되었습니다'),
          backgroundColor: Color(0xFF00C896),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      Navigator.of(context).pop(); // 로딩 다이얼로그 닫기

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            e.toString().replaceAll('Exception: ', ''),
          ),
          backgroundColor: Colors.red,
          duration: const Duration(seconds: 3),
        ),
      );

      // 에러 발생 시 수정 모드 유지
      setState(() => _isEditing = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final userProfileAsync = ref.watch(userProfileProvider);
    
    // 사용자 정보가 로드되면 컨트롤러 업데이트
    userProfileAsync.whenData((profile) {
      if (profile != null && !_isEditing) {
        _nameController.text = profile.name;
        _phoneController.text = profile.phone;
        _emailController.text = profile.email;
      }
    });
    
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: ModoAppBar(
        title: const Text('회원정보'),
        actions: [
          if (!_isEditing)
            TextButton(
              onPressed: () => setState(() => _isEditing = true),
              child: const Text('수정'),
            )
          else
            TextButton(
              onPressed: _saveChanges,
              child: const Text(
                '저장',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
        ],
      ),
      body: SafeArea(
        top: false,
        child: userProfileAsync.when(
        data: (profile) => Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                  // 프로필 이미지
                  Center(
                    child: Stack(
                      children: [
                        Container(
                          width: 100,
                          height: 100,
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [
                                Theme.of(context).colorScheme.primary,
                                Theme.of(context).colorScheme.secondary,
                              ],
                            ),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.person,
                            size: 50,
                            color: Colors.white,
                          ),
                        ),
                        if (_isEditing)
                          Positioned(
                            right: 0,
                            bottom: 0,
                            child: Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: const Color(0xFF00C896),
                                shape: BoxShape.circle,
                                border: Border.all(color: Colors.white, width: 2),
                              ),
                              child: const Icon(
                                Icons.camera_alt,
                                size: 16,
                                color: Colors.white,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),
                  
                  // 회원정보 폼
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: Column(
                      children: [
                        _buildTextField(
                          label: '이름',
                          controller: _nameController,
                          icon: Icons.person_outline,
                          enabled: _isEditing,
                        ),
                        const SizedBox(height: 20),
                        _buildTextField(
                          label: '전화번호',
                          controller: _phoneController,
                          icon: Icons.phone_outlined,
                          enabled: _isEditing,
                        ),
                        const SizedBox(height: 20),
                        _buildTextField(
                          label: '이메일',
                          controller: _emailController,
                          icon: Icons.email_outlined,
                          enabled: false, // 이메일은 변경 불가
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  
                  if (ref.read(authServiceProvider).canChangePassword) ...[
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
                            color: Colors.orange.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(
                            Icons.lock_outline,
                            size: 22,
                            color: Colors.orange,
                          ),
                        ),
                        title: const Text(
                          '비밀번호 변경',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        trailing: Icon(
                          Icons.arrow_forward_ios,
                          size: 14,
                          color: Colors.grey.shade400,
                        ),
                        onTap: () {
                          context.push('/profile/change-password');
                        },
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // 회원탈퇴 (웹 회원정보와 동일 위치)
                  _buildWithdrawSection(),
                  ],
                ),
              ),
            ),
            const CompanyFooter(),
          ],
        ),
        loading: () => const Center(
          child: CircularProgressIndicator(),
        ),
        error: (error, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 16),
              const Text('정보를 불러올 수 없습니다'),
              const SizedBox(height: 8),
              TextButton(
                onPressed: () {
                  ref.invalidate(userProfileProvider);
                },
                child: const Text('다시 시도'),
              ),
            ],
          ),
        ),
      ),
      ),
    );
  }

  Widget _buildWithdrawSection() {
    final canWithdraw = _withdrawConfirmController.text.trim() == '탈퇴';

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        children: [
          ListTile(
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
            leading: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: Colors.red.withOpacity(0.08),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(
                Icons.warning_amber_rounded,
                size: 22,
                color: Colors.red,
              ),
            ),
            title: const Text(
              '회원탈퇴',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w500),
            ),
            trailing: Text(
              _showWithdraw ? '닫기' : '탈퇴하기',
              style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
            ),
            onTap: () {
              setState(() {
                _showWithdraw = !_showWithdraw;
                if (!_showWithdraw) {
                  _withdrawConfirmController.clear();
                }
              });
            },
          ),
          if (_showWithdraw) ...[
            Divider(height: 1, color: Colors.grey.shade200),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.red.shade50,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '탈퇴 전 꼭 확인해주세요\n'
                      '• 계정 및 모든 개인정보가 삭제됩니다.\n'
                      '• 진행 중인 수선 주문이 있는 경우 취소될 수 있습니다.\n'
                      '• 보유 포인트는 환급되지 않습니다.\n'
                      '• 탈퇴 후 복구가 불가능합니다.',
                      style: TextStyle(
                        fontSize: 12,
                        height: 1.5,
                        color: Colors.red.shade700,
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Text.rich(
                    TextSpan(
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Colors.grey.shade600,
                      ),
                      children: const [
                        TextSpan(text: '확인을 위해 '),
                        TextSpan(
                          text: '탈퇴',
                          style: TextStyle(
                            color: Colors.red,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        TextSpan(text: '를 입력해주세요'),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _withdrawConfirmController,
                    onChanged: (_) => setState(() {}),
                    decoration: InputDecoration(
                      hintText: '탈퇴',
                      filled: true,
                      fillColor: Colors.grey.shade50,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: Colors.grey.shade300),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: Colors.grey.shade300),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide:
                            BorderSide(color: Colors.red.shade300, width: 2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      onPressed: (!canWithdraw || _isWithdrawing)
                          ? null
                          : _handleWithdraw,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.red,
                        foregroundColor: Colors.white,
                        disabledBackgroundColor: Colors.red.withOpacity(0.35),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: Text(
                        _isWithdrawing ? '탈퇴 처리 중...' : '회원탈퇴',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _handleWithdraw() async {
    if (_withdrawConfirmController.text.trim() != '탈퇴') return;

    setState(() => _isWithdrawing = true);
    try {
      final authService = ref.read(authServiceProvider);
      final success = await authService.deleteAccount();
      if (!mounted) return;

      if (success) {
        await showDialog(
          context: context,
          barrierDismissible: false,
          builder: (ctx) => AlertDialog(
            title: const Text('회원 탈퇴 완료'),
            content: const Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.check_circle_outline, color: Colors.green, size: 56),
                SizedBox(height: 12),
                Text('회원 탈퇴가 완료되었습니다.'),
                SizedBox(height: 8),
                Text(
                  '그동안 이용해주셔서 감사합니다.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.of(ctx).pop();
                  context.go('/login');
                },
                child: const Text('확인'),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            '회원 탈퇴 실패: ${e.toString().replaceAll('Exception: ', '')}',
          ),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) setState(() => _isWithdrawing = false);
    }
  }

  Widget _buildTextField({
    required String label,
    required TextEditingController controller,
    required IconData icon,
    required bool enabled,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: Colors.grey.shade700,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          enabled: enabled,
          decoration: InputDecoration(
            prefixIcon: Icon(
              icon,
              color: enabled ? const Color(0xFF00C896) : Colors.grey.shade400,
            ),
            filled: true,
            fillColor: enabled ? Colors.grey.shade50 : Colors.grey.shade100,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Colors.grey.shade300),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFF00C896), width: 2),
            ),
          ),
        ),
      ],
    );
  }
}

