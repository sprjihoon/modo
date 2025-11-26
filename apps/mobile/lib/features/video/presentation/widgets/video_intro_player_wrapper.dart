import 'dart:async';
import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

class VideoIntroPlayerWrapper extends StatefulWidget {
  final String videoUrl;
  final Duration introDuration;

  const VideoIntroPlayerWrapper({
    super.key,
    required this.videoUrl,
    this.introDuration = const Duration(milliseconds: 700),
  });

  @override
  State<VideoIntroPlayerWrapper> createState() => _VideoIntroPlayerWrapperState();
}

class _VideoIntroPlayerWrapperState extends State<VideoIntroPlayerWrapper> {
  VideoPlayerController? _controller;
  bool _showIntro = true;
  bool _isDisposed = false;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    // Prepare video controller
    final controller = VideoPlayerController.networkUrl(Uri.parse(widget.videoUrl));
    _controller = controller;
    await controller.initialize();
    controller.setLooping(false);
    controller.setVolume(1.0);

    if (!mounted || _isDisposed) return;
    setState(() {});

    // Show intro for configured duration, then hide and play
    unawaited(Future<void>.delayed(widget.introDuration, () async {
      if (!mounted || _isDisposed) return;
      setState(() {
        _showIntro = false;
      });
      await controller.play();
    }));
  }

  @override
  void dispose() {
    _isDisposed = true;
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;
    return AspectRatio(
      aspectRatio: controller?.value.isInitialized == true
          ? controller!.value.aspectRatio
          : 16 / 9,
      child: Stack(
        fit: StackFit.expand,
        children: [
          // Video layer
          if (controller != null && controller.value.isInitialized)
            VideoPlayer(controller)
          else
            const Center(child: CircularProgressIndicator()),

          // Top-right logo overlay (simple icon placeholder)
          Positioned(
            top: 12,
            right: 12,
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.4),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Padding(
                padding: EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.scissors_rounded, size: 16, color: Colors.white),
                    SizedBox(width: 6),
                    Text(
                      '모두의수선',
                      style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // Bottom labels: left "수선 전", right "수선 후"
          Positioned(
            left: 12,
            bottom: 12,
            child: _buildCornerLabel(context, '수선 전'),
          ),
          Positioned(
            right: 12,
            bottom: 12,
            child: _buildCornerLabel(context, '수선 후'),
          ),

          // Intro overlay (fades out)
          AnimatedOpacity(
            opacity: _showIntro ? 1.0 : 0.0,
            duration: const Duration(milliseconds: 250),
            child: IgnorePointer(
              ignoring: !_showIntro,
              child: Container(
                color: Colors.black.withOpacity(0.6),
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.scissors_rounded, size: 56, color: Colors.white),
                      const SizedBox(height: 12),
                      Text(
                        '전후 비교 영상',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCornerLabel(BuildContext context, String text) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.5),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        child: Text(
          text,
          style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
        ),
      ),
    );
  }
}


