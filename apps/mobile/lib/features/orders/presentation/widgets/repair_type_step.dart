import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../core/measure_guide.dart';
import '../../../../core/widgets/category_icon_widget.dart';
import '../../../../services/repair_service.dart';
import '../../domain/models/order_draft.dart' as models;
import 'measure_guide_accordion.dart';
import 'sub_category_step.dart' as sub_cat;

const _brandColor = Color(0xFF00C896);

class _RepairType {
  final String id;
  final String name;
  final String? subType;
  final int price;
  final String priceRange;
  final String? description;
  final String? iconName;
  final String? categoryId;
  final bool requiresMeasurement;
  final bool hasSubParts;
  final bool allowMultipleSubParts;
  final bool showAllOption;
  final int? allOptionPrice;
  final String? subPartsTitle;
  final bool requiresMultipleInputs;
  final List<String> inputLabels;
  final String? measureGuideKey;

  _RepairType({
    required this.id,
    required this.name,
    this.subType,
    required this.price,
    required this.priceRange,
    this.description,
    this.iconName,
    this.categoryId,
    this.requiresMeasurement = false,
    this.hasSubParts = false,
    this.allowMultipleSubParts = true,
    this.showAllOption = true,
    this.allOptionPrice,
    this.subPartsTitle,
    this.requiresMultipleInputs = false,
    this.inputLabels = const ['치수 (cm)'],
    this.measureGuideKey,
  });

  String get displayName => subType != null ? '$name ($subType)' : name;
}

class _SubPart {
  final String id;
  final String name;
  final int price;
  final String? iconName;

  _SubPart({required this.id, required this.name, required this.price, this.iconName});
}

class _SelectedItem {
  final String id;
  final String name;
  final int price;
  final String priceRange;
  int quantity;
  String detail;

  _SelectedItem({
    required this.id,
    required this.name,
    required this.price,
    required this.priceRange,
    this.quantity = 1,
    this.detail = '',
  });
}

class RepairTypeStepWidget extends StatefulWidget {
  final String clothingType;
  final String? clothingCategoryId;
  final String? categoryMeasureGuideKey;
  final void Function(List<models.RepairItem> items) onNext;

  const RepairTypeStepWidget({
    required this.clothingType,
    this.clothingCategoryId,
    this.categoryMeasureGuideKey,
    required this.onNext,
    super.key,
  });

  @override
  State<RepairTypeStepWidget> createState() => _RepairTypeStepWidgetState();
}

class _RepairTypeStepWidgetState extends State<RepairTypeStepWidget> {
  final _repairService = RepairService();
  List<_RepairType> _repairTypes = [];
  bool _isLoading = true;
  bool _loadError = false;
  final List<_SelectedItem> _selectedItems = [];
  bool _subPartsLoading = false;

  // Sub-parts inline view
  _RepairType? _subPartsRepairType;
  List<_SubPart> _subParts = [];
  String _subPartsMode = 'all'; // 'all' or 'specific'
  final Set<String> _subPartsSelectedIds = {};

  // Measurement inline view
  _RepairType? _measureRepairType;
  List<_SubPart>? _measureChosenParts;
  int? _measureOverridePrice;
  List<String> _measureValues = [];

  @override
  void initState() {
    super.initState();
    _loadRepairTypes();
  }

