import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// 공지사항 페이지
class NoticesPage extends ConsumerStatefulWidget {
  const NoticesPage({super.key});

  @override
  ConsumerState<NoticesPage> createState() => _NoticesPageState();
}

class _NoticesPageState extends ConsumerState<NoticesPage> {
  int _currentPage = 1;
  final int _itemsPerPage = 10;
  
  // Mock 공지사항 (페이징 테스트용 데이터 추가)
  final List<Map<String, dynamic>> _allNotices = [
      {
        'title': '11월 할인 이벤트 안내',
        'date': '2024.11.01',
        'isNew': true,
        'content': '11월 한 달간 모든 수선 20% 할인!',
      },
      {
        'title': '추석 연휴 배송 안내',
        'date': '2024.09.25',
        'isNew': false,
        'content': '추석 연휴 기간 중 배송이 지연될 수 있습니다.',
      },
      {
        'title': '서비스 이용 약관 변경 안내',
        'date': '2024.09.01',
        'isNew': false,
        'content': '개인정보 처리방침이 일부 변경되었습니다.',
      },
      // 추가 더미 데이터 (페이징 테스트용)
      {
        'title': '여름 휴가 안내',
        'date': '2024.08.15',
        'isNew': false,
        'content': '8월 15일~18일은 휴무입니다.',
      },
      {
        'title': '배송비 정책 변경',
        'date': '2024.08.01',
        'isNew': false,
        'content': '무료 배송 기준이 변경되었습니다.',
      },
      {
        'title': '신규 수선 항목 추가',
        'date': '2024.07.20',
        'isNew': false,
        'content': '원피스 수선 항목이 추가되었습니다.',
      },
      {
        'title': '앱 업데이트 안내',
        'date': '2024.07.15',
        'isNew': false,
        'content': '새로운 기능이 추가되었습니다.',
      },
      {
        'title': '결제 시스템 점검 안내',
        'date': '2024.07.01',
        'isNew': false,
        'content': '7월 1일 새벽 시스템 점검이 있습니다.',
      },
      {
        'title': '이벤트 당첨자 발표',
        'date': '2024.06.25',
        'isNew': false,
        'content': '6월 이벤트 당첨자를 발표합니다.',
      },
      {
        'title': '서비스 오픈 안내',
        'date': '2024.06.01',
        'isNew': false,
        'content': '모두의수선 서비스가 오픈했습니다!',
      },
      {
        'title': '회원 가입 이벤트',
        'date': '2024.06.01',
        'isNew': false,
        'content': '신규 회원 가입 시 포인트 지급!',
      },
      {
        'title': '오픈 기념 할인',
        'date': '2024.06.01',
        'isNew': false,
        'content': '오픈 기념 모든 수선 30% 할인!',
      },
    ];

  @override
  Widget build(BuildContext context) {
    // 페이징 계산
    final totalPages = (_allNotices.length / _itemsPerPage).ceil();
    final startIndex = (_currentPage - 1) * _itemsPerPage;
    final endIndex = (startIndex + _itemsPerPage).clamp(0, _allNotices.length);
    final displayedNotices = _allNotices.sublist(startIndex, endIndex);

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: const Text('공지사항'),
        elevation: 0,
        backgroundColor: Colors.white,
      ),
      body: Column(
        children: [
          // 결과 개수 표시
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                Text(
                  '총 ${_allNotices.length}건',
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
          
          // 공지사항 리스트
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              itemCount: displayedNotices.length,
              separatorBuilder: (context, index) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final notice = displayedNotices[index];
                final isNew = notice['isNew'] as bool;
                
                return Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.grey.shade200),
                  ),
                  child: ExpansionTile(
              tilePadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              childrenPadding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
              title: Row(
                children: [
                  if (isNew) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 6,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.red,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Text(
                        'NEW',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                  ],
                  Expanded(
                    child: Text(
                      notice['title'] as String,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
              subtitle: Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text(
                  notice['date'] as String,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey.shade600,
                  ),
                ),
              ),
              children: [
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade50,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    notice['content'] as String,
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey.shade800,
                      height: 1.6,
                    ),
                  ),
                ),
              ],
            ),
          );
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
}

