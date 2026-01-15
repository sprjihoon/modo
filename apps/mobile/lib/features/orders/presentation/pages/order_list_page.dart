import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/widgets/company_footer.dart';
import '../../../../services/order_service.dart';

/// 주문 목록 화면
class OrderListPage extends ConsumerStatefulWidget {
  const OrderListPage({super.key});

  @override
  ConsumerState<OrderListPage> createState() => _OrderListPageState();
}

class _OrderListPageState extends ConsumerState<OrderListPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _searchController = TextEditingController();
  final _orderService = OrderService();
  
  bool _isLoading = true;
  List<Map<String, dynamic>> _allOrders = [];
  int _currentPage = 1;
  final int _itemsPerPage = 10;
  String _selectedPeriod = '전체'; // 전체, 1개월, 3개월, 6개월

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 6, vsync: this);
    
    // 탭 변경 시 페이지 리셋
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) {
        setState(() {
          _currentPage = 1;
        });
      }
    });
    
    _loadOrders();
  }

  Future<void> _loadOrders() async {
    try {
      setState(() => _isLoading = true);
      final orders = await _orderService.getMyOrders();
      setState(() {
        _allOrders = orders;
        _isLoading = false;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('주문 목록 조회 실패: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
      setState(() => _isLoading = false);
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: const Text('주문 내역'),
        elevation: 0,
        backgroundColor: Colors.white,
        toolbarHeight: 60, // 공간은 확보하되 기본에 가깝게
        centerTitle: true,
        leadingWidth: 56, // leading 영역 넓힘 (잘림 방지)
        leading: Padding(
          padding: const EdgeInsets.only(left: 8),
          child: IconButton(
            icon: const Icon(Icons.home_outlined, color: Colors.black, size: 24),
            onPressed: () => context.go('/home'), // 홈 화면으로 직접 이동
            tooltip: '홈으로',
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
            splashRadius: 24,
          ),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: IconButton(
              icon: const Icon(Icons.refresh, color: Colors.black, size: 24),
              onPressed: _loadOrders,
              tooltip: '새로고침',
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
              splashRadius: 24,
            ),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(150),
          child: Column(
            children: [
              // 검색 바
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: '주문 검색...',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: () {
                              _searchController.clear();
                              setState(() {});
                            },
                          )
                        : null,
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                  ),
                  onChanged: (value) {
                    setState(() {
                      _currentPage = 1; // 검색 시 첫 페이지로
                    });
                  },
                ),
              ),
              // 날짜 필터
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: ['전체', '1개월', '3개월', '6개월'].map((period) {
                      final isSelected = _selectedPeriod == period;
                      return Padding(
                        padding: const EdgeInsets.only(right: 6),
                        child: ChoiceChip(
                          label: Text(period),
                          selected: isSelected,
                          onSelected: (selected) {
                            setState(() {
                              _selectedPeriod = period;
                              _currentPage = 1;
                            });
                          },
                          selectedColor: const Color(0xFF00C896),
                          labelStyle: TextStyle(
                            color: isSelected ? Colors.white : Colors.grey.shade700,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                            fontSize: 12,
                          ),
                          backgroundColor: Colors.grey.shade100,
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ),
              const SizedBox(height: 4),
              // 탭 바
              TabBar(
                controller: _tabController,
                isScrollable: true,
                indicatorColor: Theme.of(context).colorScheme.primary,
                indicatorWeight: 3,
                labelColor: Theme.of(context).colorScheme.primary,
                unselectedLabelColor: Colors.grey,
                labelStyle: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
                tabs: const [
                  Tab(text: '전체'),
                  Tab(text: '수거예약'),
                  Tab(text: '수선중'),
                  Tab(text: '출고완료'),
                  Tab(text: '완료'),
                  Tab(text: '취소'),
                ],
              ),
            ],
          ),
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildOrderList(context, null),
                _buildOrderList(context, 0),
                _buildOrderList(context, 2),
                _buildOrderList(context, 3),
                _buildOrderList(context, 4),
                _buildOrderList(context, 5), // 취소 탭
              ],
            ),
          ),
          const CompanyFooter(),
        ],
      ),
    );
  }

  Widget _buildOrderList(BuildContext context, int? statusFilter) {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    // 상태 필터링
    List<Map<String, dynamic>> filteredOrders = _allOrders;
    
    if (statusFilter != null) {
      // statusFilter: 0=BOOKED, 1=INBOUND, 2=PROCESSING, 3=READY_TO_SHIP, 4=DELIVERED, 5=CANCELLED
      final statusMap = {
        0: 'BOOKED',
        1: 'INBOUND',
        2: 'PROCESSING',
        3: 'READY_TO_SHIP',
        4: 'DELIVERED',
        5: 'CANCELLED', // 취소 탭 추가
      };
      final targetStatus = statusMap[statusFilter];
      if (targetStatus != null) {
        filteredOrders = _allOrders.where((order) {
          final orderStatus = order['status'] as String? ?? 'BOOKED';
          return orderStatus == targetStatus;
        }).toList();
      }
    }
    
    // 검색 필터링
    if (_searchController.text.isNotEmpty) {
      final searchText = _searchController.text.toLowerCase();
      filteredOrders = filteredOrders.where((order) {
        final itemName = (order['item_name'] ?? '').toString().toLowerCase();
        final orderNumber = (order['order_number'] ?? '').toString().toLowerCase();
        return itemName.contains(searchText) || orderNumber.contains(searchText);
      }).toList();
    }
    
    // 기간 필터링
    if (_selectedPeriod != '전체') {
      final now = DateTime.now();
      DateTime? startDate;
      
      switch (_selectedPeriod) {
        case '1개월':
          startDate = DateTime(now.year, now.month - 1, now.day);
          break;
        case '3개월':
          startDate = DateTime(now.year, now.month - 3, now.day);
          break;
        case '6개월':
          startDate = DateTime(now.year, now.month - 6, now.day);
          break;
      }
      
      if (startDate != null) {
        filteredOrders = filteredOrders.where((order) {
          final createdAtStr = order['created_at'] as String?;
          if (createdAtStr == null) return false;
          
          try {
            final createdAt = DateTime.parse(createdAtStr);
            return createdAt.isAfter(startDate!);
          } catch (e) {
            return false;
          }
        }).toList();
      }
    }
    
    // 페이징 계산
    final totalPages = filteredOrders.isEmpty ? 1 : (filteredOrders.length / _itemsPerPage).ceil();
    // 현재 페이지가 총 페이지 수를 초과하지 않도록 제한 (UI 렌더링 시에만 사용)
    final safeCurrentPage = _currentPage.clamp(1, totalPages);
    final startIndex = ((safeCurrentPage - 1) * _itemsPerPage).clamp(0, filteredOrders.length);
    final endIndex = (startIndex + _itemsPerPage).clamp(0, filteredOrders.length);
    final displayedOrders = startIndex < filteredOrders.length 
        ? filteredOrders.sublist(startIndex, endIndex)
        : <Map<String, dynamic>>[];
    
    if (filteredOrders.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.inbox_outlined,
              size: 64,
              color: Colors.grey.shade400,
            ),
            const SizedBox(height: 16),
            Text(
              '주문 내역이 없습니다',
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey.shade600,
              ),
            ),
          ],
        ),
      );
    }
    
    return Column(
      children: [
        // 결과 개수
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              Text(
                '총 ${filteredOrders.length}건',
                style: TextStyle(
                  fontSize: 13,
                  color: Colors.grey.shade600,
                ),
              ),
              const Spacer(),
              if (totalPages > 1)
                Text(
                  '$_currentPage / $totalPages 페이지',
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.grey.shade600,
                  ),
                ),
            ],
          ),
        ),
        
        // 주문 리스트
        Expanded(
          child: ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            itemCount: displayedOrders.length,
            separatorBuilder: (context, index) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              return _buildOrderCard(context, displayedOrders[index]);
            },
          ),
        ),
        
        // 페이징 버튼
        if (totalPages > 1)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border(
                top: BorderSide(color: Colors.grey.shade200),
              ),
            ),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    onPressed: safeCurrentPage > 1
                        ? () => setState(() => _currentPage = safeCurrentPage - 1)
                        : null,
                    icon: const Icon(Icons.chevron_left),
                    color: const Color(0xFF00C896),
                  ),
                  const SizedBox(width: 8),
                  ..._buildPageNumbers(safeCurrentPage, totalPages),
                  const SizedBox(width: 8),
                  IconButton(
                    onPressed: safeCurrentPage < totalPages
                        ? () => setState(() => _currentPage = safeCurrentPage + 1)
                        : null,
                    icon: const Icon(Icons.chevron_right),
                    color: const Color(0xFF00C896),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }

  /// 페이지 번호 버튼 생성 (현재 페이지 기준 앞뒤 2페이지씩 표시)
  List<Widget> _buildPageNumbers(int currentPage, int totalPages) {
    final List<Widget> pageButtons = [];
    
    // 최대 5개 페이지 번호 표시
    int startPage = (currentPage - 2).clamp(1, totalPages);
    int endPage = (currentPage + 2).clamp(1, totalPages);
    
    // 5개 페이지가 안 되면 조정
    if (endPage - startPage < 4) {
      if (startPage == 1) {
        endPage = (startPage + 4).clamp(1, totalPages);
      } else if (endPage == totalPages) {
        startPage = (endPage - 4).clamp(1, totalPages);
      }
    }
    
    for (int page = startPage; page <= endPage; page++) {
      final isCurrentPage = page == currentPage;
      pageButtons.add(
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: InkWell(
            onTap: () => setState(() => _currentPage = page),
            borderRadius: BorderRadius.circular(8),
            child: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: isCurrentPage
                    ? const Color(0xFF00C896)
                    : Colors.transparent,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: isCurrentPage
                      ? const Color(0xFF00C896)
                      : Colors.grey.shade300,
                ),
              ),
              child: Center(
                child: Text(
                  '$page',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: isCurrentPage
                        ? FontWeight.bold
                        : FontWeight.normal,
                    color: isCurrentPage
                        ? Colors.white
                        : Colors.grey.shade700,
                  ),
                ),
              ),
            ),
          ),
        ),
      );
    }
    
    return pageButtons;
  }

  Widget _buildOrderCard(BuildContext context, Map<String, dynamic> order) {
    final statusMap = {
      'PENDING': {'label': '결제대기', 'color': Colors.amber, 'icon': Icons.hourglass_empty_outlined},
      'BOOKED': {'label': '수거예약', 'color': Colors.blue, 'icon': Icons.schedule_outlined},
      'INBOUND': {'label': '입고완료', 'color': Colors.orange, 'icon': Icons.inventory_outlined},
      'PROCESSING': {'label': '수선중', 'color': Colors.purple, 'icon': Icons.content_cut_rounded},
      'READY_TO_SHIP': {'label': '출고완료', 'color': Colors.green, 'icon': Icons.done_all_outlined},
      'DELIVERED': {'label': '배송완료', 'color': Colors.grey.shade600, 'icon': Icons.check_circle_outline},
      'CANCELLED': {'label': '수거취소', 'color': Colors.red, 'icon': Icons.cancel_outlined},
    };
    
    // 결제 상태
    final paymentStatus = order['payment_status'] as String?;
    final isPaid = paymentStatus == 'PAID';
    
    final status = order['status'] as String? ?? 'BOOKED';
    final statusInfo = statusMap[status] ?? statusMap['BOOKED']!;
    final statusLabel = statusInfo['label'] as String;
    final statusColor = statusInfo['color'] as Color;
    final statusIcon = statusInfo['icon'] as IconData;
    
    // shipments 정보에서 송장번호 가져오기
    final shipments = order['shipments'] as List<dynamic>?;
    final shipment = shipments != null && shipments.isNotEmpty 
        ? shipments.first as Map<String, dynamic>
        : null;
    final trackingNo = shipment?['pickup_tracking_no'] ?? 
                       shipment?['tracking_no'] ?? 
                       order['tracking_no'];
    
    // 날짜 포맷팅
    final createdAt = order['created_at'] as String?;
    String dateStr = '';
    if (createdAt != null) {
      try {
        final date = DateTime.parse(createdAt);
        dateStr = '${date.year}.${date.month.toString().padLeft(2, '0')}.${date.day.toString().padLeft(2, '0')}';
      } catch (e) {
        dateStr = '날짜 없음';
      }
    }
    
    // 가격 포맷팅
    final totalPrice = order['total_price'] as num? ?? 0;
    final priceStr = '₩${totalPrice.toString().replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (Match m) => '${m[1]},',
    )}';

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      elevation: 0,
      child: InkWell(
        onTap: () async {
          await context.push('/orders/${order['id']}');
          if (mounted) {
            // 상세에서 돌아오면 최신 데이터로 새로고침
            _loadOrders();
          }
        },
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            border: Border.all(color: Colors.grey.shade200),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: statusColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            statusIcon,
                            size: 14,
                            color: statusColor,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            statusLabel,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: statusColor,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  if (dateStr.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        dateStr,
                        style: TextStyle(
                          fontSize: 11,
                          color: Colors.grey.shade700,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      Icons.checkroom_rounded,
                      color: statusColor,
                      size: 28,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          order['item_name'] as String? ?? '수선 항목',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (trackingNo != null) ...[
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              Icon(
                                Icons.local_shipping_outlined,
                                size: 14,
                                color: Colors.grey.shade600,
                              ),
                              const SizedBox(width: 4),
                              Expanded(
                                child: Text(
                                  trackingNo.toString(),
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.grey.shade600,
                                    fontFamily: 'monospace',
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  color: Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Text(
                          '결제금액',
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.grey.shade600,
                          ),
                        ),
                        const SizedBox(width: 8),
                        // 결제 상태 배지
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: isPaid ? Colors.green.shade100 : Colors.amber.shade100,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            isPaid ? '결제완료' : '결제대기',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: isPaid ? Colors.green.shade700 : Colors.amber.shade700,
                            ),
                          ),
                        ),
                      ],
                    ),
                    Text(
                      priceStr,
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.grey.shade800,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

