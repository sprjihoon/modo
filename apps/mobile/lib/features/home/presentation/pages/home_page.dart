import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/widgets/company_footer.dart';
import '../../../auth/data/providers/auth_provider.dart';

/// 홈 화면
class HomePage extends ConsumerStatefulWidget {
  const HomePage({super.key});

  @override
  ConsumerState<HomePage> createState() => _HomePageState();
}

class _HomePageState extends ConsumerState<HomePage> {
  final PageController _bannerController = PageController();
  int _currentBannerIndex = 0;

  @override
  void dispose() {
    _bannerController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text(
          '모두의수선',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            color: Colors.black,
          ),
        ),
        actions: [
          // 주문 목록 아이콘
          IconButton(
            icon: const Icon(Icons.receipt_long_outlined, color: Colors.black),
            tooltip: '내 주문',
            onPressed: () {
              context.push('/orders');
            },
          ),
          // 마이페이지 아이콘
          IconButton(
            icon: const Icon(Icons.person_outline, color: Colors.black),
            tooltip: '마이페이지',
            onPressed: () {
              context.push('/profile');
            },
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
            // 인사말
            _buildGreeting(context),
            const SizedBox(height: 20),
            
            // 슬라이드 배너
            _buildBannerSlider(context),
            const SizedBox(height: 24),
            
            // 가격표 & 가이드 버튼
            _buildActionButtons(context),
            const SizedBox(height: 24),
            
            // 내 주문 섹션
            _buildMyOrdersSection(context),
            const SizedBox(height: 24),
            
            // 프로모션 배너
            _buildPromotionBanner(context),
            const SizedBox(height: 80),
                ],
              ),
            ),
          ),
          const CompanyFooter(),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showPreparationDialog(context),
        backgroundColor: const Color(0xFF00C896),
        icon: const Icon(Icons.add),
        label: const Text('첫 수거신청 하기'),
        elevation: 4,
      ),
    );
  }

  /// 수선물 준비 안내 다이얼로그
  void _showPreparationDialog(BuildContext context) {
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (context) => Dialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // X 닫기 버튼
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  InkWell(
                    onTap: () => Navigator.of(context).pop(),
                    borderRadius: BorderRadius.circular(20),
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      child: Icon(
                        Icons.close,
                        size: 24,
                        color: Colors.grey.shade600,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              
              // 타이틀
              const Text(
                '다음 단계 진행을 위해',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w500,
                  color: Colors.black87,
                ),
              ),
              const SizedBox(height: 4),
              RichText(
                textAlign: TextAlign.center,
                text: TextSpan(
                  style: const TextStyle(
                    fontSize: 20,
                    height: 1.4,
                  ),
                  children: [
                    TextSpan(
                      text: '수선의류를 미리 ',
                      style: TextStyle(
                        color: Colors.grey.shade800,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    TextSpan(
                      text: '준비',
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.primary,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    TextSpan(
                      text: '해주세요',
                      style: TextStyle(
                        color: Colors.grey.shade800,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),
              
              // 의류 이미지
              Container(
                width: 200,
                height: 200,
                decoration: BoxDecoration(
                  color: Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: Colors.grey.shade200,
                    width: 2,
                  ),
                ),
                child: Center(
                  child: Icon(
                    Icons.checkroom_rounded,
                    size: 100,
                    color: Theme.of(context).colorScheme.primary.withOpacity(0.3),
                  ),
                ),
              ),
              const SizedBox(height: 32),
              
              // 확인 버튼
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.of(context).pop();
                    // 의류 종류 선택 화면으로 이동
                    context.push('/select-clothing-type', extra: <String>[]);
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF00C896),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    elevation: 0,
                  ),
                  child: const Text(
                    '확인',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildGreeting(BuildContext context) {
    final userProfileAsync = ref.watch(userProfileProvider);
    
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: userProfileAsync.when(
        data: (profile) {
          // 사용자 이름 가져오기 (없으면 '고객'으로 표시)
          final userName = profile?['name'] as String? ?? '고객';
          
          return RichText(
            text: TextSpan(
              style: const TextStyle(
                fontSize: 20,
                color: Colors.black,
                height: 1.4,
              ),
              children: [
                TextSpan(
                  text: userName,
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.primary,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const TextSpan(text: '님 반가워요!\n'),
                const TextSpan(
                  text: '비대면 의류 수선 서비스입니다.',
                  style: TextStyle(fontSize: 16),
                ),
              ],
            ),
          );
        },
        loading: () => RichText(
          text: TextSpan(
            style: const TextStyle(
              fontSize: 20,
              color: Colors.black,
              height: 1.4,
            ),
            children: [
              TextSpan(
                text: '고객',
                style: TextStyle(
                  color: Theme.of(context).colorScheme.primary,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const TextSpan(text: '님 반가워요!\n'),
              const TextSpan(
                text: '비대면 의류 수선 서비스입니다.',
                style: TextStyle(fontSize: 16),
              ),
            ],
          ),
        ),
        error: (_, __) => RichText(
          text: TextSpan(
            style: const TextStyle(
              fontSize: 20,
              color: Colors.black,
              height: 1.4,
            ),
            children: [
              TextSpan(
                text: '고객',
                style: TextStyle(
                  color: Theme.of(context).colorScheme.primary,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const TextSpan(text: '님 반가워요!\n'),
              const TextSpan(
                text: '비대면 의류 수선 서비스입니다.',
                style: TextStyle(fontSize: 16),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBannerSlider(BuildContext context) {
    final banners = [
      {
        'title': '멀리 갈 필요 없이\n문앞에 두고',
        'buttonText': '첫 수거신청 하기',
        'color': const Color(0xFF2D3E50),
      },
      {
        'title': '옷 수선,\n이제 집에서 간편하게',
        'buttonText': '수선 접수하기',
        'color': const Color(0xFF00C896),
      },
      {
        'title': '수거부터 배송까지\n한 번에',
        'buttonText': '서비스 둘러보기',
        'color': const Color(0xFF8B5CF6),
      },
    ];

    return Column(
      children: [
        SizedBox(
          height: 320,
          child: PageView.builder(
            controller: _bannerController,
            onPageChanged: (index) {
              setState(() {
                _currentBannerIndex = index;
              });
            },
            itemCount: banners.length,
            itemBuilder: (context, index) {
              final banner = banners[index];
              return Container(
                margin: const EdgeInsets.symmetric(horizontal: 20),
                decoration: BoxDecoration(
                  color: banner['color'] as Color,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Stack(
                  children: [
                    // 배경 패턴
                    Positioned(
                      right: -30,
                      top: -30,
                      child: Container(
                        width: 150,
                        height: 150,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.white.withOpacity(0.1),
                        ),
                      ),
                    ),
                    Positioned(
                      right: 40,
                      bottom: -40,
                      child: Container(
                        width: 120,
                        height: 120,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.white.withOpacity(0.1),
                        ),
                      ),
                    ),
                    // 컨텐츠
                    Padding(
                      padding: const EdgeInsets.all(28),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: const Text(
                              '서비스 이용',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.white,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          const Spacer(),
                          Text(
                            banner['title'] as String,
                            style: const TextStyle(
                              fontSize: 26,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                              height: 1.3,
                            ),
                          ),
                          const SizedBox(height: 24),
                          ElevatedButton(
                            onPressed: () => _showPreparationDialog(context),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF00C896),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 28,
                                vertical: 14,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(25),
                              ),
                              elevation: 0,
                            ),
                            child: Text(
                              banner['buttonText'] as String,
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 16),
        // 인디케이터
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(
            banners.length,
            (index) => Container(
              width: _currentBannerIndex == index ? 24 : 8,
              height: 8,
              margin: const EdgeInsets.symmetric(horizontal: 4),
              decoration: BoxDecoration(
                color: _currentBannerIndex == index
                    ? Colors.black
                    : Colors.grey.shade300,
                borderRadius: BorderRadius.circular(4),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildActionButtons(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        children: [
          Expanded(
            child: _buildActionCard(
              '가격표',
              Icons.receipt_long_outlined,
              const Color(0xFF00C896),
              () {
                // TODO: 가격표 페이지
              },
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _buildActionCard(
              '쉬운가이드',
              Icons.help_outline,
              const Color(0xFF00C896),
              () {
                // TODO: 가이드 페이지
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionCard(
    String title,
    IconData icon,
    Color color,
    VoidCallback onTap,
  ) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade200),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(width: 8),
            Text(
              title,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: Colors.black87,
              ),
            ),
          ],
        ),
      ),
    );
  }


  /// 내 주문 섹션
  Widget _buildMyOrdersSection(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 섹션 헤더
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                '내 주문',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Colors.black87,
                ),
              ),
              TextButton.icon(
                onPressed: () {
                  context.push('/orders');
                },
                icon: const Icon(Icons.arrow_forward, size: 16),
                label: const Text('전체보기'),
                style: TextButton.styleFrom(
                  foregroundColor: Colors.grey.shade700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          
          // 주문 카드 (최근 주문 1개 미리보기)
          InkWell(
            onTap: () => context.push('/orders'),
            borderRadius: BorderRadius.circular(16),
            child: Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey.shade200),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.03),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Row(
                children: [
                  // 아이콘
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: const Color(0xFF00C896).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.checkroom_rounded,
                      color: Color(0xFF00C896),
                      size: 28,
                    ),
                  ),
                  const SizedBox(width: 16),
                  
                  // 주문 정보
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.orange.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Text(
                                '수선중',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.orange,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              '2024.11.12',
                              style: TextStyle(
                                fontSize: 11,
                                color: Colors.grey.shade600,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          '청바지 기장 수선',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: Colors.black87,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '₩15,000',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: Colors.grey.shade700,
                          ),
                        ),
                      ],
                    ),
                  ),
                  
                  // 화살표
                  Icon(
                    Icons.arrow_forward_ios,
                    size: 16,
                    color: Colors.grey.shade400,
                  ),
                ],
              ),
            ),
          ),
          
          const SizedBox(height: 12),
          
          // 주문 목록으로 가는 버튼
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () {
                context.push('/orders');
              },
              icon: const Icon(Icons.list_alt_rounded, size: 20),
              label: const Text('전체 주문 보기'),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                side: BorderSide(color: Colors.grey.shade300),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// 프로모션 배너
  Widget _buildPromotionBanner(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: const Color(0xFFE3F5FF),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    '11월 한정 최대 혜택',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.black54,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    '충전 결제하면\n최대 20%적립',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                      height: 1.3,
                    ),
                  ),
                ],
              ),
            ),
            Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                color: const Color(0xFF00C896),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Center(
                child: Icon(
                  Icons.loyalty_outlined,
                  color: Colors.white,
                  size: 32,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

