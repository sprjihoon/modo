import 'dart:async';
import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';
import '../../utils/adaptive_duration_calculator.dart';

/// 여러 아이템의 입고/출고 영상을 순차적으로 재생하는 위젯
class SequentialComparisonPlayer extends StatefulWidget {
  /// 각 아이템의 입고/출고 영상 쌍 리스트
  final List<Map<String, String>> videoItems;
  final Duration introDuration;
  final Duration intervalDuration; // 아이템 간 간격

  const SequentialComparisonPlayer({
    super.key,
    required this.videoItems,
    this.introDuration = const Duration(milliseconds: 700),
    this.intervalDuration = const Duration(milliseconds: 500),
  });

  @override
  State<SequentialComparisonPlayer> createState() => _SequentialComparisonPlayerState();
}

class _SequentialComparisonPlayerState extends State<SequentialComparisonPlayer> {
  int _currentIndex = 0;
  VideoPlayerController? _inboundController;
  VideoPlayerController? _outboundController;
  bool _showIntro = true;
  bool _isDisposed = false;
  bool _isPlaying = false;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _startPlayback();
  }

  Future<void> _startPlayback() async {
    // 인트로 표시
    await Future.delayed(widget.introDuration);
    if (!mounted || _isDisposed) return;
    
    setState(() {
      _showIntro = false;
    });

    // 모든 아이템을 순차 재생
    await _playAllItemsSequentially();
  }

  Future<void> _playAllItemsSequentially() async {
    for (int i = 0; i < widget.videoItems.length; i++) {
      if (!mounted || _isDisposed) return;
      
      setState(() {
        _currentIndex = i;
        _isLoading = true;
      });

      await _playItemAt(i);
      
      // 다음 아이템으로 넘어가기 전 짧은 간격
      if (i < widget.videoItems.length - 1) {
        await Future.delayed(widget.intervalDuration);
      }
    }

    // 모든 재생 완료 후 첫 번째 아이템으로 돌아가기
    if (mounted && !_isDisposed && widget.videoItems.isNotEmpty) {
      setState(() {
        _currentIndex = 0;
      });
      await _playItemAt(0);
    }
  }

  Future<void> _playItemAt(int index) async {
    if (index >= widget.videoItems.length || !mounted || _isDisposed) return;
    
    try {
      // 이전 컨트롤러 정리
      await _disposeControllers();
      if (!mounted || _isDisposed) return;

      final item = widget.videoItems[index];
      final inboundUrl = item['inbound'];
      final outboundUrl = item['outbound'];

      if (inboundUrl == null || outboundUrl == null) {
        debugPrint('❌ 아이템 $index의 영상 URL이 없습니다');
        return;
      }

      // 새 컨트롤러 생성
      final inbound = VideoPlayerController.networkUrl(Uri.parse(inboundUrl));
      final outbound = VideoPlayerController.networkUrl(Uri.parse(outboundUrl));
      
      _inboundController = inbound;
      _outboundController = outbound;

      // 병렬 초기화
      await Future.wait([
        inbound.initialize(),
        outbound.initialize(),
      ]);

      if (!mounted || _isDisposed) {
        await _disposeControllers(); // 초기화 중 dispose된 경우 정리
        return;
      }

      // Duration 및 속도 계산
      final inboundDuration = inbound.value.duration.inSeconds.toDouble();
      final outboundDuration = outbound.value.duration.inSeconds.toDouble();

      final result = AdaptiveDurationCalculator.calculate(
        inboundDuration: inboundDuration,
        outboundDuration: outboundDuration,
      );

      final inboundSpeed = result['inboundSpeed']!;
      final outboundSpeed = result['outboundSpeed']!;

      // 재생 속도 설정
      await inbound.setPlaybackSpeed(inboundSpeed);
      await outbound.setPlaybackSpeed(outboundSpeed);

      inbound.setLooping(false);
      inbound.setVolume(0.5);
      outbound.setLooping(false);
      outbound.setVolume(0.5);

      if (!mounted || _isDisposed) return;

      setState(() {
        _isLoading = false;
      });

      // 재생 시작
      await _playBoth();

      // 재생 완료 대기 (더 긴 영상 기준)
      if (!mounted || _isDisposed) return;
      
      final maxDuration = inbound.value.duration > outbound.value.duration
          ? inbound.value.duration
          : outbound.value.duration;
      
      await Future.delayed(maxDuration);
    } catch (e) {
      debugPrint('아이템 $index 재생 실패: $e');
      if (mounted && !_isDisposed) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _playBoth() async {
    if (_inboundController == null || _outboundController == null) return;
    setState(() {
      _isPlaying = true;
    });
    await Future.wait([
      _inboundController!.play(),
      _outboundController!.play(),
    ]);
  }

  Future<void> _pauseBoth() async {
    if (_inboundController == null || _outboundController == null) return;
    setState(() {
      _isPlaying = false;
    });
    await Future.wait([
      _inboundController!.pause(),
      _outboundController!.pause(),
    ]);
  }

  Future<void> _disposeControllers() async {
    final inbound = _inboundController;
    final outbound = _outboundController;
    
    _inboundController = null;
    _outboundController = null;
    
    if (inbound != null) {
      try {
        await inbound.dispose();
      } catch (e) {
        debugPrint('Inbound controller dispose error: $e');
      }
    }
    
    if (outbound != null) {
      try {
        await outbound.dispose();
      } catch (e) {
        debugPrint('Outbound controller dispose error: $e');
      }
    }
  }

  @override
  void dispose() {
    _isDisposed = true;
    _disposeControllers();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final inbound = _inboundController;
    final outbound = _outboundController;
    final bothReady = inbound?.value.isInitialized == true && 
                      outbound?.value.isInitialized == true;

    return AspectRatio(
      aspectRatio: 16 / 9,
      child: Stack(
        fit: StackFit.expand,
        children: [
          // 좌우 분할 영상
          if (bothReady && !_isLoading)
            Row(
              children: [
                // 입고 영상 (좌측)
                Expanded(
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      VideoPlayer(inbound!),
                      // 좌하단 라벨
                      Positioned(
                        bottom: 12,
                        left: 12,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.black.withOpacity(0.7),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            '수선 전',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                // 중앙 구분선
                Container(
                  width: 2,
                  color: Colors.white,
                ),
                // 출고 영상 (우측)
                Expanded(
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      VideoPlayer(outbound!),
                      // 우하단 라벨
                      Positioned(
                        bottom: 12,
                        right: 12,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.black.withOpacity(0.7),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            '수선 후',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            )
          else
            const Center(child: CircularProgressIndicator()),

          // 아이템 번호 표시 (좌상단)
          if (widget.videoItems.length > 1)
            Positioned(
              top: 12,
              left: 12,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFF00C896).withOpacity(0.9),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '아이템 ${_currentIndex + 1} / ${widget.videoItems.length}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),

          // 우상단 로고
          Positioned(
            top: 12,
            right: 12,
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.4),
                shape: BoxShape.circle,
              ),
              child: const Padding(
                padding: EdgeInsets.all(8.0),
                child: Icon(
                  Icons.cut_outlined,
                  color: Colors.white,
                  size: 24,
                ),
              ),
            ),
          ),

          // 인트로 오버레이
          if (_showIntro)
            AnimatedOpacity(
              opacity: _showIntro ? 1.0 : 0.0,
              duration: const Duration(milliseconds: 300),
              child: Container(
                color: Colors.black87,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      Icons.compare_arrows_outlined,
                      size: 64,
                      color: Colors.white,
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      '전후 비교 영상',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    if (widget.videoItems.length > 1) ...[
                      Text(
                        '${widget.videoItems.length}개 아이템 순차 재생',
                        style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(height: 4),
                    ],
                    const Text(
                      '잠시 후 재생됩니다...',
                      style: TextStyle(
                        color: Colors.white70,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
            ),

          // 로딩 오버레이
          if (_isLoading && !_showIntro)
            Container(
              color: Colors.black54,
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const CircularProgressIndicator(
                      color: Colors.white,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      '아이템 ${_currentIndex + 1} 로딩 중...',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
            ),

          // 재생/일시정지 버튼
          if (bothReady && !_showIntro && !_isLoading)
            Center(
              child: GestureDetector(
                onTap: () {
                  if (_isPlaying) {
                    _pauseBoth();
                  } else {
                    _playBoth();
                  }
                },
                child: Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.5),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    _isPlaying ? Icons.pause : Icons.play_arrow,
                    color: Colors.white,
                    size: 40,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

