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
import '../widgets/repair_type_step.dart';

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
  final String name;
  final int? directPrice;
  final String? priceRange;
  final bool requiresMeasurement;
  final List<String>? inputLabels;
  final String? iconName;

  const SubCategorySelection({
    required this.name,
    this.directPrice,
    this.priceRange,
    this.requiresMeasurement = false,
    this.inputLabels,
    this.iconName,
  });
}

class MeasurementConfig {
  final String itemName;
  final List<String> labels;
  final int price;
  final String? iconName;

  const MeasurementConfig({
    required this.itemName,
    required this.labels,
    required this.price,
    this.iconName,
  });
}

class OrderFlowPage extends ConsumerStatefulWidget {
  const OrderFlowPage({super.key});

  @override
  ConsumerState<OrderFlowPage> createState() => _OrderFlowPageState();
}

class _OrderFlowPageState extends ConsumerState<OrderFlowPage> {
  static const _brandColor = Color(0xFF00C896);

  _FlowMode _currentMode = _FlowMode.list;
  final List<_FlowMode> _modeHistory = [];

  OrderDraft _draft = const OrderDraft();

  // Staging fields for the clothing item being added
  String _stagingClothingType = '';
  String? _stagingCategoryId;
  String? _stagingIconName;
  List<ImageWithPins> _stagingImages = [];
  SubCategorySelection? _stagingSubCategory;
  _SubCategoryPhase _subCategoryPhase = _SubCategoryPhase.pre;

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
      if (selection.directPrice != null) {
        if (selection.requiresMeasurement) {
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

    if (_stagingSubCategory != null && _stagingSubCategory!.directPrice != null) {
      if (_stagingSubCategory!.requiresMeasurement) {
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
      _subCategoryPhase = _SubCategoryPhase.post;
      _pushMode(_FlowMode.addSubCategory);
    }
  }

  void handleMeasurementDone(List<double> values) {
    if (_stagingSubCategory == null) return;

    final detail = values.map((v) => v.toStringAsFixed(1)).join(', ');
    final item = RepairItem(
      name: _stagingSubCategory!.name,
      price: _stagingSubCategory!.directPrice ?? 0,
      priceRange: _stagingSubCategory!.priceRange ?? '',
      quantity: 1,
      detail: detail,
    );
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
        body: _buildCurrentStep(),
      ),
    );
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
          SubCategorySelection(
            name: selection.name,
            directPrice: selection.directPrice,
            priceRange: selection.priceRange,
            requiresMeasurement: selection.requiresMeasurement,
            inputLabels: selection.inputLabels,
            iconName: selection.iconName,
          ),
        );
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
    return _PlaceholderStep(
      title: '치수 입력',
      onNext: () => handleMeasurementDone([10.0, 20.0]),
    );
  }

  Widget _buildRepairStep() {
    return RepairTypeStepWidget(
      clothingType: _stagingClothingType,
      clothingCategoryId: _stagingCategoryId,
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

class _PlaceholderStep extends StatelessWidget {
  final String title;
  final VoidCallback? onNext;

  const _PlaceholderStep({
    required this.title,
    this.onNext,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Spacer(),
          Text(
            title,
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            textAlign: TextAlign.center,
          ),
          const Spacer(),
          if (onNext != null)
            SizedBox(
              height: 52,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF00C896),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                onPressed: onNext,
                child: const Text('다음'),
              ),
            ),
        ],
      ),
    );
  }
}