  Future<void> _loadRepairTypes() async {
    try {
      setState(() {
        _isLoading = true;
        _loadError = false;
      });

      final categoryId = widget.clothingCategoryId;
      List<Map<String, dynamic>> types;

      if (categoryId != null) {
        types = await _repairService.getRepairTypesByCategory(categoryId);
      } else {
        types = await _repairService.getAllRepairTypesWithCategories();
      }

      final mapped = types.map((d) {
        final inputCount = (d['input_count'] as num?)?.toInt() ?? 1;
        final labels = sub_cat.normalizeInputLabels(
          d['input_labels'],
          inputCount: inputCount,
        );

        return _RepairType(
          id: d['id'].toString(),
          name: (d['name'] as String?) ?? '',
          subType: d['sub_type'] as String?,
          price: (d['price'] as num?)?.toInt() ?? 0,
          priceRange: (d['price_range'] as String?) ?? _formatPrice((d['price'] as num?)?.toInt() ?? 0),
          description: d['description'] as String?,
          iconName: d['icon_name'] as String?,
          categoryId: d['category_id']?.toString(),
          requiresMeasurement: d['requires_measurement'] == true,
          hasSubParts: d['has_sub_parts'] == true,
          allowMultipleSubParts: d['allow_multiple_sub_parts'] != false,
          showAllOption: d['show_all_option'] != false,
          allOptionPrice: (d['all_option_price'] as num?)?.toInt(),
          subPartsTitle: d['sub_parts_title'] as String?,
          requiresMultipleInputs: d['requires_multiple_inputs'] == true,
          inputLabels: labels,
          measureGuideKey: d['measure_guide_key'] as String?,
        );
      }).toList();

      if (!mounted) return;

      // 웹 RepairTypeStep과 동일: 항목 1개면 중간 목록 생략하고 바로 분기
      if (mapped.length == 1) {
        final single = mapped[0];
        setState(() {
          _repairTypes = mapped;
          _isLoading = false;
        });
        if (single.hasSubParts) {
          await _openSubPartsView(single);
        } else if (single.requiresMeasurement) {
          _openMeasureView(single);
        } else {
          widget.onNext([
            models.RepairItem(
              name: single.displayName,
              price: single.price,
              priceRange: single.priceRange,
              quantity: 1,
            ),
          ]);
        }
        return;
      }

      setState(() {
        _repairTypes = mapped;
        _isLoading = false;
      });
    } catch (e) {
      debugPrint('수선 항목 로드 실패: $e');
      if (mounted) setState(() { _loadError = true; _isLoading = false; });
    }
  }

  String _formatPrice(int price) {
    return '${price.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}원';
  }

  void _handleTap(_RepairType type) {
    // Toggle off if already selected
    if (_selectedItems.any((i) => i.id == type.id || i.id.startsWith('${type.id}_'))) {
      setState(() {
        _selectedItems.removeWhere((i) => i.id == type.id || i.id.startsWith('${type.id}_'));
      });
      return;
    }

    if (type.hasSubParts) {
      _openSubPartsView(type);
    } else if (type.requiresMeasurement) {
      _openMeasureView(type);
    } else {
      _addSimpleItem(type);
    }
  }

  void _addSimpleItem(_RepairType type, {String? detail, int? overridePrice}) {
    final effectivePrice = overridePrice ?? type.price;
    setState(() {
      _selectedItems.add(_SelectedItem(
        id: type.id,
        name: type.displayName,
        price: effectivePrice,
        priceRange: type.priceRange.isNotEmpty ? type.priceRange : _formatPrice(effectivePrice),
        detail: detail ?? '',
      ));
    });
  }

  Future<void> _openSubPartsView(_RepairType type) async {
    setState(() => _subPartsLoading = true);
    try {
      final response = await Supabase.instance.client
          .from('repair_sub_parts')
          .select('id, name, price, icon_name, display_order')
          .eq('repair_type_id', type.id)
          .order('display_order', ascending: true);

      final parts = (response as List).map((sp) {
        final m = Map<String, dynamic>.from(sp as Map);
        return _SubPart(
          id: m['id'].toString(),
          name: (m['name'] as String?) ?? '',
          price: (m['price'] as num?)?.toInt() ?? 0,
          iconName: m['icon_name'] as String?,
        );
      }).toList();

      if (parts.isEmpty) {
        if (type.requiresMeasurement) {
          _openMeasureView(type);
        } else {
          _addSimpleItem(type);
        }
        setState(() => _subPartsLoading = false);
        return;
      }

      setState(() {
        _subPartsRepairType = type;
        _subParts = parts;
        _subPartsMode = type.showAllOption ? 'all' : 'specific';
        _subPartsSelectedIds.clear();
        _subPartsLoading = false;
      });
    } catch (e) {
      _addSimpleItem(type);
      setState(() => _subPartsLoading = false);
    }
  }

  void _openMeasureView(_RepairType type, {List<_SubPart>? chosenParts, int? overridePrice}) {
    final groups = (chosenParts != null && chosenParts.isNotEmpty) ? chosenParts.length : 1;
    setState(() {
      _measureRepairType = type;
      _measureChosenParts = chosenParts;
      _measureOverridePrice = overridePrice;
      _measureValues = List.filled(type.inputLabels.length * groups, '');
    });
  }

