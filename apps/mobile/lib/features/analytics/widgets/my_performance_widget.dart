import 'package:flutter/material.dart';
import '../../../services/log_service.dart';

/// 작업자용 '나의 성과' 위젯
/// 
/// 오늘 처리한 작업 건수를 표시하여 동기부여
class MyPerformanceWidget extends StatefulWidget {
  /// 간단한 버전 (한 줄)
  final bool compact;
  
  /// 새로고침 콜백
  final VoidCallback? onRefresh;

  const MyPerformanceWidget({
    Key? key,
    this.compact = false,
    this.onRefresh,
  }) : super(key: key);

  @override
  State<MyPerformanceWidget> createState() => _MyPerformanceWidgetState();
}

class _MyPerformanceWidgetState extends State<MyPerformanceWidget> {
  final _logService = LogService();
  
  bool _isLoading = true;
  Map<String, int> _todayPerformance = {
    'workComplete': 0,
    'scanInbound': 0,
    'scanOutbound': 0,
    'extraChargeRequest': 0,
  };

  @override
  void initState() {
    super.initState();
    _loadPerformance();
  }

  Future<void> _loadPerformance() async {
    setState(() => _isLoading = true);
    
    try {
      final performance = await _logService.getMyTodayPerformance();
      
      if (mounted) {
        setState(() {
          _todayPerformance = performance;
          _isLoading = false;
        });
      }
    } catch (e) {
      print('❌ 성과 조회 실패: $e');
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _refresh() {
    _loadPerformance();
    widget.onRefresh?.call();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.compact) {
      return _buildCompactVersion();
    }
    return _buildFullVersion();
  }

  /// 간단 버전 (한 줄)
  Widget _buildCompactVersion() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Colors.blue.shade50,
            Colors.purple.shade50,
          ],
        ),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(
              Icons.emoji_events,
              color: Colors.amber,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _isLoading
                ? const Text(
                    '성과 불러오는 중...',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.black87,
                    ),
                  )
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text(
                        '오늘의 성과',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.black54,
                        ),
                      ),
                      Text(
                        '⛳️ ${_todayPerformance['workComplete']}건 완료',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.black87,
                        ),
                      ),
                    ],
                  ),
          ),
          IconButton(
            icon: const Icon(Icons.refresh, size: 20),
            onPressed: _refresh,
            color: Colors.blue,
          ),
        ],
      ),
    );
  }

  /// 풀 버전 (카드 형태)
  Widget _buildFullVersion() {
    final workComplete = _todayPerformance['workComplete'] ?? 0;
    final scanInbound = _todayPerformance['scanInbound'] ?? 0;
    final scanOutbound = _todayPerformance['scanOutbound'] ?? 0;
    final extraChargeRequest = _todayPerformance['extraChargeRequest'] ?? 0;

    return Card(
      margin: EdgeInsets.zero,
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              Colors.blue.shade50,
              Colors.purple.shade50,
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 헤더
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(
                      Icons.emoji_events,
                      color: Colors.amber,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '오늘의 성과',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.black87,
                          ),
                        ),
                        Text(
                          '오늘 하루도 수고하셨습니다! 💪',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.black54,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.refresh),
                    onPressed: _refresh,
                    color: Colors.blue,
                  ),
                ],
              ),

              const SizedBox(height: 16),

              // 로딩 또는 통계
              if (_isLoading)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.all(20),
                    child: CircularProgressIndicator(),
                  ),
                )
              else
                Column(
                  children: [
                    // 메인 지표 (작업 완료)
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.05),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Text(
                            '⛳️',
                            style: TextStyle(fontSize: 32),
                          ),
                          const SizedBox(width: 12),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                '작업 완료',
                                style: TextStyle(
                                  fontSize: 14,
                                  color: Colors.black54,
                                ),
                              ),
                              Text(
                                '$workComplete건',
                                style: const TextStyle(
                                  fontSize: 32,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.blue,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 12),

                    // 서브 지표들
                    Row(
                      children: [
                        Expanded(
                          child: _buildSubMetric(
                            icon: Icons.arrow_downward,
                            label: '입고',
                            value: scanInbound,
                            color: Colors.green,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _buildSubMetric(
                            icon: Icons.arrow_upward,
                            label: '출고',
                            value: scanOutbound,
                            color: Colors.orange,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _buildSubMetric(
                            icon: Icons.attach_money,
                            label: '추가과금',
                            value: extraChargeRequest,
                            color: Colors.purple,
                          ),
                        ),
                      ],
                    ),

                    // 격려 메시지
                    if (workComplete > 0) ...[
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 8,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              _getEncouragementMessage(workComplete),
                              style: const TextStyle(
                                fontSize: 13,
                                color: Colors.black87,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSubMetric({
    required IconData icon,
    required String label,
    required int value,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 4),
          Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              color: Colors.black54,
            ),
          ),
          Text(
            '$value',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  String _getEncouragementMessage(int workCount) {
    if (workCount >= 50) {
      return '🏆 대단해요! 오늘 정말 열심히 하셨네요!';
    } else if (workCount >= 30) {
      return '🌟 훌륭합니다! 이 속도면 최고예요!';
    } else if (workCount >= 20) {
      return '💪 좋아요! 계속 파이팅하세요!';
    } else if (workCount >= 10) {
      return '👍 잘하고 있어요! 힘내세요!';
    } else if (workCount >= 5) {
      return '😊 좋은 시작이에요!';
    } else {
      return '🎯 오늘도 화이팅!';
    }
  }
}

