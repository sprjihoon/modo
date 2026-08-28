import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../services/cart_service.dart';
import '../../../../services/customer_event_service.dart';
import '../domain/cart_draft_items.dart';
import '../domain/cart_item.dart';

export '../domain/cart_item.dart';

/// 장바구니 상태 관리
/// - 로그인 상태이면 Supabase cart_drafts 를 primary storage 로 사용한다.
/// - 비로그인 상태이면 SharedPreferences fallback.
/// - 앱 시작 시 서버 데이터를 불러와서 로컬 캐시를 대체한다.
class CartNotifier extends StateNotifier<List<CartItem>> {
  static const String _cacheKey = 'cart_items_v2';

  final _svc = CartService();

  CartNotifier() : super([]) {
    _init();
  }

  // ── 초기화 ─────────────────────────────────────────────────────────────

  Future<void> _init() async {
    // 1. 로컬 캐시를 먼저 보여줘서 빠른 렌더링
    await _loadLocalCache();

    // 2. 로그인 되어 있으면 서버에서 최신 데이터로 대체
    if (_svc.isLoggedIn) {
      await _syncFromServer();
    }
  }

  Future<void> _loadLocalCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_cacheKey);
      if (raw != null) {
        final list = jsonDecode(raw) as List<dynamic>;
        state = list
            .map((e) => CartItem.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } catch (e) {
      debugPrint('CartNotifier._loadLocalCache error: $e');
    }
  }

  Future<void> _saveLocalCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
        _cacheKey,
        jsonEncode(state.map((i) => i.toJson()).toList()),
      );
    } catch (e) {
      debugPrint('CartNotifier._saveLocalCache error: $e');
    }
  }

  /// 서버 데이터를 내려받아 로컬 state 를 덮어쓴다.
  ///
  /// draft_data 는 세 가지 포맷이 혼재할 수 있다.
  ///  1. 신규 웹 멀티 포맷: items: [{ clothingType, repairItems, imagesWithPins }, ...]
  ///  2. 통합 포맷 (옛 웹/앱 공통 OrderDraft): repairItems 배열 (최상위)
  ///  3. 구형 앱 포맷: repairItem 단일 맵 (최상위)
  Future<void> _syncFromServer() async {
    try {
      final rows = await _svc.fetchAll();
      final items = <CartItem>[];

      for (final row in rows) {
        try {
          final data = Map<String, dynamic>.from(row['draft_data'] as Map);
          final serverId = row['id'] as String;
          items.addAll(
            cartItemsFromDraft(data, idPrefix: serverId, serverId: serverId),
          );
        } catch (e) {
          debugPrint('CartNotifier._syncFromServer item parse error: $e');
        }
      }

      state = items;
      await _saveLocalCache();
    } catch (e) {
      debugPrint('CartNotifier._syncFromServer error: $e');
    }
  }

  // ── 공개 API ────────────────────────────────────────────────────────────

  /// 로컬 id 로 CartItem 을 찾는다 (UI 에서 server id 추출용).
  CartItem? findById(String id) {
    for (final i in state) {
      if (i.id == id) return i;
    }
    return null;
  }

  /// 서버에 저장된 cart_drafts 행을 server id 로 직접 지운다.
  /// (장바구니에서 이어 작성 → 다시 담기 시 원본 중복 방지용)
  Future<void> removeServerCartRow(String serverId) async {
    if (_svc.isLoggedIn) {
      await _svc.removeItem(serverId);
    }
    state = state.where((i) => i.serverId != serverId).toList();
    await _saveLocalCache();
  }

  /// 서버에서 최신 장바구니를 다시 불러온다 (pull-to-refresh 등에서 호출).
  Future<void> refresh() async {
    if (_svc.isLoggedIn) {
      await _syncFromServer();
    } else {
      await _loadLocalCache();
    }
  }

  /// 수선 항목들을 장바구니에 추가한다.
  Future<void> addToCart({
    required List<Map<String, dynamic>> repairItems,
    required List<String> imageUrls,
  }) async {
    final base = DateTime.now().millisecondsSinceEpoch;
    final newItems = <CartItem>[];

    for (int i = 0; i < repairItems.length; i++) {
      final localId = '${base + i}';
      var item = CartItem(
        id: localId,
        repairItem: repairItems[i],
        imageUrls: imageUrls,
      );

      // 서버에 업로드
      if (_svc.isLoggedIn) {
        final serverId = await _svc.addItem(item.toJson());
        if (serverId != null) {
          item = item.copyWith(serverId: serverId);
        }
      }

      newItems.add(item);
      // 분석: 장바구니 추가 (관리자 퍼널 CART_ADD)
      final name = (item.repairItem['name'] ??
              item.repairItem['repairPart'] ??
              item.clothingType)
          .toString();
      CustomerEventService.trackCartAdd(
        itemName: name.isEmpty ? '수선 항목' : name,
        targetId: item.serverId ?? item.id,
        quantity: 1,
        price: item.price,
      );
    }

    state = [...state, ...newItems];
    await _saveLocalCache();
  }

  /// OrderDraft 형식(수거 정보 포함)으로 장바구니에 추가한다.
  /// 신규 흐름은 `items[]` 만 있고 최상위 `repairItems` 가 없다.
  Future<void> addOrderDraftToCart(Map<String, dynamic> orderDraft) async {
    String? serverId;
    if (_svc.isLoggedIn) {
      serverId = await _svc.addOrderDraft(orderDraft);
      if (serverId == null) {
        throw Exception('장바구니 저장에 실패했습니다');
      }
      await _syncFromServer();
      if (state.any((i) => i.serverId == serverId)) {
        _trackAdds(state.where((i) => i.serverId == serverId));
        return;
      }
    }

    final localId = serverId ?? '${DateTime.now().millisecondsSinceEpoch}';
    final newItems = cartItemsFromDraft(
      orderDraft,
      idPrefix: localId,
      serverId: serverId,
    );
    if (newItems.isEmpty) {
      throw Exception('담을 수선 항목이 없습니다');
    }

    _trackAdds(newItems);
    state = [...state, ...newItems];
    await _saveLocalCache();
  }

  void _trackAdds(Iterable<CartItem> items) {
    for (final item in items) {
      final name = (item.repairItem['name'] ??
              item.repairItem['repairPart'] ??
              item.clothingType)
          .toString();
      CustomerEventService.trackCartAdd(
        itemName: name.isEmpty ? '수선 항목' : name,
        targetId: item.serverId ?? item.id,
        quantity: 1,
        price: item.price,
      );
    }
  }

  /// 항목을 장바구니에서 제거한다.
  Future<void> removeFromCart(String itemId) async {
    final target = state.firstWhere(
      (i) => i.id == itemId,
      orElse: () => CartItem(id: '', repairItem: {}, imageUrls: []),
    );

    // 서버에서 삭제
    if (_svc.isLoggedIn && target.serverId != null) {
      await _svc.removeItem(target.serverId!);
    }

    if (target.id.isNotEmpty) {
      final name = (target.repairItem['name'] ??
              target.repairItem['repairPart'] ??
              target.clothingType)
          .toString();
      CustomerEventService.trackCartRemove(
        itemName: name.isEmpty ? '수선 항목' : name,
        targetId: target.serverId ?? target.id,
      );
    }

    state = state.where((i) => i.id != itemId).toList();
    await _saveLocalCache();
  }

  /// 장바구니를 전체 비운다.
  Future<void> clearCart() async {
    final count = state.length;
    if (_svc.isLoggedIn) {
      await _svc.clearAll();
    }
    if (count > 0) {
      CustomerEventService.trackEvent(
        eventType: CustomerEventType.CART_CLEAR,
        metadata: {'item_count': count},
      );
    }
    state = [];
    await _saveLocalCache();
  }

  int getTotalPrice() => state.fold(0, (s, i) => s + i.price);
  int getTotalItemCount() => state.length;
}

/// Providers
final cartProvider =
    StateNotifierProvider<CartNotifier, List<CartItem>>((ref) {
  return CartNotifier();
});

final cartItemCountProvider = Provider<int>((ref) {
  return ref.watch(cartProvider).length;
});

final cartTotalPriceProvider = Provider<int>((ref) {
  return ref.watch(cartProvider).fold(0, (s, i) => s + i.price);
});
