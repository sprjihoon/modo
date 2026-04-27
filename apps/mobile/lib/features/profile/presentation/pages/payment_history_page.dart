import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../core/widgets/modo_app_bar.dart';
import '../../../../services/payment_service.dart';
import '../../../orders/providers/cart_provider.dart';

/// 결제내역 페이지
class PaymentHistoryPage extends ConsumerStatefulWidget {
  const PaymentHistoryPage({super.key});

  @override
  ConsumerState<PaymentHistoryPage> createState() => _PaymentHistoryPageState();
}

class _PaymentHistoryPageState extends ConsumerState<PaymentHistoryPage> {
  int _currentPage = 1;
  final int _itemsPerPage = 10;
  String _selectedPeriod = '전체'; // 전체, 1개월, 3개월, 6개월
  bool _isLoading = true;
  String? _errorMessage;
  List<Map<String, dynamic>> _allPayments = [];
  final _paymentService = PaymentService();

  @override
  void initState() {
    super.initState();
    _loadPayments();
  }

  Future<void> _loadPayments() async {
    try {
      setState(() {
        _isLoading = true;
        _errorMessage = null;
      });
      final userId = Supabase.instance.client.auth.currentUser?.id;
      if (userId == null) {
        setState(() {
          _allPayments = [];
          _isLoading = false;
        });
        return;
      }
      final data = await _paymentService.getPaymentHistory();
      setState(() {
        _allPayments = data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  Widget _buildPaymentPendingBanner() {
    final cartCount = ref.watch(cartItemCountProvider);
    if (cartCount == 0) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: InkWell(
        onTap: () => context.push('/cart'),
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: const Color(0xFFFFF5E6),
            border: Border.all(color: const Color(0xFFFFD9A0)),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Row(
            children: [
              const Icon(Icons.shopping_cart_outlined,
                  color: Color(0xFFE07A00), size: 22),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      '장바구니에 결제할 건 $cartCount건이 있어요',
                      style: const TextStyle(
                        fontSize: 13.5,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF8A4500),
                      ),
                    ),
                    const SizedBox(height: 2),
                    const Text(
                      '장바구니에서 결제를 완료해주세요',
                      style: TextStyle(
                        fontSize: 12,
                        color: Color(0xFFB36500),
                      ),
                    ),
                  ],
                ),
              ),
              const Text(
                '보기 →',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFFE07A00),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        backgroundColor: Colors.grey.shade50,
        appBar: const ModoAppBar(
          title: Text('결제내역'),
        ),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_errorMessage != null) {
      return Scaffold(
        backgroundColor: Colors.grey.shade50,
        appBar: const ModoAppBar(
          title: Text('결제내역'),
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 12),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Text(
                  '결제내역을 불러오지 못했습니다.\n$_errorMessage',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.red),
                ),
              ),
              const SizedBox(height: 16),
              OutlinedButton.icon(
                onPressed: _loadPayments,
                icon: const Icon(Icons.refresh),
                label: const Text('다시 시도'),
              ),
            ],
          ),
        ),
      );
    }

    // 기간 필터링
    final filteredPayments = _getFilteredPayments();
    
    // 페이징 계산
    final totalPages = (filteredPayments.length / _itemsPerPage).ceil();
    final startIndex = (_currentPage - 1) * _itemsPerPage;
    final endIndex = (startIndex + _itemsPerPage).clamp(0, filteredPayments.length);
    final displayedPayments = filteredPayments.sublist(startIndex, endIndex);

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: const ModoAppBar(
        title: Text('결제내역'),
      ),
      body: Column(
        children: [
          _buildPaymentPendingBanner(),
          // 날짜 필터
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: ['전체', '1개월', '3개월', '6개월'].map((period) {
                  final isSelected = _selectedPeriod == period;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
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
                      ),
                      backgroundColor: Colors.grey.shade100,
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
          
          // 결과 개수 표시
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                Text(
                  '총 ${filteredPayments.length}건',
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.grey.shade600,
                  ),
                ),
                const Spacer(),
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
          
          // 결제내역 리스트 (포인트 내역 스타일)
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              itemCount: displayedPayments.length,
              separatorBuilder: (context, index) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final payment = displayedPayments[index];
                return _buildPaymentCard(context, payment);
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
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  IconButton(
                    onPressed: _currentPage > 1
                        ? () => setState(() => _currentPage--)
                        : null,
                    icon: const Icon(Icons.chevron_left),
                    color: const Color(0xFF00C896),
                  ),
                  const SizedBox(width: 16),
                  ...List.generate(totalPages.clamp(0, 5), (index) {
                    final page = index + 1;
                    final isCurrentPage = page == _currentPage;
                    
                    return Padding(
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
                    );
                  }),
                  const SizedBox(width: 16),
                  IconButton(
                    onPressed: _currentPage < totalPages
                        ? () => setState(() => _currentPage++)
                        : null,
                    icon: const Icon(Icons.chevron_right),
                    color: const Color(0xFF00C896),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  /// 기간별 필터링
  List<Map<String, dynamic>> _getFilteredPayments() {
    if (_selectedPeriod == '전체') {
      return _allPayments;
    }
    
    final now = DateTime.now();
    DateTime cutoffDate;
    
    switch (_selectedPeriod) {
      case '1개월':
        cutoffDate = DateTime(now.year, now.month - 1, now.day);
        break;
      case '3개월':
        cutoffDate = DateTime(now.year, now.month - 3, now.day);
        break;
      case '6개월':
        cutoffDate = DateTime(now.year, now.month - 6, now.day);
        break;
      default:
        return _allPayments;
    }
    
    return _allPayments.where((payment) {
      final createdAt = payment['created_at'] as String? ?? payment['approved_at'] as String?;
      if (createdAt == null) return false;
      try {
        final dt = DateTime.parse(createdAt);
        return dt.isAfter(cutoffDate);
      } catch (_) {
        return true;
      }
    }).toList();
  }

  /// 결제 카드 (포인트 내역 스타일)
  Widget _buildPaymentCard(BuildContext context, Map<String, dynamic> payment) {
    final paymentStatus = (payment['payment_status'] as String? ?? '').toUpperCase();
    final isCanceled = paymentStatus == 'CANCELED';
    final isPartialCanceled = paymentStatus == 'PARTIAL_CANCELED';
    final isCanceledAny = isCanceled || isPartialCanceled;

    final createdAt = payment['created_at'] as String? ?? payment['approved_at'] as String? ?? '';
    final canceledAt = payment['canceled_at'] as String?;

    String dateStr = '';
    final dateSource = (isCanceledAny && canceledAt != null) ? canceledAt : createdAt;
    if (dateSource.isNotEmpty) {
      try {
        final dt = DateTime.parse(dateSource);
        dateStr =
            '${dt.year}.${dt.month.toString().padLeft(2, '0')}.${dt.day.toString().padLeft(2, '0')} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
      } catch (_) {}
    }

    final itemName = payment['item_name'] as String? ?? payment['order_name'] as String? ?? '주문';
    final amountNum = (payment['total_price'] as num?) ??
        (payment['amount'] as num?) ??
        (payment['approved_amount'] as num?) ??
        0;

    // 상태 배지
    Color badgeColor;
    String badgeLabel;
    if (isCanceled) {
      badgeColor = Colors.red;
      badgeLabel = '환불완료';
    } else if (isPartialCanceled) {
      badgeColor = Colors.orange;
      badgeLabel = '부분환불';
    } else {
      badgeColor = const Color(0xFF00C896);
      badgeLabel = '결제완료';
    }

    return InkWell(
      onTap: () {
        final orderId = payment['id'] as String?;
        if (orderId != null) {
          context.push('/orders/$orderId');
        }
      },
      borderRadius: BorderRadius.circular(16),
      child: Opacity(
        opacity: isCanceledAny ? 0.75 : 1.0,
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.grey.shade200),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: badgeColor.withOpacity(0.1),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      isCanceledAny ? Icons.cancel_outlined : Icons.receipt_long,
                      color: badgeColor,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          itemName,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: isCanceledAny ? Colors.grey.shade500 : Colors.black87,
                            decoration: isCanceledAny ? TextDecoration.lineThrough : null,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          isCanceledAny ? '취소: $dateStr' : dateStr,
                          style: TextStyle(
                            fontSize: 11,
                            color: Colors.grey.shade500,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: badgeColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          badgeLabel,
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: badgeColor,
                          ),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '₩${amountNum.toInt().toString().replaceAllMapped(
                          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
                          (Match m) => '${m[1]},',
                        )}',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: isCanceledAny ? Colors.grey.shade400 : Colors.black87,
                          decoration: isCanceledAny ? TextDecoration.lineThrough : null,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

