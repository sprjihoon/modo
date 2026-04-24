import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../services/cart_service.dart';

/// 장바구니 항목 모델 (개별 수선 항목)
class CartItem {
  final String id;         // 로컬 임시 ID (서버와 연결되면 serverId 로 교체됨)
  final String? serverId;  // cart_drafts.id (서버 UUID) — null 이면 아직 미업로드
  final Map<String, dynamic> repairItem;
  final List<String> imageUrls;
  final DateTime addedAt;

  CartItem({
    required this.id,
    required this.repairItem,
    required this.imageUrls,
    this.serverId,
    DateTime? addedAt,
  }) : addedAt = addedAt ?? DateTime.now();

  int get price {
    final priceRange = repairItem['priceRange'] as String? ?? '0';
    final prices = priceRange.split('~');
    if (prices.isNotEmpty) {
      final minPrice = prices[0]
          .replaceAll('원', '')
          .replaceAll(',', '')
          .replaceAll('부위당', '')
          .trim();
      return int.tryParse(minPrice) ?? 0;
    }
    return 0;
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'serverId': serverId,
        'repairItem': repairItem,
        'imageUrls': imageUrls,
        'addedAt': addedAt.toIso8601String(),
      };

  factory CartItem.fromJson(Map<String, dynamic> json) => CartItem(
        id: json['id'] as String,
        serverId: json['serverId'] as String?,
        repairItem: json['repairItem'] as Map<String, dynamic>,
        imageUrls: List<String>.from(json['imageUrls'] as List),
        addedAt: DateTime.parse(json['addedAt'] as String),
      );

  CartItem copyWith({String? serverId}) => CartItem(
        id: id,
        serverId: serverId ?? this.serverId,
        repairItem: repairItem,
        imageUrls: imageUrls,
        addedAt: addedAt,
      );
}

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

          // 1. 신규 웹 멀티 포맷: items: ClothingItem[]
          final itemsList = data['items'] as List?;
          if (itemsList != null && itemsList.isNotEmpty) {
            int globalIdx = 0;
            for (final clothingRaw in itemsList) {
              if (clothingRaw is! Map) continue;
              final clothing = Map<String, dynamic>.from(clothingRaw);
              final repairItemsList = (clothing['repairItems'] as List?) ?? [];
              final imagesWithPins =
                  (clothing['imagesWithPins'] as List?) ?? [];
              final imageUrls = imagesWithPins
                  .whereType<Map>()
                  .map((m) => m['imageUrl'] as String?)
                  .where((u) => u != null && u.isNotEmpty)
                  .cast<String>()
                  .toList();

              for (final riRaw in repairItemsList) {
                if (riRaw is! Map) continue;
                final ri = Map<String, dynamic>.from(riRaw);
                if (!ri.containsKey('repairPart') ||
                    (ri['repairPart'] as String? ?? '').isEmpty) {
                  ri['repairPart'] = ri['name'] ?? '';
                }
                items.add(CartItem(
                  id: '${serverId}_$globalIdx',
                  serverId: serverId,
                  repairItem: ri,
                  imageUrls: imageUrls,
                ));
                globalIdx++;
              }
            }
            continue;
          }

          // 2. 통합 포맷: repairItems 배열에서 각 항목을 꺼낸다.
          final repairItemsList = data['repairItems'] as List?;
          if (repairItemsList != null && repairItemsList.isNotEmpty) {
            for (int idx = 0; idx < repairItemsList.length; idx++) {
              final ri = Map<String, dynamic>.from(repairItemsList[idx] as Map);
              if (!ri.containsKey('repairPart') ||
                  (ri['repairPart'] as String? ?? '').isEmpty) {
                ri['repairPart'] = ri['name'] ?? '';
              }
              items.add(CartItem(
                id: '${serverId}_$idx',
                serverId: serverId,
                repairItem: ri,
                imageUrls: List<String>.from(
                  (data['imageUrls'] as List?) ?? [],
                ),
              ));
            }
            continue;
          }

          // 3. 구형 앱 포맷: repairItem 단일 맵
          if (data['repairItem'] is Map) {
            final ri = Map<String, dynamic>.from(data['repairItem'] as Map);
            if (!ri.containsKey('repairPart') ||
                (ri['repairPart'] as String? ?? '').isEmpty) {
              ri['repairPart'] = ri['name'] ?? '';
            }
            items.add(CartItem(
              id: serverId,
              serverId: serverId,
              repairItem: ri,
              imageUrls: List<String>.from(
                (data['imageUrls'] as List?) ?? [],
              ),
            ));
          }
        } catch (e) {
          debugPrint('CartNotifier._syncFromServer item parse error: $e');
          // 파싱 실패한 항목은 건너뛴다.
        }
      }

      state = items;
      await _saveLocalCache();
    } catch (e) {
      debugPrint('CartNotifier._syncFromServer error: $e');
    }
  }

  // ── 공개 API ────────────────────────────────────────────────────────────

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
    }

    state = [...state, ...newItems];
    await _saveLocalCache();
  }

  /// OrderDraft 형식(수거 정보 포함)으로 장바구니에 추가한다.
  Future<void> addOrderDraftToCart(Map<String, dynamic> orderDraft) async {
    final localId = '${DateTime.now().millisecondsSinceEpoch}';
    final repairItems = (orderDraft['repairItems'] as List?) ?? [];
    final imageUrls = List<String>.from((orderDraft['imageUrls'] as List?) ?? []);

    // 로컬 상태에는 각 repairItem을 CartItem으로 추가
    final newItems = <CartItem>[];
    for (int i = 0; i < repairItems.length; i++) {
      final ri = Map<String, dynamic>.from(repairItems[i] as Map);
      if (!ri.containsKey('repairPart') ||
          (ri['repairPart'] as String? ?? '').isEmpty) {
        ri['repairPart'] = ri['name'] ?? '';
      }
      newItems.add(CartItem(
        id: '${localId}_$i',
        repairItem: ri,
        imageUrls: imageUrls,
      ));
    }

    // 서버에는 전체 OrderDraft 를 하나의 row 로 저장
    if (_svc.isLoggedIn) {
      await _svc.addOrderDraft(orderDraft);
    }

    state = [...state, ...newItems];
    await _saveLocalCache();
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

    state = state.where((i) => i.id != itemId).toList();
    await _saveLocalCache();
  }

  /// 장바구니를 전체 비운다.
  Future<void> clearCart() async {
    if (_svc.isLoggedIn) {
      await _svc.clearAll();
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
