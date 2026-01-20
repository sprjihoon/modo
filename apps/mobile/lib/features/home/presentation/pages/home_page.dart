import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/widgets/scaffold_with_footer.dart';
import '../../../auth/data/providers/auth_provider.dart';
import '../../../orders/providers/cart_provider.dart';
import '../../../../services/order_service.dart';
import '../../../../services/banner_service.dart';
import '../../../../services/order_limit_service.dart';
import '../widgets/extra_charge_alert_banner.dart';
import '../../../orders/presentation/widgets/order_limit_dialog.dart';

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
  final OrderLimitService _orderLimitService = OrderLimitService();

  /// 주문 데이터를 한 번만 가져오기 위한 캐시
  List<Map<String, dynamic>>? _cachedOrders;
  bool _ordersLoaded = false;
  bool _isCheckingOrderLimit = false;

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
          // 🆕 알림 아이콘
          FutureBuilder<int>(
            future: _getUnreadNotificationsCount(),
            builder: (context, snapshot) {
              final unreadCount = snapshot.data ?? 0;

              return Stack(
                children: [
                  IconButton(
                    icon: const Icon(Icons.notifications_outlined, color: Colors.black),
                    tooltip: '알림',
                    onPressed: () {
                      context.push('/notifications');
                    },
                  ),
                  if (unreadCount > 0)
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
                          unreadCount > 99 ? '99+' : '$unreadCount',
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
            const SizedBox(height: 12),

            // 🆕 추가결제 알림 배너 (PENDING_CUSTOMER 상태일 때만 표시)
            _buildExtraChargeAlertBanner(),

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

  /// 배너 클릭 처리 (action_type에 따라 다른 동작)
  Future<void> _handleBannerTap(BuildContext context, Map<String, dynamic> banner) async {
    final actionType = banner['action_type'] as String? ?? 'order';
    final actionValue = banner['action_value'] as String?;

    switch (actionType) {
      case 'navigate':
        // 앱 내 페이지 이동
        if (actionValue != null && actionValue.isNotEmpty) {
          context.push(actionValue);
        } else {
          _showPreparationDialog(context);
        }
        break;
      case 'url':
        // 외부 URL 열기
        if (actionValue != null && actionValue.isNotEmpty) {
          final uri = Uri.parse(actionValue);
          if (await canLaunchUrl(uri)) {
            await launchUrl(uri, mode: LaunchMode.externalApplication);
          }
        }
        break;
      case 'order':
      default:
        // 기본: 수거신청 다이얼로그
        _showPreparationDialog(context);
        break;
    }
  }

  /// 수선물 준비 안내 다이얼로그 (주문 제한 체크 포함)
  Future<void> _showPreparationDialog(BuildContext context) async {
    // 주문 제한 체크 중이면 중복 호출 방지
    if (_isCheckingOrderLimit) return;
    
    setState(() => _isCheckingOrderLimit = true);

    try {
      // 주문 제한 상태 확인
      final limitStatus = await _orderLimitService.checkOrderLimitStatus();
      
      if (!mounted) return;

      // 제한 초과 시 알림 다이얼로그 표시
      if (limitStatus.isLimited) {
        await OrderLimitDialog.show(
          context,
          title: limitStatus.title,
          message: limitStatus.message ?? 
              '오늘 하루 처리 가능한 주문량이 다 찼어요.\n알림 신청하시면 접수 가능할 때 알려드릴게요!',
        );
        return;
      }

      // 제한이 없으면 기존 준비 다이얼로그 표시
      _showActualPreparationDialog(context);
    } catch (e) {
      debugPrint('주문 제한 체크 실패: $e');
      // 에러 발생 시 기본적으로 주문 허용 (사용자 경험 우선)
      _showActualPreparationDialog(context);
    } finally {
      if (mounted) {
        setState(() => _isCheckingOrderLimit = false);
      }
    }
  }

  /// 실제 수선물 준비 안내 다이얼로그
  void _showActualPreparationDialog(BuildContext context) {
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

  /// 🆕 읽지 않은 알림 개수 조회 (취소된 주문 알림 제외)
  Future<int> _getUnreadNotificationsCount() async {
    try {
      final supabase = Supabase.instance.client;
      final user = supabase.auth.currentUser;
      if (user == null) return 0;

      final userResponse = await supabase
          .from('users')
          .select('id')
          .eq('auth_id', user.id)
          .maybeSingle();

      if (userResponse == null) return 0;

      final userId = userResponse['id'] as String;

      // 취소된 주문의 알림 제외하여 조회
      final response = await supabase
          .from('notifications')
          .select('id, order_id, orders!left(id, status)')
          .eq('user_id', userId)
          .eq('is_read', false);

      // 취소된 주문의 알림 필터링
      final validNotifications = (response as List).where((notification) {
        // order_id가 없는 알림은 포함
        if (notification['order_id'] == null) return true;
        
        // orders 조인 결과 확인
        final orders = notification['orders'];
        if (orders == null) return false; // 주문이 삭제된 경우 제외
        
        // 취소된 주문의 알림 제외
        final orderStatus = orders['status'] as String?;
        return orderStatus != 'CANCELLED';
      }).toList();

      return validNotifications.length;
    } catch (e) {
      debugPrint('❌ 알림 개수 조회 실패: $e');
      return 0;
    }
  }

  /// 🆕 추가결제 알림 배너
  Widget _buildExtraChargeAlertBanner() {
    return FutureBuilder<List<Map<String, dynamic>>>(
      future: _getCachedOrders(),
      builder: (context, snapshot) {
        if (!snapshot.hasData || snapshot.data!.isEmpty) {
          return const SizedBox.shrink();
        }

        // PENDING_CUSTOMER 상태인 주문 찾기
        final pendingOrder = snapshot.data!.firstWhere(
          (order) => order['extra_charge_status'] == 'PENDING_CUSTOMER',
          orElse: () => {},
        );

        if (pendingOrder.isEmpty) {
          return const SizedBox.shrink();
        }

        return ExtraChargeAlertBanner(orderData: pendingOrder);
      },
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
                            onPressed: _isCheckingOrderLimit ? null : () => _handleBannerTap(this.context, banner),
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


  /// 내 주문 섹션 (주문이 없으면 섹션 전체 숨김)
  Widget _buildMyOrdersSection(BuildContext context) {
    return FutureBuilder<List<Map<String, dynamic>>>(
      future: _getCachedOrders(),
      builder: (context, snapshot) {
        // 로딩 중, 에러, 빈 목록일 경우 섹션 전체 숨김
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const SizedBox.shrink();
        }
        if (snapshot.hasError || (snapshot.data ?? []).isEmpty) {
          return const SizedBox.shrink();
        }
        
        final orders = snapshot.data!;
        final order = orders.first;
        final status = order['status'] as String? ?? 'BOOKED';
        final extraChargeStatus = order['extra_charge_status'] as String?;
        final isPendingCustomer = extraChargeStatus == 'PENDING_CUSTOMER';
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
        final priceStr = '₩${price.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}';
        
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
              
              // 최근 주문 1건
              InkWell(
                onTap: () => context.push('/orders/${order['id']}'),
                borderRadius: BorderRadius.circular(16),
                child: Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: isPendingCustomer 
                          ? Colors.orange.shade300 
                          : Colors.grey.shade200,
                      width: isPendingCustomer ? 2 : 1,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: isPendingCustomer 
                            ? Colors.orange.withOpacity(0.15)
                            : Colors.black.withOpacity(0.03),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      // 아이콘
                      Stack(
                        clipBehavior: Clip.none,
                        children: [
                          Container(
                            width: 56,
                            height: 56,
                            decoration: BoxDecoration(
                              color: isPendingCustomer 
                                  ? Colors.orange.withOpacity(0.15)
                                  : const Color(0xFF00C896).withOpacity(0.1),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Icon(
                              isPendingCustomer 
                                  ? Icons.payment 
                                  : Icons.checkroom_rounded,
                              color: isPendingCustomer 
                                  ? Colors.orange.shade700
                                  : const Color(0xFF00C896),
                              size: 28,
                            ),
                          ),
                          // 추가결제 배지
                          if (isPendingCustomer)
                            Positioned(
                              right: -6,
                              top: -6,
                              child: Container(
                                padding: const EdgeInsets.all(4),
                                decoration: BoxDecoration(
                                  color: Colors.red,
                                  shape: BoxShape.circle,
                                  border: Border.all(color: Colors.white, width: 2),
                                ),
                                child: const Text(
                                  '!',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(width: 16),
                      
                      // 주문 정보
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                // 추가결제 배지 (우선 표시)
                                if (isPendingCustomer) ...[
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: Colors.orange.shade100,
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(
                                          Icons.payment,
                                          size: 12,
                                          color: Colors.orange.shade900,
                                        ),
                                        const SizedBox(width: 4),
                                        Text(
                                          '추가결제',
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.bold,
                                            color: Colors.orange.shade900,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                ],
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: (statusStyle['color'] as Color).withOpacity(0.12),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    statusStyle['label'] as String,
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                      color: statusStyle['color'] as Color,
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
      },
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

}

