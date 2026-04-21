import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class AppContent {
  final String text;
  final List<String> images;
  final Map<String, dynamic> metadata;

  AppContent({
    required this.text,
    required this.images,
    this.metadata = const {},
  });

  factory AppContent.fromMap(Map<String, dynamic> map) {
    final rawImages = map['images'];
    List<String> images = [];

    if (rawImages is List) {
      images = rawImages.map((e) => e.toString()).toList();
    }

    final rawMeta = map['metadata'];
    Map<String, dynamic> metadata = const {};
    if (rawMeta is Map) {
      metadata = Map<String, dynamic>.from(rawMeta);
    }

    return AppContent(
      text: (map['content'] as String?) ?? '',
      images: images,
      metadata: metadata,
    );
  }
}

/// 쉬운가이드 단계 모델
class EasyGuideStep {
  final String emoji;
  final String title;
  final String desc;

  const EasyGuideStep({
    required this.emoji,
    required this.title,
    required this.desc,
  });

  factory EasyGuideStep.fromMap(Map<String, dynamic> map) {
    return EasyGuideStep(
      emoji: ((map['emoji'] as String?) ?? '✨').trim(),
      title: ((map['title'] as String?) ?? '').trim(),
      desc: ((map['desc'] as String?) ?? '').trim(),
    );
  }
}

class ContentService {
  final _supabase = Supabase.instance.client;

  Future<AppContent?> getContent(String key) async {
    try {
      final response = await _supabase
          .from('app_contents')
          .select('content, images, metadata')
          .eq('key', key)
          .maybeSingle();

      if (response != null) {
        return AppContent.fromMap(response);
      }
      return null;
    } catch (e) {
      debugPrint('Content fetch error for $key: $e');
      return null;
    }
  }

  /// easy_guide 전용: metadata.steps 파싱하여 반환
  /// 비어있거나 오류면 빈 리스트 반환 (호출 측에서 fallback 처리)
  Future<List<EasyGuideStep>> getEasyGuideSteps() async {
    final content = await getContent('easy_guide');
    if (content == null) return const [];

    final raw = content.metadata['steps'];
    if (raw is! List) return const [];

    return raw
        .whereType<Map>()
        .map((m) => EasyGuideStep.fromMap(Map<String, dynamic>.from(m)))
        .where((s) => s.title.isNotEmpty || s.desc.isNotEmpty)
        .toList();
  }
}

