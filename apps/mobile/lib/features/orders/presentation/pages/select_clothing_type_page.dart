import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../../../services/repair_service.dart';
import '../../../../services/image_service.dart';
import '../../../../core/utils/snackbar_util.dart';
import '../../../../core/widgets/category_icon_widget.dart';
import '../../../../core/widgets/modo_app_bar.dart';

/// 수선 의류 종류 선택 페이지
class SelectClothingTypePage extends ConsumerStatefulWidget {
  final List<String> imageUrls;
  final bool fromCamera; // 카메라 촬영 후 자동 진입 플래그
  final String? imageUrl; // 촬영한 이미지 URL
  final String? preSelectedCategory; // 미리 선택된 카테고리
  
  const SelectClothingTypePage({
    required this.imageUrls,
    this.fromCamera = false,
    this.imageUrl,
    this.preSelectedCategory,
    super.key,
  });

  @override
  ConsumerState<SelectClothingTypePage> createState() => _SelectClothingTypePageState();
}

class _SelectClothingTypePageState extends ConsumerState<SelectClothingTypePage> {
  String? _selectedType;
  String? _selectedCategoryId;
  final _repairService = RepairService();
  
  List<Map<String, dynamic>> _clothingTypes = [];
  bool _isNavigating = false; // 네비게이션 중 플래그

