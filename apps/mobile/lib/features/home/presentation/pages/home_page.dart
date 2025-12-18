import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/widgets/scaffold_with_footer.dart';
import '../../../auth/data/providers/auth_provider.dart';
import '../../../orders/providers/cart_provider.dart';
import '../../../../services/order_service.dart';
import '../../../../services/banner_service.dart';

/// 배너 인덱스 관리를 위한 ValueNotifier
final bannerIndexProvider = StateNotifierProvider<BannerIndexNotifier, int>((ref) {
  return BannerIndexNotifier();
});

class BannerIndexNotifier extends StateNotifier<int> {
  BannerIndexNotifier() : super(0);

  void updateIndex(int index) {
    state = index;
  }
}

/// 홈 화면
class HomePage extends ConsumerStatefulWidget {
  const HomePage({super.key});

  @override
  ConsumerState<HomePage> createState() => _HomePageState();
}

class _HomePageState extends ConsumerState<HomePage> {
  final PageController _bannerController = PageController();
  final OrderService _orderService = OrderService();
  final BannerService _bannerService = BannerService();

  /// 주문 데이터를 한 번만 가져오기 위한 캐시
  List<Map<String, dynamic>>? _cachedOrders;
  bool _ordersLoaded = false;

  @override
  void dispose() {
    _bannerController.dispose();
    super.dispose();
  }

  /// 주문 데이터 캐싱
  Future<List<Map<String, dynamic>>> _getCachedOrders() async {
    if (_cachedOrders != null && _ordersLoaded) {
      return _cachedOrders!;
    }

    try {
      _cachedOrders = await _orderService.getMyOrders();
      _ordersLoaded = true;
      return _cachedOrders!;
    } catch (e) {
      debugPrint('주문 데이터 로드 실패: $e');
      _ordersLoaded = true;
      return [];
    }
  }

