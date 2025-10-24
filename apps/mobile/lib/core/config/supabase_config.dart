import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Supabase 설정 클래스
class SupabaseConfig {
  SupabaseConfig._();

  static String get url => 
      dotenv.env['SUPABASE_URL'] ?? '';
  
  static String get anonKey => 
      dotenv.env['SUPABASE_ANON_KEY'] ?? '';
  
  static String get serviceRoleKey => 
      dotenv.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';
}

