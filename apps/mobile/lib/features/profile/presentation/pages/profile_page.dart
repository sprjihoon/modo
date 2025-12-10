import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/widgets/company_footer.dart';
import '../../../auth/data/providers/auth_provider.dart';

/// 마이페이지 (프로필)
class ProfilePage extends ConsumerWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final userProfileAsync = ref.watch(userProfileProvider);
    
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: const Text('마이페이지'),
        elevation: 0,
        backgroundColor: Colors.white,
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                children: [
            // 사용자 정보 헤더
            userProfileAsync.when(
              data: (profile) {
                final userName = profile?['name'] as String? ?? '고객';
                final userEmail = profile?['email'] as String? ?? '';
                const mockPoints = 0; // TODO: 포인트 정보 가져오기
                return _buildUserHeader(context, userName, userEmail, mockPoints);
              },
              loading: () => _buildUserHeader(context, '고객', '', 0),
              error: (_, __) => _buildUserHeader(context, '고객', '', 0),
            ),
            const SizedBox(height: 16),
            
            // 회원 관리 섹션
            _buildSection(
              context,
              '회원 관리',
              [
                _MenuItem(
                  icon: Icons.person_outline,
                  title: '회원정보',
                  onTap: () => context.push('/profile/account'),
                ),
                _MenuItem(
                  icon: Icons.location_on_outlined,
                  title: '배송지 설정',
                  onTap: () => context.push('/profile/addresses'),
                ),
                _MenuItem(
                  icon: Icons.credit_card_outlined,
                  title: '결제수단 관리',
                  onTap: () => context.push('/profile/payment-methods'),
                ),
                _MenuItem(
                  icon: Icons.receipt_long_outlined,
                  title: '결제내역',
                  onTap: () => context.push('/profile/payment-history'),
                ),
              ],
            ),
            const SizedBox(height: 16),
            
            // 서비스 섹션
            _buildSection(
              context,
              '서비스',
              [
                _MenuItem(
                  icon: Icons.card_giftcard_outlined,
                  title: '친구초대',
                  subtitle: '친구와 함께 혜택 받기',
                  trailing: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.red,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text(
                      'HOT',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  onTap: () => context.push('/profile/invite-friends'),
                ),
                _MenuItem(
                  icon: Icons.campaign_outlined,
                  title: '공지사항',
                  onTap: () => context.push('/profile/notices'),
                ),
                _MenuItem(
                  icon: Icons.headset_mic_outlined,
                  title: '고객센터',
                  onTap: () => context.push('/profile/customer-service'),
                ),
                _MenuItem(
                  icon: Icons.settings_outlined,
                  title: '앱 설정',
                  onTap: () => context.push('/profile/settings'),
                ),
              ],
            ),
            const SizedBox(height: 16),
            
            // 로그아웃/탈퇴
            _buildSection(
              context,
              '',
              [
                _MenuItem(
                  icon: Icons.logout,
                  title: '로그아웃',
                  titleColor: Colors.red,
                  onTap: () => _showLogoutDialog(context, ref),
                ),
                _MenuItem(
                  icon: Icons.person_remove_outlined,
                  title: '회원 탈퇴',
                  titleColor: Colors.grey.shade600,
                  onTap: () => _showWithdrawDialog(context, ref),
                ),
              ],
            ),
            const SizedBox(height: 100),
                ],
              ),
            ),
          ),
          const CompanyFooter(),
        ],
      ),
    );
  }

  /// 사용자 정보 헤더
  Widget _buildUserHeader(
    BuildContext context,
    String name,
    String email,
    int points,
  ) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: const BoxDecoration(
        color: Colors.white,
      ),
      child: Row(
        children: [
          // 프로필 이미지
          Container(
            width: 72,
            height: 72,
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
              size: 40,
              color: Colors.white,
            ),
          ),
          const SizedBox(width: 16),
          
          // 사용자 정보
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$name 님',
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  email,
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey.shade600,
                  ),
                ),
                const SizedBox(height: 12),
                
                // 포인트 - 클릭 가능
                InkWell(
                  onTap: () => context.push('/profile/points-history'),
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade50,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.grey.shade300),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text(
                          '포인트',
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.black54,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '${points}P',
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: Colors.black87,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Icon(
                          Icons.arrow_forward_ios,
                          size: 12,
                          color: Colors.grey.shade500,
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// 섹션 빌더
  Widget _buildSection(
    BuildContext context,
    String title,
    List<_MenuItem> items,
  ) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (title.isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 12),
              child: Text(
                title,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey.shade700,
                ),
              ),
            ),
          ],
          ...List.generate(items.length * 2 - 1, (index) {
            if (index.isEven) {
              final item = items[index ~/ 2];
              return _buildMenuItem(context, item);
            } else {
              return Divider(
                height: 1,
                indent: 60,
                color: Colors.grey.shade200,
              );
            }
          }),
        ],
      ),
    );
  }

  /// 메뉴 아이템 빌더
  Widget _buildMenuItem(BuildContext context, _MenuItem item) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
      leading: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: (item.titleColor ?? Colors.black87).withOpacity(0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(
          item.icon,
          size: 22,
          color: item.titleColor ?? Colors.grey.shade700,
        ),
      ),
      title: Text(
        item.title,
        style: TextStyle(
          fontSize: 15,
          fontWeight: FontWeight.w500,
          color: item.titleColor ?? Colors.black87,
        ),
      ),
      subtitle: item.subtitle != null
          ? Text(
              item.subtitle!,
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey.shade600,
              ),
            )
          : null,
      trailing: item.trailing ??
          Icon(
            Icons.arrow_forward_ios,
            size: 14,
            color: Colors.grey.shade400,
          ),
      onTap: item.onTap,
    );
  }

  /// 로그아웃 다이얼로그
  void _showLogoutDialog(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: const Text(
          '로그아웃',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        content: const Text('로그아웃 하시겠습니까?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text(
              '취소',
              style: TextStyle(color: Colors.grey.shade600),
            ),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.of(context).pop();
              
              try {
                final authService = ref.read(authServiceProvider);
                await authService.signOut();
                
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('로그아웃되었습니다'),
                      backgroundColor: Color(0xFF00C896),
                    ),
                  );
                  context.go('/login');
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('로그아웃 실패: ${e.toString().replaceAll('Exception: ', '')}'),
                      backgroundColor: Colors.red.shade400,
                    ),
                  );
                }
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            child: const Text('로그아웃'),
          ),
        ],
      ),
    );
  }

  /// 회원 탈퇴 다이얼로그
  void _showWithdrawDialog(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: const Text(
          '회원 탈퇴',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        content: const Text(
          '탈퇴하시면 개인정보가 삭제됩니다.\n주문 및 작업 기록은 비즈니스 기록 보관을 위해 보관됩니다.\n정말 탈퇴하시겠습니까?',
          style: TextStyle(height: 1.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: Text(
              '취소',
              style: TextStyle(color: Colors.grey.shade600),
            ),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.of(dialogContext).pop();
              
              // 로딩 표시
              showDialog(
                context: context,
                barrierDismissible: false,
                builder: (loadingContext) => const Center(
                  child: CircularProgressIndicator(),
                ),
              );

              try {
                final authService = ref.read(authServiceProvider);
                await authService.deleteAccount();
                
                if (context.mounted) {
                  Navigator.of(context, rootNavigator: true).pop(); // 로딩 닫기
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('회원 탈퇴가 완료되었습니다'),
                      backgroundColor: Colors.red,
                    ),
                  );
                  context.go('/login');
                }
              } catch (e) {
                if (context.mounted) {
                  Navigator.of(context, rootNavigator: true).pop(); // 로딩 닫기
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('회원 탈퇴 실패: ${e.toString().replaceAll('Exception: ', '')}'),
                      backgroundColor: Colors.red,
                    ),
                  );
                }
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            child: const Text('탈퇴하기'),
          ),
        ],
      ),
    );
  }
}

/// 메뉴 아이템 모델
class _MenuItem {
  final IconData icon;
  final String title;
  final String? subtitle;
  final Widget? trailing;
  final Color? titleColor;
  final VoidCallback? onTap;

  _MenuItem({
    required this.icon,
    required this.title,
    this.subtitle,
    this.trailing,
    this.titleColor,
    this.onTap,
  });
}

