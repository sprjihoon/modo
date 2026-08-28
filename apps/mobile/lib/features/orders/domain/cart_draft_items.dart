import 'cart_item.dart';
import 'repair_item_payload.dart';

/// draft_data 한 건을 장바구니 행으로 펼친다.
///
/// 지원 포맷:
///  1. 신규 웹/앱: `items: [{ clothingType, repairItems, imagesWithPins }, ...]`
///  2. 통합: 최상위 `repairItems`
///  3. 구형 앱: 최상위 `repairItem`
List<CartItem> cartItemsFromDraft(
  Map<String, dynamic> data, {
  required String idPrefix,
  String? serverId,
}) {
  final items = <CartItem>[];

  final itemsList = data['items'] as List?;
  if (itemsList != null && itemsList.isNotEmpty) {
    var globalIdx = 0;
    for (var clothingIdx = 0; clothingIdx < itemsList.length; clothingIdx++) {
      final clothingRaw = itemsList[clothingIdx];
      if (clothingRaw is! Map) continue;
      final clothing = Map<String, dynamic>.from(clothingRaw);
      final repairItemsList = (clothing['repairItems'] as List?) ?? [];
      final imagesWithPins = _mapsOf(clothing['imagesWithPins']);
      final imageUrls = _imageUrlsOf(imagesWithPins, fallback: const []);
      final clothingType = clothing['clothingType']?.toString() ?? '';
      final groupKey = '$idPrefix#c$clothingIdx';

      for (final riRaw in repairItemsList) {
        if (riRaw is! Map) continue;
        items.add(
          CartItem(
            id: '${idPrefix}_$globalIdx',
            serverId: serverId,
            repairItem: normalizeCartRepairItem(
              Map<String, dynamic>.from(riRaw),
              fallbackClothingType: clothingType,
            ),
            imageUrls: imageUrls,
            imagesWithPins: imagesWithPins,
            groupKey: groupKey,
            clothingType: clothingType,
          ),
        );
        globalIdx++;
      }
    }
    if (items.isNotEmpty) return items;
  }

  final repairItemsList = data['repairItems'] as List?;
  if (repairItemsList != null && repairItemsList.isNotEmpty) {
    final clothingType = data['clothingType']?.toString() ?? '';
    final imagesWithPins = _mapsOf(data['imagesWithPins']);
    final imageUrls = _imageUrlsOf(
      imagesWithPins,
      fallback: _stringListOf(data['imageUrls']),
    );
    for (var idx = 0; idx < repairItemsList.length; idx++) {
      final riRaw = repairItemsList[idx];
      if (riRaw is! Map) continue;
      items.add(
        CartItem(
          id: '${idPrefix}_$idx',
          serverId: serverId,
          repairItem: normalizeCartRepairItem(
            Map<String, dynamic>.from(riRaw),
            fallbackClothingType: clothingType,
          ),
          imageUrls: imageUrls,
          imagesWithPins: imagesWithPins,
          groupKey: serverId ?? idPrefix,
          clothingType: clothingType,
        ),
      );
    }
    if (items.isNotEmpty) return items;
  }

  if (data['repairItem'] is Map) {
    final clothingType = data['clothingType']?.toString() ?? '';
    final imagesWithPins = _mapsOf(data['imagesWithPins']);
    final imageUrls = _imageUrlsOf(
      imagesWithPins,
      fallback: _stringListOf(data['imageUrls']),
    );
    items.add(
      CartItem(
        id: idPrefix,
        serverId: serverId,
        repairItem: normalizeCartRepairItem(
          Map<String, dynamic>.from(data['repairItem'] as Map),
          fallbackClothingType: clothingType,
        ),
        imageUrls: imageUrls,
        imagesWithPins: imagesWithPins,
        groupKey: serverId ?? idPrefix,
        clothingType: clothingType,
      ),
    );
  }

  return items;
}

Map<String, dynamic> normalizeCartRepairItem(
  Map<String, dynamic> ri, {
  String fallbackClothingType = '',
}) {
  final name = ri['name']?.toString() ?? '';
  final repairPart = ri['repairPart']?.toString().trim();
  if (repairPart == null || repairPart.isEmpty) {
    ri['repairPart'] = name.isNotEmpty ? name : '수선 항목';
  }
  if (ri['name'] == null || ri['name'].toString().isEmpty) {
    ri['name'] = ri['repairPart'];
  }
  ri['scope'] = ri['scope']?.toString() ?? '';
  ri['measurement'] = ri['measurement']?.toString() ?? '';
  ri['priceRange'] = ri['priceRange']?.toString() ?? '';
  if (ri['price'] is! int) {
    final p = ri['price'];
    if (p is num) {
      ri['price'] = p.toInt();
    } else if (p is String) {
      ri['price'] = int.tryParse(p.replaceAll(RegExp(r'[^0-9]'), '')) ?? 0;
    } else {
      ri['price'] = 0;
    }
  }
  if (ri['quantity'] is! int) {
    ri['quantity'] = 1;
  }
  if (fallbackClothingType.isNotEmpty &&
      (ri['clothingType']?.toString() ?? '').isEmpty) {
    ri['clothingType'] = fallbackClothingType;
  }
  final detail = repairItemDetail(ri);
  if (detail != null) {
    ri['detail'] = detail;
  }
  return ri;
}

List<Map<String, dynamic>> _mapsOf(dynamic raw) {
  if (raw is! List) return const [];
  return raw
      .whereType<Map>()
      .map((e) => Map<String, dynamic>.from(e))
      .toList();
}

List<String> _stringListOf(dynamic raw) {
  if (raw is! List) return const [];
  return raw.map((e) => e?.toString() ?? '').where((s) => s.isNotEmpty).toList();
}

List<String> _imageUrlsOf(
  List<Map<String, dynamic>> imagesWithPins, {
  required List<String> fallback,
}) {
  if (imagesWithPins.isEmpty) return fallback;
  return imagesWithPins
      .map((m) => m['imageUrl']?.toString())
      .whereType<String>()
      .where((u) => u.isNotEmpty)
      .toList();
}
