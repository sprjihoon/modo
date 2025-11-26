import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../widgets/side_by_side_video_player.dart';

/// 입고/출고 영상 좌우 비교 재생 페이지
class ComparisonVideoPlayerPage extends StatelessWidget {
  final String inboundVideoUrl;
  final String outboundVideoUrl;

  const ComparisonVideoPlayerPage({
    super.key,
    required this.inboundVideoUrl,
    required this.outboundVideoUrl,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: const Text('전후 비교 영상'),
        systemOverlayStyle: SystemUiOverlayStyle.light,
      ),
      body: SafeArea(
        child: Center(
          child: SideBySideVideoPlayer(
            inboundVideoUrl: inboundVideoUrl,
            outboundVideoUrl: outboundVideoUrl,
          ),
        ),
      ),
    );
  }
}

