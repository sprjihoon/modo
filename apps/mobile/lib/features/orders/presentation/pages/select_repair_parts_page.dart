import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// 수선 부위 선택 페이지 (그리드 형태)
class SelectRepairPartsPage extends ConsumerStatefulWidget {
  final List<String> imageUrls;
  final List<Map<String, dynamic>>? imagesWithPins; // 핀 정보 포함
  
  const SelectRepairPartsPage({
    super.key,
    required this.imageUrls,
    this.imagesWithPins,
  });

  @override
  ConsumerState<SelectRepairPartsPage> createState() => _SelectRepairPartsPageState();
}

class _SelectRepairPartsPageState extends ConsumerState<SelectRepairPartsPage> {
  String? _selectedPart;

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

  // 주요 수선 부위 목록 (가격표 기반)
  final List<Map<String, dynamic>> _repairParts = [
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
                  
                  // 수선 부위 그리드
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                        childAspectRatio: 0.9,
                      ),
                      itemCount: _repairParts.length,
                      itemBuilder: (context, index) {
                        final part = _repairParts[index];
                        final isSelected = _selectedPart == part['name'];
                        
                        return InkWell(
                          onTap: () {
                            setState(() {
                              _selectedPart = part['name'] as String;
                            });
                            
                            // 선택 후 잠시 대기
                            Future.delayed(const Duration(milliseconds: 300), () {
                              if (mounted) {
                                // 상세 입력 페이지로 이동 (핀 정보 포함)
                                context.push('/repair-detail-input', extra: {
                                  'repairPart': part['name'],
                                  'priceRange': part['priceRange'],
                                  'imageUrls': widget.imageUrls,
                                  'imagesWithPins': widget.imagesWithPins, // 핀 정보 전달
                                });
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
                                // 아이콘 (이미지 대신)
                                Container(
                                  width: 80,
                                  height: 80,
                                  decoration: BoxDecoration(
                                    color: (part['color'] as Color).withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Icon(
                                    part['icon'] as IconData,
                                    size: 40,
                                    color: part['color'] as Color,
                                  ),
                                ),
                                const SizedBox(height: 12),
                                
                                // 수선 부위 이름
                                Text(
                                  part['name'] as String,
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: isSelected 
                                        ? const Color(0xFF00C896)
                                        : Colors.black87,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                
                                // 가격 범위
                                Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 8),
                                  child: Text(
                                    part['priceRange'] as String,
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: Colors.grey.shade600,
                                    ),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
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
}

