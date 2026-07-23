import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/widgets/modo_app_bar.dart';
import '../../../../services/customer_event_service.dart';
import '../../domain/models/order_draft.dart';
import '../../providers/cart_provider.dart';
import '../widgets/items_list_widget.dart';
import '../widgets/clothing_type_step.dart';
import '../widgets/sub_category_step.dart' as sub_cat;
import '../widgets/image_pin_step.dart';
import '../widgets/measurement_step.dart';
import '../widgets/repair_type_step.dart';
import '../widgets/order_flow_progress.dart';

enum _FlowMode {
  list,
  addClothing,
  addSubCategory,
  addPhoto,
  addMeasurement,
  addRepair,
  pickup,
}

enum _SubCategoryPhase { pre, post }

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
}

class OrderFlowPage extends ConsumerStatefulWidget {
  const OrderFlowPage({super.key});

  @override
  ConsumerState<OrderFlowPage> createState() => _OrderFlowPageState();
}

class _OrderFlowPageState extends ConsumerState<OrderFlowPage> {
  static const _brandColor = Color(0xFF00C896);

  _FlowMode _currentMode = _FlowMode.addClothing;
  final List<_FlowMode> _modeHistory = [];

  OrderDraft _draft = const OrderDraft();

  // Staging fields for the clothing item being added
  String _stagingClothingType = '';
  String? _stagingCategoryId;
  String? _stagingIconName;
  List<ImageWithPins> _stagingImages = [];
  SubCategorySelection? _stagingSubCategory;
  MeasurementStepConfig? _measurementConfig;
  _SubCategoryPhase _subCategoryPhase = _SubCategoryPhase.pre;

  MeasurementStepConfig _buildMeasurementConfig(SubCategorySelection selection) {
    final labels = sub_cat.normalizeInputLabels(
      selection.inputLabels,
      inputCount: selection.inputCount,
    );
    return MeasurementStepConfig(
      itemName: selection.name,
      labels: labels,
      price: selection.directPrice,
      iconName: selection.iconName ?? _stagingIconName,
      notes: selection.description,
    );
  }

  SubCategorySelection _mapSubCategory(sub_cat.SubCategorySelection selection) {
    return SubCategorySelection(
      id: selection.id,
      name: selection.name,
      directPrice: selection.directPrice,
      priceRange: selection.priceRange,
      requiresMeasurement: selection.requiresMeasurement,
      inputCount: selection.inputCount,
      inputLabels: selection.inputLabels,
      iconName: selection.iconName,
      description: selection.description,
      measureGuideKey: selection.measureGuideKey,
    );
  }

  @override
  void initState() {
    super.initState();
    CustomerEventService.trackOrderStart();
  }

  void _pushMode(_FlowMode mode) {
    setState(() {
      _modeHistory.add(_currentMode);
      _currentMode = mode;
    });
  }

  void _popMode() {
    setState(() {
      if (_modeHistory.isNotEmpty) {
        _currentMode = _modeHistory.removeLast();
      } else {
        _currentMode = _FlowMode.list;
      }
    });
  }

  void startAddClothing() {
    _stagingClothingType = '';
    _stagingCategoryId = null;
    _stagingIconName = null;
    _stagingImages = [];
    _stagingSubCategory = null;
    _measurementConfig = null;
    _subCategoryPhase = _SubCategoryPhase.pre;
    _pushMode(_FlowMode.addClothing);
  }

  void handleClothingDone(String type, String? categoryId, String? iconName) {
    _stagingClothingType = type;
    _stagingCategoryId = categoryId;
    _stagingIconName = iconName;
    _subCategoryPhase = _SubCategoryPhase.pre;
    _pushMode(_FlowMode.addSubCategory);
  }

  void handleSubCategoryDone(
    String type,
    String? categoryId,
    SubCategorySelection selection,
  ) {
    _stagingSubCategory = selection;

    if (_subCategoryPhase == _SubCategoryPhase.pre) {
      _pushMode(_FlowMode.addPhoto);
    } else {
      if (selection.directPrice != null && selection.directPrice! > 0) {
        if (selection.requiresMeasurement) {
          _measurementConfig = _buildMeasurementConfig(selection);
          _pushMode(_FlowMode.addMeasurement);
        } else {
          final item = RepairItem(
            name: selection.name,
            price: selection.directPrice!,
            priceRange: selection.priceRange ?? '',
            quantity: 1,
          );
          handleRepairDone([item]);
        }
      } else {
        _pushMode(_FlowMode.addRepair);
      }
    }
  }

  void handlePhotoDone(List<ImageWithPins> imagesWithPins) {
    _stagingImages = imagesWithPins;

    if (_stagingSubCategory != null &&
        _stagingSubCategory!.directPrice != null &&
        _stagingSubCategory!.directPrice! > 0) {
      if (_stagingSubCategory!.requiresMeasurement) {
        _measurementConfig = _buildMeasurementConfig(_stagingSubCategory!);
        _pushMode(_FlowMode.addMeasurement);
      } else {
        final item = RepairItem(
          name: _stagingSubCategory!.name,
          price: _stagingSubCategory!.directPrice!,
          priceRange: _stagingSubCategory!.priceRange ?? '',
          quantity: 1,
        );
        handleRepairDone([item]);
      }
    } else {
      _pushMode(_FlowMode.addRepair);
    }
  }