  @override
  Widget build(BuildContext context) {
    return ScaffoldWithFooter(
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
          // 장바구니 아이콘
          Consumer(
            builder: (context, ref, child) {
              final cartItemCount = ref.watch(cartItemCountProvider);
              
              return Stack(
                children: [
                  IconButton(
                    icon: const Icon(Icons.shopping_cart_outlined, color: Colors.black),
                    tooltip: '장바구니',
                    onPressed: () {
                      context.push('/cart');
                    },
                  ),
                  if (cartItemCount > 0)
                    Positioned(
                      right: 8,
                      top: 8,
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: const BoxDecoration(
                          color: Colors.red,
                          shape: BoxShape.circle,
                        ),
                        constraints: const BoxConstraints(
                          minWidth: 16,
                          minHeight: 16,
                        ),
                        child: Text(
                          cartItemCount > 99 ? '99+' : '$cartItemCount',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ),
                ],
              );
            },
          ),
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
      body: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 인사말
            _buildGreeting(context),
            const SizedBox(height: 20),

            // 슬라이드 배너 (독립적인 스크롤 영역)
            _buildOptimizedBannerSlider(context),
            const SizedBox(height: 24),

            // 가격표 & 가이드 버튼
            _buildActionButtons(context),
            const SizedBox(height: 24),

            // 내 주문 섹션
            _buildMyOrdersSection(context),
            const SizedBox(height: 24),
          ],
        ),
      ),
      floatingActionButton: FutureBuilder<List<Map<String, dynamic>>>(
        future: _getCachedOrders(), // 캐싱된 주문 데이터 사용
        builder: (context, snapshot) {
          final hasOrders = snapshot.hasData && (snapshot.data?.isNotEmpty ?? false);
          final buttonText = hasOrders ? '수거신청 하기' : '첫 수거신청 하기';

          return FloatingActionButton.extended(
            onPressed: () => _showPreparationDialog(context),
            backgroundColor: const Color(0xFF00C896),
            icon: const Icon(Icons.add),
            label: Text(buttonText),
            elevation: 4,
          );
        },
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
          final userName = profile?.name ?? '고객';
          
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

  Widget _buildOptimizedBannerSlider(BuildContext context) {
    return FutureBuilder<List<Map<String, dynamic>>>(
      future: Future.wait([
        _bannerService.getActiveBanners(),
        _getCachedOrders(), // 캐싱된 주문 데이터 사용
      ]).then((results) => results[0]),
      builder: (context, bannerSnapshot) {
        // 캐싱된 주문 데이터 사용
        return FutureBuilder<List<Map<String, dynamic>>>(
          future: _getCachedOrders(),
          builder: (context, orderSnapshot) {
            final hasOrders = orderSnapshot.hasData && (orderSnapshot.data?.isNotEmpty ?? false);

            // 배너 데이터 로드 중
            if (bannerSnapshot.connectionState == ConnectionState.waiting) {
              return const SizedBox(
                height: 320,
                child: Center(child: CircularProgressIndicator()),
              );
            }

            // 배너 데이터가 없거나 오류 발생 시 기본 배너 사용
            List<Map<String, dynamic>> banners = [];
            if (bannerSnapshot.hasData && bannerSnapshot.data!.isNotEmpty) {
              banners = bannerSnapshot.data!;
              // 첫 번째 배너의 버튼 텍스트를 주문 여부에 따라 동적 변경
              if (banners.isNotEmpty) {
                banners = List.from(banners);
                final firstBanner = banners[0];
                if (firstBanner['title']?.toString().contains('멀리 갈 필요 없이') == true ||
                    firstBanner['title']?.toString().contains('문앞에 두고') == true) {
                  banners[0] = Map.from(firstBanner);
                  banners[0]['button_text'] = hasOrders ? '수거신청 하기' : '첫 수거신청 하기';
                }
              }
            } else {
              // 기본 배너 (데이터베이스에 배너가 없을 때)
              banners = [
                {
                  'title': '멀리 갈 필요 없이\n문앞에 두고',
                  'button_text': hasOrders ? '수거신청 하기' : '첫 수거신청 하기',
                  'background_color': '#2D3E50',
                  'background_image_url': null,
                },
                {
                  'title': '옷 수선,\n이제 집에서 간편하게',
                  'button_text': '수선 접수하기',
                  'background_color': '#00C896',
                  'background_image_url': null,
                },
                {
                  'title': '수거부터 배송까지\n한 번에',
                  'button_text': '서비스 둘러보기',
                  'background_color': '#8B5CF6',
                  'background_image_url': null,
                },
              ];
            }

            return Column(
      children: [
        SizedBox(
          height: 320,
          child: PageView.builder(
            controller: _bannerController,
            physics: const PageScrollPhysics(), // 페이지 스크롤 활성화
            onPageChanged: (index) {
              // setState() 대신 ValueNotifier 사용으로 전체 리빌드 방지
              ref.read(bannerIndexProvider.notifier).updateIndex(index);
            },
            itemCount: banners.length,
            itemBuilder: (context, index) {
              final banner = banners[index];
              // 색상 파싱 (HEX 문자열을 Color로 변환)
              Color backgroundColor;
              try {
                final colorString = banner['background_color'] as String? ?? '#2D3E50';
                backgroundColor = Color(int.parse(colorString.replaceFirst('#', '0xFF')));
              } catch (e) {
                backgroundColor = const Color(0xFF2D3E50);
              }
              
              final backgroundImageUrl = banner['background_image_url'] as String?;
              
              return Container(
                margin: const EdgeInsets.symmetric(horizontal: 20),
                decoration: BoxDecoration(
                  color: backgroundColor,
                  image: backgroundImageUrl != null
                      ? DecorationImage(
                          image: NetworkImage(backgroundImageUrl),
                          fit: BoxFit.cover,
                        )
                      : null,
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
                            banner['title'] as String? ?? '',
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
                              banner['button_text'] as String? ?? '수거신청 하기',
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
        Consumer(
          builder: (context, ref, child) {
            final currentIndex = ref.watch(bannerIndexProvider);
            return Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(
                banners.length,
                (index) => Container(
                  width: currentIndex == index ? 24 : 8,
                  height: 8,
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  decoration: BoxDecoration(
                    color: currentIndex == index
                        ? Colors.black
                        : Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ),
            );
          },
        ),
      ],
            );
          },
        );
      },
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
                context.push('/content-view', extra: {'key': 'price_list', 'title': '가격표'});
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
                context.push('/content-view', extra: {'key': 'easy_guide', 'title': '쉬운가이드'});
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
          
          // 실데이터: 최근 주문 1건
          FutureBuilder<List<Map<String, dynamic>>>(
            future: _getCachedOrders(), // 캐싱된 주문 데이터 사용
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return Container(
                  height: 92,
                  alignment: Alignment.center,
                  child: const CircularProgressIndicator(strokeWidth: 2),
                );
              }
              if (snapshot.hasError) {
                return _buildEmptyOrderCard(
                  context,
                  title: '주문을 불러오지 못했어요',
                  subtitle: '다시 시도해 주세요',
                  icon: Icons.error_outline,
                );
              }
              final orders = snapshot.data ?? [];
              if (orders.isEmpty) {
                return _buildEmptyOrderCard(
                  context,
                  title: '아직 주문이 없어요',
                  subtitle: '첫 수거신청을 시작해 보세요',
                  icon: Icons.inbox_outlined,
                );
              }
              
              final order = orders.first;
              final status = order['status'] as String? ?? 'BOOKED';
              final statusStyle = _statusStyle(status);
              final createdAt = order['created_at'] as String?;
              String dateStr = '';
              if (createdAt != null) {
                try {
                  final dt = DateTime.parse(createdAt);
                  dateStr = '${dt.year}.${dt.month.toString().padLeft(2, '0')}.${dt.day.toString().padLeft(2, '0')}';
                } catch (_) {}
              }
              final price = order['total_price'] as num? ?? 0;
              final priceStr = '₩${price.toString().replaceAllMapped(RegExp(r'(\\d{1,3})(?=(\\d{3})+(?!\\d))'), (m) => '${m[1]},')}';
              
              return InkWell(
                onTap: () => context.push('/orders/${order['id']}'),
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
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                    color: statusStyle['color']!.withOpacity(0.12),
                                borderRadius: BorderRadius.circular(6),
                              ),
                                  child: Text(
                                    statusStyle['label']! as String,
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                      color: statusStyle['color']! as Color,
                                ),
                              ),
                            ),
                                if (dateStr.isNotEmpty) ...[
                            const SizedBox(width: 8),
                            Text(
                                    dateStr,
                                    style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                            ),
                                ],
                          ],
                        ),
                        const SizedBox(height: 8),
                            Text(
                              (order['item_name'] as String?) ?? '수선 항목',
                              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.black87),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Text(
                              priceStr,
                              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.grey.shade700),
                        ),
                      ],
                    ),
                  ),
                  
                      const Icon(Icons.arrow_forward_ios, size: 16, color: Colors.grey),
                ],
              ),
            ),
              );
            },
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

  Map<String, dynamic> _statusStyle(String status) {
    switch (status) {
      case 'BOOKED':
        return {'label': '수거예약', 'color': Colors.blue};
      case 'INBOUND':
        return {'label': '입고완료', 'color': Colors.orange};
      case 'PROCESSING':
        return {'label': '수선중', 'color': Colors.purple};
      case 'READY_TO_SHIP':
        return {'label': '출고완료', 'color': Colors.green};
      case 'DELIVERED':
        return {'label': '배송완료', 'color': Colors.grey.shade600};
      case 'CANCELLED':
        return {'label': '수거취소', 'color': Colors.red};
      default:
        return {'label': '수거예약', 'color': Colors.blue};
    }
  }

  Widget _buildEmptyOrderCard(BuildContext context,
      {required String title, required String subtitle, required IconData icon,}) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: Colors.grey.shade500, size: 28),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: const TextStyle(
                        fontSize: 15, fontWeight: FontWeight.bold, color: Colors.black87,),),
                const SizedBox(height: 4),
                Text(subtitle, style: TextStyle(fontSize: 13, color: Colors.grey.shade700)),
              ],
            ),
          ),
          TextButton(
            onPressed: () => context.push('/orders'),
            child: const Text('주문 보기'),
          ),
        ],
      ),
    );
  }

}

