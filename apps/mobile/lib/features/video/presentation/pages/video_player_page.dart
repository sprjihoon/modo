import 'package:flutter/material.dart';
import '../widgets/video_intro_player_wrapper.dart';

class VideoPlayerPage extends StatelessWidget {
  final String videoUrl;

  const VideoPlayerPage({
    super.key,
    required this.videoUrl,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('전후 비교 영상'),
      ),
      backgroundColor: Colors.black,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(12.0),
          child: VideoIntroPlayerWrapper(videoUrl: videoUrl),
        ),
      ),
    );
  }
}


