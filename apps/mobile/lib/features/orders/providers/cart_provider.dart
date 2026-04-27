import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../services/cart_service.dart';

/// 장바구니 항목 모델 (개별 수선 항목)
///
/// 묶음 결제(여러 CartItem 을 한번에 quote/intent 로 보내는 흐름) 를 위해
/// 한 의류(=clothing item) 안에 들어 있던 핀/사진/clothingType 도 같이 들고 다닌다.
/// 같은 의류에서 떨어져 나온 CartItem 들은 [groupKey] 가 동일하다.
class CartItem {
  final String id;         // 로컬 임시 ID (서버와 연결되면 serverId 로 교체됨)
  final String? serverId;  // cart_drafts.id (서버 UUID) — null 이면 아직 미업로드
  final Map<String, dynamic> repairItem;
  final List<String> imageUrls;
  /// 핀까지 포함된 원본 이미지 정보. (서버 quote/intent 에 그대로 전달)
  final List<Map<String, dynamic>> imagesWithPins;
  /// 같은 의류에서 떨어져 나온 CartItem 들이 공유하는 키.
  /// (보통 `${serverId}#c${clothingIdx}` 형태. fallback 으로 serverId 만 쓰기도 한다.)
  final String groupKey;
  /// 이 묶음(의류)의 종류 표기. (없으면 빈 문자열)
  final String clothingType;
  final DateTime addedAt;

