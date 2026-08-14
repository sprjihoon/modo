import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/company_footer.dart';
import '../../../../core/widgets/modo_app_bar.dart';
import '../../data/providers/auth_provider.dart';

/// 회원가입 화면
class SignupPage extends ConsumerStatefulWidget {
  const SignupPage({super.key});

  @override
  ConsumerState<SignupPage> createState() => _SignupPageState();
}

class _SignupPageState extends ConsumerState<SignupPage>
    with WidgetsBindingObserver {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _passwordConfirmController = TextEditingController();
  final _phoneController = TextEditingController();
  
  bool _isLoading = false;
  bool _isSocialLoginInProgress = false;
  String _socialProviderLabel = '';
  String? _pendingSocialProvider;
  bool _obscurePassword = true;
  bool _obscurePasswordConfirm = true;
  bool _agreeToTerms = false;
  bool _agreeToPrivacy = false;
  bool _isEmailChecked = false;
  bool _isPhoneChecked = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    super.didChangeAppLifecycleState(state);
    if (state != AppLifecycleState.resumed || !mounted) return;

    final provider = _pendingSocialProvider;
    final isNative = provider == 'naver';
    if (_isSocialLoginInProgress &&
        provider != null &&
        !isNative) {
      Future.delayed(const Duration(milliseconds: 800), () {
        if (!mounted) return;
        if (_isSocialLoginInProgress &&
            Supabase.instance.client.auth.currentSession == null) {
          setState(() {
            _isSocialLoginInProgress = false;
            _pendingSocialProvider = null;
            _socialProviderLabel = '';
          });
        }
      });
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _passwordConfirmController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  /// 이메일 중복 체크
  Future<void> _checkEmailDuplicate() async {
    final email = _emailController.text.trim();
    
    if (email.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('이메일을 입력해주세요'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    if (!email.contains('@')) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('올바른 이메일 형식이 아닙니다'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    try {
      final authService = ref.read(authServiceProvider);
      final isDuplicate = await authService.checkEmailDuplicate(email);

      if (mounted) {
        if (isDuplicate) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('이미 사용 중인 이메일입니다'),
              backgroundColor: Colors.red,
            ),
          );
          setState(() => _isEmailChecked = false);
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('사용 가능한 이메일입니다'),
              backgroundColor: Color(0xFF00C896),
            ),
          );
          setState(() => _isEmailChecked = true);
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('중복 확인 실패: ${e.toString().replaceAll('Exception: ', '')}'),
            backgroundColor: Colors.red,
          ),
        );
        setState(() => _isEmailChecked = false);
      }
    }
  }

  /// 전화번호 중복 체크
  Future<void> _checkPhoneDuplicate() async {
    final phone = _phoneController.text.trim();
    
    if (phone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('전화번호를 입력해주세요'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    try {
      final authService = ref.read(authServiceProvider);
      final isDuplicate = await authService.checkPhoneDuplicate(phone);

      if (mounted) {
        if (isDuplicate) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('이미 사용 중인 전화번호입니다'),
              backgroundColor: Colors.red,
            ),
          );
          setState(() => _isPhoneChecked = false);
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('사용 가능한 전화번호입니다'),
              backgroundColor: Color(0xFF00C896),
            ),
          );
          setState(() => _isPhoneChecked = true);
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('중복 확인 실패: ${e.toString().replaceAll('Exception: ', '')}'),
            backgroundColor: Colors.red,
          ),
        );
        setState(() => _isPhoneChecked = false);
      }
    }
  }

  Future<void> _handleSignup() async {
    if (!_formKey.currentState!.validate()) return;

    // 중복 체크 확인
    if (!_isEmailChecked) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('이메일 중복 확인을 해주세요'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    if (!_isPhoneChecked) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('전화번호 중복 확인을 해주세요'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    if (!_agreeToTerms || !_agreeToPrivacy) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('이용약관 및 개인정보처리방침에 동의해주세요'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final authService = ref.read(authServiceProvider);
      final email = _emailController.text.trim();
      final password = _passwordController.text;
      final name = _nameController.text.trim();
      final phone = _phoneController.text.trim();

      await authService.signUpWithEmail(
        email: email,
        password: password,
        name: name,
        phone: phone,
      );
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('회원가입이 완료되었습니다'),
            backgroundColor: Color(0xFF00C896),
          ),
        );
        context.go('/home');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('회원가입 실패: ${e.toString().replaceAll('Exception: ', '')}'),
            backgroundColor: Colors.red.shade400,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<String> _routeAfterAuth() async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) return '/home';
      final response = await Supabase.instance.client.rpc(
        'check_profile_completed',
        params: {'p_auth_id': user.id},
      );
      if (response is List && response.isNotEmpty) {
        final isCompleted = response.first['is_completed'] as bool? ?? false;
        if (!isCompleted) return '/complete-profile';
      }
    } catch (_) {}
    return '/home';
  }

  Future<void> _handleSocialSignup(String provider) async {
    final labels = {
      'google': 'Google',
      'naver': '네이버',
      'kakao': '카카오',
      'apple': 'Apple',
    };
    setState(() {
      _isSocialLoginInProgress = true;
      _socialProviderLabel = labels[provider] ?? provider;
      _pendingSocialProvider = provider;
    });

    try {
      final authService = ref.read(authServiceProvider);
      bool success = false;

      switch (provider) {
        case 'google':
          success = await authService.signInWithGoogle();
          break;
        case 'naver':
          success = await authService.signInWithNaver();
          break;
        case 'kakao':
          success = await authService.signInWithKakao();
          break;
        case 'apple':
          success = await authService.signInWithApple();
          break;
      }

      if (success &&
          Supabase.instance.client.auth.currentSession != null &&
          mounted) {
        setState(() {
          _isSocialLoginInProgress = false;
          _pendingSocialProvider = null;
          _socialProviderLabel = '';
        });
        final route = await _routeAfterAuth();
        if (mounted) context.go(route);
      }

      if (!success && mounted) {
        setState(() {
          _isSocialLoginInProgress = false;
          _pendingSocialProvider = null;
          _socialProviderLabel = '';
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSocialLoginInProgress = false;
          _pendingSocialProvider = null;
          _socialProviderLabel = '';
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              provider == 'apple'
                  ? 'Apple 로그인을 완료하지 못했습니다. 다시 시도해주세요.'
                  : '소셜 가입을 완료하지 못했습니다. 다시 시도해주세요.',
            ),
            backgroundColor: Colors.red.shade400,
          ),
        );
      }
    }
  }

  /// 흰 가입 화면이 시스템 다크모드 텍스트(흰색)를 물려받지 않도록 고정
  InputDecoration _inputDecoration({
    required BuildContext context,
    required String labelText,
    required String hintText,
    required IconData prefixIcon,
    Widget? suffixIcon,
  }) {
    return InputDecoration(
      labelText: labelText,
      hintText: hintText,
      labelStyle: TextStyle(color: Colors.grey.shade700),
      floatingLabelStyle: TextStyle(
        color: Theme.of(context).colorScheme.primary,
      ),
      hintStyle: TextStyle(color: Colors.grey.shade500),
      prefixIcon: Icon(
        prefixIcon,
        color: Theme.of(context).colorScheme.primary,
      ),
      suffixIcon: suffixIcon,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      filled: true,
      fillColor: Colors.grey.shade50,
    );
  }

  static const _fieldTextStyle = TextStyle(color: Colors.black87);

  @override
  Widget build(BuildContext context) {
    // 배경을 흰색으로 쓰는 화면이라 다크모드 테마 글자색이 안 보이게 됨 → 라이트 테마 고정
    return Theme(
      data: AppTheme.lightTheme,
      child: Builder(
        builder: (context) => _buildBody(context),
      ),
    );
  }

  Widget _buildBody(BuildContext context) {
    if (_isSocialLoginInProgress) {
      return Scaffold(
        backgroundColor: Colors.white,
        body: SafeArea(
          top: false,
          child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(
                color: Theme.of(context).colorScheme.primary,
              ),
              const SizedBox(height: 16),
              Text(
                _socialProviderLabel.isEmpty
                    ? '소셜 계정으로 이동 중...'
                    : '$_socialProviderLabel로 이동 중...',
                style: TextStyle(color: Colors.grey.shade700),
              ),
              if (_pendingSocialProvider != null &&
                  _pendingSocialProvider != 'naver') ...[
                const SizedBox(height: 20),
                TextButton(
                  onPressed: () {
                    setState(() {
                      _isSocialLoginInProgress = false;
                      _pendingSocialProvider = null;
                      _socialProviderLabel = '';
                    });
                  },
                  child: Text(
                    '취소',
                    style: TextStyle(color: Colors.grey.shade600),
                  ),
                ),
              ],
            ],
          ),
        ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: const ModoAppBar(
        title: Text(
          '회원가입',
          style: TextStyle(
            color: Colors.black,
            fontWeight: FontWeight.bold,
          ),
        ),
        showHome: false,
      ),
      body: SafeArea(
        top: false,
        child: Column(
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
                // 헤더
                const Text(
                  '모두의수선에\n오신 것을 환영합니다',
                  style: TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                    height: 1.3,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  '간편하게 가입하고 수선 서비스를 이용하세요',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey.shade600,
                  ),
                ),
                const SizedBox(height: 40),
                
                // 이름
                TextFormField(
                  controller: _nameController,
                  style: _fieldTextStyle,
                  decoration: _inputDecoration(
                    context: context,
                    labelText: '이름',
                    hintText: '홍길동',
                    prefixIcon: Icons.person_outline,
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return '이름을 입력해주세요';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                
                // 이메일 (중복 체크 포함)
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _emailController,
                        style: _fieldTextStyle,
                        keyboardType: TextInputType.emailAddress,
                        onChanged: (value) {
                          // 이메일 변경 시 중복 체크 초기화
                          if (_isEmailChecked) {
                            setState(() => _isEmailChecked = false);
                          }
                        },
                        decoration: _inputDecoration(
                          context: context,
                          labelText: '이메일',
                          hintText: 'example@email.com',
                          prefixIcon: Icons.email_outlined,
                          suffixIcon: _isEmailChecked
                              ? const Icon(Icons.check_circle, color: Color(0xFF00C896))
                              : null,
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return '이메일을 입력해주세요';
                          }
                          if (!value.contains('@')) {
                            return '올바른 이메일 형식이 아닙니다';
                          }
                          return null;
                        },
                      ),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton(
                      onPressed: _checkEmailDuplicate,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _isEmailChecked
                            ? Colors.grey.shade400
                            : const Color(0xFF00C896),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 16,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: Text(
                        _isEmailChecked ? '확인완료' : '중복확인',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                
                // 전화번호 (중복 체크 포함)
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _phoneController,
                        style: _fieldTextStyle,
                        keyboardType: TextInputType.phone,
                        onChanged: (value) {
                          // 전화번호 변경 시 중복 체크 초기화
                          if (_isPhoneChecked) {
                            setState(() => _isPhoneChecked = false);
                          }
                        },
                        decoration: _inputDecoration(
                          context: context,
                          labelText: '전화번호',
                          hintText: '010-1234-5678',
                          prefixIcon: Icons.phone_outlined,
                          suffixIcon: _isPhoneChecked
                              ? const Icon(Icons.check_circle, color: Color(0xFF00C896))
                              : null,
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return '전화번호를 입력해주세요';
                          }
                          return null;
                        },
                      ),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton(
                      onPressed: _checkPhoneDuplicate,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _isPhoneChecked
                            ? Colors.grey.shade400
                            : const Color(0xFF00C896),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 16,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: Text(
                        _isPhoneChecked ? '확인완료' : '중복확인',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                
                // 비밀번호
                TextFormField(
                  controller: _passwordController,
                  style: _fieldTextStyle,
                  obscureText: _obscurePassword,
                  decoration: _inputDecoration(
                    context: context,
                    labelText: '비밀번호',
                    hintText: '6자 이상 입력',
                    prefixIcon: Icons.lock_outlined,
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
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return '비밀번호를 입력해주세요';
                    }
                    if (value.length < 8) {
                      return '비밀번호는 8자 이상이어야 합니다';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                
                // 비밀번호 확인
                TextFormField(
                  controller: _passwordConfirmController,
                  style: _fieldTextStyle,
                  obscureText: _obscurePasswordConfirm,
                  decoration: _inputDecoration(
                    context: context,
                    labelText: '비밀번호 확인',
                    hintText: '비밀번호 재입력',
                    prefixIcon: Icons.lock_outlined,
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscurePasswordConfirm
                            ? Icons.visibility_outlined
                            : Icons.visibility_off_outlined,
                        color: Colors.grey,
                      ),
                      onPressed: () {
                        setState(() {
                          _obscurePasswordConfirm = !_obscurePasswordConfirm;
                        });
                      },
                    ),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return '비밀번호를 다시 입력해주세요';
                    }
                    if (value != _passwordController.text) {
                      return '비밀번호가 일치하지 않습니다';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 24),
                
                // 약관 동의
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade50,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.grey.shade200),
                  ),
                  child: Column(
                    children: [
                      // 이용약관 동의
                      Row(
                        children: [
                          SizedBox(
                            width: 24,
                            height: 24,
                            child: Checkbox(
                              value: _agreeToTerms,
                              onChanged: (value) {
                                setState(() {
                                  _agreeToTerms = value ?? false;
                                });
                              },
                              activeColor: const Color(0xFF00C896),
                            ),
                          ),
                          const SizedBox(width: 8),
                          const Expanded(
                            child: Text(
                              '이용약관 동의 (필수)',
                              style: TextStyle(
                                fontSize: 14,
                                color: Colors.black87,
                              ),
                            ),
                          ),
                          TextButton(
                            onPressed: () {
                              context.push('/terms');
                            },
                            style: TextButton.styleFrom(
                              padding: const EdgeInsets.symmetric(horizontal: 8),
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
                      ),
                      const SizedBox(height: 8),
                      
                      // 개인정보처리방침 동의
                      Row(
                        children: [
                          SizedBox(
                            width: 24,
                            height: 24,
                            child: Checkbox(
                              value: _agreeToPrivacy,
                              onChanged: (value) {
                                setState(() {
                                  _agreeToPrivacy = value ?? false;
                                });
                              },
                              activeColor: const Color(0xFF00C896),
                            ),
                          ),
                          const SizedBox(width: 8),
                          const Expanded(
                            child: Text(
                              '개인정보처리방침 동의 (필수)',
                              style: TextStyle(
                                fontSize: 14,
                                color: Colors.black87,
                              ),
                            ),
                          ),
                          TextButton(
                            onPressed: () {
                              context.push('/privacy-policy');
                            },
                            style: TextButton.styleFrom(
                              padding: const EdgeInsets.symmetric(horizontal: 8),
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
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                
                // 회원가입 버튼
                ElevatedButton(
                  onPressed: _isLoading ? null : _handleSignup,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF00C896),
                    foregroundColor: Colors.white,
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
                          '회원가입',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                ),
                const SizedBox(height: 24),
                
                // 소셜 회원가입 구분선
                Row(
                  children: [
                    Expanded(child: Divider(color: Colors.grey.shade300)),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Text(
                        '소셜 계정으로 가입',
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
                      'Apple',
                      Colors.black,
                      Colors.white,
                      () => _handleSocialSignup('apple'),
                    ),
                    const SizedBox(width: 12),
                    _buildSocialButton(
                      'Google',
                      Colors.white,
                      Colors.black87,
                      () => _handleSocialSignup('google'),
                    ),
                    const SizedBox(width: 12),
                    _buildSocialButton(
                      'Naver',
                      const Color(0xFF03C75A),
                      Colors.white,
                      () => _handleSocialSignup('naver'),
                    ),
                    const SizedBox(width: 12),
                    _buildSocialButton(
                      'Kakao',
                      const Color(0xFFFFE812),
                      Colors.black87,
                      () => _handleSocialSignup('kakao'),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                
                // 로그인 링크
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      '이미 계정이 있으신가요?',
                      style: TextStyle(
                        color: Colors.grey.shade700,
                        fontSize: 14,
                      ),
                    ),
                    TextButton(
                      onPressed: () {
                        context.pop();
                      },
                      child: const Text(
                        '로그인',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF00C896),
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
          const CompanyFooter(),
        ],
      ),
      ),
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


