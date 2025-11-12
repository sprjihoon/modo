import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// 포인트 적립 내역 페이지
class PointsHistoryPage extends ConsumerStatefulWidget {
  const PointsHistoryPage({super.key});

  @override
  ConsumerState<PointsHistoryPage> createState() => _PointsHistoryPageState();
}

class _PointsHistoryPageState extends ConsumerState<PointsHistoryPage> {
  int _currentPage = 1;
  final int _itemsPerPage = 10;
  String _selectedPeriod = '전체'; // 전체, 1개월, 3개월, 6개월
  
  // Mock 포인트 내역 (전체 데이터)
  final List<Map<String, dynamic>> _allPointsHistory = [
      {
        'date': '2024.11.12 14:30',
        'type': '적립',
        'reason': '수선 완료',
        'points': 1500,
        'balance': 1500,
      },
      {
        'date': '2024.11.10 10:20',
        'type': '사용',
        'reason': '주문 할인 적용',
        'points': -1000,
        'balance': 0,
      },
      {
        'date': '2024.11.05 16:45',
        'type': '적립',
        'reason': '친구 초대',
        'points': 5000,
        'balance': 1000,
      },
      {
        'date': '2024.11.01 09:15',
        'type': '적립',
        'reason': '회원가입 축하',
        'points': 3000,
        'balance': 0,
      },
      // 추가 더미 데이터 (페이징 테스트용)
      {
        'date': '2024.10.28 14:20',
        'type': '사용',
        'reason': '수선 할인 적용',
        'points': -500,
        'balance': 3000,
      },
      {
        'date': '2024.10.25 11:30',
        'type': '적립',
        'reason': '리뷰 작성',
        'points': 1000,
        'balance': 3500,
      },
      {
        'date': '2024.10.20 16:00',
        'type': '적립',
        'reason': '수선 완료',
        'points': 2000,
        'balance': 2500,
      },
      {
        'date': '2024.10.15 10:15',
        'type': '사용',
        'reason': '주문 할인',
        'points': -1500,
        'balance': 500,
      },
      {
        'date': '2024.10.10 13:40',
        'type': '적립',
        'reason': '이벤트 참여',
        'points': 2000,
        'balance': 2000,
      },
      {
        'date': '2024.10.05 09:20',
        'type': '적립',
        'reason': '친구 초대',
        'points': 5000,
        'balance': 0,
      },
      {
        'date': '2024.09.28 15:30',
        'type': '사용',
        'reason': '수선 할인',
        'points': -800,
        'balance': 5000,
      },
      {
        'date': '2024.09.20 11:45',
        'type': '적립',
        'reason': '수선 완료',
        'points': 1800,
        'balance': 5800,
      },
    ];

