import 'dart:async';
import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

/// 입고/출고 영상을 좌우로 나란히 재생하는 위젯
class SideBySideVideoPlayer extends StatefulWidget {
  final String inboundVideoUrl;
  final String outboundVideoUrl;
  final Duration introDuration;

  const SideBySideVideoPlayer({
    super.key,
    required this.inboundVideoUrl,
    required this.outboundVideoUrl,
    this.introDuration = const Duration(milliseconds: 700),
  });

  @override
  State<SideBySideVideoPlayer> createState() => _SideBySideVideoPlayerState();
}

class _SideBySideVideoPlayerState extends State<SideBySideVideoPlayer> {
  VideoPlayerController? _inboundController;
  VideoPlayerController? _outboundController;
  bool _showIntro = true;
  bool _isDisposed = false;
  bool _isPlaying = false;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    try {
      // 두 영상 컨트롤러 생성
      final inbound = VideoPlayerController.networkUrl(Uri.parse(widget.inboundVideoUrl));
      final outbound = VideoPlayerController.networkUrl(Uri.parse(widget.outboundVideoUrl));
      
      _inboundController = inbound;
      _outboundController = outbound;

      // 병렬 초기화
      await Future.wait([
        inbound.initialize(),
        outbound.initialize(),
      ]);

      if (!mounted || _isDisposed) return;

      // 설정
      inbound.setLooping(false);
      inbound.setVolume(0.5); // 입고 영상 볼륨 낮춤
      outbound.setLooping(false);
      outbound.setVolume(0.5); // 출고 영상 볼륨 낮춤

      setState(() {});

      // 인트로 표시 후 자동 재생
      unawaited(Future<void>.delayed(widget.introDuration, () async {
        if (!mounted || _isDisposed) return;
        setState(() {
          _showIntro = false;
        });
        await _playBoth();
      }));
    } catch (e) {
      debugPrint('영상 초기화 실패: $e');
    }
  }

  Future<void> _playBoth() async {
    if (_inboundController == null || _outboundController == null) return;
    setState(() {
      _isPlaying = true;
    });
    // 동시 재생
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

  @override
  void dispose() {
    _isDisposed = true;
    _inboundController?.dispose();
    _outboundController?.dispose();
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
          if (bothReady)
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

          // 우상단 로고 (아이콘 대체)
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
                child: const Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.compare_arrows_outlined,
                        size: 64,
                        color: Colors.white,
                      ),
                      SizedBox(height: 16),
                      Text(
                        '전후 비교 영상',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      SizedBox(height: 8),
                      Text(
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
            ),

          // 재생/일시정지 버튼
          if (bothReady && !_showIntro)
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