  void _confirmSubParts() {
    if (_subPartsRepairType == null) return;
    final type = _subPartsRepairType!;

    if (_subPartsMode == 'all') {
      final allPrice = type.allOptionPrice ?? type.price;
      setState(() { _subPartsRepairType = null; _subParts = []; });
      if (type.requiresMeasurement) {
        _openMeasureView(type, overridePrice: allPrice);
      } else {
        _addSimpleItem(type, overridePrice: allPrice);
      }
      return;
    }

    final chosenParts = _subParts.where((p) => _subPartsSelectedIds.contains(p.id)).toList();
    if (chosenParts.isEmpty) return;

    setState(() { _subPartsRepairType = null; _subParts = []; });

    if (type.requiresMeasurement) {
      _openMeasureView(type, chosenParts: chosenParts);
      return;
    }

    setState(() {
      for (final part in chosenParts) {
        _selectedItems.add(_SelectedItem(
          id: '${type.id}_${part.id}',
          name: '${type.name} - ${part.name}',
          price: part.price > 0 ? part.price : type.price,
          priceRange: _formatPrice(part.price > 0 ? part.price : type.price),
        ));
      }
    });
  }

  void _confirmMeasurement() {
    if (_measureRepairType == null) return;
    final type = _measureRepairType!;
    final labels = type.inputLabels;
    final chosenParts = _measureChosenParts;
    final overridePrice = _measureOverridePrice;

    if (chosenParts == null || chosenParts.isEmpty) {
      final detail = labels.asMap().entries.map((e) => '${e.value}: ${_measureValues[e.key].isEmpty ? '-' : _measureValues[e.key]}').join(', ');
      _addSimpleItem(type, detail: detail, overridePrice: overridePrice);
    } else {
      for (int pIdx = 0; pIdx < chosenParts.length; pIdx++) {
        final part = chosenParts[pIdx];
        final detail = labels.asMap().entries.map((e) {
          final v = _measureValues[pIdx * labels.length + e.key];
          return '${e.value}: ${v.isEmpty ? '-' : v}';
        }).join(', ');
        setState(() {
          _selectedItems.add(_SelectedItem(
            id: '${type.id}_${part.id}',
            name: '${type.name} - ${part.name}',
            price: part.price > 0 ? part.price : type.price,
            priceRange: _formatPrice(part.price > 0 ? part.price : type.price),
            detail: detail,
          ));
        });
      }
    }

    setState(() {
      _measureRepairType = null;
      _measureChosenParts = null;
      _measureOverridePrice = null;
      _measureValues = [];
    });
  }

  bool _isActive(_RepairType type) {
    return _selectedItems.any((i) => i.id == type.id || i.id.startsWith('${type.id}_'));
  }

  @override
  Widget build(BuildContext context) {
    // Sub-parts view
    if (_subPartsRepairType != null) return _buildSubPartsView();
    // Measurement view
    if (_measureRepairType != null) return _buildMeasureView();
    // Main grid
    return _buildMainGrid();
  }