  @override
  void initState() {
    super.initState();
    _loadCategories();
    
    // 카메라 촬영 후 자동 진입인 경우, 바로 핀 마킹으로 이동
    if (widget.fromCamera && widget.imageUrl != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _navigateToImageAnnotation(widget.imageUrl!, widget.preSelectedCategory ?? '');
      });
    }
  }
  
   /// 핀 마킹 페이지로 이동 (카메라 촬영 후 자동 진입)
   Future<void> _navigateToImageAnnotation(String imageUrl, String clothingType) async {
     debugPrint('📸 핀 마킹 이동 - 새 촬영 세션');
     
     // 핀 마킹 페이지로 바로 이동
     final result = await context.push<Map<String, dynamic>>(
       '/image-annotation',
       extra: {
         'imagePath': imageUrl,
         'pins': [],
         'onComplete': null,
       },
     );
     
     // 핀 완료 후 수선 부위 선택으로 이동
     if (result != null && mounted) {
       debugPrint('📸 핀 마킹 완료 (from camera)');
       
       try {
         // 필요한 필드만 명시적으로 추출 (순환 참조 완전 차단)
         final imagePath = result['imagePath'] as String;
         final pinsData = result['pins'] as List?;
         
         debugPrint('📍 imagePath: $imagePath');
         debugPrint('📍 pins 개수: ${pinsData?.length ?? 0}');
         
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
         
         debugPrint('✅ 핀 복사 완료: ${pins.length}개');
         
         // 완전히 새로운 데이터 구조 생성
         final currentSessionImages = <Map<String, dynamic>>[{
           'imagePath': imagePath,
           'pins': pins,
           'clothingType': clothingType,
         }];
         
         debugPrint('✅ 세션 이미지 생성 완료');
         
         // 카테고리 페이지를 교체하면서 수선 부위 선택으로 이동
         context.pushReplacement('/select-repair-parts', extra: {
           'imageUrls': [imagePath],
           'imagesWithPins': currentSessionImages,
           'categoryId': _selectedCategoryId,
           'categoryName': _selectedType,
         },);
       } catch (e, stackTrace) {
         debugPrint('❌ 데이터 처리 오류: $e');
         debugPrint('❌ Stack: $stackTrace');
         
        setState(() {
          _isNavigating = false;
        });
        
        if (mounted) {
          SnackBarUtil.showError(
            context,
            message: '데이터 처리 오류: $e',
            duration: const Duration(seconds: 5),
          );
        }
      }
   }
   }
  
  /// DB에서 카테고리 로드
  Future<void> _loadCategories() async {
    try {
      final categories = await _repairService.getCategories();
      if (mounted) {
        setState(() {
          _clothingTypes = categories;
        });
      }
    } catch (e) {
      debugPrint('카테고리 로드 실패: $e');
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
                onTap: _isNavigating ? null : () {
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
                onTap: _isNavigating ? null : () {
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
       // 1. 즉시 오버레이 표시 (이미지 선택 전에)
       setState(() {
         _isNavigating = true;
       });
       
       // 2. 오버레이가 확실히 표시되도록 대기
       await Future.delayed(const Duration(milliseconds: 200));
       
       final imageService = ImageService();
       
       // 3. 이미지 선택 및 업로드 (오버레이 유지하면서)
       final imageUrl = await imageService.pickAndUploadImage(
         source: source,
         bucket: 'order-images',
         folder: 'repairs',
       );
       
       // 사용자가 취소한 경우
       if (imageUrl == null) {
         setState(() {
           _isNavigating = false;
         });
         return;
       }
       
       if (!mounted) return;
       
       // 4. 핀 마킹 페이지로 이동 (오버레이는 계속 유지)
       final result = await context.push<Map<String, dynamic>>(
         '/image-annotation',
         extra: {
           'imagePath': imageUrl,
           'pins': [],
           'onComplete': null,
         },
       );
       
      // 5. 핀 완료 후 수선 부위 선택으로 이동 (오버레이 계속 유지)
      if (result != null && mounted) {
        debugPrint('📸 핀 마킹 완료');
        
        try {
          // 필요한 필드만 명시적으로 추출 (순환 참조 완전 차단)
          final imagePath = result['imagePath'] as String;
          final pinsData = result['pins'] as List?;
          
          debugPrint('📍 imagePath: $imagePath');
          debugPrint('📍 pins 개수: ${pinsData?.length ?? 0}');
          
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
          
          debugPrint('✅ 핀 복사 완료: ${pins.length}개');
          
          // 완전히 새로운 데이터 구조 생성
          final currentSessionImages = <Map<String, dynamic>>[{
            'imagePath': imagePath,
            'pins': pins,
            'clothingType': clothingType,
          }];
          
          debugPrint('✅ 세션 이미지 생성 완료');
          
          // pushReplacement로 카테고리 페이지 교체
          context.pushReplacement('/select-repair-parts', extra: {
            'imageUrls': [imagePath],
            'imagesWithPins': currentSessionImages,
            'categoryId': _selectedCategoryId,
            'categoryName': _selectedType,
          },);
        } catch (e, stackTrace) {
          debugPrint('❌ 데이터 처리 오류: $e');
          debugPrint('❌ Stack: $stackTrace');
          
          setState(() {
            _isNavigating = false;
          });
          
          if (mounted) {
            SnackBarUtil.showError(
              context,
              message: '데이터 처리 오류: $e',
              duration: const Duration(seconds: 5),
            );
          }
        }
      } else if (mounted) {
        // 취소 시 오버레이 제거
        setState(() {
          _isNavigating = false;
        });
      }
     } catch (e) {
       if (mounted) {
         setState(() {
           _isNavigating = false;
         });
        SnackBarUtil.showError(
          context,
          message: '사진 추가 실패: $e',
        );
       }
     }
   }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // 메인 화면
        Scaffold(
      backgroundColor: Colors.white,
      appBar: ModoAppBar(
        title: const Text(
          '수선',
          style: TextStyle(
            color: Colors.black,
            fontWeight: FontWeight.bold,
          ),
        ),
        onBack: _isNavigating ? () {} : null,
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
                
                // 의류 종류 리스트 (DB에서 로드)
                ..._clothingTypes.map((type) {
                  final typeName = type['name'] as String;
                  final iconName = type['icon_name'] as String?;
                  final isSelected = _selectedType == typeName;
                  return ListTile(
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 20,
                      vertical: 8,
                    ),
                    leading: CategoryIconWidget(
                      iconName: iconName,
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
                    onTap: _isNavigating ? null : () {
                      setState(() {
                        _selectedType = type['name'] as String;
                        _selectedCategoryId = type['id'] as String; // 중요!
                      });
                      
                      debugPrint('✅ 카테고리 선택: ${type['name']} (${type['id']})');
                      
                      // 선택 후 사진 선택 바텀시트 표시
                      Future.delayed(const Duration(milliseconds: 300), () {
                        if (mounted && !_isNavigating) {
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
                            const Text(
                              '수선 가격표 확인하기',
                              style: TextStyle(
                                fontSize: 13,
                                color: Color(0xFF00C896),
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
        ),
        
        // 네비게이션 중 로딩 오버레이 (단일 오버레이만 표시)
        if (_isNavigating)
          Positioned.fill(
            child: Container(
              color: Colors.black.withOpacity(0.5),
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const CircularProgressIndicator(
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                    const SizedBox(height: 16),
                    RichText(
                      text: const TextSpan(
                        text: '화면 전환 중...',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          decoration: TextDecoration.none,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }
}

