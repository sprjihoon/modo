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

  // ── 내부 유틸 ────────────────────────────────────────────────────────────

  /// priceRange 문자열("5,000원~8,000원")에서 최솟값 정수를 추출한다.
  int _extractMinPrice(String priceRange) {
    try {
      final cleaned = priceRange.split('~').first
          .replaceAll(RegExp(r'[^0-9]'), '');
      return int.tryParse(cleaned) ?? 0;
    } catch (_) {
      return 0;
    }
  }

  /// CartItem.toJson() 결과를 웹과 공통으로 사용하는 OrderDraft 포맷으로 변환한다.
  /// 이렇게 변환해야 웹에서도 동일한 항목이 보인다.
  Map<String, dynamic> _toUnifiedDraft(Map<String, dynamic> cartItemJson) {
    final repairItem =
        Map<String, dynamic>.from(cartItemJson['repairItem'] as Map? ?? {});
    final imageUrls = List<String>.from(
      (cartItemJson['imageUrls'] as List?) ?? [],
    );
    final priceRange = repairItem['priceRange'] as String? ?? '';
    return {
      'clothingType': cartItemJson['clothingType'] as String? ?? '',
      'repairItems': [
        {
          'name': repairItem['repairPart'] ?? repairItem['name'] ?? '',
          'price': _extractMinPrice(priceRange),
          'priceRange': priceRange,
          'quantity': 1,
          // 앱 전용 필드도 함께 저장해 앱이 다시 읽을 때 그대로 쓸 수 있게 한다.
          'repairPart': repairItem['repairPart'] ?? '',
          'scope': repairItem['scope'] ?? '',
          'measurement': repairItem['measurement'] ?? '',
        }
      ],
      'imageUrls': imageUrls,
      'imagesWithPins': [],
    };
  }

  // ── 공개 API ────────────────────────────────────────────────────────────

  /// 내 장바구니 항목을 모두 불러온다 (source 무관 — 웹/앱 공유).
  Future<List<Map<String, dynamic>>> fetchAll() async {
    final userId = await _resolveUserId();
    if (userId == null) return [];
    try {
      final rows = await _supabase
          .from('cart_drafts')
          .select('id, draft_data, source, created_at')
          .eq('user_id', userId)
          .order('created_at', ascending: true);
      return List<Map<String, dynamic>>.from(rows as List);
    } catch (e) {
      debugPrint('CartService.fetchAll error: $e');
      return [];
    }
  }

  /// 항목 하나를 추가한다.
  /// [draftData] 는 CartItem.toJson() 결과다.
  /// 웹과 공통인 OrderDraft 포맷으로 변환해 저장한다.
  /// 반환값은 서버가 부여한 UUID (없으면 null).
  Future<String?> addItem(Map<String, dynamic> draftData) async {
    final userId = await _resolveUserId();
    if (userId == null) return null;
    try {
      final unified = _toUnifiedDraft(draftData);
      final row = await _supabase
          .from('cart_drafts')
          .insert({
            'user_id': userId,
            'draft_data': unified,
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

  /// 내 장바구니 전체 삭제 (source 무관 — 웹/앱 공유).
  Future<void> clearAll() async {
    final userId = await _resolveUserId();
    if (userId == null) return;
    try {
      await _supabase
          .from('cart_drafts')
          .delete()
          .eq('user_id', userId);
    } catch (e) {
      debugPrint('CartService.clearAll error: $e');
    }
  }
}
