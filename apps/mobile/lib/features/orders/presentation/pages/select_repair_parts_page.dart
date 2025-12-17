import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../../../services/repair_service.dart';
import '../../domain/models/image_pin.dart';
import '../../providers/repair_items_provider.dart';

final supabase = Supabase.instance.client;

/// 수선 부위 선택 페이지 (그리드 형태)
class SelectRepairPartsPage extends ConsumerStatefulWidget {
  final List<String> imageUrls;
  final List<Map<String, dynamic>>? imagesWithPins; // 핀 정보 포함
  final String? categoryId; // 선택한 카테고리 ID
  final String? categoryName; // 선택한 카테고리명
  
  const SelectRepairPartsPage({
    required this.imageUrls, super.key,
    this.imagesWithPins,
    this.categoryId,
    this.categoryName,
  });

  @override
  ConsumerState<SelectRepairPartsPage> createState() => _SelectRepairPartsPageState();
}

class _SelectRepairPartsPageState extends ConsumerState<SelectRepairPartsPage> {
  final _repairService = RepairService();
  List<Map<String, dynamic>> _repairTypes = [];
  bool _isLoading = true;
  
  final Set<String> _selectedPartIds = {}; // 다중 선택을 위해 Set 사용
  final List<Map<String, dynamic>> _selectedItems = []; // 선택한 항목들

  @override
  void initState() {
    super.initState();
    _loadRepairTypes();
  }

