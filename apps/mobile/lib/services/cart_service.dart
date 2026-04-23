import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// 크로스 디바이스 장바구니 Supabase CRUD 서비스.
///
/// cart_drafts 테이블에 직접 접근한다.
/// CartNotifier 가 이 서비스를 통해 서버와 동기화한다.
class CartService {
  final _supabase = Supabase.instance.client;

  // ── 내부 헬퍼 ──────────────────────────────────────────────────────────

  /// 현재 로그인된 사용자의 public.users.id 를 반환한다.
  Future<String?> _resolveUserId() async {
    final authUser = _supabase.auth.currentUser;
    if (authUser == null) return null;
    try {
      final row = await _supabase
          .from('users')
          .select('id')
          .eq('auth_id', authUser.id)
          .maybeSingle();
      return row?['id'] as String?;
    } catch (e) {
      debugPrint('CartService._resolveUserId error: $e');
      return null;
    }
  }

  // ── 공개 API ────────────────────────────────────────────────────────────

  /// 로그인 여부를 반환한다.
  bool get isLoggedIn => _supabase.auth.currentUser != null;

  /// 내 장바구니 항목을 모두 불러온다.
  Future<List<Map<String, dynamic>>> fetchAll() async {
    final userId = await _resolveUserId();
    if (userId == null) return [];
    try {
      final rows = await _supabase
          .from('cart_drafts')
          .select('id, draft_data, source, created_at')
          .eq('user_id', userId)
          .eq('source', 'mobile')
          .order('created_at', ascending: true);
      return List<Map<String, dynamic>>.from(rows as List);
    } catch (e) {
      debugPrint('CartService.fetchAll error: $e');
      return [];
    }
  }

  /// 항목 하나를 추가한다.
  /// [draftData] 는 CartItem.toJson() 결과다.
  /// 반환값은 서버가 부여한 UUID (없으면 null).
  Future<String?> addItem(Map<String, dynamic> draftData) async {
    final userId = await _resolveUserId();
    if (userId == null) return null;
    try {
      final row = await _supabase
          .from('cart_drafts')
          .insert({
            'user_id': userId,
            'draft_data': draftData,
            'source': 'mobile',
          })
          .select('id')
          .single();
      return row['id'] as String?;
    } catch (e) {
      debugPrint('CartService.addItem error: $e');
      return null;
    }
  }

  /// 항목을 삭제한다. [cartDraftId] 는 cart_drafts.id (서버 UUID).
  Future<void> removeItem(String cartDraftId) async {
    try {
      await _supabase
          .from('cart_drafts')
          .delete()
          .eq('id', cartDraftId);
    } catch (e) {
      debugPrint('CartService.removeItem error: $e');
    }
  }

  /// 내 장바구니 전체 삭제.
  Future<void> clearAll() async {
    final userId = await _resolveUserId();
    if (userId == null) return;
    try {
      await _supabase
          .from('cart_drafts')
          .delete()
          .eq('user_id', userId)
          .eq('source', 'mobile');
    } catch (e) {
      debugPrint('CartService.clearAll error: $e');
    }
  }
}