  void handleMeasurementDone(List<String> values) {
    final config = _measurementConfig;
    final selection = _stagingSubCategory;
    if (config == null && selection == null) return;

    final labels = config?.labels ??
        selection?.inputLabels ??
        const ['치수 (cm)'];
    final detail = labels.asMap().entries.map((entry) {
      final value = entry.key < values.length && values[entry.key].isNotEmpty
          ? values[entry.key]
          : '-';
      return '${entry.value}: $value';
    }).join(', ');

    final price = config?.price ?? selection?.directPrice ?? 0;
    final item = RepairItem(
      name: config?.itemName ?? selection!.name,
      price: price,
      priceRange: selection?.priceRange ?? '',
      quantity: 1,
      detail: detail,
    );
    _measurementConfig = null;
    handleRepairDone([item]);
  }

  void handleRepairDone(List<RepairItem> items) {
    final clothing = ClothingItem(
      clothingType: _stagingClothingType,
      clothingCategoryId: _stagingCategoryId,
      iconName: _stagingIconName,
      repairItems: items,
      imagesWithPins: _stagingImages,
    );

    setState(() {
      _draft = _draft.copyWith(items: [..._draft.items, clothing]);
      _modeHistory.clear();
      _currentMode = _FlowMode.list;
    });
  }

  void cancelAddClothing() {
    setState(() {
      _stagingClothingType = '';
      _stagingCategoryId = null;
      _stagingIconName = null;
      _stagingImages = [];
      _stagingSubCategory = null;
      _measurementConfig = null;
      _modeHistory.clear();
      _currentMode = _FlowMode.list;
    });
  }

  void handleRemoveItem(int index) {
    if (index < 0 || index >= _draft.items.length) return;
    setState(() {
      final updated = List<ClothingItem>.from(_draft.items)..removeAt(index);
      _draft = _draft.copyWith(items: updated);
    });
  }

  void handleProceedToPickup() {
    _pushMode(_FlowMode.pickup);
  }

  void _showExitDialog() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 28, 24, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _brandColor,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('계속 결제하기'),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: _brandColor,
                    side: BorderSide(color: _brandColor),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  onPressed: () {
                    Navigator.pop(ctx);
                    _saveToCartAndExit();
                  },
                  child: const Text('장바구니에 담기'),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: TextButton(
                  style: TextButton.styleFrom(
                    foregroundColor: Colors.grey[600],
                  ),
                  onPressed: () {
                    Navigator.pop(ctx);
                    context.go('/home');
                  },
                  child: const Text('홈으로 나가기'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _saveToCartAndExit() async {
    if (_draft.items.isEmpty) {
      context.go('/home');
      return;
    }

    final cartNotifier = ref.read(cartProvider.notifier);
    await cartNotifier.addOrderDraftToCart(_draft.toJson());

    if (!mounted) return;
    context.go('/home');
  }

  bool _handleBackNavigation() {
    if (_modeHistory.isNotEmpty) {
      _popMode();
      return false;
    }

    // 초기 상태(아이템 없는 첫 의류 선택 화면)에서는 바로 이탈 허용
    if (_draft.items.isEmpty && _currentMode == _FlowMode.addClothing) {
      return true;
    }

    if (_draft.items.isNotEmpty || _currentMode != _FlowMode.list) {
      _showExitDialog();
      return false;
    }

    return true;
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        final shouldPop = _handleBackNavigation();
        if (shouldPop) {
          context.pop();
        }
      },
      child: Scaffold(
        appBar: ModoAppBar(
          title: const Text('수거신청'),
          showHome: false,
          onBack: () {
            final shouldPop = _handleBackNavigation();
            if (shouldPop) {
              if (context.canPop()) {
                context.pop();
              } else {
                context.go('/home');
              }
            }
          },
        ),
        body: Column(
          children: [
            OrderFlowProgress(
              currentStep: getOrderFlowStepIndex(
                mode: _toProgressMode(_currentMode),
                subCategoryPhase: _subCategoryPhase == _SubCategoryPhase.pre
                    ? OrderFlowSubCategoryPhase.pre
                    : OrderFlowSubCategoryPhase.post,
              ),
            ),
            Expanded(child: _buildCurrentStep()),
          ],
        ),
      ),
    );
  }

  OrderFlowStepMode _toProgressMode(_FlowMode mode) {
    switch (mode) {
      case _FlowMode.list:
        return OrderFlowStepMode.list;
      case _FlowMode.addClothing:
        return OrderFlowStepMode.addClothing;
      case _FlowMode.addSubCategory:
        return OrderFlowStepMode.addSubCategory;
      case _FlowMode.addPhoto:
        return OrderFlowStepMode.addPhoto;
      case _FlowMode.addMeasurement:
        return OrderFlowStepMode.addMeasurement;
      case _FlowMode.addRepair:
        return OrderFlowStepMode.addRepair;
      case _FlowMode.pickup:
        return OrderFlowStepMode.pickup;
    }
  }