  @override
  Widget build(BuildContext context) {
    // 기간 필터링된 데이터
    final filteredHistory = _getFilteredHistory();
    
    // 페이징 처리
    final totalPages = (filteredHistory.length / _itemsPerPage).ceil();
    final startIndex = (_currentPage - 1) * _itemsPerPage;
    final endIndex = (startIndex + _itemsPerPage).clamp(0, filteredHistory.length);
    final displayedHistory = filteredHistory.sublist(
      startIndex,
      endIndex,
    );

    // 현재 포인트 계산
    int currentPoints = 0;
    if (_allPointsHistory.isNotEmpty) {
      currentPoints = _allPointsHistory.first['balance'] as int;
    }

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: const Text('포인트 내역'),
        elevation: 0,
        backgroundColor: Colors.white,
      ),
      body: Column(
        children: [
          // 현재 포인트 헤더
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF00C896), Color(0xFF00A67C)],
              ),
            ),
            child: Column(
              children: [
                const Text(
                  '보유 포인트',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.white70,
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      currentPoints.toString().replaceAllMapped(
                        RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
                        (Match m) => '${m[1]},',
                      ),
                      style: const TextStyle(
                        fontSize: 40,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const Padding(
                      padding: EdgeInsets.only(bottom: 8),
                      child: Text(
                        'P',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                
                // 포인트 안내
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.info_outline,
                        size: 16,
                        color: Colors.white,
                      ),
                      SizedBox(width: 8),
                      Text(
                        '1 포인트 = 1원',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          
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
                          _currentPage = 1; // 필터 변경 시 1페이지로
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
          
          // 적립/사용 통계
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Row(
              children: [
                Expanded(
                  child: _buildStatItem(
                    '적립',
                    '+${_calculateTotal(filteredHistory, true)}P',
                    const Color(0xFF00C896),
                    Icons.add_circle_outline,
                  ),
                ),
                Container(
                  width: 1,
                  height: 40,
                  color: Colors.grey.shade200,
                ),
                Expanded(
                  child: _buildStatItem(
                    '사용',
                    '${_calculateTotal(filteredHistory, false)}P',
                    Colors.orange,
                    Icons.remove_circle_outline,
                  ),
                ),
              ],
            ),
          ),
          
          // 내역 리스트
          Expanded(
            child: displayedHistory.isEmpty
                ? _buildEmptyState()
                : Column(
                    children: [
                      // 결과 개수 표시
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        child: Row(
                          children: [
                            Text(
                              '총 ${filteredHistory.length}건',
                              style: TextStyle(
                                fontSize: 13,
                                color: Colors.grey.shade600,
                              ),
                            ),
                            const Spacer(),
                            Text(
                              '${_currentPage} / $totalPages 페이지',
                              style: TextStyle(
                                fontSize: 13,
                                color: Colors.grey.shade600,
                              ),
                            ),
                          ],
                        ),
                      ),
                      
                      // 리스트
                      Expanded(
                        child: ListView.separated(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                          itemCount: displayedHistory.length,
                          separatorBuilder: (context, index) => const SizedBox(height: 12),
                          itemBuilder: (context, index) {
                            final history = displayedHistory[index];
                            return _buildHistoryCard(context, history);
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
                              ...List.generate(totalPages, (index) {
                                final page = index + 1;
                                final isCurrentPage = page == _currentPage;
                                
                                // 현재 페이지 근처만 표시
                                if ((page - _currentPage).abs() > 2 && page != 1 && page != totalPages) {
                                  if (page == _currentPage - 3 || page == _currentPage + 3) {
                                    return const Padding(
                                      padding: EdgeInsets.symmetric(horizontal: 4),
                                      child: Text('...'),
                                    );
                                  }
                                  return const SizedBox.shrink();
                                }
                                
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
          ),
        ],
      ),
    );
  }

  /// 기간별 필터링
  List<Map<String, dynamic>> _getFilteredHistory() {
    if (_selectedPeriod == '전체') {
      return _allPointsHistory;
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
        return _allPointsHistory;
    }
    
    return _allPointsHistory.where((history) {
      final dateStr = history['date'] as String;
      // "2024.11.12 14:30" 형식 파싱
      final dateParts = dateStr.split(' ')[0].split('.');
      final historyDate = DateTime(
        int.parse(dateParts[0]),
        int.parse(dateParts[1]),
        int.parse(dateParts[2]),
      );
      return historyDate.isAfter(cutoffDate);
    }).toList();
  }

  /// 적립/사용 합계 계산
  String _calculateTotal(List<Map<String, dynamic>> history, bool isEarned) {
    int total = 0;
    for (var item in history) {
      final points = item['points'] as int;
      if (isEarned && points > 0) {
        total += points;
      } else if (!isEarned && points < 0) {
        total += points.abs();
      }
    }
    return total.toString().replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (Match m) => '${m[1]},',
    );
  }

  /// 통계 아이템
  Widget _buildStatItem(String label, String value, Color color, IconData icon) {
    return Column(
      children: [
        Icon(icon, color: color, size: 24),
        const SizedBox(height: 8),
        Text(
          label,
          style: const TextStyle(
            fontSize: 13,
            color: Colors.black54,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
      ],
    );
  }

  /// 포인트 내역 카드
  Widget _buildHistoryCard(BuildContext context, Map<String, dynamic> history) {
    final type = history['type'] as String;
    final points = history['points'] as int;
    final isEarned = type == '적립';
    
    return Container(
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
              color: isEarned 
                  ? const Color(0xFF00C896).withOpacity(0.1)
                  : Colors.orange.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              isEarned ? Icons.add_circle : Icons.remove_circle,
              color: isEarned ? const Color(0xFF00C896) : Colors.orange,
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
                  history['reason'] as String,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  history['date'] as String,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey.shade600,
                  ),
                ),
              ],
            ),
          ),
          
          // 포인트
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                  '${isEarned ? '+' : ''}${points.toString().replaceAllMapped(
                  RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
                  (Match m) => '${m[1]},',
                )}P',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: isEarned ? const Color(0xFF00C896) : Colors.orange,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                '잔액: ${history['balance']}P',
                style: TextStyle(
                  fontSize: 11,
                  color: Colors.grey.shade500,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// 빈 상태
  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.receipt_long_outlined,
            size: 80,
            color: Colors.grey.shade300,
          ),
          const SizedBox(height: 16),
          Text(
            '포인트 내역이 없습니다',
            style: TextStyle(
              fontSize: 16,
              color: Colors.grey.shade600,
            ),
          ),
        ],
      ),
    );
  }
}

