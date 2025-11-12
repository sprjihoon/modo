import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

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
  
  // Mock 결제내역 (페이징 테스트용)
  final List<Map<String, dynamic>> _allPayments = [
    {
      'date': '2024.11.12 14:30',
      'item': '청바지 기장 수선',
      'amount': 15000,
      'method': 'KB국민카드',
      'status': 'completed',
    },
    {
      'date': '2024.11.05 10:20',
      'item': '셔츠 소매 수선',
      'amount': 25000,
      'method': '신한카드',
      'status': 'completed',
    },
    {
      'date': '2024.10.28 16:45',
      'item': '원피스 총기장 수선',
      'amount': 30000,
      'method': 'KB국민카드',
      'status': 'completed',
    },
    {
      'date': '2024.10.20 11:30',
      'item': '바지 기장 수선',
      'amount': 12000,
      'method': '현대카드',
      'status': 'completed',
    },
    {
      'date': '2024.10.15 09:15',
      'item': '코트 소매 수선',
      'amount': 35000,
      'method': 'KB국민카드',
      'status': 'completed',
    },
    {
      'date': '2024.10.10 13:40',
      'item': '청바지 밑단 수선',
      'amount': 18000,
      'method': '신한카드',
      'status': 'completed',
    },
    {
      'date': '2024.10.05 15:20',
      'item': '셔츠 기장 수선',
      'amount': 20000,
      'method': '삼성카드',
      'status': 'completed',
    },
    {
      'date': '2024.09.28 10:50',
      'item': '원피스 허리 수선',
      'amount': 28000,
      'method': 'KB국민카드',
      'status': 'completed',
    },
  ];

  @override
  Widget build(BuildContext context) {
    // 기간 필터링
    final filteredPayments = _getFilteredPayments();
    
    // 페이징 계산
    final totalPages = (filteredPayments.length / _itemsPerPage).ceil();
    final startIndex = (_currentPage - 1) * _itemsPerPage;
    final endIndex = (startIndex + _itemsPerPage).clamp(0, filteredPayments.length);
    final displayedPayments = filteredPayments.sublist(startIndex, endIndex);

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: const Text('결제내역'),
        elevation: 0,
        backgroundColor: Colors.white,
      ),
      body: Column(
        children: [
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
      final dateStr = payment['date'] as String;
      // "2024.11.12 14:30" 형식 파싱
      final dateParts = dateStr.split(' ')[0].split('.');
      final paymentDate = DateTime(
        int.parse(dateParts[0]),
        int.parse(dateParts[1]),
        int.parse(dateParts[2]),
      );
      return paymentDate.isAfter(cutoffDate);
    }).toList();
  }

  /// 결제 카드 (포인트 내역 스타일)
  Widget _buildPaymentCard(BuildContext context, Map<String, dynamic> payment) {
    return InkWell(
      onTap: () => context.push('/profile/receipt', extra: payment),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.grey.shade200),
        ),
        child: Row(
          children: [
            // 아이콘
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: const Color(0xFF00C896).withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.receipt_long,
                color: Color(0xFF00C896),
                size: 24,
              ),
            ),
            const SizedBox(width: 16),
            
            // 내용
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    payment['item'] as String,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    payment['date'] as String,
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade600,
                    ),
                  ),
                ],
              ),
            ),
            
            // 금액
            Text(
              '₩${(payment['amount'] as int).toString().replaceAllMapped(
                RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
                (Match m) => '${m[1]},',
              )}',
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

