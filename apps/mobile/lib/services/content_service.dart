import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class ContentService {
  final _supabase = Supabase.instance.client;

  Future<String?> getContent(String key) async {
    try {
      final response = await _supabase
          .from('app_contents')
          .select('content')
          .eq('key', key)
          .maybeSingle();

      if (response != null && response['content'] != null) {
        return response['content'] as String;
      }
      return null;
    } catch (e) {
      debugPrint('Content fetch error for $key: $e');
      return null;
    }
  }
}