  Widget _buildCurrentStep() {
    switch (_currentMode) {
      case _FlowMode.list:
        return _buildListStep();
      case _FlowMode.addClothing:
        return _buildClothingTypeStep();
      case _FlowMode.addSubCategory:
        return _buildSubCategoryStep();
      case _FlowMode.addPhoto:
        return _buildPhotoStep();
      case _FlowMode.addMeasurement:
        return _buildMeasurementStep();
      case _FlowMode.addRepair:
        return _buildRepairStep();
      case _FlowMode.pickup:
        return _buildPickupStep();
    }
  }

  Widget _buildListStep() {
    return ItemsListWidget(
      items: _draft.items,
      onAddItem: startAddClothing,
      onRemoveItem: handleRemoveItem,
      onProceedToPickup: handleProceedToPickup,
      onSaveToCart: () => _saveToCartAndExit(),
    );
  }

  Widget _buildClothingTypeStep() {
    return ClothingTypeStep(
      onSelect: (name, categoryId, iconName) {
        handleClothingDone(name, categoryId, iconName);
      },
    );
  }

  Widget _buildSubCategoryStep() {
    final categoryId = _stagingCategoryId;
    if (categoryId == null) {
      // No category → skip to photo
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _pushMode(_FlowMode.addPhoto);
      });
      return const Center(child: CircularProgressIndicator());
    }

    return sub_cat.SubCategoryStep(
      categoryId: categoryId,
      categoryName: _stagingClothingType,
      onSelect: (selection) {
        handleSubCategoryDone(
          _stagingClothingType,
          _stagingCategoryId,
          _mapSubCategory(selection),
        );
      },
      onEmpty: () {
        // 웹: 자식/직접가격 leaf 없음 → 사진 후 수선유형 단계
        if (_subCategoryPhase == _SubCategoryPhase.pre) {
          _stagingSubCategory = null;
          _pushMode(_FlowMode.addPhoto);
        } else {
          _pushMode(_FlowMode.addRepair);
        }
      },
    );
  }

  Widget _buildPhotoStep() {
    return ImagePinStep(
      clothingType: _stagingClothingType,
      existingImages: _stagingImages,
      onComplete: handlePhotoDone,
    );
  }

  Widget _buildMeasurementStep() {
    final selection = _stagingSubCategory;
    final config = _measurementConfig ??
        (selection != null ? _buildMeasurementConfig(selection) : null);

    if (config == null) {
      return const Center(child: Text('치수 입력 정보를 불러올 수 없습니다.'));
    }

    return MeasurementStep(
      config: config,
      onConfirm: handleMeasurementDone,
      onBack: _popMode,
    );
  }

  Widget _buildRepairStep() {
    final effectiveCategoryId = _stagingSubCategory?.id ?? _stagingCategoryId;
    return RepairTypeStepWidget(
      clothingType: _stagingClothingType,
      clothingCategoryId: effectiveCategoryId,
      onNext: (items) => handleRepairDone(items),
    );
  }

  Widget _buildPickupStep() {
    // Convert draft items to the format expected by PickupRequestPage
    final repairItems = <Map<String, dynamic>>[];
    final bundleItems = <Map<String, dynamic>>[];
    final allImageUrls = <String>[];

    for (final clothing in _draft.items) {
      final clothingRepairItems = clothing.repairItems.map((r) => {
        'name': r.name,
        'repairPart': r.name,
        'price': r.price,
        'priceRange': r.priceRange,
        'quantity': r.quantity,
        if (r.detail != null) 'detail': r.detail,
      }).toList();

      repairItems.addAll(clothingRepairItems);

      final imagesWithPins = clothing.imagesWithPins.map((i) => i.toJson()).toList();
      final imageUrls = clothing.imagesWithPins.map((i) => i.imageUrl).toList();
      allImageUrls.addAll(imageUrls);

      bundleItems.add({
        'clothingType': clothing.clothingType,
        'repairItems': clothingRepairItems,
        'imagesWithPins': imagesWithPins,
      });
    }

    // Navigate to existing PickupRequestPage
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      context.push('/pickup-request', extra: {
        'repairItems': repairItems,
        'imageUrls': allImageUrls,
        'imagesWithPins': _draft.items.expand((c) => c.imagesWithPins.map((i) => i.toJson())).toList(),
        'bundleItems': bundleItems.length > 1 ? bundleItems : null,
      });
      // After navigating, go back to list mode so returning works
      setState(() {
        _modeHistory.clear();
        _currentMode = _FlowMode.list;
      });
    });

    return const Center(
      child: CircularProgressIndicator(
        valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF00C896)),
      ),
    );
  }
}

