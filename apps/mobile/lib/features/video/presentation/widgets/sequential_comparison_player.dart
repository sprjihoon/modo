import 'dart:async';
import 'dart:io' show File, Platform;
import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';
import 'package:http/http.dart' as http;
import '../../utils/adaptive_duration_calculator.dart';
import '../../../../services/video_cache_service.dart';
import '../../../../core/config/feature_flags.dart';

/// 여러 아이템의 입고/출고 영상을 순차적으로 재생하는 위젯
class SequentialComparisonPlayer extends StatefulWidget {
  /// 각 아이템의 입고/출고 영상 쌍 리스트
  final List<Map<String, String>> videoItems;
  final Duration introDuration;
  final Duration intervalDuration; // 아이템 간 간격

  const SequentialComparisonPlayer({
    required this.videoItems, super.key,
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
  bool _autoPlayCompleted = false; // 자동 순차 재생 완료 여부
  String? _errorMessage; // 에러 메시지

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

    // 모든 재생 완료 - 첫 번째 아이템 표시하고 선택 모드로 전환
    if (mounted && !_isDisposed && widget.videoItems.isNotEmpty) {
      setState(() {
        _autoPlayCompleted = true;
        _isPlaying = false;
      });
    }
  }
  
  /// 특정 아이템 선택해서 재생
  Future<void> _selectAndPlayItem(int index) async {
    if (index >= widget.videoItems.length || !mounted || _isDisposed) return;
    
    setState(() {
      _currentIndex = index;
      _isLoading = true;
    });
    
    await _playItemAt(index);
  }

  Future<void> _playItemAt(int index) async {
    if (index >= widget.videoItems.length || !mounted || _isDisposed) return;
    
    try {
      // 에러 상태 초기화
      if (mounted) {
        setState(() {
          _errorMessage = null;
        });
      }
      
      // 이전 컨트롤러 정리
      await _disposeControllers();
      if (!mounted || _isDisposed) return;

      final item = widget.videoItems[index];
      var inboundUrl = item['inbound'];
      var outboundUrl = item['outbound'];

      if (inboundUrl == null || outboundUrl == null) {
        debugPrint('❌ 아이템 $index의 영상 URL이 없습니다');
        if (mounted) {
          setState(() {
            _errorMessage = '영상 URL이 없습니다';
            _isLoading = false;
          });
        }
        return;
      }

      // URL 유효성 검사
      if (inboundUrl.isEmpty || outboundUrl.isEmpty) {
        debugPrint('❌ 아이템 $index의 영상 URL이 비어있습니다');
        if (mounted) {
          setState(() {
            _errorMessage = '영상 URL이 비어있습니다';
            _isLoading = false;
          });
        }
        return;
      }

      // URL 형식 검증 (HLS 또는 HTTP URL)
      if (!inboundUrl.startsWith('http') && !inboundUrl.startsWith('/')) {
        debugPrint('❌ 입고 영상 URL 형식 오류: $inboundUrl');
        if (mounted) {
          setState(() {
            _errorMessage = '입고 영상 URL 형식이 올바르지 않습니다';
            _isLoading = false;
          });
        }
        return;
      }
      if (!outboundUrl.startsWith('http') && !outboundUrl.startsWith('/')) {
        debugPrint('❌ 출고 영상 URL 형식 오류: $outboundUrl');
        if (mounted) {
          setState(() {
            _errorMessage = '출고 영상 URL 형식이 올바르지 않습니다';
            _isLoading = false;
          });
        }
        return;
      }

      debugPrint('🎬 아이템 $index 초기화 시작');
      debugPrint('📹 입고 URL: $inboundUrl');
      debugPrint('📹 출고 URL: $outboundUrl');

      // 🔍 URL 접근성 사전 검증 (네트워크 URL인 경우에만)
      if (inboundUrl.startsWith('http')) {
        try {
          debugPrint('🔍 입고 영상 URL 접근성 검증 중...');
          final inboundResponse = await http.head(Uri.parse(inboundUrl))
              .timeout(const Duration(seconds: 10));
          debugPrint('📡 입고 영상 응답 코드: ${inboundResponse.statusCode}');
          
          if (inboundResponse.statusCode >= 400) {
            debugPrint('❌ 입고 영상 URL 접근 불가: ${inboundResponse.statusCode}');
            if (mounted && !_isDisposed) {
              setState(() {
                _errorMessage = '입고 영상에 접근할 수 없습니다.\n(HTTP ${inboundResponse.statusCode})';
                _isLoading = false;
              });
            }
            return;
          }
        } catch (e) {
          debugPrint('⚠️ 입고 영상 URL 검증 실패 (계속 진행): $e');
        }
      }
      
      if (outboundUrl.startsWith('http')) {
        try {
          debugPrint('🔍 출고 영상 URL 접근성 검증 중...');
          final outboundResponse = await http.head(Uri.parse(outboundUrl))
              .timeout(const Duration(seconds: 10));
          debugPrint('📡 출고 영상 응답 코드: ${outboundResponse.statusCode}');
          
          if (outboundResponse.statusCode >= 400) {
            debugPrint('❌ 출고 영상 URL 접근 불가: ${outboundResponse.statusCode}');
            if (mounted && !_isDisposed) {
              setState(() {
                _errorMessage = '출고 영상에 접근할 수 없습니다.\n(HTTP ${outboundResponse.statusCode})';
                _isLoading = false;
              });
            }
            return;
          }
        } catch (e) {
          debugPrint('⚠️ 출고 영상 URL 검증 실패 (계속 진행): $e');
        }
      }

      // 📦 캐싱: URL을 캐시된 로컬 경로로 변환
      if (VideoFeatureFlags.shouldUseCache) {
        final results = await Future.wait([
          VideoCache.getCachedVideoUrl(inboundUrl),
          VideoCache.getCachedVideoUrl(outboundUrl),
        ]);
        inboundUrl = results[0];
        outboundUrl = results[1];
        
        if (VideoFeatureFlags.enableDebugLogs) {
          debugPrint('💾 Item $index - Inbound: ${inboundUrl.contains('cache') ? 'CACHED' : 'NETWORK'}');
          debugPrint('💾 Item $index - Outbound: ${outboundUrl.contains('cache') ? 'CACHED' : 'NETWORK'}');
        }
      }

      // iOS에서 동시 재생을 위한 옵션 설정
      // mixWithOthers: 다른 오디오/비디오와 동시 재생 허용
      VideoPlayerOptions videoOptions;
      if (Platform.isIOS) {
        videoOptions = VideoPlayerOptions(
          mixWithOthers: true,
          allowBackgroundPlayback: false,
        );
        debugPrint('📱 iOS: mixWithOthers 옵션 활성화');
      } else {
        videoOptions = VideoPlayerOptions();
      }
      
      // 새 컨트롤러 생성 (로컬 파일 vs 네트워크 URL 구분)
      // 캐시된 파일은 '/'로 시작하는 로컬 경로
      final bool isInboundLocal = inboundUrl.startsWith('/');
      final bool isOutboundLocal = outboundUrl.startsWith('/');
      
      debugPrint('📂 입고 소스: ${isInboundLocal ? 'LOCAL' : 'NETWORK'}');
      debugPrint('📂 출고 소스: ${isOutboundLocal ? 'LOCAL' : 'NETWORK'}');
      
      final inbound = isInboundLocal
          ? VideoPlayerController.file(
              File(inboundUrl),
              videoPlayerOptions: videoOptions,
            )
          : VideoPlayerController.networkUrl(
              Uri.parse(inboundUrl),
              videoPlayerOptions: videoOptions,
            );
      final outbound = isOutboundLocal
          ? VideoPlayerController.file(
              File(outboundUrl),
              videoPlayerOptions: videoOptions,
            )
          : VideoPlayerController.networkUrl(
              Uri.parse(outboundUrl),
              videoPlayerOptions: videoOptions,
            );
      
      _inboundController = inbound;
      _outboundController = outbound;

      // 에러 리스너 추가 (초기화 전)
      inbound.addListener(() {
        if (inbound.value.hasError) {
          debugPrint('❌ 입고 영상 에러: ${inbound.value.errorDescription}');
          if (mounted && !_isDisposed) {
            setState(() {
              _errorMessage = '입고 영상 재생 오류: ${inbound.value.errorDescription}';
              _isLoading = false;
            });
          }
        }
      });
      outbound.addListener(() {
        if (outbound.value.hasError) {
          debugPrint('❌ 출고 영상 에러: ${outbound.value.errorDescription}');
          if (mounted && !_isDisposed) {
            setState(() {
              _errorMessage = '출고 영상 재생 오류: ${outbound.value.errorDescription}';
              _isLoading = false;
            });
          }
        }
      });

      // 병렬 초기화 (타임아웃 추가)
      debugPrint('⏳ 영상 초기화 중...');
      debugPrint('📹 입고 URL: $inboundUrl');
      debugPrint('📹 출고 URL: $outboundUrl');
      try {
        await Future.wait([
          inbound.initialize(),
          outbound.initialize(),
        ]).timeout(const Duration(seconds: 30), onTimeout: () {
          throw Exception('영상 초기화 타임아웃 (30초)');
        });
      } catch (initError) {
        debugPrint('❌ 영상 초기화 실패: $initError');
        
        // 더 친화적인 에러 메시지 생성
        String userMessage = '영상을 불러올 수 없습니다';
        final errorStr = initError.toString().toLowerCase();
        
        if (errorStr.contains('source error') || errorStr.contains('exoplaybackexception')) {
          userMessage = '영상 스트리밍 서버에 연결할 수 없습니다.\n네트워크 연결을 확인해주세요.';
        } else if (errorStr.contains('timeout')) {
          userMessage = '영상 로드 시간이 초과되었습니다.\n네트워크 상태를 확인해주세요.';
        } else if (errorStr.contains('network') || errorStr.contains('connection')) {
          userMessage = '네트워크 연결 오류입니다.\n인터넷 연결을 확인해주세요.';
        }
        
        if (mounted && !_isDisposed) {
          setState(() {
            _errorMessage = userMessage;
            _isLoading = false;
          });
        }
        return;
      }

      if (!mounted || _isDisposed) {
        await _disposeControllers(); // 초기화 중 dispose된 경우 정리
        return;
      }

      // 초기화 후 상태 확인
      debugPrint('✅ 영상 초기화 완료');
      debugPrint('📹 입고 - isInitialized: ${inbound.value.isInitialized}, hasError: ${inbound.value.hasError}');
      debugPrint('📹 출고 - isInitialized: ${outbound.value.isInitialized}, hasError: ${outbound.value.hasError}');
      debugPrint('📹 입고 duration: ${inbound.value.duration}');
      debugPrint('📹 출고 duration: ${outbound.value.duration}');

      // 에러 체크
      if (inbound.value.hasError || outbound.value.hasError) {
        final errorMsg = inbound.value.errorDescription ?? outbound.value.errorDescription ?? '알 수 없는 오류';
        debugPrint('❌ 영상 에러 발생: $errorMsg');
        if (mounted && !_isDisposed) {
          setState(() {
            _errorMessage = '영상 재생 오류: $errorMsg';
            _isLoading = false;
          });
        }
        return;
      }

      // Duration 및 속도 계산
      final inboundDuration = inbound.value.duration.inSeconds.toDouble();
      final outboundDuration = outbound.value.duration.inSeconds.toDouble();

      // Duration이 0인 경우 체크 (HLS 스트림 로드 실패 가능성)
      if (inboundDuration <= 0 || outboundDuration <= 0) {
        debugPrint('⚠️ 영상 duration이 0입니다. HLS 스트림 로드 실패 가능성');
        debugPrint('   입고: $inboundDuration초, 출고: $outboundDuration초');
        // Duration이 0이어도 재생 시도 (일부 HLS는 duration이 늦게 로드됨)
      }

      final result = AdaptiveDurationCalculator.calculate(
        inboundDuration: inboundDuration,
        outboundDuration: outboundDuration,
      );

      final inboundSpeed = result['inboundSpeed']!;
      final outboundSpeed = result['outboundSpeed']!;

      debugPrint('⚡ 재생 속도 - 입고: ${inboundSpeed}x, 출고: ${outboundSpeed}x');

      // 재생 속도 설정
      await inbound.setPlaybackSpeed(inboundSpeed);
      await outbound.setPlaybackSpeed(outboundSpeed);

      inbound.setLooping(false);
      inbound.setVolume(0.5);
      outbound.setLooping(false);
      outbound.setVolume(0.5);
      
      // 영상 종료 감지 리스너 추가
      inbound.addListener(_onVideoStateChanged);
      outbound.addListener(_onVideoStateChanged);

      if (!mounted || _isDisposed) return;

      setState(() {
        _isLoading = false;
      });

      // 재생 시작
      debugPrint('▶️ 재생 시작');
      await _playBoth();

      // 재생 완료 대기 (더 긴 영상 기준)
      if (!mounted || _isDisposed) return;
      
      final maxDuration = inbound.value.duration > outbound.value.duration
          ? inbound.value.duration
          : outbound.value.duration;
      
      // Duration이 0이면 기본 대기 시간 설정
      final waitDuration = maxDuration.inMilliseconds > 0 
          ? maxDuration 
          : const Duration(seconds: 10);
      
      await Future.delayed(waitDuration);
      
      // 재생 완료 후 상태 업데이트
      if (mounted && !_isDisposed) {
        setState(() {
          _isPlaying = false;
        });
      }
    } catch (e, stackTrace) {
      debugPrint('❌ 아이템 $index 재생 실패: $e');
      debugPrint('📍 Stack trace: $stackTrace');
      if (mounted && !_isDisposed) {
        setState(() {
          _errorMessage = '영상 재생 오류: $e';
          _isLoading = false;
        });
      }
    }
  }

  /// 영상 상태 변경 감지
  void _onVideoStateChanged() {
    if (_inboundController == null || _outboundController == null) return;
    if (!mounted || _isDisposed) return;
    
    final inboundPos = _inboundController!.value.position;
    final inboundDur = _inboundController!.value.duration;
    final outboundPos = _outboundController!.value.position;
    final outboundDur = _outboundController!.value.duration;
    
    // 영상이 시작 위치에 있으면 종료 체크 안함 (seekTo 직후 방지)
    if (inboundPos.inMilliseconds < 500 || outboundPos.inMilliseconds < 500) {
      return;
    }
    
    // 두 영상 모두 끝났는지 확인
    final inboundEnded = inboundDur.inMilliseconds > 0 && 
                         inboundPos.inMilliseconds >= inboundDur.inMilliseconds - 100;
    final outboundEnded = outboundDur.inMilliseconds > 0 && 
                          outboundPos.inMilliseconds >= outboundDur.inMilliseconds - 100;
    
    if (inboundEnded && outboundEnded && _isPlaying) {
      setState(() {
        _isPlaying = false;
      });
    }
  }

  Future<void> _playBoth() async {
    if (_inboundController == null || _outboundController == null) return;
    
    // 영상이 끝났으면 처음으로 되돌리기
    final inboundPos = _inboundController!.value.position;
    final inboundDur = _inboundController!.value.duration;
    final outboundPos = _outboundController!.value.position;
    final outboundDur = _outboundController!.value.duration;
    
    final inboundEnded = inboundDur.inMilliseconds > 0 && 
                         inboundPos.inMilliseconds >= inboundDur.inMilliseconds - 100;
    final outboundEnded = outboundDur.inMilliseconds > 0 && 
                          outboundPos.inMilliseconds >= outboundDur.inMilliseconds - 100;
    
    if (inboundEnded || outboundEnded) {
      await Future.wait([
        _inboundController!.seekTo(Duration.zero),
        _outboundController!.seekTo(Duration.zero),
      ]);
      // iOS에서 seekTo 완료를 위한 딜레이
      await Future.delayed(const Duration(milliseconds: 100));
    }
    
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

    return SingleChildScrollView(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
        // 비디오 플레이어 영역
        AspectRatio(
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
          if (_isLoading && !_showIntro && _errorMessage == null)
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
          
          // 에러 오버레이
          if (_errorMessage != null)
            Container(
              color: Colors.black87,
              child: Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.error_outline,
                        size: 48,
                        color: Colors.redAccent,
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        '영상을 재생할 수 없습니다',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        _errorMessage!,
                        textAlign: TextAlign.center,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 11,
                        ),
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        height: 36,
                        child: ElevatedButton.icon(
                          onPressed: () {
                            setState(() {
                              _errorMessage = null;
                              _isLoading = true;
                            });
                            _playItemAt(_currentIndex);
                          },
                          icon: const Icon(Icons.refresh, size: 18),
                          label: const Text('다시 시도', style: TextStyle(fontSize: 13)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.white,
                            foregroundColor: Colors.black87,
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                          ),
                        ),
                      ),
                    ],
                  ),
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
        ),
        
        // 하단 아이템 선택 버튼 (여러 아이템이고 자동 재생 완료 후)
        if (widget.videoItems.length > 1 && _autoPlayCompleted)
          Container(
            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
            color: Colors.black,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  '아이템 선택',
                  style: TextStyle(
                    color: Colors.white70,
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: 8),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: List.generate(widget.videoItems.length, (index) {
                      final isSelected = _currentIndex == index;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: GestureDetector(
                          onTap: () => _selectAndPlayItem(index),
                          child: Container(
                            width: 48,
                            height: 48,
                            decoration: BoxDecoration(
                              color: isSelected 
                                  ? const Color(0xFF00C896) 
                                  : Colors.grey[800],
                              borderRadius: BorderRadius.circular(8),
                              border: isSelected
                                  ? Border.all(color: Colors.white, width: 2)
                                  : null,
                            ),
                            child: Center(
                              child: Text(
                                '${index + 1}',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 18,
                                  fontWeight: isSelected 
                                      ? FontWeight.bold 
                                      : FontWeight.normal,
                                ),
                              ),
                            ),
                          ),
                        ),
                      );
                    }),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

