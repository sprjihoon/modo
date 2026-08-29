import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/widgets/company_footer.dart';
import '../../../../core/widgets/modo_app_bar.dart';
import '../../../auth/data/providers/auth_provider.dart';

/// 마이페이지 (프로필)
class ProfilePage extends ConsumerWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isLoggedIn = ref.watch(isLoggedInProvider);
    final userProfileAsync = ref.watch(userProfileProvider);
    
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: const ModoAppBar(
        title: Text('마이페이지'),
      ),
      body: SafeArea(
        top: false,
        child: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                children: [
            if (!isLoggedIn)
              _buildGuestHeader(context)
            else
              userProfileAsync.when(
                data: (profile) {
                  final userName = profile?.name ?? '고객';
                  final userEmail = profile?.email ?? '';
                  final userPoints = profile?.pointBalance ?? 0;
                  return _buildUserHeader(context, userName, userEmail, userPoints);
                },
                loading: () => _buildUserHeader(context, '고객', '', 0),
                error: (_, __) => _buildUserHeader(context, '고객', '', 0),
              ),
            const SizedBox(height: 16),
            
            if (isLoggedIn) ...[
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
                    icon: Icons.receipt_long_outlined,
                    title: '결제내역',
                    onTap: () => context.push('/profile/payment-history'),
                  ),
                  _MenuItem(
                    icon: Icons.monetization_on_outlined,
                    title: '포인트 내역',
                    onTap: () => context.push('/profile/points-history'),
                  ),
                  _MenuItem(
                    icon: Icons.rate_review_outlined,
                    title: '내 리뷰',
                    subtitle: '작성한 리뷰 수정·삭제',
                    onTap: () => context.push('/profile/reviews'),
                  ),
                ],
              ),
              const SizedBox(height: 16),
            ],
            
            // 서비스 섹션
            _buildSection(
              context,
              '서비스',
              [
                if (isLoggedIn)
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
            if (isLoggedIn) ...[
              const SizedBox(height: 16),
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
                ],
              ),
            ],
            const SizedBox(height: 100),
                ],
              ),
            ),
          ),
          const CompanyFooter(),
        ],
      ),
      ),
    );
  }

  Widget _buildGuestHeader(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      color: Colors.white,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '로그인이 필요합니다',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '주문·결제 등 회원 기능은 로그인 후 이용할 수 있어요.',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey.shade600,
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () => context.push('/login?from=/profile'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF00C896),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: 0,
              ),
              child: const Text(
                '로그인',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ),
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
      builder: (dialogContext) => AlertDialog(
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
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: Text(
              '취소',
              style: TextStyle(color: Colors.grey.shade600),
            ),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.of(dialogContext).pop();
              
              try {
                // 🔄 먼저 모든 auth 관련 provider를 invalidate
                ref.invalidate(userProfileProvider);
                ref.invalidate(currentUserProvider);
                
                final authService = ref.read(authServiceProvider);
                
                if (context.mounted) {
                  context.go('/home');
                }
                
                // 페이지 이동 후 로그아웃 실행
                await Future.delayed(const Duration(milliseconds: 100));
                await authService.signOut();
                
              } catch (e) {
                debugPrint('❌ 로그아웃 오류: $e');
                // 에러가 발생해도 이미 로그인 페이지로 이동했으므로 무시
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

