import 'package:flutter/material.dart';
import '../../../../services/video_cache_service.dart';
import '../../../../core/config/feature_flags.dart';

/// 주문 상세 페이지 진입 시 비디오 프리로드 Mixin
/// 
/// 사용 방법:
/// ```dart
/// class OrderDetailPage extends StatefulWidget with VideoPreloadMixin {
///   @override
///   void initState() {
///     super.initState();
///     preloadVideosIfEnabled([inboundUrl, outboundUrl]);
///   }
/// }
/// ```
mixin VideoPreloadMixin<T extends StatefulWidget> on State<T> {
  /// 비디오 URL 목록을 프리로드
  /// 
  /// Feature Flag가 활성화된 경우에만 실행
  Future<void> preloadVideosIfEnabled(List<String> videoUrls) async {
    if (!VideoFeatureFlags.shouldPreload) {
      if (VideoFeatureFlags.enableDebugLogs) {
        debugPrint('ℹ️ Video preload disabled (Feature Flag: OFF)');
      }
      return;
    }

    if (videoUrls.isEmpty) {
      if (VideoFeatureFlags.enableDebugLogs) {
        debugPrint('⚠️ No videos to preload');
      }
      return;
    }

    if (VideoFeatureFlags.enableDebugLogs) {
      debugPrint('🚀 Preloading ${videoUrls.length} videos...');
    }

    try {
      await VideoCache.preloadMultipleVideos(videoUrls);
      
      if (VideoFeatureFlags.enableDebugLogs) {
        debugPrint('✅ Video preload completed');
      }
    } catch (e) {
      if (VideoFeatureFlags.enableDebugLogs) {
        debugPrint('❌ Video preload failed: $e');
      }
    }
  }

  /// 단일 비디오 프리로드
  Future<void> preloadVideoIfEnabled(String videoUrl) async {
    await preloadVideosIfEnabled([videoUrl]);
  }
}

/// 비디오 프리로드 위젯 (선언적 방식)
/// 
/// 사용 방법:
/// ```dart
/// VideoPreloader(
///   videoUrls: [inboundUrl, outboundUrl],
///   child: YourWidget(),
/// )
/// ```
class VideoPreloader extends StatefulWidget {
  final List<String> videoUrls;
  final Widget child;
  final bool showProgress;

  const VideoPreloader({
    required this.videoUrls,
    required this.child,
    this.showProgress = false,
    super.key,
  });

  @override
  State<VideoPreloader> createState() => _VideoPreloaderState();
}

class _VideoPreloaderState extends State<VideoPreloader> {
  bool _isPreloading = false;
  bool _isComplete = false;

  @override
  void initState() {
    super.initState();
    _startPreload();
  }

  Future<void> _startPreload() async {
    if (!VideoFeatureFlags.shouldPreload) return;
    if (widget.videoUrls.isEmpty) return;

    setState(() {
      _isPreloading = true;
    });

    try {
      await VideoCache.preloadMultipleVideos(widget.videoUrls);
      
      if (mounted) {
        setState(() {
          _isPreloading = false;
          _isComplete = true;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isPreloading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.showProgress) {
      return widget.child;
    }

    return Stack(
      children: [
        widget.child,
        if (_isPreloading)
          Positioned(
            bottom: 16,
            right: 16,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.7),
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  ),
                  SizedBox(width: 8),
                  Text(
                    '영상 준비 중...',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
          ),
        if (_isComplete && widget.showProgress)
          Positioned(
            bottom: 16,
            right: 16,
            child: TweenAnimationBuilder<double>(
              tween: Tween(begin: 1.0, end: 0.0),
              duration: const Duration(seconds: 2),
              builder: (context, value, child) {
                return Opacity(
                  opacity: value,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.green.withOpacity(0.9),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.check_circle, color: Colors.white, size: 16),
                        SizedBox(width: 8),
                        Text(
                          '영상 준비 완료',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
      ],
    );
  }
}

