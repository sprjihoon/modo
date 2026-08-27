import 'dart:convert';

/// 수선 항목에서 고객 입력 수치를 꺼낸다.
///
/// 지원 포맷:
/// - 신규 웹/앱: `detail` ("줄일 길이 (cm): 3")
/// - 수선유형+세부부위: 항목별 `detail`
/// - 옛 앱: `scope` / `measurement` / `selectedParts`
/// - 옛 앱 상세: `detailedMeasurements` ([{part, value}] 또는 [{part, values:[{label,value}]}])
String? repairItemDetail(Map<String, dynamic> item) {
  final existing = item['detail']?.toString().trim();
  if (existing != null && existing.isNotEmpty) return existing;

  final fromDetailed = detailFromDetailedMeasurements(item['detailedMeasurements']);
  if (fromDetailed != null) return fromDetailed;

  final scope = item['scope']?.toString();
  final measurement = item['measurement']?.toString();
  final selected = (item['selectedParts'] as List?)?.cast<dynamic>();
  final parts = <String>[];
  if (scope != null && scope.isNotEmpty) parts.add(scope);
  if (measurement != null &&
      measurement.isNotEmpty &&
      measurement != '{}') {
    parts.add(measurement);
  }
  if (selected != null && selected.isNotEmpty) {
    parts.add('부위: ${selected.join(', ')}');
  }
  return parts.isEmpty ? null : parts.join(' / ');
}

String? detailFromDetailedMeasurements(dynamic raw) {
  if (raw is! List || raw.isEmpty) return null;
  final lines = <String>[];
  for (final entry in raw) {
    if (entry is! Map) continue;
    final part = entry['part']?.toString() ?? '';
    final values = entry['values'];
    if (values is List && values.isNotEmpty) {
      final bits = values.map((v) {
        if (v is Map) {
          final label = v['label']?.toString() ?? '';
          final value = v['value']?.toString() ?? '';
          if (value.isEmpty) return '';
          return label.isEmpty ? value : '$label: $value';
        }
        return v.toString();
      }).where((s) => s.trim().isNotEmpty).join(', ');
      if (bits.isEmpty) continue;
      lines.add(part.isEmpty ? bits : '$part ($bits)');
      continue;
    }
    final value = entry['value']?.toString() ?? '';
    if (value.isEmpty) continue;
    lines.add(part.isEmpty ? value : '$part: $value');
  }
  return lines.isEmpty ? null : lines.join(' / ');
}

/// 결제 견적·장바구니 draft 에 넣는 수선 항목.
/// 작업지시서/주문상세는 여기서 빠진 `detail` 을 복구할 수 없다.
Map<String, dynamic> toQuoteRepairItem(Map<String, dynamic> item) {
  final name = (item['repairPart'] as String?) ??
      (item['name'] as String?) ??
      '수선';
  final price = item['price'] is int
      ? item['price'] as int
      : int.tryParse(item['price']?.toString() ?? '') ?? 0;
  final quantity = item['quantity'] is int
      ? item['quantity'] as int
      : int.tryParse(item['quantity']?.toString() ?? '') ?? 1;
  final detail = repairItemDetail(item);
  return <String, dynamic>{
    'name': name,
    'price': price,
    'quantity': quantity < 1 ? 1 : quantity,
    if (detail != null) 'detail': detail,
  };
}

/// orders.repair_parts text[] 에 넣는 JSON 문자열.
String toRepairPartJson(Map<String, dynamic> item) {
  return jsonEncode(toQuoteRepairItem(item));
}

class ParsedRepairPart {
  final String name;
  final int price;
  final int quantity;
  final String? detail;

  const ParsedRepairPart({
    required this.name,
    this.price = 0,
    this.quantity = 1,
    this.detail,
  });
}

ParsedRepairPart parseRepairPart(dynamic raw) {
  if (raw == null) return const ParsedRepairPart(name: '');
  if (raw is Map) {
    final map = Map<String, dynamic>.from(raw);
    final detail = repairItemDetail(map);
    final name = (map['name'] ?? map['repairPart'] ?? '').toString();
    final price = map['price'] is num
        ? (map['price'] as num).toInt()
        : int.tryParse(map['price']?.toString() ?? '') ?? 0;
    final quantity = map['quantity'] is num
        ? (map['quantity'] as num).toInt()
        : int.tryParse(map['quantity']?.toString() ?? '') ?? 1;
    return ParsedRepairPart(
      name: name,
      price: price,
      quantity: quantity < 1 ? 1 : quantity,
      detail: detail,
    );
  }
  if (raw is String) {
    final s = raw.trim();
    if (s.startsWith('{')) {
      try {
        return parseRepairPart(jsonDecode(s));
      } catch (_) {
        return ParsedRepairPart(name: s);
      }
    }
    return ParsedRepairPart(name: s);
  }
  return ParsedRepairPart(name: raw.toString());
}

/// 작업지시서·주문 상세에 표시할 고객 입력 수치.
List<ParsedRepairPart> measurementLinesFromParts(dynamic parts) {
  if (parts is! List || parts.isEmpty) return const [];
  return parts
      .map(parseRepairPart)
      .where((p) => p.detail != null && p.detail!.isNotEmpty)
      .toList();
}
