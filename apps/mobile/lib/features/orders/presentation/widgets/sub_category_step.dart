import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../core/widgets/category_icon_widget.dart';

const _brandColor = Color(0xFF00C896);

class SubCategorySelection {
  final String id;
  final String name;
  final int? directPrice;
  final String? priceRange;
  final bool requiresMeasurement;
  final int inputCount;
  final List<String>? inputLabels;
  final String? iconName;
  final String? description;
  final String? measureGuideKey;

  const SubCategorySelection({
    required this.id,
    required this.name,
    this.directPrice,
    this.priceRange,
    this.requiresMeasurement = false,
    this.inputCount = 1,
    this.inputLabels,
    this.iconName,
    this.description,
    this.measureGuideKey,
  });

  bool get hasDirectPrice => directPrice != null && directPrice! > 0;
}

/// 웹 SubCategoryStep.getInputLabels / RepairTypeStep과 동일한 라벨 정규화
List<String> normalizeInputLabels(dynamic rawLabels, {int inputCount = 1}) {
  final count = inputCount > 0 ? inputCount : 1;
  if (rawLabels is List) {
    final labels = rawLabels.map((e) => e.toString()).where((e) => e.isNotEmpty).toList();
    if (labels.isNotEmpty) return labels;
  }
  if (rawLabels is String && rawLabels.trim().isNotEmpty) {
    if (count <= 1) return [rawLabels.trim()];
    final parts = rawLabels
        .split(RegExp(r'(?<=\))\s+(?=\S)'))
        .map((e) => e.trim())
        .where((e) => e.isNotEmpty)
        .toList();
    if (parts.length >= count) return parts.take(count).toList();
    return List.generate(count, (i) => '치수 ${i + 1} (cm)');
  }
  return List.generate(count, (_) => '치수 (cm)');
}

SubCategorySelection _selectionFromRow(Map<String, dynamic> row) {
  final inputCount = (row['input_count'] as num?)?.toInt() ?? 1;
  return SubCategorySelection(
    id: row['id'].toString(),
    name: (row['name'] as String?) ?? '',
    directPrice: (row['price'] as num?)?.toInt(),
    priceRange: row['price_range'] as String?,
    requiresMeasurement: row['requires_measurement'] == true,
    inputCount: inputCount,
    inputLabels: normalizeInputLabels(row['input_labels'], inputCount: inputCount),
    iconName: row['icon_name'] as String?,
    description: row['description'] as String?,
    measureGuideKey: row['measure_guide_key'] as String?,
  );
}

class SubCategoryStep extends StatefulWidget {
  final String categoryId;
  final String categoryName;
  final void Function(SubCategorySelection selection) onSelect;

  /// 자식도 없고 부모도 직접가격 leaf가 아닐 때 (웹 onNext("", undefined)와 동일)
  final VoidCallback? onEmpty;

  const SubCategoryStep({
    required this.categoryId,
    required this.categoryName,
    required this.onSelect,
    this.onEmpty,
    super.key,
  });

  @override
  State<SubCategoryStep> createState() => _SubCategoryStepState();
}

class _SubCategoryStepState extends State<SubCategoryStep> {
  List<Map<String, dynamic>> _subCategories = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadSubCategories();
  }

  Future<void> _loadSubCategories() async {
    try {
      final response = await Supabase.instance.client
          .from('repair_categories')
          .select(
            'id, name, icon_name, display_order, price, price_range, '
            'requires_measurement, input_count, input_labels, description, measure_guide_key',
          )
          .eq('is_active', true)
          .eq('parent_category_id', widget.categoryId)
          .order('display_order', ascending: true);

      final subs = List<Map<String, dynamic>>.from(response);

      if (!mounted) return;

      if (subs.isEmpty) {
        // 웹과 동일: 자식 없으면 부모 카테고리 자체가 직접가격 leaf인지 조회
        final parent = await Supabase.instance.client
            .from('repair_categories')
            .select(
              'id, name, icon_name, price, price_range, '
              'requires_measurement, input_count, input_labels, description, measure_guide_key',
            )
            .eq('id', widget.categoryId)
            .maybeSingle();

        if (!mounted) return;

        if (parent != null) {
          final price = (parent['price'] as num?)?.toInt();
          if (price != null && price > 0) {
            widget.onSelect(_selectionFromRow(Map<String, dynamic>.from(parent)));
            return;
          }
        }

        if (widget.onEmpty != null) {
          widget.onEmpty!();
        } else {
          // fallback: 이름만 넘기던 기존 동작 대신 빈 선택으로 수리유형 단계로
          widget.onSelect(SubCategorySelection(
            id: widget.categoryId,
            name: widget.categoryName,
          ));
        }
        return;
      }

      setState(() {
        _subCategories = subs;
        _isLoading = false;
      });
    } catch (e) {
      debugPrint('소카테고리 로드 실패: $e');
      if (mounted) {
        setState(() => _isLoading = false);
        widget.onEmpty?.call();
      }
    }
  }

  String _formatPrice(int price) {
    return '${price.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}원';
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(
          valueColor: AlwaysStoppedAnimation<Color>(_brandColor),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 4),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                '수선 부위를 선택해주세요',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.black87,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                '${widget.categoryName} · 수선 항목을 선택해주세요',
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey.shade400,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Expanded(
          child: GridView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 0.9,
            ),
            itemCount: _subCategories.length,
            itemBuilder: (context, index) {
              final sub = _subCategories[index];
              final selection = _selectionFromRow(sub);
              final hasDirectPrice = selection.hasDirectPrice;

              return InkWell(
                onTap: () => widget.onSelect(selection),
                borderRadius: BorderRadius.circular(16),
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    border: Border.all(
                      color: Colors.grey.shade200,
                      width: 2,
                    ),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      CategoryIconWidget(
                        iconName: selection.iconName,
                        size: 60,
                        preserveColors: true,
                      ),
                      const SizedBox(height: 12),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        child: Text(
                          selection.name,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: Colors.grey.shade700,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (hasDirectPrice) ...[
                        const SizedBox(height: 4),
                        Text(
                          selection.priceRange ??
                              _formatPrice(selection.directPrice!),
                          style: TextStyle(
                            fontSize: 10,
                            color: Colors.grey.shade400,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
