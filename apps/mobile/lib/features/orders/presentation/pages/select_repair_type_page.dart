import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// 수선 부위 선택 페이지
class SelectRepairTypePage extends ConsumerStatefulWidget {
  final String clothingType;
  final List<String> imageUrls;
  
  const SelectRepairTypePage({
    required this.clothingType, required this.imageUrls, super.key,
  });

  @override
  ConsumerState<SelectRepairTypePage> createState() => _SelectRepairTypePageState();
}

class _SelectRepairTypePageState extends ConsumerState<SelectRepairTypePage> {
  final Map<String, List<Map<String, dynamic>>> _repairTypes = {
    '공통수선': [
      {'name': '재봉줄', 'priceRange': '부위당 4,000원 ~ 7,000원'},
      {'name': '단추 달기', 'priceRange': '1,000원 ~ 3,000원'},
      {'name': '스냅(똑딱이) 달기', 'priceRange': '부위당 4,000원 ~ 5,000원'},
      {'name': '걸고리 달기', 'priceRange': '부위당 4,000원 ~ 5,000원'},
      {'name': '고무줄 교체', 'priceRange': '10,000원 ~ 15,000원'},
      {'name': '누빔 수선', 'priceRange': '부위당 8,000원 ~ 8,000원'},
      {'name': '주머니 막음', 'priceRange': '8,000원 ~ 10,000원'},
    ],
    '티셔츠/맨투맨': [
      {'name': '소매기장 줄임', 'priceRange': '8,000원 ~ 18,000원'},
      {'name': '전체팔통 줄임', 'priceRange': '8,000원 ~ 20,000원'},
      {'name': '어깨길이 줄임', 'priceRange': '10,000원 ~ 25,000원'},
      {'name': '전체품 줄임', 'priceRange': '8,000원 ~ 20,000원'},
      {'name': '총기장 줄임', 'priceRange': '10,000원 ~ 15,000원'},
      {'name': '아패드 수선(주기/재기/교체)', 'priceRange': '8,000원'},
    ],
    '셔츠/블라우스': [
      {'name': '소매기장 줄임', 'priceRange': '15,000원 ~ 18,000원'},
      {'name': '전체팔통 줄임', 'priceRange': '15,000원 ~ 20,000원'},
      {'name': '어깨길이 줄임', 'priceRange': '15,000원 ~ 25,000원'},
      {'name': '전체품 줄임', 'priceRange': '15,000원 ~ 20,000원'},
      {'name': '총기장 줄임', 'priceRange': '12,000원 ~ 15,000원'},
      {'name': '아패드 수선', 'priceRange': '8,000원'},
    ],
    '원피스': [
      {'name': '소매기장 줄임', 'priceRange': '15,000원 ~ 18,000원'},
      {'name': '전체팔통 줄임', 'priceRange': '15,000원 ~ 20,000원'},
      {'name': '어깨길이 줄임', 'priceRange': '15,000원 ~ 25,000원'},
      {'name': '전체품 줄임', 'priceRange': '15,000원 ~ 20,000원'},
      {'name': '총기장 줄임', 'priceRange': '12,000원 ~ 15,000원'},
      {'name': '지퍼교체', 'priceRange': '8,000원'},
      {'name': '아패드 수선', 'priceRange': '8,000원'},
    ],
    '바지': [
      {'name': '허리/밑 줄임', 'priceRange': '15,000원 ~ 20,000원'},
      {'name': '전체통 줄임', 'priceRange': '15,000원 ~ 20,000원'},
      {'name': '밑통만 줄임', 'priceRange': '12,000원 ~ 15,000원'},
      {'name': '밑위(기장이) 줄임', 'priceRange': '15,000원 ~ 20,000원'},
      {'name': '기장 줄임 - 일반형', 'priceRange': '6,000원 ~ 10,000원'},
      {'name': '기장 줄임 - 투턱형(3cm)', 'priceRange': '8,000원 ~ 10,000원'},
      {'name': '기장 줄임 - 지퍼형', 'priceRange': '12,000원 ~ 20,000원'},
      {'name': '기장 줄임 - 고무줄형', 'priceRange': '10,000원 ~ 18,000원'},
      {'name': '기장 줄임 - 트임형', 'priceRange': '10,000원 ~ 18,000원'},
      {'name': '기장 줄임 - 카브라형', 'priceRange': '10,000원 ~ 18,000원'},
      {'name': '기장 줄임 - 스트링형', 'priceRange': '10,000원 ~ 18,000원'},
      {'name': '기장+밑통 줄임', 'priceRange': '13,000원 ~ 20,000원'},
      {'name': '지퍼교체', 'priceRange': '12,000원 ~ 20,000원'},
    ],
    '청바지': [
      {'name': '허리/밑 줄임', 'priceRange': '18,000원'},
      {'name': '전체통 줄임', 'priceRange': '18,000원'},
      {'name': '밑통만 줄임', 'priceRange': '12,000원'},
      {'name': '밑위(기장이) 줄임', 'priceRange': '15,000원'},
      {'name': '기장 줄임 - 일반형', 'priceRange': '10,000원'},
      {'name': '기장 줄임 - 투턱형(3cm)', 'priceRange': '12,000원'},
      {'name': '기장 줄임 - 지퍼형', 'priceRange': '15,000원'},
      {'name': '기장 줄임 - 트임형', 'priceRange': '12,000원'},
      {'name': '기장 줄임 - 컷단형', 'priceRange': '12,000원'},
      {'name': '기장+밑통 줄임', 'priceRange': '18,000원'},
      {'name': '지퍼교체', 'priceRange': '12,000원 ~ 20,000원'},
    ],
    '치마': [
      {'name': '허리/밑 줄임', 'priceRange': '15,000원 ~ 20,000원'},
      {'name': '전체통 줄임', 'priceRange': '15,000원 ~ 20,000원'},
      {'name': '기장 줄임 - 기본형', 'priceRange': '15,000원 ~ 20,000원'},
      {'name': '기장 줄임 - 동글컷(80cm)', 'priceRange': '18,000원 ~ 20,000원'},
      {'name': '지퍼교체', 'priceRange': '12,000원 ~ 20,000원'},
    ],
    '아우터': [
      {'name': '소매기장 줄임 - 기본형', 'priceRange': '15,000원 ~ 30,000원'},
      {'name': '소매기장 줄임 - 단추구멍형', 'priceRange': '25,000원 ~ 30,000원'},
      {'name': '소매기장 줄임 - 지퍼형', 'priceRange': '28,000원 ~ 30,000원'},
      {'name': '전체팔통 줄임', 'priceRange': '20,000원 ~ 40,000원'},
      {'name': '어깨길이 줄임', 'priceRange': '25,000원 ~ 35,000원'},
      {'name': '전체품 줄임', 'priceRange': '20,000원 ~ 40,000원'},
      {'name': '총기장 줄임 - 기본형', 'priceRange': '25,000원 ~ 30,000원'},
      {'name': '총기장 줄임 - 집업형', 'priceRange': '30,000원'},
      {'name': '지퍼교체', 'priceRange': '25,000원 ~ 30,000원'},
      {'name': '아패드 수선', 'priceRange': '10,000원 ~ 10,000원'},
    ],
  };

