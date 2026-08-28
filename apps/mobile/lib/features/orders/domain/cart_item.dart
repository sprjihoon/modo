/// 장바구니 항목 (개별 수선 항목)
class CartItem {
  final String id;
  final String? serverId;
  final Map<String, dynamic> repairItem;
  final List<String> imageUrls;
  final List<Map<String, dynamic>> imagesWithPins;
  final String groupKey;
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
    final rawPrice = repairItem['price'];
    if (rawPrice is num && rawPrice > 0) return rawPrice.toInt();
    if (rawPrice is String) {
      final n = int.tryParse(rawPrice.replaceAll(RegExp(r'[^0-9]'), ''));
      if (n != null && n > 0) return n;
    }
    final priceRange = repairItem['priceRange']?.toString() ?? '0';
    final prices = priceRange.split('~');
    if (prices.isNotEmpty) {
      final minPrice = prices[0].replaceAll(RegExp(r'[^0-9]'), '');
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
        id: json['id'].toString(),
        serverId: json['serverId']?.toString(),
        repairItem: Map<String, dynamic>.from(json['repairItem'] as Map? ?? {}),
        imageUrls: ((json['imageUrls'] as List?) ?? [])
            .map((e) => e?.toString() ?? '')
            .where((s) => s.isNotEmpty)
            .toList(),
        imagesWithPins: ((json['imagesWithPins'] as List?) ?? [])
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList(),
        groupKey: json['groupKey']?.toString(),
        clothingType: json['clothingType']?.toString() ?? '',
        addedAt: DateTime.tryParse(json['addedAt']?.toString() ?? '') ??
            DateTime.now(),
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
