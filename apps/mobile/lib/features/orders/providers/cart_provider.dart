import 'package:flutter_riverpod/flutter_riverpod.dart';

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
}

/// 장바구니 상태 관리
class CartNotifier extends StateNotifier<List<CartItem>> {
  CartNotifier() : super([]);

  /// 장바구니에 항목 추가 (각 수선 항목을 개별 카드로)
  void addToCart({
    required List<Map<String, dynamic>> repairItems,
    required List<String> imageUrls,
  }) {
    // 각 수선 항목을 개별 CartItem으로 변환
    final int baseTimestamp = DateTime.now().millisecondsSinceEpoch;
    
    for (int i = 0; i < repairItems.length; i++) {
      final item = CartItem(
        id: '${baseTimestamp + i}',
        repairItem: repairItems[i],  // repairItem에 itemImages가 포함됨
        imageUrls: imageUrls,
      );
      state = [...state, item];
    }
  }

  /// 장바구니에서 항목 제거
  void removeFromCart(String itemId) {
    state = state.where((item) => item.id != itemId).toList();
  }

  /// 장바구니 비우기
  void clearCart() {
    state = [];
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

