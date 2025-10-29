import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// 수선 의류 종류 선택 페이지
class SelectClothingTypePage extends ConsumerStatefulWidget {
  final List<String> imageUrls;
  
  const SelectClothingTypePage({
    super.key,
    required this.imageUrls,
  });

  @override
  ConsumerState<SelectClothingTypePage> createState() => _SelectClothingTypePageState();
}

class _SelectClothingTypePageState extends ConsumerState<SelectClothingTypePage> {
  String? _selectedType;

  final List<Map<String, dynamic>> _clothingTypes = [
    {'name': '아우터', 'icon': Icons.checkroom},
    {'name': '티셔츠/맨투맨', 'icon': Icons.checkroom_outlined},
    {'name': '셔츠/블라우스', 'icon': Icons.checkroom_outlined},
    {'name': '원피스', 'icon': Icons.checkroom_outlined},
    {'name': '바지', 'icon': Icons.checkroom_outlined},
    {'name': '청바지', 'icon': Icons.checkroom_outlined},
    {'name': '치마', 'icon': Icons.checkroom_outlined},
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
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              children: [
                // 헤더
                const Padding(
                  padding: EdgeInsets.all(20),
                  child: Text(
                    '어떤 의류를 수선하시나요?',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                    ),
                  ),
                ),
                
                // 의류 종류 리스트
                ..._clothingTypes.map((type) {
                  final isSelected = _selectedType == type['name'];
                  return ListTile(
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 20,
                      vertical: 8,
                    ),
                    leading: Icon(
                      type['icon'] as IconData,
                      size: 32,
                      color: isSelected 
                          ? const Color(0xFF00C896) 
                          : Colors.grey.shade600,
                    ),
                    title: Text(
                      type['name'] as String,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        color: isSelected 
                            ? const Color(0xFF00C896) 
                            : Colors.black87,
                      ),
                    ),
                    trailing: Icon(
                      Icons.arrow_forward_ios,
                      size: 16,
                      color: Colors.grey.shade400,
                    ),
                    onTap: () {
                      setState(() {
                        _selectedType = type['name'] as String;
                      });
                      
                      // 선택 후 잠시 대기 후 다음 단계로
                      Future.delayed(const Duration(milliseconds: 300), () {
                        if (mounted) {
                          // 수선 부위 선택 페이지로 이동
                          context.push('/select-repair-type', extra: {
                            'clothingType': type['name'],
                            'imageUrls': widget.imageUrls,
                          });
                        }
                      });
                    },
                  );
                }),
                
                const SizedBox(height: 20),
                
                // 하단 안내
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
                              '수선도 모바일로 간편하게',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: Colors.grey.shade800,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '수선 가격표 확인하기',
                              style: TextStyle(
                                fontSize: 13,
                                color: const Color(0xFF00C896),
                                decoration: TextDecoration.underline,
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
        ],
      ),
    );
  }
}