  /// DB에서 수선 종류 로드
  Future<void> _loadRepairTypes() async {
    debugPrint('🔍 수선 종류 로드 시작');
    debugPrint('  categoryId: ${widget.categoryId}');
    debugPrint('  categoryName: ${widget.categoryName}');
    
    if (widget.categoryId == null) {
      debugPrint('⚠️ categoryId가 null입니다');
      setState(() => _isLoading = false);
      return;
    }
    
    try {
      debugPrint('📡 DB 조회 시작: category_id = ${widget.categoryId}');
      final types = await _repairService.getRepairTypesByCategory(widget.categoryId!);
      debugPrint('✅ 수선 종류 ${types.length}개 로드 완료');
      
      if (mounted) {
        setState(() {
          _repairTypes = types;
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('❌ 수선 종류 로드 실패: $e');
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }
  
  // 전체 핀 개수 계산
  int _getTotalPins() {
    if (widget.imagesWithPins == null) {
      debugPrint('⚠️ imagesWithPins is null');
      return 0;
    }
    
    int total = 0;
    debugPrint('📍 핀 개수 계산: ${widget.imagesWithPins!.length}장의 사진');
    
    for (var imageData in widget.imagesWithPins!) {
      final pins = imageData['pins'] as List?;
      final pinsCount = pins?.length ?? 0;
      debugPrint('  - 사진: ${imageData['imagePath']}, 핀: $pinsCount개');
      total += pinsCount;
    }
    
    debugPrint('  총 핀 개수: $total개');
    return total;
  }
  
  // 다음 단계로 진행
  void _proceedToNextStep(Map<String, dynamic> repairType) {
    final typeName = repairType['name'] as String;
    final subType = repairType['sub_type'] as String?;
    final price = repairType['price'] as int;
    final displayName = subType != null ? '$typeName ($subType)' : typeName;
    final hasSubParts = repairType['has_sub_parts'] as bool? ?? false;
    final allowMultiple = repairType['allow_multiple_sub_parts'] as bool? ?? false;
    
    debugPrint('🔄 수치 입력 페이지로 이동: $displayName');
    
    // 수치 입력이 필요한 경우 입력 페이지로
    context.push('/repair-detail-input', extra: {
      'repairPart': displayName,
      'price': price,
      'repairTypeId': repairType['id'],
      'requiresMultipleInputs': repairType['requires_multiple_inputs'] ?? false,
      'inputLabels': repairType['input_labels'] ?? ['치수 (cm)'],
      'hasAdvancedOptions': hasSubParts,
      'allowMultipleSubParts': allowMultiple,
      'imageUrls': widget.imageUrls,
      'imagesWithPins': widget.imagesWithPins,
    },);
  }
  
  // 세부 항목 선택 바텀시트 (수치 입력 불필요한 항목의 하위 항목들)
  Future<void> _showSubItemsSelection(Map<String, dynamic> parentItem) async {
    final repairTypeId = parentItem['id'] as String;
    final parentName = parentItem['name'] as String;
    final allowMultiple = parentItem['allow_multiple_sub_parts'] as bool? ?? true; // 기본값 다중 선택
    final customTitle = parentItem['sub_parts_title'] as String?; // 커스텀 제목
    
    // 세부 항목 로드
    try {
      final response = await supabase
          .from('repair_sub_parts')
          .select('*')
          .eq('repair_type_id', repairTypeId)
          .eq('part_type', 'sub_part')
          .order('display_order');
      
      final subItems = List<Map<String, dynamic>>.from(response);
      
      if (subItems.isEmpty && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('등록된 세부 항목이 없습니다')),
        );
        return;
      }
      
      if (!mounted) return;
      
      // 바텀시트 표시
      final selectedSubItems = <Map<String, dynamic>>[];
      
      await showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (context) => StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              height: MediaQuery.of(context).size.height * 0.75,
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
              ),
              child: Column(
                children: [
                  // 핸들
                  Container(
                    margin: const EdgeInsets.only(top: 12, bottom: 16),
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  
                  // 제목
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    customTitle ?? '상세 수선 부위를 선택해주세요',
                                    style: const TextStyle(
                                      fontSize: 20,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    parentName,
                                    style: TextStyle(
                                      fontSize: 14,
                                      color: Colors.grey.shade600,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Text(
                              allowMultiple ? '(다중 선택 가능)' : '(단일 선택)',
                              style: TextStyle(
                                fontSize: 13,
                                color: Colors.grey.shade600,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        if (selectedSubItems.isNotEmpty)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: const Color(0xFF00C896).withOpacity(0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              '${selectedSubItems.length}개 선택됨',
                              style: const TextStyle(
                                fontSize: 14,
                                color: Color(0xFF00C896),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  
                  // 세부 항목 그리드
                  Expanded(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: GridView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 3,
                          crossAxisSpacing: 12,
                          mainAxisSpacing: 12,
                          childAspectRatio: 1.0,
                        ),
                        itemCount: subItems.length,
                        itemBuilder: (context, index) {
                          final subItem = subItems[index];
                          final subItemId = subItem['id'] as String;
                          final subItemName = subItem['name'] as String;
                          final subItemPrice = subItem['price'] as int? ?? 0;
                          final isSelected = selectedSubItems.any((item) => item['id'] == subItemId);
                          
                          return InkWell(
                            onTap: () {
                              setModalState(() {
                                if (allowMultiple) {
                                  // 다중 선택
                                  if (isSelected) {
                                    selectedSubItems.removeWhere((item) => item['id'] == subItemId);
                                  } else {
                                    selectedSubItems.add(subItem);
                                  }
                                } else {
                                  // 단일 선택
                                  selectedSubItems.clear();
                                  selectedSubItems.add(subItem);
                                }
                              });
                            },
                            borderRadius: BorderRadius.circular(12),
                            child: Container(
                              decoration: BoxDecoration(
                                color: isSelected
                                    ? const Color(0xFF00C896).withOpacity(0.05)
                                    : Colors.grey.shade50,
                                border: Border.all(
                                  color: isSelected
                                      ? const Color(0xFF00C896)
                                      : Colors.grey.shade200,
                                  width: isSelected ? 2 : 1,
                                ),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  // 아이콘
                                  Container(
                                    width: 50,
                                    height: 50,
                                    decoration: BoxDecoration(
                                      color: isSelected
                                          ? const Color(0xFF00C896)
                                          : Colors.grey.shade300,
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Icon(
                                      isSelected
                                          ? Icons.check_circle
                                          : Icons.build_outlined,
                                      color: isSelected
                                          ? Colors.white
                                          : Colors.grey.shade600,
                                      size: 28,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  // 항목명
                                  Padding(
                                    padding: const EdgeInsets.symmetric(horizontal: 4),
                                    child: Text(
                                      subItemName,
                                      textAlign: TextAlign.center,
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: isSelected
                                            ? FontWeight.bold
                                            : FontWeight.normal,
                                        color: isSelected
                                            ? const Color(0xFF00C896)
                                            : Colors.black87,
                                      ),
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  // 가격
                                  if (subItemPrice > 0)
                                    Text(
                                      '${subItemPrice.toString().replaceAllMapped(
                                        RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
                                        (Match m) => '${m[1]},',
                                      )}원',
                                      style: TextStyle(
                                        fontSize: 10,
                                        color: Colors.grey.shade600,
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                  
                  // 확인 버튼
                  SafeArea(
                    child: Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.05),
                            blurRadius: 10,
                            offset: const Offset(0, -5),
                          ),
                        ],
                      ),
                      child: ElevatedButton(
                        onPressed: selectedSubItems.isEmpty
                            ? null
                            : () {
                                Navigator.pop(context);
                                _completeSubItemSelection(parentItem, selectedSubItems);
                              },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: selectedSubItems.isEmpty
                              ? Colors.grey.shade300
                              : const Color(0xFF00C896),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          elevation: 0,
                        ),
                        child: Text(
                          selectedSubItems.isEmpty
                              ? '부위를 선택해주세요'
                              : '${selectedSubItems.length}개 항목 선택 완료',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      );
    } catch (e) {
      debugPrint('세부 항목 로드 실패: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('세부 항목 로드 실패: $e')),
        );
      }
    }
  }
  
  // 세부 항목 선택 완료
  void _completeSubItemSelection(
    Map<String, dynamic> parentItem,
    List<Map<String, dynamic>> selectedSubItems,
  ) {
    final parentName = parentItem['name'] as String;
    final currentItems = ref.read(repairItemsProvider);
    
    debugPrint('🔍 현재 항목 수: ${currentItems.length}');
    
    // 이미지 데이터를 명시적 필드 추출로 저장 (순환 참조 완전 차단)
    final List<Map<String, dynamic>> imageDataCopy = [];
    if (widget.imagesWithPins != null) {
      for (var img in widget.imagesWithPins!) {
        final imagePath = img['imagePath'] as String;
        final pinsData = img['pins'] as List?;
        
        // pins를 완전히 새로운 List로 생성
        final pins = <Map<String, dynamic>>[];
        if (pinsData != null) {
          for (var pin in pinsData) {
            if (pin is Map) {
              // 각 필드를 primitive 값으로 추출
              pins.add({
                'id': pin['id']?.toString() ?? '',
                'relative_x': (pin['relative_x'] as num?)?.toDouble() ?? 0.5,
                'relative_y': (pin['relative_y'] as num?)?.toDouble() ?? 0.5,
                'memo': pin['memo']?.toString() ?? '',
                'created_at': pin['created_at']?.toString() ?? DateTime.now().toIso8601String(),
                'updated_at': pin['updated_at']?.toString() ?? DateTime.now().toIso8601String(),
              });
            }
          }
        }
        
        imageDataCopy.add({
          'imagePath': imagePath,
          'pins': pins,
        });
      }
    }
    
    debugPrint('📸 이미지 데이터 복사 완료: ${imageDataCopy.length}장');
    
    final newItems = selectedSubItems.map((subItem) {
      final subItemName = subItem['name'] as String;
      final subItemPrice = subItem['price'] as int? ?? (parentItem['price'] as int);
      
      return {
        'id': '${parentName}_${subItemName}_${DateTime.now().millisecondsSinceEpoch}',
        'repairPart': '$parentName - $subItemName',
        'priceRange': '${subItemPrice.toString().replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (Match m) => '${m[1]},',
        )}원',
        'price': subItemPrice,
        'scope': '전체',
        'measurement': '선택 완료',
        // 이미지 데이터 복사본 저장 (순환 참조 없음)
        'itemImages': imageDataCopy,
      };
    }).toList();
    
    // 기존 항목에 새 항목 추가
    final allItems = [...currentItems, ...newItems];
    debugPrint('➕ 총 항목 수: ${allItems.length}');
    
    try {
      // Provider에 저장 (JSON 깊은 복사 적용)
      ref.read(repairItemsProvider.notifier).setItems(allItems);
      debugPrint('✅ Provider 저장 성공');
    } catch (e, stackTrace) {
      debugPrint('❌ Provider 저장 실패: $e');
      debugPrint('❌ Stack: $stackTrace');
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('데이터 저장 실패: $e'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 5),
          ),
        );
      }
      return;
    }
    
    // RepairConfirmationPage로 직접 이동
    if (mounted) {
      context.push('/repair-confirmation', extra: {
        'repairItems': allItems,
        'imageUrls': widget.imageUrls,
      },);
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black),
          onPressed: () => context.pop(),
        ),
        title: const Text(
          '수선',
          style: TextStyle(
            color: Colors.black,
            fontWeight: FontWeight.bold,
          ),
        ),
        centerTitle: true,
        actions: [
          TextButton(
            onPressed: () {
              context.pop();
            },
            child: const Text(
              '나가기',
              style: TextStyle(
                color: Colors.black54,
                fontSize: 14,
              ),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 헤더
                  Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          '수선 부위를 선택해주세요.',
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: Colors.black87,
                          ),
                        ),
                        if (widget.imagesWithPins != null && widget.imagesWithPins!.isNotEmpty) ...[
                          const SizedBox(height: 12),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: const Color(0xFF00C896).withOpacity(0.1),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: const Color(0xFF00C896).withOpacity(0.3),
                              ),
                            ),
                            child: Row(
                              children: [
                                const Icon(
                                  Icons.check_circle,
                                  color: Color(0xFF00C896),
                                  size: 20,
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    '사진 ${widget.imagesWithPins!.length}장에 수선 부위 ${_getTotalPins()}개 표시됨',
                                    style: TextStyle(
                                      fontSize: 13,
                                      color: Colors.grey.shade700,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          // 사진 미리보기 (핀과 메모 표시)
                          const SizedBox(height: 16),
                          _buildImagePreviewSection(),
                        ],
                      ],
                    ),
                  ),
                  
                  // 수선 부위 그리드 (DB에서 로드)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: _isLoading
                        ? const Center(
                            child: Padding(
                              padding: EdgeInsets.all(40),
                              child: CircularProgressIndicator(
                                valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF00C896)),
                              ),
                            ),
                          )
                        : _repairTypes.isEmpty
                            ? Center(
                                child: Padding(
                                  padding: const EdgeInsets.all(40),
                                  child: Column(
                                    children: [
                                      Icon(Icons.inbox_outlined, size: 64, color: Colors.grey.shade300),
                                      const SizedBox(height: 16),
                                      Text(
                                        '등록된 수선 항목이 없습니다',
                                        style: TextStyle(color: Colors.grey.shade600),
                                      ),
                                    ],
                                  ),
                                ),
                              )
                            : GridView.builder(
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                  crossAxisCount: 2,
                                  crossAxisSpacing: 12,
                                  mainAxisSpacing: 12,
                                  childAspectRatio: 0.9,
                                ),
                                itemCount: _repairTypes.length,
                                itemBuilder: (context, index) {
                                  final repairType = _repairTypes[index];
                                  final typeName = repairType['name'] as String;
                                  final subType = repairType['sub_type'] as String?;
                                  final price = repairType['price'] as int;
                                  final partId = repairType['id'] as String;
                                  final isSelected = _selectedPartIds.contains(partId);
                                  final requiresMeasurement = repairType['requires_measurement'] as bool? ?? true;
                                  
                                  final displayName = subType != null ? '$typeName ($subType)' : typeName;
                                  
                                  return InkWell(
                                    onTap: () {
                                      final hasSubParts = repairType['has_sub_parts'] as bool? ?? false;
                                      
                                      setState(() {
                                        _selectedPartIds.clear();
                                        _selectedItems.clear();
                                        _selectedPartIds.add(partId);
                                        _selectedItems.add(repairType);
                                      });
                                      
                                      // 선택 후 다음 단계로
                                      Future.delayed(const Duration(milliseconds: 300), () {
                                        if (mounted) {
                                          debugPrint('✅ 수선 부위 선택됨: $displayName');
                                          debugPrint('📊 requiresMeasurement: $requiresMeasurement');
                                          debugPrint('📊 hasSubParts: $hasSubParts');
                                          
                                          if (requiresMeasurement) {
                                            // 수치 입력이 필요한 경우 → 입력 페이지로
                                            debugPrint('🔄 수치 입력 페이지로 이동...');
                                            _proceedToNextStep(repairType);
                                          } else if (hasSubParts) {
                                            // 수치 입력 불필요 + 세부 항목 있음 → 세부 항목 선택 화면
                                            debugPrint('🔄 세부 항목 선택 화면 표시...');
                                            _showSubItemsSelection(repairType);
                                          } else {
                                            // 수치 입력 불필요 + 세부 항목 없음 → 바로 추가
                                            debugPrint('✅ 바로 확인 페이지로 이동...');
                                            final currentItems = ref.read(repairItemsProvider);
                                            debugPrint('🔍 현재 항목 수: ${currentItems.length}');
                                            
                                            // 이미지 데이터를 명시적 필드 추출로 저장 (순환 참조 완전 차단)
                                            final List<Map<String, dynamic>> imageDataCopy = [];
                                            if (widget.imagesWithPins != null) {
                                              for (var img in widget.imagesWithPins!) {
                                                final imagePath = img['imagePath'] as String;
                                                final pinsData = img['pins'] as List?;
                                                
                                                // pins를 완전히 새로운 List로 생성
                                                final pins = <Map<String, dynamic>>[];
                                                if (pinsData != null) {
                                                  for (var pin in pinsData) {
                                                    if (pin is Map) {
                                                      // 각 필드를 primitive 값으로 추출
                                                      pins.add({
                                                        'id': pin['id']?.toString() ?? '',
                                                        'relative_x': (pin['relative_x'] as num?)?.toDouble() ?? 0.5,
                                                        'relative_y': (pin['relative_y'] as num?)?.toDouble() ?? 0.5,
                                                        'memo': pin['memo']?.toString() ?? '',
                                                        'created_at': pin['created_at']?.toString() ?? DateTime.now().toIso8601String(),
                                                        'updated_at': pin['updated_at']?.toString() ?? DateTime.now().toIso8601String(),
                                                      });
                                                    }
                                                  }
                                                }
                                                
                                                imageDataCopy.add({
                                                  'imagePath': imagePath,
                                                  'pins': pins,
                                                });
                                              }
                                            }
                                            
                                            debugPrint('📸 이미지 데이터 복사 완료: ${imageDataCopy.length}장');
                                            
                                            final repairItem = {
                                              'id': '${displayName}_${DateTime.now().millisecondsSinceEpoch}',
                                              'repairPart': displayName,
                                              'priceRange': '${price.toString().replaceAllMapped(
                                                RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
                                                (Match m) => '${m[1]},',
                                              )}원',
                                              'price': price,
                                              'scope': '전체',
                                              'measurement': '선택 완료',
                                              // 이미지 데이터 복사본 저장 (순환 참조 없음)
                                              'itemImages': imageDataCopy,
                                            };
                                            
                                            // 기존 항목에 새 항목 추가
                                            final allItems = [...currentItems, repairItem];
                                            debugPrint('➕ 총 항목 수: ${allItems.length}');
                                            
                                            try {
                                              // Provider에 저장 (JSON 깊은 복사 적용)
                                              ref.read(repairItemsProvider.notifier).setItems(allItems);
                                              debugPrint('✅ Provider 저장 성공');
                                            } catch (e, stackTrace) {
                                              debugPrint('❌ Provider 저장 실패: $e');
                                              debugPrint('❌ Stack: $stackTrace');
                                              
                                              if (mounted) {
                                                ScaffoldMessenger.of(context).showSnackBar(
                                                  SnackBar(
                                                    content: Text('데이터 저장 실패: $e'),
                                                    backgroundColor: Colors.red,
                                                    duration: const Duration(seconds: 5),
                                                  ),
                                                );
                                              }
                                              return;
                                            }
                                            
                                            // RepairConfirmationPage로 이동
                                            if (mounted) {
                                              context.push('/repair-confirmation', extra: {
                                                'repairItems': allItems,
                                                'imageUrls': widget.imageUrls,
                                              },);
                                            }
                                          }
                                        }
                                      });
                                    },
                                    borderRadius: BorderRadius.circular(16),
                                    child: Container(
                            decoration: BoxDecoration(
                              color: isSelected 
                                  ? const Color(0xFF00C896).withOpacity(0.05)
                                  : Colors.grey.shade50,
                              border: Border.all(
                                color: isSelected 
                                    ? const Color(0xFF00C896)
                                    : Colors.grey.shade200,
                                width: isSelected ? 2 : 1,
                              ),
                              borderRadius: BorderRadius.circular(16),
                            ),
                                      child: Column(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          // 아이콘
                                          Stack(
                                            children: [
                                              Container(
                                                width: 80,
                                                height: 80,
                                                decoration: BoxDecoration(
                                                  color: isSelected 
                                                      ? const Color(0xFF00C896)
                                                      : const Color(0xFF00C896).withOpacity(0.1),
                                                  borderRadius: BorderRadius.circular(12),
                                                ),
                                                child: Icon(
                                                  isSelected && !requiresMeasurement
                                                      ? Icons.check_circle
                                                      : Icons.content_cut, // TODO: DB의 icon_name으로 SVG 로드
                                                  size: 40,
                                                  color: isSelected 
                                                      ? Colors.white
                                                      : const Color(0xFF00C896),
                                                ),
                                              ),
                                              if (isSelected && !requiresMeasurement)
                                                Positioned(
                                                  top: 4,
                                                  right: 4,
                                                  child: Container(
                                                    width: 20,
                                                    height: 20,
                                                    decoration: const BoxDecoration(
                                                      color: Colors.white,
                                                      shape: BoxShape.circle,
                                                    ),
                                                    child: const Icon(
                                                      Icons.check,
                                                      size: 16,
                                                      color: Color(0xFF00C896),
                                                    ),
                                                  ),
                                                ),
                                            ],
                                          ),
                                          const SizedBox(height: 12),
                                          
                                          // 수선 부위 이름
                                          Padding(
                                            padding: const EdgeInsets.symmetric(horizontal: 8),
                                            child: Text(
                                              displayName,
                                              textAlign: TextAlign.center,
                                              style: TextStyle(
                                                fontSize: 14,
                                                fontWeight: FontWeight.bold,
                                                color: isSelected 
                                                    ? const Color(0xFF00C896)
                                                    : Colors.black87,
                                              ),
                                              maxLines: 2,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          
                                          // 가격
                                          Text(
                                            '${price.toString().replaceAllMapped(
                                              RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
                                              (Match m) => '${m[1]},',
                                            )}원',
                                            textAlign: TextAlign.center,
                                            style: TextStyle(
                                              fontSize: 12,
                                              color: Colors.grey.shade600,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  );
                                },
                              ),
                  ),
                  const SizedBox(height: 20),
                  
                  // 안내 메시지
                  Container(
                    margin: const EdgeInsets.symmetric(horizontal: 20),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade50,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          Icons.info_outline,
                          color: Colors.grey.shade700,
                          size: 20,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '수선 부위를 선택해주세요',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.grey.shade800,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '정확한 견적은 입고 후 확정됩니다',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: Colors.grey.shade600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 100),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// 사진 미리보기 섹션 (핀과 메모 표시)
  Widget _buildImagePreviewSection() {
    if (widget.imagesWithPins == null || widget.imagesWithPins!.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: widget.imagesWithPins!.map((imageData) {
        final imagePath = imageData['imagePath'] as String;
        final pinsData = imageData['pins'] as List?;
        final pins = pinsData?.map((p) {
          if (p is Map<String, dynamic>) {
            return ImagePin.fromJson(p);
          }
          return null;
        }).whereType<ImagePin>().toList() ?? [];

        return Container(
          margin: const EdgeInsets.only(bottom: 16),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey.shade300),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 사진
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: CachedNetworkImage(
                  imageUrl: imagePath,
                  height: 150,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  placeholder: (context, url) => Container(
                    height: 150,
                    color: Colors.grey.shade200,
                    child: const Center(child: CircularProgressIndicator()),
                  ),
                  errorWidget: (context, url, error) => Container(
                    height: 150,
                    color: Colors.grey.shade200,
                    child: const Icon(Icons.error),
                  ),
                ),
              ),
              
              // 핀 정보
              if (pins.isNotEmpty) ...[
                const SizedBox(height: 12),
                ...pins.asMap().entries.map((entry) {
                  final index = entry.key;
                  final pin = entry.value;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 20,
                          height: 20,
                          decoration: const BoxDecoration(
                            color: Color(0xFF00C896),
                            shape: BoxShape.circle,
                          ),
                          child: Center(
                            child: Text(
                              '${index + 1}',
                              style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            pin.memo.isEmpty ? '(메모 없음)' : pin.memo,
                            style: TextStyle(
                              fontSize: 13,
                              color: pin.memo.isEmpty ? Colors.grey.shade500 : Colors.grey.shade800,
                              fontStyle: pin.memo.isEmpty ? FontStyle.italic : FontStyle.normal,
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                }),
              ] else ...[
                const SizedBox(height: 8),
                Text(
                  '핀이 표시되지 않았습니다',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey.shade500,
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ],
            ],
          ),
        );
      }).toList(),
    );
  }
}

