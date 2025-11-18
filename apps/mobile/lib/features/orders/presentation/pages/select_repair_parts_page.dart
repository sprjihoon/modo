import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../services/repair_service.dart';

/// 수선 부위 선택 페이지 (그리드 형태)
class SelectRepairPartsPage extends ConsumerStatefulWidget {
  final List<String> imageUrls;
  final List<Map<String, dynamic>>? imagesWithPins; // 핀 정보 포함
  final String? categoryId; // 선택한 카테고리 ID
  final String? categoryName; // 선택한 카테고리명
  
  const SelectRepairPartsPage({
    super.key,
    required this.imageUrls,
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
  
  String? _selectedPartId;
  String? _selectedPartName;

  @override
  void initState() {
    super.initState();
    _loadRepairTypes();
  }

  /// DB에서 수선 종류 로드
  Future<void> _loadRepairTypes() async {
    if (widget.categoryId == null) {
      setState(() => _isLoading = false);
      return;
    }
    
    try {
      final types = await _repairService.getRepairTypesByCategory(widget.categoryId!);
      if (mounted) {
        setState(() {
          _repairTypes = types;
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('수선 종류 로드 실패: $e');
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }
  
  /// 세부 부위 선택 바텀시트
  Future<void> _showSubPartsSelection(Map<String, dynamic> repairType) async {
    // TODO: DB에서 세부 부위 로드
    // final subParts = await _repairService.getSubParts(repairType['id']);
    
    // 임시: 바텀시트 표시
    final result = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.7,
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
              child: Text(
                '세부 부위를 선택해주세요',
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(height: 20),
            // TODO: 세부 부위 그리드
            Expanded(
              child: Center(
                child: Text(
                  '세부 부위 UI 구현 중...',
                  style: TextStyle(color: Colors.grey.shade600),
                ),
              ),
            ),
          ],
        ),
      ),
    );
    
    if (result != null && mounted) {
      // 세부 부위 선택 후 상세 입력으로 이동
      context.push('/repair-detail-input', extra: {
        'repairPart': '${repairType['name']} - ${result['partName']}',
        'price': result['price'],
        'repairTypeId': repairType['id'],
        'subPartId': result['subPartId'],
        'requiresMultipleInputs': repairType['requires_multiple_inputs'] ?? false,
        'inputLabels': repairType['input_labels'] ?? ['치수 (cm)'],
        'imageUrls': widget.imageUrls,
        'imagesWithPins': widget.imagesWithPins,
      });
    }
  }

  // 전체 핀 개수 계산
  int _getTotalPins() {
    if (widget.imagesWithPins == null) return 0;
    int total = 0;
    for (var imageData in widget.imagesWithPins!) {
      final pins = imageData['pins'] as List?;
      total += pins?.length ?? 0;
    }
    return total;
  }

  // Mock 수선 부위 목록 (DB 로드 실패 시 폴백용)
  final List<Map<String, dynamic>> _mockRepairParts = [
    {
      'name': '소매기장 줄임',
      'icon': Icons.straighten,
      'priceRange': '8,000원 ~ 30,000원',
      'color': const Color(0xFFFF6B6B),
    },
    {
      'name': '전체팔통 줄임',
      'icon': Icons.expand_less,
      'priceRange': '8,000원 ~ 40,000원',
      'color': const Color(0xFFFF6B6B),
    },
    {
      'name': '어깨길이 줄임',
      'icon': Icons.height,
      'priceRange': '10,000원 ~ 35,000원',
      'color': const Color(0xFFFF6B6B),
    },
    {
      'name': '전체품 줄임',
      'icon': Icons.unfold_less,
      'priceRange': '8,000원 ~ 40,000원',
      'color': const Color(0xFFFF6B6B),
    },
    {
      'name': '총기장 줄임',
      'icon': Icons.vertical_align_bottom,
      'priceRange': '10,000원 ~ 30,000원',
      'color': const Color(0xFFFF6B6B),
    },
    {
      'name': '부속품 찢김, 수선',
      'icon': Icons.build_circle_outlined,
      'priceRange': '8,000원 ~ 10,000원',
      'color': const Color(0xFFFF8B94),
    },
    {
      'name': '기장 줄임',
      'icon': Icons.arrow_downward,
      'priceRange': '6,000원 ~ 20,000원',
      'color': const Color(0xFF4ECDC4),
    },
    {
      'name': '허리/밑 줄임',
      'icon': Icons.rotate_90_degrees_ccw,
      'priceRange': '15,000원 ~ 20,000원',
      'color': const Color(0xFF4ECDC4),
    },
    {
      'name': '전체통 줄임',
      'icon': Icons.compress,
      'priceRange': '12,000원 ~ 20,000원',
      'color': const Color(0xFF4ECDC4),
    },
    {
      'name': '재봉줄',
      'icon': Icons.construction,
      'priceRange': '부위당 4,000원 ~ 7,000원',
      'color': const Color(0xFF95E1D3),
    },
    {
      'name': '단추 달기',
      'icon': Icons.circle_outlined,
      'priceRange': '1,000원 ~ 3,000원',
      'color': const Color(0xFF95E1D3),
    },
    {
      'name': '지퍼교체',
      'icon': Icons.vertical_align_center,
      'priceRange': '8,000원 ~ 30,000원',
      'color': const Color(0xFF95E1D3),
    },
  ];

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
                                  final isSelected = _selectedPartId == repairType['id'];
                                  
                                  final displayName = subType != null ? '$typeName ($subType)' : typeName;
                                  
                                  return InkWell(
                                    onTap: () {
                                      setState(() {
                                        _selectedPartId = repairType['id'] as String;
                                        _selectedPartName = displayName;
                                      });
                                      
                                      // 선택 후 잠시 대기
                                      Future.delayed(const Duration(milliseconds: 300), () {
                                        if (mounted) {
                                          // 세부 부위가 있는지 확인
                                          final hasSubParts = repairType['has_sub_parts'] as bool? ?? false;
                                          
                                          if (hasSubParts) {
                                            // TODO: 세부 부위 선택 페이지로 이동
                                            _showSubPartsSelection(repairType);
                                          } else {
                                            // 바로 상세 입력 페이지로 이동
                                            context.push('/repair-detail-input', extra: {
                                              'repairPart': displayName,
                                              'price': price,
                                              'repairTypeId': repairType['id'],
                                              'requiresMultipleInputs': repairType['requires_multiple_inputs'] ?? false,
                                              'inputLabels': repairType['input_labels'] ?? ['치수 (cm)'],
                                              'imageUrls': widget.imageUrls,
                                              'imagesWithPins': widget.imagesWithPins,
                                            });
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
                                          Container(
                                            width: 80,
                                            height: 80,
                                            decoration: BoxDecoration(
                                              color: const Color(0xFF00C896).withOpacity(0.1),
                                              borderRadius: BorderRadius.circular(12),
                                            ),
                                            child: const Icon(
                                              Icons.content_cut, // TODO: DB의 icon_name으로 SVG 로드
                                              size: 40,
                                              color: Color(0xFF00C896),
                                            ),
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
}