  // ── Sub-parts inline view ────────────────────────────────────────────
  Widget _buildSubPartsView() {
    final type = _subPartsRepairType!;
    final canConfirm = _subPartsMode == 'all' || (_subPartsMode == 'specific' && _subPartsSelectedIds.isNotEmpty);

    return Column(
      children: [
        // Header with bottom border (web-style)
        Container(
          width: double.infinity,
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
          decoration: BoxDecoration(
            border: Border(bottom: BorderSide(color: Colors.grey.shade100)),
          ),
          child: Text(
            type.subPartsTitle ?? '세부 부위를 선택해주세요',
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
        ),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Selected type card
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.grey.shade100),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: _brandColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Center(child: CategoryIconWidget(iconName: type.iconName, size: 28, color: _brandColor)),
                    ),
                    const SizedBox(width: 12),
                    Text(type.displayName,
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // All / Specific radio
              if (type.showAllOption) ...[
                Text('수선 범위를 선택해주세요', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.grey.shade700)),
                const SizedBox(height: 12),
                Row(
                  children: [
                    _buildRadioButton('전체', 'all'),
                    const SizedBox(width: 12),
                    _buildRadioButton('특정 부위 선택', 'specific'),
                  ],
                ),
                const SizedBox(height: 20),
              ],

              // Sub-part grid
              if (_subPartsMode == 'specific') ...[
                if (type.showAllOption)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Text(
                      '${type.subPartsTitle ?? '세부 부위를 선택해주세요'}${type.allowMultipleSubParts ? ' (다중 선택 가능)' : ''}',
                      style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                    ),
                  ),
                GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 3,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    childAspectRatio: 0.58,
                  ),
                  itemCount: _subParts.length,
                  itemBuilder: (_, idx) {
                    final part = _subParts[idx];
                    final isSelected = _subPartsSelectedIds.contains(part.id);
                    return InkWell(
                      onTap: () {
                        setState(() {
                          if (type.allowMultipleSubParts) {
                            isSelected ? _subPartsSelectedIds.remove(part.id) : _subPartsSelectedIds.add(part.id);
                          } else {
                            _subPartsSelectedIds.clear();
                            _subPartsSelectedIds.add(part.id);
                          }
                        });
                      },
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: isSelected ? _brandColor.withValues(alpha: 0.05) : Colors.grey.shade50,
                          border: Border.all(
                            color: isSelected ? _brandColor : Colors.grey.shade100,
                            width: 2,
                          ),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              width: 96,
                              height: 96,
                              decoration: BoxDecoration(
                                color: isSelected ? _brandColor : _brandColor.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              clipBehavior: Clip.antiAlias,
                              child: isSelected
                                  ? const Center(child: Icon(Icons.check, color: Colors.white, size: 32))
                                  : Padding(
                                      padding: const EdgeInsets.all(4),
                                      child: CategoryIconWidget(
                                        iconName: part.iconName,
                                        size: 88,
                                        preserveColors: true,
                                      ),
                                    ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              part.name,
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: isSelected ? _brandColor : Colors.grey.shade700,
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            if (part.price > 0)
                              Text(_formatPrice(part.price), style: TextStyle(fontSize: 10, color: Colors.grey.shade400)),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ],
            ],
          ),
        ),

        // Bottom button (web-style flat)
        Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border(top: BorderSide(color: Colors.grey.shade100)),
          ),
          child: SafeArea(
            top: false,
            child: SizedBox(
              width: double.infinity,
              child: canConfirm
                  ? ElevatedButton(
                      onPressed: _confirmSubParts,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _brandColor,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 0,
                      ),
                      child: Text(
                        _subPartsMode == 'all'
                            ? '전체 선택으로 확인'
                            : '${_subPartsSelectedIds.length}개 선택 확인',
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                      ),
                    )
                  : Container(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '부위를 선택해주세요',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.grey.shade400),
                      ),
                    ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildRadioButton(String label, String value) {
    final isSelected = _subPartsMode == value;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() {
          _subPartsMode = value;
          if (value == 'all') _subPartsSelectedIds.clear();
        }),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            border: Border.all(color: isSelected ? _brandColor : Colors.grey.shade200, width: 2),
            borderRadius: BorderRadius.circular(12),
            color: isSelected ? _brandColor.withOpacity(0.05) : null,
          ),
          child: Row(
            children: [
              Container(
                width: 16,
                height: 16,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: isSelected ? _brandColor : Colors.grey.shade400, width: 2),
                ),
                child: isSelected
                    ? Center(child: Container(width: 8, height: 8, decoration: const BoxDecoration(shape: BoxShape.circle, color: _brandColor)))
                    : null,
              ),
              const SizedBox(width: 8),
              Text(label, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: isSelected ? _brandColor : Colors.grey.shade600)),
            ],
          ),
        ),
      ),
    );
  }

  // ── Measurement inline view ──────────────────────────────────────────
  Widget _buildMeasureView() {
    final type = _measureRepairType!;
    final labels = type.inputLabels;
    final groups = (_measureChosenParts != null && _measureChosenParts!.isNotEmpty)
        ? _measureChosenParts!.map((p) => p.name).toList()
        : <String>[];
    final hasAnyValue = _measureValues.any((v) => v.trim().isNotEmpty);
    final partNames = _measureChosenParts?.map((p) => p.name).join(' ') ?? '';
    final guideTypeId = resolveMeasureGuideId(
      [
        widget.clothingType,
        type.name,
        type.subType,
        partNames,
      ].whereType<String>().where((s) => s.isNotEmpty).join(' '),
      measureGuideKey: type.measureGuideKey ?? widget.categoryMeasureGuideKey,
      clothingHint: widget.clothingType,
    );

    return Column(
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
          decoration: BoxDecoration(
            border: Border(bottom: BorderSide(color: Colors.grey.shade100)),
          ),
          child: const Text(
            '치수를 입력해주세요',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
        ),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.grey.shade100),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: _brandColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Center(
                        child: CategoryIconWidget(
                          iconName: type.iconName,
                          size: 28,
                          color: _brandColor,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            type.displayName,
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          if ((_measureOverridePrice ?? type.price) > 0)
                            Text(
                              _formatPrice(_measureOverridePrice ?? type.price),
                              style: const TextStyle(fontSize: 12, color: _brandColor),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              if (groups.isEmpty)
                ...labels.asMap().entries.map((e) => _buildInputField(e.value, e.key))
              else
                ...groups.asMap().entries.expand((gEntry) {
                  return [
                    if (gEntry.key > 0) const SizedBox(height: 16),
                    Text(
                      gEntry.value,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: _brandColor,
                      ),
                    ),
                    const SizedBox(height: 8),
                    ...labels.asMap().entries.map(
                          (lEntry) => _buildInputField(
                            lEntry.value,
                            gEntry.key * labels.length + lEntry.key,
                          ),
                        ),
                  ];
                }),
              const SizedBox(height: 8),
              // 확인/이전: 치수 재는 방법보다 위
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => setState(() {
                        _measureRepairType = null;
                        _measureChosenParts = null;
                        _measureValues = [];
                      }),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.grey.shade500,
                        side: BorderSide(color: Colors.grey.shade200),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text(
                        '이전',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: ElevatedButton(
                      onPressed: hasAnyValue ? _confirmMeasurement : null,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _brandColor,
                        foregroundColor: Colors.white,
                        disabledBackgroundColor: _brandColor.withOpacity(0.4),
                        disabledForegroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        elevation: 0,
                      ),
                      child: const Text(
                        '확인',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              MeasureGuideAccordion(initialTypeId: guideTypeId),
              SizedBox(height: MediaQuery.paddingOf(context).bottom + 8),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildInputField(String label, int index) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          TextField(
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: InputDecoration(
              hintText: '예: 30',
              hintStyle: TextStyle(color: Colors.grey.shade400),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.grey.shade200, width: 2),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.grey.shade200, width: 2),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: _brandColor, width: 2),
              ),
            ),
            onChanged: (v) => setState(() { _measureValues[index] = v; }),
          ),
        ],
      ),
    );
  }

  // ── Main grid view ───────────────────────────────────────────────────
  Widget _buildMainGrid() {
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: EdgeInsets.zero,
            children: [
              // Header
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (widget.clothingType.isNotEmpty) ...[
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        decoration: BoxDecoration(
                          color: _brandColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: _brandColor.withOpacity(0.2)),
                        ),
                        child: Text(
                          widget.clothingType,
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: _brandColor),
                        ),
                      ),
                      const SizedBox(height: 12),
                    ],
                    Text(
                      widget.clothingType.isNotEmpty ? '상세 수선 부위를 선택해주세요' : '수선 항목을 선택해주세요',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 2),
                    Text('복수 선택 가능', style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                  ],
                ),
              ),
              const SizedBox(height: 8),

              // Selected items
              if (_selectedItems.isNotEmpty)
                Container(
                  margin: const EdgeInsets.symmetric(horizontal: 16),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: _brandColor.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: _brandColor.withOpacity(0.15)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('선택된 항목', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: _brandColor)),
                      const SizedBox(height: 8),
                      ..._selectedItems.map((item) => Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: _brandColor.withOpacity(0.2)),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(child: Text(item.name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600))),
                                    // Quantity controls
                                    _buildQtyButton(Icons.remove, () {
                                      if (item.quantity > 1) setState(() => item.quantity--);
                                    }),
                                    Padding(
                                      padding: const EdgeInsets.symmetric(horizontal: 8),
                                      child: Text('${item.quantity}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                                    ),
                                    _buildQtyButton(Icons.add, () => setState(() => item.quantity++)),
                                    const SizedBox(width: 8),
                                    GestureDetector(
                                      onTap: () => setState(() => _selectedItems.remove(item)),
                                      child: const Icon(Icons.delete_outline, size: 18, color: Colors.red),
                                    ),
                                  ],
                                ),
                                if (item.priceRange.isNotEmpty)
                                  Text(item.priceRange, style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                                if (item.detail.isNotEmpty)
                                  Text(item.detail, style: const TextStyle(fontSize: 12, color: _brandColor)),
                              ],
                            ),
                          )),
                    ],
                  ),
                ),

              const SizedBox(height: 12),

              // Repair type grid (hidden when items are already selected)
              if (_selectedItems.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: _isLoading
                      ? _buildLoadingGrid()
                      : _loadError
                          ? _buildErrorState()
                          : _repairTypes.isEmpty
                              ? const Center(child: Text('수선 항목이 없습니다'))
                              : GridView.builder(
                                  shrinkWrap: true,
                                  physics: const NeverScrollableScrollPhysics(),
                                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                    crossAxisCount: 3,
                                    crossAxisSpacing: 10,
                                    mainAxisSpacing: 10,
                                    childAspectRatio: 0.9,
                                  ),
                                  itemCount: _repairTypes.length,
                                  itemBuilder: (_, idx) => _buildRepairTypeCard(_repairTypes[idx]),
                                ),
                ),
              const SizedBox(height: 80),
            ],
          ),
        ),

        // Bottom button
        Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border(top: BorderSide(color: Colors.grey.shade100)),
          ),
          child: SafeArea(
            top: false,
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _selectedItems.isNotEmpty
                    ? () {
                        widget.onNext(_selectedItems.map((i) => models.RepairItem(
                          name: i.name,
                          price: i.price,
                          priceRange: i.priceRange,
                          quantity: i.quantity,
                          detail: i.detail.isNotEmpty ? i.detail : null,
                        )).toList());
                      }
                    : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: _brandColor,
                  foregroundColor: Colors.white,
                  disabledBackgroundColor: Colors.grey.shade200,
                  disabledForegroundColor: Colors.grey.shade400,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 0,
                ),
                child: Text(
                  _selectedItems.isNotEmpty ? '${_selectedItems.length}개 선택 → 다음' : '수선 항목을 선택해주세요',
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildRepairTypeCard(_RepairType type) {
    final active = _isActive(type);
    return InkWell(
      onTap: _subPartsLoading ? null : () => _handleTap(type),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        decoration: BoxDecoration(
          color: active ? _brandColor.withOpacity(0.05) : Colors.white,
          border: Border.all(color: active ? _brandColor : Colors.grey.shade200, width: active ? 2 : 1),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Stack(
          children: [
            Center(
              child: Padding(
                padding: const EdgeInsets.all(8),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      type.displayName,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: active ? _brandColor : Colors.black87,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      type.priceRange.isNotEmpty ? type.priceRange : _formatPrice(type.price),
                      style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                    ),
                  ],
                ),
              ),
            ),
            if ((type.hasSubParts || type.requiresMeasurement) && !active)
              Positioned(
                right: 8,
                top: 0,
                bottom: 0,
                child: Center(child: Icon(Icons.chevron_right, size: 16, color: Colors.grey.shade300)),
              ),
            if (active)
              Positioned(
                top: 6,
                right: 6,
                child: Container(
                  width: 20,
                  height: 20,
                  decoration: const BoxDecoration(color: _brandColor, shape: BoxShape.circle),
                  child: const Icon(Icons.check, size: 14, color: Colors.white),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildQtyButton(IconData icon, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 24,
        height: 24,
        decoration: BoxDecoration(color: Colors.grey.shade100, shape: BoxShape.circle),
        child: Icon(icon, size: 14, color: Colors.grey.shade600),
      ),
    );
  }

  Widget _buildLoadingGrid() {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
        childAspectRatio: 0.9,
      ),
      itemCount: 6,
      itemBuilder: (_, __) => Container(
        decoration: BoxDecoration(
          color: Colors.grey.shade100,
          borderRadius: BorderRadius.circular(16),
        ),
      ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Column(
        children: [
          const SizedBox(height: 40),
          Text('수선 항목을 불러오지 못했습니다', style: TextStyle(fontSize: 14, color: Colors.grey.shade500)),
          const SizedBox(height: 12),
          TextButton(
            onPressed: _loadRepairTypes,
            child: const Text('다시 시도', style: TextStyle(color: _brandColor, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }
}
