import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../services/permission_service.dart';

/// 주문 생성 페이지
class CreateOrderPage extends ConsumerStatefulWidget {
  const CreateOrderPage({super.key});

  @override
  ConsumerState<CreateOrderPage> createState() => _CreateOrderPageState();
}

class _CreateOrderPageState extends ConsumerState<CreateOrderPage> {
  // State
  final List<String> _imageUrls = [];
  final List<Map<String, dynamic>> _repairItems = []; // 선택한 수선 항목들
  bool _isLoading = false;

  @override
  void dispose() {
    super.dispose();
  }

  // 수선 항목 추가
  void _addRepairItem(Map<String, dynamic> item) {
    setState(() {
      _repairItems.add(item);
    });
  }

  /// 이미지 선택 (권한 요청 포함)
  Future<void> _pickImage(ImageSource source) async {
    // 1. 권한 확인 및 요청
    bool hasPermission = false;
    if (source == ImageSource.camera) {
      hasPermission = await PermissionService.requestCameraPermission(context);
    } else {
      hasPermission = await PermissionService.requestPhotosPermission(context);
    }
    
    if (!hasPermission) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(source == ImageSource.camera 
              ? '카메라 권한이 필요합니다' 
              : '사진 접근 권한이 필요합니다'),
            backgroundColor: Colors.orange,
          ),
        );
      }
      return;
    }

    setState(() => _isLoading = true);

    try {
      // TODO: 실제 이미지 선택 및 업로드 (Supabase Storage 설정 후)
      // final picker = ImagePicker();
      // final image = await picker.pickImage(source: source);
      // final url = await _orderService.uploadImage(image.path);
      
      // 임시 Mock 이미지 URL (테스트용)
      final mockUrls = [
        'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400',
        'https://images.unsplash.com/photo-1620799140188-3b2a02fd9a77?w=400',
        'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400',
      ];
      final url = mockUrls[_imageUrls.length % mockUrls.length];
      
      // 짧은 지연 (업로드 시뮬레이션)
      await Future.delayed(const Duration(milliseconds: 500));
      
      setState(() {
        _imageUrls.add(url);
        _isLoading = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('사진이 추가되었습니다 (${_imageUrls.length}장)'),
            backgroundColor: const Color(0xFF00C896),
            duration: const Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      setState(() => _isLoading = false);
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

  /// 수선 부위 추가하기
  Future<void> _addRepairPart() async {
    if (_imageUrls.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('최소 1장 이상의 사진을 등록해주세요'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    // 수선 부위 선택 페이지로 이동
    final result = await context.push<Map<String, dynamic>>(
      '/select-repair-parts',
      extra: _imageUrls,
    );
    
    // 수선 항목이 추가되면 리스트에 추가
    if (result != null && mounted) {
      _addRepairItem(result);
    }
  }
  
  /// 다음 단계로 이동 (최종 확인)
  Future<void> _goToConfirmation() async {
    if (_repairItems.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('최소 1개 이상의 수선 항목을 추가해주세요'),
          backgroundColor: Colors.red,
        ),
        );
      return;
      }

    // 최종 확인 페이지로 이동
      if (mounted) {
      context.push('/repair-confirmation', extra: {
        'repairItems': _repairItems,
        'imageUrls': _imageUrls,
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
      ),
      body: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 헤더
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 20),
                child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                        Text(
                          '수선을 신청할',
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: Colors.black87,
                            height: 1.3,
                          ),
                        ),
                        Text(
                          '의류 사진을 등록해주세요',
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: Colors.black87,
                            height: 1.3,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),
                  
                  // 사진 및 수선 항목 목록
                  if (_imageUrls.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: Column(
                        children: [
                          // 사진과 연결된 수선 항목들
                          ..._imageUrls.asMap().entries.map((entry) {
                            final index = entry.key;
                            final url = entry.value;
                            
                            return Container(
                              margin: const EdgeInsets.only(bottom: 16),
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: Colors.grey.shade50,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Column(
                                children: [
                                  Row(
                                    children: [
                                      // 썸네일
                                      ClipRRect(
                                        borderRadius: BorderRadius.circular(8),
                                        child: Image.network(
                                          url,
                                          width: 60,
                                          height: 60,
                                          fit: BoxFit.cover,
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      // 정보
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              '수선 ${index + 1} ${_repairItems.length > index ? '(${_repairItems[index]['repairPart']})' : ''}',
                                              style: const TextStyle(
                                                fontSize: 15,
                                                fontWeight: FontWeight.bold,
                                                color: Colors.black87,
                                              ),
                                            ),
                                            if (_repairItems.length > index) ...[
                                              const SizedBox(height: 4),
                                              Container(
                                                padding: const EdgeInsets.symmetric(
                                                  horizontal: 8,
                                                  vertical: 4,
                                                ),
                                                decoration: BoxDecoration(
                                                  color: Colors.grey.shade200,
                                                  borderRadius: BorderRadius.circular(4),
                                                ),
                                                child: Text(
                                                  '${_repairItems[index]['scope']} · ${_repairItems[index]['measurement']}',
                                                  style: const TextStyle(
                                                    fontSize: 11,
                                                    color: Colors.black54,
                                                  ),
                                                ),
                                              ),
                                            ],
                                          ],
                                        ),
                                      ),
                                      // 삭제 버튼
                                      IconButton(
                                        icon: Icon(
                                          Icons.close,
                                          color: Colors.grey.shade600,
                                        ),
                                        onPressed: () {
                                          setState(() {
                                            _imageUrls.removeAt(index);
                                            // 해당 인덱스의 수선 항목도 삭제
                                            if (_repairItems.length > index) {
                                              _repairItems.removeAt(index);
                                            }
                                          });
                                        },
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            );
                          }),
                        ],
                      ),
                    ),
                  
                  // 추가하기 버튼 (사진 or 수선)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: InkWell(
                      onTap: _isLoading ? null : () {
                        if (_imageUrls.isEmpty) {
                          _showImageSourceDialog();
                        } else {
                          _addRepairPart();
                        }
                      },
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 20),
                        decoration: BoxDecoration(
                          color: const Color(0xFF374350),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              _imageUrls.isEmpty ? Icons.camera_alt_outlined : Icons.add,
                              color: Colors.white,
                              size: 22,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              _imageUrls.isEmpty ? '추가하기' : '수선 추가하기',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                          ],
                        ),
                      ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    
                  // 등록 어려움 체크박스
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Row(
                      children: [
                        SizedBox(
                          width: 24,
                          height: 24,
                          child: Checkbox(
                            value: false,
                            onChanged: (value) {},
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(4),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            '현재는 등록이 어려워요. 수선은 다음에 신청할게요.',
                            style: TextStyle(
                              fontSize: 13,
                              color: Colors.grey.shade600,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),
                  
                  // 불가품목 안내
                  Container(
                    margin: const EdgeInsets.symmetric(horizontal: 20),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade50,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.info_outline,
                          color: Colors.grey.shade700,
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            '불가품목',
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.grey.shade700,
                            ),
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
            
          // 다음 버튼 (하단 고정)
            Container(
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
              child: SafeArea(
                child: ElevatedButton(
                onPressed: _repairItems.isEmpty ? null : _goToConfirmation,
                  style: ElevatedButton.styleFrom(
                  backgroundColor: _repairItems.isEmpty 
                      ? Colors.grey.shade300 
                      : const Color(0xFF00C896),
                  foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    elevation: 0,
                  ),
                  child: _isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        )
                    : const Text(
                        '다음',
                        style: TextStyle(
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
  }

  /// 이미지 소스 선택 다이얼로그
  Future<void> _showImageSourceDialog() async {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
      child: Column(
            mainAxisSize: MainAxisSize.min,
        children: [
              // 핸들 바
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 20),
              
              // 카메라로 촬영
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF00C896).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(
                    Icons.camera_alt_outlined,
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
                onTap: () {
                  Navigator.pop(context);
                  _pickImage(ImageSource.camera);
                },
              ),
              
              // 갤러리에서 선택
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                    color: const Color(0xFF00C896).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(
                    Icons.photo_library_outlined,
                    color: Color(0xFF00C896),
                  ),
                ),
                title: const Text(
                  '갤러리에서 선택',
              style: TextStyle(
                fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              onTap: () {
                  Navigator.pop(context);
                  _pickImage(ImageSource.gallery);
                },
              ),
              
              const SizedBox(height: 10),
                  ],
                ),
              ),
            ),
    );
  }

}

