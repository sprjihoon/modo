import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class AppContent {
  final String text;
  final List<String> images;

  AppContent({
    required this.text,
    required this.images,
  });

  factory AppContent.fromMap(Map<String, dynamic> map) {
    final rawImages = map['images'];
    List<String> images = [];

    if (rawImages is List) {
      images = rawImages.map((e) => e.toString()).toList();
    }

    return AppContent(
      text: (map['content'] as String?) ?? '',
      images: images,
    );
  }
}

class ContentService {
  final _supabase = Supabase.instance.client;

  Future<AppContent?> getContent(String key) async {
    try {
      final response = await _supabase
          .from('app_contents')
          .select('content, images')
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
}