  String? _selectedRepairType;

  List<Map<String, dynamic>> _getRepairTypesForClothing() {
    // 공통수선 항목 포함
    final commonRepairs = _repairTypes['공통수선'] ?? [];
    final specificRepairs = _repairTypes[widget.clothingType] ?? [];
    
    return [...specificRepairs, ...commonRepairs];
  }

  @override
  Widget build(BuildContext context) {
    final repairTypes = _getRepairTypesForClothing();
    
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
            child: ListView(
              children: [
                // 헤더
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        '수선 부위를 선택해주세요',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: Colors.black87,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFF00C896).withOpacity(0.1),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          widget.clothingType,
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
                
                // 수선 부위 리스트
                ...repairTypes.map((repair) {
                  final isSelected = _selectedRepairType == repair['name'];
                  return Container(
                    margin: const EdgeInsets.symmetric(
                      horizontal: 20,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: isSelected 
                          ? const Color(0xFF00C896).withOpacity(0.05)
                          : Colors.white,
                      border: Border.all(
                        color: isSelected 
                            ? const Color(0xFF00C896)
                            : Colors.grey.shade200,
                        width: isSelected ? 2 : 1,
                      ),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: ListTile(
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      title: Text(
                        repair['name'] as String,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                          color: isSelected 
                              ? const Color(0xFF00C896) 
                              : Colors.black87,
                        ),
                      ),
                      subtitle: Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Text(
                          repair['priceRange'] as String,
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.grey.shade600,
                          ),
                        ),
                      ),
                      trailing: Icon(
                        Icons.arrow_forward_ios,
                        size: 16,
                        color: isSelected 
                            ? const Color(0xFF00C896)
                            : Colors.grey.shade400,
                      ),
                      onTap: () {
                        setState(() {
                          _selectedRepairType = repair['name'] as String;
                        });
                        
                        // 선택 후 잠시 대기
                        Future.delayed(const Duration(milliseconds: 300), () {
                          if (mounted) {
                            // TODO: 다음 단계 (상세 치수 입력 또는 주문 확인)로 이동
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('${repair['name']} 선택됨 - 다음 단계 구현 예정'),
                                backgroundColor: const Color(0xFF00C896),
                              ),
                            );
                          }
                        });
                      },
                    ),
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
                              '상세 수선 부위를 선택해주세요',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: Colors.grey.shade800,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '입고 후 추가 결제 요청이 있을 수 있습니다',
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
        ],
      ),
    );
  }
}

