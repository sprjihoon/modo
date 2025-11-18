import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../../../services/repair_service.dart';

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
  String? _selectedCategoryId;
  final List<Map<String, dynamic>> _capturedImagesWithPins = [];
  final _repairService = RepairService();
  
  List<Map<String, dynamic>> _clothingTypes = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadCategories();
  }
  
  /// DB에서 카테고리 로드
  Future<void> _loadCategories() async {
    try {
      final categories = await _repairService.getCategories();
      if (mounted) {
        setState(() {
          _clothingTypes = categories;
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('카테고리 로드 실패: $e');
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  /// 사진 선택 바텀시트 표시
  void _showImagePickerBottomSheet(BuildContext context, String clothingType) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // 핸들바
              Container(
                margin: const EdgeInsets.only(top: 12, bottom: 20),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              
              // 타이틀
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Text(
                  '$clothingType 사진을 추가해주세요',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
              ),
              const SizedBox(height: 24),
              
              // 카메라 촬영
              ListTile(
                leading: Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: const Color(0xFF00C896).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.camera_alt_rounded,
                    color: Color(0xFF00C896),
                  ),
                ),
                title: const Text(
                  '카메라로 촬영',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                subtitle: const Text(
                  '지금 바로 사진 촬영',
                  style: TextStyle(fontSize: 13),
                ),
                onTap: () {
                  Navigator.pop(context);
                  _pickImage(ImageSource.camera, clothingType);
                },
              ),
              
              const Divider(height: 1),
              
              // 갤러리에서 선택
              ListTile(
                leading: Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: Colors.blue.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.photo_library_rounded,
                    color: Colors.blue,
                  ),
                ),
                title: const Text(
                  '갤러리에서 선택',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                subtitle: const Text(
                  '저장된 사진 불러오기',
                  style: TextStyle(fontSize: 13),
                ),
                onTap: () {
                  Navigator.pop(context);
                  _pickImage(ImageSource.gallery, clothingType);
                },
              ),
              
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  /// 이미지 선택/촬영
  Future<void> _pickImage(ImageSource source, String clothingType) async {
    try {
      // TODO: 실제 이미지 선택 및 업로드
      // final picker = ImagePicker();
      // final image = await picker.pickImage(source: source);
      // if (image == null) return;
      
      // Mock: 0.5초 지연 후 더미 이미지 추가
      await Future.delayed(const Duration(milliseconds: 500));
      
      final mockUrls = [
        'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400',
        'https://images.unsplash.com/photo-1620799140188-3b2a02fd9a77?w=400',
        'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400',
      ];
      final mockUrl = mockUrls[_capturedImagesWithPins.length % mockUrls.length];
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('사진이 추가되었습니다'),
            backgroundColor: Color(0xFF00C896),
            duration: Duration(seconds: 1),
          ),
        );
        
        // 핀 표시 페이지로 이동 (이미지 주석)
        final result = await context.push<Map<String, dynamic>>(
          '/image-annotation',
          extra: {
            'imagePath': mockUrl,
            'pins': [],
            'onComplete': null,
          },
        );
        
        // 핀 표시 완료 후 이미지와 핀 정보를 함께 저장
        if (result != null && mounted) {
          setState(() {
            _capturedImagesWithPins.add({
              'imagePath': result['imagePath'] as String,
              'pins': result['pins'] ?? [],
              'clothingType': clothingType,
            });
          });
          
          // 성공 메시지 표시
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                '수선 부위 ${(result['pins'] as List?)?.length ?? 0}개가 표시되었습니다',
              ),
              backgroundColor: const Color(0xFF00C896),
              duration: const Duration(seconds: 2),
            ),
          );
          
          // 수선 부위 선택 페이지로 이동 (핀 정보 포함)
          final imageUrls = _capturedImagesWithPins
              .map((e) => e['imagePath'] as String)
              .toList();
          
          context.push('/select-repair-parts', extra: {
            'imageUrls': imageUrls,
            'imagesWithPins': _capturedImagesWithPins,
            'categoryId': _selectedCategoryId,
            'categoryName': _selectedType,
          });
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('사진 추가 실패: $e'),
            backgroundColor: Colors.red.shade400,
          ),
        );
      }
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
                      
                      // 선택 후 사진 선택 바텀시트 표시
                      Future.delayed(const Duration(milliseconds: 300), () {
                        if (mounted) {
                          _showImagePickerBottomSheet(context, type['name'] as String);
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

