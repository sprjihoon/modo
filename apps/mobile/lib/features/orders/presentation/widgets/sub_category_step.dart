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
  final List<String>? inputLabels;
  final String? iconName;
  final String? description;

  const SubCategorySelection({
    required this.id,
    required this.name,
    this.directPrice,
    this.priceRange,
    this.requiresMeasurement = false,
    this.inputLabels,
    this.iconName,
    this.description,
  });

  bool get hasDirectPrice => directPrice != null && directPrice! > 0;
}

class SubCategoryStep extends StatefulWidget {
  final String categoryId;
  final String categoryName;
  final void Function(SubCategorySelection selection) onSelect;

  const SubCategoryStep({
    required this.categoryId,
    required this.categoryName,
    required this.onSelect,
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
          .select('id, name, icon_name, display_order, price, price_range, requires_measurement, input_count, input_labels, description')
          .eq('is_active', true)
          .eq('parent_category_id', widget.categoryId)
          .order('display_order', ascending: true);

      final subs = List<Map<String, dynamic>>.from(response);

      if (mounted) {
        if (subs.isEmpty) {
          // No sub-categories → treat the parent as a direct selection
          widget.onSelect(SubCategorySelection(
            id: widget.categoryId,
            name: widget.categoryName,
          ));
        } else {
          setState(() {
            _subCategories = subs;
            _isLoading = false;
          });
        }
      }
    } catch (e) {
      debugPrint('소카테고리 로드 실패: $e');
      if (mounted) setState(() => _isLoading = false);
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
              final name = sub['name'] as String;
              final iconName = sub['icon_name'] as String?;
              final directPrice = sub['price'] as int?;
              final hasDirectPrice = directPrice != null && directPrice > 0;
              final requiresMeasurement = sub['requires_measurement'] as bool? ?? false;
              final rawLabels = sub['input_labels'];
              final inputLabels = rawLabels is List
                  ? rawLabels.map((e) => e.toString()).toList()
                  : ['치수 (cm)'];

              return InkWell(
                onTap: () {
                  widget.onSelect(SubCategorySelection(
                    id: sub['id'] as String,
                    name: name,
                    directPrice: directPrice,
                    priceRange: sub['price_range'] as String?,
                    requiresMeasurement: requiresMeasurement,
                    inputLabels: inputLabels,
                    iconName: iconName,
                    description: sub['description'] as String?,
                  ));
                },
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
                        iconName: iconName,
                        size: 60,
                        color: Colors.grey.shade500,
                      ),
                      const SizedBox(height: 12),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        child: Text(
                          name,
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
                          sub['price_range'] as String? ?? _formatPrice(directPrice),
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
