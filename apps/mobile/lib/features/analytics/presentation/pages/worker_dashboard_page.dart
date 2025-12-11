import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/widgets/company_footer.dart';
import '../../../auth/data/providers/auth_provider.dart';
import '../../widgets/my_performance_widget.dart';
import '../../../../services/log_service.dart';

/// 작업자 전용 대시보드 페이지
/// 
/// 작업자(WORKER)와 관리자(MANAGER)가 자신의 오늘 성과를 확인할 수 있는 페이지
class WorkerDashboardPage extends ConsumerStatefulWidget {
  const WorkerDashboardPage({super.key});

  @override
  ConsumerState<WorkerDashboardPage> createState() => _WorkerDashboardPageState();
}

class _WorkerDashboardPageState extends ConsumerState<WorkerDashboardPage> {
  final _logService = LogService();
  
  bool _isLoading = true;
  Map<String, int> _weeklyPerformance = {};
  int _totalThisWeek = 0;
  int _averagePerDay = 0;

  @override
  void initState() {
    super.initState();
    _loadWeeklyPerformance();
  }

  Future<void> _loadWeeklyPerformance() async {
    setState(() => _isLoading = true);
    
    try {
      // 최근 7일간의 성과 조회
      final performance = await _logService.getMyWeeklyPerformance();
      
      int total = 0;
      for (final count in performance.values) {
        total += count;
      }
      
      if (mounted) {
        setState(() {
          _weeklyPerformance = performance;
          _totalThisWeek = total;
          _averagePerDay = performance.isNotEmpty 
              ? (total / performance.length).round() 
              : 0;
          _isLoading = false;
        });
      }
    } catch (e) {
      print('❌ 주간 성과 조회 실패: $e');
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _refresh() {
    _loadWeeklyPerformance();
  }

  @override
  Widget build(BuildContext context) {
    final userProfileAsync = ref.watch(userProfileProvider);
    
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: const Text('나의 대시보드'),
        elevation: 0,
        backgroundColor: Colors.white,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _refresh,
            tooltip: '새로고침',
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async => _refresh(),
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 사용자 인사말
                    userProfileAsync.when(
                      data: (profile) {
                        final userName = profile?.name ?? '작업자';
                        return _buildWelcomeHeader(userName);
                      },
                      loading: () => _buildWelcomeHeader('작업자'),
                      error: (_, __) => _buildWelcomeHeader('작업자'),
                    ),
                    
                    const SizedBox(height: 16),
                    
                    // 오늘의 성과 위젯 (상세 버전)
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: MyPerformanceWidget(
                        compact: false,
                        onRefresh: _refresh,
                      ),
                    ),
                    
                    const SizedBox(height: 24),
                    
                    // 주간 성과 요약
                    _buildWeeklySummary(),
                    
                    const SizedBox(height: 24),
                    
                    // 주간 성과 차트
                    _buildWeeklyChart(),
                    
                    const SizedBox(height: 24),
                    
                    // 동기부여 메시지
                    _buildMotivationalSection(),
                    
                    const SizedBox(height: 100),
                  ],
                ),
              ),
            ),
          ),
          const CompanyFooter(),
        ],
      ),
    );
  }

  /// 환영 헤더
  Widget _buildWelcomeHeader(String userName) {
    final now = DateTime.now();
    final greeting = _getTimeBasedGreeting(now.hour);
    
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            const Color(0xFF00C896),
            const Color(0xFF00A77D),
          ],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            greeting,
            style: TextStyle(
              fontSize: 14,
              color: Colors.white.withOpacity(0.9),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '$userName님',
            style: const TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '오늘도 좋은 하루 보내세요! 💪',
            style: TextStyle(
              fontSize: 16,
              color: Colors.white.withOpacity(0.9),
            ),
          ),
        ],
      ),
    );
  }

  String _getTimeBasedGreeting(int hour) {
    if (hour < 6) {
      return '새벽에도 수고하세요 🌙';
    } else if (hour < 12) {
      return '좋은 아침이에요 ☀️';
    } else if (hour < 18) {
      return '좋은 오후에요 🌤️';
    } else {
      return '수고 많으셨어요 🌙';
    }
  }

  /// 주간 성과 요약
  Widget _buildWeeklySummary() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF00C896).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.calendar_month,
                    color: Color(0xFF00C896),
                    size: 24,
                  ),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Text(
                    '이번 주 성과',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            
            if (_isLoading)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(20),
                  child: CircularProgressIndicator(),
                ),
              )
            else
              Row(
                children: [
                  Expanded(
                    child: _buildSummaryCard(
                      icon: Icons.check_circle_outline,
                      label: '총 완료',
                      value: '$_totalThisWeek건',
                      color: const Color(0xFF00C896),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildSummaryCard(
                      icon: Icons.trending_up,
                      label: '일평균',
                      value: '$_averagePerDay건',
                      color: Colors.blue,
                    ),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryCard({
    required IconData icon,
    required String label,
    required String value,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 28),
          const SizedBox(height: 12),
          Text(
            label,
            style: TextStyle(
              fontSize: 13,
              color: Colors.grey.shade600,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  /// 주간 성과 차트
  Widget _buildWeeklyChart() {
    final weekDays = ['월', '화', '수', '목', '금', '토', '일'];
    final now = DateTime.now();
    
    // 이번 주의 각 요일별 데이터 준비
    List<int> dailyCounts = [];
    int maxCount = 1;
    
    for (int i = 0; i < 7; i++) {
      final dayOffset = now.weekday - 1 - i;
      final date = now.subtract(Duration(days: dayOffset.abs()));
      final dateKey = '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
      final count = _weeklyPerformance[dateKey] ?? 0;
      dailyCounts.add(count);
      if (count > maxCount) maxCount = count;
    }
    
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.purple.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.bar_chart,
                    color: Colors.purple,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Text(
                    '일별 작업 현황',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            
            if (_isLoading)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(20),
                  child: CircularProgressIndicator(),
                ),
              )
            else
              SizedBox(
                height: 150,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: List.generate(7, (index) {
                    final count = dailyCounts[index];
                    final heightRatio = count / maxCount;
                    final isToday = index == now.weekday - 1;
                    
                    return Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            Text(
                              '$count',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: isToday 
                                    ? const Color(0xFF00C896) 
                                    : Colors.grey.shade600,
                              ),
                            ),
                            const SizedBox(height: 4),
                            AnimatedContainer(
                              duration: const Duration(milliseconds: 500),
                              height: 80 * heightRatio + 10,
                              decoration: BoxDecoration(
                                color: isToday 
                                    ? const Color(0xFF00C896)
                                    : Colors.grey.shade300,
                                borderRadius: BorderRadius.circular(6),
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              weekDays[index],
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: isToday 
                                    ? FontWeight.bold 
                                    : FontWeight.normal,
                                color: isToday 
                                    ? const Color(0xFF00C896) 
                                    : Colors.grey.shade600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                ),
              ),
          ],
        ),
      ),
    );
  }

  /// 동기부여 섹션
  Widget _buildMotivationalSection() {
    final message = _getMotivationalMessage(_totalThisWeek);
    
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Colors.amber.shade100,
              Colors.orange.shade100,
            ],
          ),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.8),
                shape: BoxShape.circle,
              ),
              child: const Text(
                '💪',
                style: TextStyle(fontSize: 28),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    '오늘의 한마디',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.black54,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    message,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getMotivationalMessage(int weeklyTotal) {
    if (weeklyTotal >= 200) {
      return '🏆 이번 주 정말 대단해요! 최고의 한 주네요!';
    } else if (weeklyTotal >= 100) {
      return '🌟 훌륭한 성과예요! 계속 이 페이스로!';
    } else if (weeklyTotal >= 50) {
      return '💪 좋은 흐름이에요! 파이팅!';
    } else if (weeklyTotal >= 20) {
      return '👍 잘하고 있어요! 조금만 더 힘내봐요!';
    } else {
      return '🎯 오늘도 화이팅! 할 수 있어요!';
    }
  }
}

