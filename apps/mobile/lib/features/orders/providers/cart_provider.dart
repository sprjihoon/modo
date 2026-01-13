import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// 장바구니 항목 모델 (개별 수선 항목)
class CartItem {
  final String id;
  final Map<String, dynamic> repairItem; // 단일 수선 항목 (itemImages 포함)
  final List<String> imageUrls;
  final DateTime addedAt;

  CartItem({
    required this.id,
    required this.repairItem,
    required this.imageUrls,
    DateTime? addedAt,
  }) : addedAt = addedAt ?? DateTime.now();

  /// 가격 계산
  int get price {
    final priceRange = repairItem['priceRange'] as String;
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

  /// JSON으로 변환
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'repairItem': repairItem,
      'imageUrls': imageUrls,
      'addedAt': addedAt.toIso8601String(),
    };
  }

  /// JSON에서 생성
  factory CartItem.fromJson(Map<String, dynamic> json) {
    return CartItem(
      id: json['id'] as String,
      repairItem: json['repairItem'] as Map<String, dynamic>,
      imageUrls: List<String>.from(json['imageUrls'] as List),
      addedAt: DateTime.parse(json['addedAt'] as String),
    );
  }
}

/// 장바구니 상태 관리
class CartNotifier extends StateNotifier<List<CartItem>> {
  static const String _cartKey = 'cart_items';

  CartNotifier() : super([]) {
    _loadCart();
  }

  /// SharedPreferences에서 장바구니 로드
  Future<void> _loadCart() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cartJson = prefs.getString(_cartKey);
      if (cartJson != null) {
        final List<dynamic> cartList = jsonDecode(cartJson);
        final cartItems = cartList
            .map((item) => CartItem.fromJson(item as Map<String, dynamic>))
            .toList();
        state = cartItems;
      }
    } catch (e) {
      // 로드 실패 시 빈 장바구니로 시작
      state = [];
    }
  }

  /// SharedPreferences에 장바구니 저장
  Future<void> _saveCart() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cartJson = jsonEncode(state.map((item) => item.toJson()).toList());
      await prefs.setString(_cartKey, cartJson);
    } catch (e) {
      // 저장 실패는 무시 (로컬 저장소 문제)
    }
  }

  /// 장바구니에 항목 추가 (각 수선 항목을 개별 카드로)
  Future<void> addToCart({
    required List<Map<String, dynamic>> repairItems,
    required List<String> imageUrls,
  }) async {
    // 각 수선 항목을 개별 CartItem으로 변환
    final int baseTimestamp = DateTime.now().millisecondsSinceEpoch;
    
    final List<CartItem> newItems = [];
    for (int i = 0; i < repairItems.length; i++) {
      final item = CartItem(
        id: '${baseTimestamp + i}',
        repairItem: repairItems[i],  // repairItem에 itemImages가 포함됨
        imageUrls: imageUrls,
      );
      newItems.add(item);
    }
    
    state = [...state, ...newItems];
    await _saveCart();
  }

  /// 장바구니에서 항목 제거
  Future<void> removeFromCart(String itemId) async {
    state = state.where((item) => item.id != itemId).toList();
    await _saveCart();
  }

  /// 장바구니 비우기
  Future<void> clearCart() async {
    state = [];
    await _saveCart();
  }

  /// 전체 가격 계산
  int getTotalPrice() {
    return state.fold(0, (sum, item) => sum + item.price);
  }

  /// 전체 항목 개수
  int getTotalItemCount() {
    return state.length; // 각 카드가 1개 항목
  }
}

/// 장바구니 Provider
final cartProvider = StateNotifierProvider<CartNotifier, List<CartItem>>((ref) {
  return CartNotifier();
});

/// 장바구니 항목 개수 Provider
final cartItemCountProvider = Provider<int>((ref) {
  final cart = ref.watch(cartProvider);
  return cart.length; // 각 카드가 1개 항목
});

/// 장바구니 총 가격 Provider
final cartTotalPriceProvider = Provider<int>((ref) {
  final cart = ref.watch(cartProvider);
  return cart.fold(0, (sum, item) => sum + item.price);
});

