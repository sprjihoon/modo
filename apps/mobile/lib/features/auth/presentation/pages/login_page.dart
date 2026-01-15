import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/widgets/company_footer.dart';
import '../../data/providers/auth_provider.dart';

/// 로그인 화면
class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  bool _obscurePassword = true;

  @override
  void initState() {
    super.initState();
    // 로그인 페이지 진입 시 모든 auth provider 초기화 (로그아웃 후 클린업)
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.invalidate(userProfileProvider);
      ref.invalidate(currentUserProvider);
    });
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final authService = ref.read(authServiceProvider);
      final email = _emailController.text.trim();
      final password = _passwordController.text;

      await authService.signInWithEmail(
        email: email,
        password: password,
      );
      
      if (mounted) {
        context.go('/home');
      }
    } catch (e) {
      print('❌ 로그인 페이지 에러: $e');
      if (mounted) {
        String errorMessage = '로그인 실패';
        
        final errorString = e.toString();
        if (errorString.contains('Exception: ')) {
          errorMessage = errorString.replaceAll('Exception: ', '');
        } else {
          errorMessage = errorString;
        }
        
        // 사용자 친화적인 메시지로 변환
        if (errorMessage.contains('이메일 확인')) {
          errorMessage = '이메일 확인이 필요합니다.\nSupabase Dashboard에서 이메일 확인을 OFF로 설정하거나\n이메일을 확인해주세요.';
        } else if (errorMessage.contains('올바르지 않습니다')) {
          errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.';
        } else if (errorMessage.contains('네트워크') || errorMessage.contains('connection')) {
          errorMessage = '네트워크 연결을 확인해주세요.';
        } else if (errorMessage.contains('설정') || errorMessage.contains('config')) {
          errorMessage = 'Supabase 설정을 확인해주세요.\n.env 파일이 올바른지 확인하세요.';
        }
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(errorMessage),
            backgroundColor: Colors.red.shade400,
            duration: const Duration(seconds: 4),
            action: SnackBarAction(
              label: '확인',
              textColor: Colors.white,
              onPressed: () {},
            ),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _handleSocialLogin(String provider) async {
    try {
      final authService = ref.read(authServiceProvider);
      
      switch (provider) {
        case 'google':
          await authService.signInWithGoogle();
          break;
        case 'naver':
          await authService.signInWithNaver();
          break;
        case 'kakao':
          await authService.signInWithKakao();
          break;
      }
      
      // OAuth는 리다이렉트로 처리되므로 여기서는 성공 메시지만 표시
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('$provider 로그인을 시작합니다'),
            backgroundColor: const Color(0xFF00C896),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('$provider 로그인 실패: ${e.toString().replaceAll('Exception: ', '')}'),
            backgroundColor: Colors.red.shade400,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Theme.of(context).colorScheme.primary.withOpacity(0.1),
                    Theme.of(context).colorScheme.secondary.withOpacity(0.1),
                  ],
                ),
              ),
              child: SafeArea(
                child: Center(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(24.0),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // 로고 & 타이틀
                          _buildHeader(context),
                          const SizedBox(height: 48),
                          
                          // 로그인 카드
                          Card(
                            elevation: 8,
                            shadowColor: Colors.black.withOpacity(0.1),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Padding(
                              padding: const EdgeInsets.all(24.0),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  // 이메일 입력
                                  TextFormField(
                              controller: _emailController,
                              keyboardType: TextInputType.emailAddress,
                              decoration: InputDecoration(
                                labelText: '이메일',
                                hintText: 'example@email.com',
                                prefixIcon: Icon(
                                  Icons.email_outlined,
                                  color: Theme.of(context).colorScheme.primary,
                                ),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                filled: true,
                                fillColor: Colors.grey.shade50,
                              ),
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return '이메일을 입력하세요';
                                }
                                if (!value.contains('@')) {
                                  return '올바른 이메일 형식이 아닙니다';
                                }
                                return null;
                              },
                            ),
                                  const SizedBox(height: 16),
                                  
                                  // 비밀번호 입력
                                  TextFormField(
                              controller: _passwordController,
                              obscureText: _obscurePassword,
                              decoration: InputDecoration(
                                labelText: '비밀번호',
                                hintText: '••••••••',
                                prefixIcon: Icon(
                                  Icons.lock_outlined,
                                  color: Theme.of(context).colorScheme.primary,
                                ),
                                suffixIcon: IconButton(
                                  icon: Icon(
                                    _obscurePassword
                                        ? Icons.visibility_outlined
                                        : Icons.visibility_off_outlined,
                                    color: Colors.grey,
                                  ),
                                  onPressed: () {
                                    setState(() {
                                      _obscurePassword = !_obscurePassword;
                                    });
                                  },
                                ),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                filled: true,
                                fillColor: Colors.grey.shade50,
                              ),
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return '비밀번호를 입력하세요';
                                }
                                if (value.length < 6) {
                                  return '비밀번호는 6자 이상이어야 합니다';
                                }
                                return null;
                              },
                            ),
                                  const SizedBox(height: 12),
                                  
                                  // 비밀번호 찾기
                                  Align(
                              alignment: Alignment.centerRight,
                              child: TextButton(
                                onPressed: () {
                                  context.push('/forgot-password');
                                },
                                child: Text(
                                  '비밀번호를 잊으셨나요?',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.grey.shade600,
                                  ),
                                ),
                              ),
                            ),
                                  const SizedBox(height: 8),
                                  
                                  // 로그인 버튼
                                  ElevatedButton(
                              onPressed: _isLoading ? null : _handleLogin,
                              style: ElevatedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 16),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                elevation: 2,
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
                                      '로그인',
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 24),
                          
                          // 소셜 로그인 구분선
                          Row(
                            children: [
                              Expanded(child: Divider(color: Colors.grey.shade300)),
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 16),
                                child: Text(
                                  '간편 로그인',
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: Colors.grey.shade600,
                                  ),
                                ),
                              ),
                              Expanded(child: Divider(color: Colors.grey.shade300)),
                            ],
                          ),
                          const SizedBox(height: 24),
                          
                          // 소셜 로그인 버튼
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                        _buildSocialButton(
                          'Google',
                          Colors.white,
                          Colors.black87,
                          () => _handleSocialLogin('google'),
                        ),
                        const SizedBox(width: 16),
                        _buildSocialButton(
                          'Naver',
                          const Color(0xFF03C75A),
                          Colors.white,
                          () => _handleSocialLogin('naver'),
                        ),
                        const SizedBox(width: 16),
                        _buildSocialButton(
                          'Kakao',
                          const Color(0xFFFFE812),
                          Colors.black87,
                          () => _handleSocialLogin('kakao'),
                            ),
                          ],
                        ),
                          const SizedBox(height: 24),
                          
                          // 회원가입 링크
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                        Text(
                          '계정이 없으신가요?',
                          style: TextStyle(
                            color: Colors.grey.shade700,
                            fontSize: 14,
                          ),
                        ),
                        TextButton(
                          onPressed: () {
                            context.push('/signup');
                          },
                          child: const Text(
                            '회원가입',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                            ),
                          ],
                        ),
                        ],
                      ),
                    ),
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

  Widget _buildHeader(BuildContext context) {
    return Column(
      children: [
        // 로고 아이콘
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Theme.of(context).colorScheme.primary,
                Theme.of(context).colorScheme.secondary,
              ],
            ),
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: Theme.of(context).colorScheme.primary.withOpacity(0.3),
                blurRadius: 20,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: const Icon(
            Icons.checkroom_rounded,
            size: 48,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 24),
        
        // 타이틀
        const Text(
          '모두의수선',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 32,
            fontWeight: FontWeight.bold,
            letterSpacing: -0.5,
          ),
        ),
        const SizedBox(height: 8),
        
        // 서브타이틀
        Text(
          '비대면 의류 수선 플랫폼',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 14,
            color: Colors.grey.shade600,
            letterSpacing: 0.5,
          ),
        ),
      ],
    );
  }

  /// 소셜 로그인 버튼
  Widget _buildSocialButton(
    String name,
    Color bgColor,
    Color textColor,
    VoidCallback onTap,
  ) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: 70,
        height: 70,
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: name == 'Google' ? Colors.grey.shade300 : Colors.transparent,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // 첫 글자를 크게 표시
            Text(
              name[0],
              style: TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.bold,
                color: textColor,
              ),
            ),
            Text(
              name,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: textColor,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