  CartItem({
    required this.id,
    required this.repairItem,
    required this.imageUrls,
    this.imagesWithPins = const [],
    this.serverId,
    String? groupKey,
    this.clothingType = '',
    DateTime? addedAt,
  })  : groupKey = groupKey ?? (serverId ?? id),
        addedAt = addedAt ?? DateTime.now();

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
        'imagesWithPins': imagesWithPins,
        'groupKey': groupKey,
        'clothingType': clothingType,
        'addedAt': addedAt.toIso8601String(),
      };

  factory CartItem.fromJson(Map<String, dynamic> json) => CartItem(
        id: json['id'] as String,
        serverId: json['serverId'] as String?,
        repairItem: Map<String, dynamic>.from(json['repairItem'] as Map),
        imageUrls: List<String>.from(json['imageUrls'] as List),
        imagesWithPins: ((json['imagesWithPins'] as List?) ?? [])
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList(),
        groupKey: json['groupKey'] as String?,
        clothingType: (json['clothingType'] as String?) ?? '',
        addedAt: DateTime.parse(json['addedAt'] as String),
      );

  CartItem copyWith({String? serverId}) => CartItem(
        id: id,
        serverId: serverId ?? this.serverId,
        repairItem: repairItem,
        imageUrls: imageUrls,
        imagesWithPins: imagesWithPins,
        groupKey: groupKey,
        clothingType: clothingType,
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
          //    각 의류(clothing)는 groupKey 로 묶어서 묶음 결제 시 복원할 수 있게 한다.
          final itemsList = data['items'] as List?;
          if (itemsList != null && itemsList.isNotEmpty) {
            int globalIdx = 0;
            for (int clothingIdx = 0;
                clothingIdx < itemsList.length;
                clothingIdx++) {
              final clothingRaw = itemsList[clothingIdx];
              if (clothingRaw is! Map) continue;
              final clothing = Map<String, dynamic>.from(clothingRaw);
              final repairItemsList = (clothing['repairItems'] as List?) ?? [];
              final imagesWithPinsRaw =
                  (clothing['imagesWithPins'] as List?) ?? [];
              final imagesWithPins = imagesWithPinsRaw
                  .whereType<Map>()
                  .map((e) => Map<String, dynamic>.from(e))
                  .toList();
              final imageUrls = imagesWithPins
                  .map((m) => m['imageUrl'] as String?)
                  .where((u) => u != null && u.isNotEmpty)
                  .cast<String>()
                  .toList();
              final clothingType =
                  (clothing['clothingType'] as String?) ?? '';
              final groupKey = '${serverId}#c$clothingIdx';

              for (final riRaw in repairItemsList) {
                if (riRaw is! Map) continue;
                final ri = _normalizeRepairItem(
                  Map<String, dynamic>.from(riRaw),
                  fallbackClothingType: clothingType,
                );
                items.add(CartItem(
                  id: '${serverId}_$globalIdx',
                  serverId: serverId,
                  repairItem: ri,
                  imageUrls: imageUrls,
                  imagesWithPins: imagesWithPins,
                  groupKey: groupKey,
                  clothingType: clothingType,
                ));
                globalIdx++;
              }
            }
            continue;
          }

          // 2. 통합 포맷: repairItems 배열 (한 row 가 곧 한 의류로 간주)
          final repairItemsList = data['repairItems'] as List?;
          if (repairItemsList != null && repairItemsList.isNotEmpty) {
            final clothingType = (data['clothingType'] as String?) ?? '';
            final imagesWithPinsRaw = (data['imagesWithPins'] as List?) ?? [];
            final imagesWithPins = imagesWithPinsRaw
                .whereType<Map>()
                .map((e) => Map<String, dynamic>.from(e))
                .toList();
            final imageUrls = imagesWithPins.isNotEmpty
                ? imagesWithPins
                    .map((m) => m['imageUrl'] as String?)
                    .where((u) => u != null && u.isNotEmpty)
                    .cast<String>()
                    .toList()
                : List<String>.from((data['imageUrls'] as List?) ?? []);
            for (int idx = 0; idx < repairItemsList.length; idx++) {
              final ri = _normalizeRepairItem(
                Map<String, dynamic>.from(repairItemsList[idx] as Map),
                fallbackClothingType: clothingType,
              );
              items.add(CartItem(
                id: '${serverId}_$idx',
                serverId: serverId,
                repairItem: ri,
                imageUrls: imageUrls,
                imagesWithPins: imagesWithPins,
                groupKey: serverId,
                clothingType: clothingType,
              ));
            }
            continue;
          }

          // 3. 구형 앱 포맷: repairItem 단일 맵
          if (data['repairItem'] is Map) {
            final clothingType = (data['clothingType'] as String?) ?? '';
            final imagesWithPinsRaw = (data['imagesWithPins'] as List?) ?? [];
            final imagesWithPins = imagesWithPinsRaw
                .whereType<Map>()
                .map((e) => Map<String, dynamic>.from(e))
                .toList();
            final imageUrls = imagesWithPins.isNotEmpty
                ? imagesWithPins
                    .map((m) => m['imageUrl'] as String?)
                    .where((u) => u != null && u.isNotEmpty)
                    .cast<String>()
                    .toList()
                : List<String>.from((data['imageUrls'] as List?) ?? []);
            final ri = _normalizeRepairItem(
              Map<String, dynamic>.from(data['repairItem'] as Map),
              fallbackClothingType: clothingType,
            );
            items.add(CartItem(
              id: serverId,
              serverId: serverId,
              repairItem: ri,
              imageUrls: imageUrls,
              imagesWithPins: imagesWithPins,
              groupKey: serverId,
              clothingType: clothingType,
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

  // ── 내부 헬퍼 ──────────────────────────────────────────────────────────

  /// 어떤 포맷에서 들어오든 cart_page / pickup_request_page 에서 안전하게
  /// String 으로 다룰 수 있도록 주요 필드를 모두 채워준다.
  /// (웹은 RepairItem.{name,price,priceRange,quantity} 만 저장하므로
  ///  repairPart/scope/measurement 가 비어 들어오는 경우가 많다.)
  Map<String, dynamic> _normalizeRepairItem(
    Map<String, dynamic> ri, {
    String fallbackClothingType = '',
  }) {
    final name = (ri['name'] as String?) ?? '';
    final repairPart = (ri['repairPart'] as String?)?.trim();
    if (repairPart == null || repairPart.isEmpty) {
      ri['repairPart'] = name.isNotEmpty ? name : '수선 항목';
    }
    if (ri['name'] == null || (ri['name'] as String).isEmpty) {
      ri['name'] = ri['repairPart'];
    }
    ri['scope'] = (ri['scope'] as String?) ?? '';
    ri['measurement'] = (ri['measurement'] as String?) ?? '';
    ri['priceRange'] = (ri['priceRange'] as String?) ?? '';
    if (ri['price'] is! int) {
      final p = ri['price'];
      if (p is num) {
        ri['price'] = p.toInt();
      } else if (p is String) {
        ri['price'] = int.tryParse(p) ?? 0;
      } else {
        ri['price'] = 0;
      }
    }
    if (ri['quantity'] is! int) {
      ri['quantity'] = 1;
    }
    if (fallbackClothingType.isNotEmpty &&
        (ri['clothingType'] as String?)?.isEmpty != false) {
      ri['clothingType'] = fallbackClothingType;
    }
    return ri;
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
