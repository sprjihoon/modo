import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../widgets/side_by_side_video_player.dart';
import '../widgets/side_by_side_video_player_media_kit.dart';
import '../widgets/sequential_comparison_player.dart';
import '../../../../core/config/feature_flags.dart';

/// 입고/출고 영상 좌우 비교 재생 페이지
class ComparisonVideoPlayerPage extends StatelessWidget {
  // 단일 영상 쌍 (레거시 지원)
  final String? inboundVideoUrl;
  final String? outboundVideoUrl;
  
  // 여러 아이템의 영상 쌍 (순차 재생)
  final List<Map<String, String>>? videoItems;

  const ComparisonVideoPlayerPage({
    super.key,
    this.inboundVideoUrl,
    this.outboundVideoUrl,
    this.videoItems,
  }) : assert(
         (inboundVideoUrl != null && outboundVideoUrl != null) || (videoItems != null && videoItems.length > 0),
         '단일 영상 쌍 또는 여러 아이템 영상 중 하나를 제공해야 합니다.',
       );

  @override
  Widget build(BuildContext context) {
    // 여러 아이템인지 판단
    final bool isMultipleItems = videoItems != null && videoItems!.length > 1;
    
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Text(
          isMultipleItems 
              ? '전후 비교 영상 (${videoItems!.length}개 아이템)'
              : '전후 비교 영상',
        ),
        systemOverlayStyle: SystemUiOverlayStyle.light,
      ),
      body: SafeArea(
        child: Center(
          child: _buildPlayer(),
        ),
      ),
    );
  }
  
  Widget _buildPlayer() {
    // 여러 아이템: 순차 재생 플레이어
    if (videoItems != null && videoItems!.isNotEmpty) {
      return SequentialComparisonPlayer(
        videoItems: videoItems!,
      );
    }
    
    // 🔄 Feature Flag: media_kit vs video_player
    if (VideoFeatureFlags.shouldUseMediaKit) {
      // ✨ 새로운 플레이어: media_kit (고성능)
      if (VideoFeatureFlags.enableDebugLogs) {
        print('🚀 Using media_kit player (enhanced performance)');
      }
      return SideBySideVideoPlayerMediaKit(
        inboundVideoUrl: inboundVideoUrl!,
        outboundVideoUrl: outboundVideoUrl!,
      );
    } else {
      // 🔙 기존 플레이어: video_player (레거시)
      if (VideoFeatureFlags.enableDebugLogs) {
        print('📹 Using video_player (legacy)');
      }
      return SideBySideVideoPlayer(
        inboundVideoUrl: inboundVideoUrl!,
        outboundVideoUrl: outboundVideoUrl!,
      );
    }
  }
}

