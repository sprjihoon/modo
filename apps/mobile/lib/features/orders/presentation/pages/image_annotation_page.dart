import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../../domain/models/image_pin.dart';
import '../widgets/image_pin_editor.dart';

/// 이미지 주석(핀) 추가 페이지
class ImageAnnotationPage extends StatefulWidget {
  /// 초기 이미지 경로 (선택사항)
  final String? initialImagePath;
  
  /// 초기 핀 리스트
  final List<ImagePin>? initialPins;
  
  /// 완료 콜백
  final Function(String imagePath, List<ImagePin> pins)? onComplete;

  const ImageAnnotationPage({
    super.key,
    this.initialImagePath,
    this.initialPins,
    this.onComplete,
  });

  @override
  State<ImageAnnotationPage> createState() => _ImageAnnotationPageState();
}

class _ImageAnnotationPageState extends State<ImageAnnotationPage> {
  String? _imagePath;
  List<ImagePin> _pins = [];
  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _imagePath = widget.initialImagePath;
    _pins = widget.initialPins ?? [];
  }

  /// 갤러리에서 이미지 선택
  Future<void> _pickImageFromGallery() async {
    try {
      final XFile? image = await _picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1920,
        maxHeight: 1920,
        imageQuality: 85,
      );

      if (image != null) {
        setState(() {
          _imagePath = image.path;
          _pins = []; // 새 이미지 선택 시 핀 초기화
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('이미지 선택 실패: $e')),
        );
      }
    }
  }

  /// 카메라로 사진 촬영
  Future<void> _pickImageFromCamera() async {
    try {
      final XFile? image = await _picker.pickImage(
        source: ImageSource.camera,
        maxWidth: 1920,
        maxHeight: 1920,
        imageQuality: 85,
      );

      if (image != null) {
        setState(() {
          _imagePath = image.path;
          _pins = []; // 새 이미지 선택 시 핀 초기화
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('사진 촬영 실패: $e')),
        );
      }
    }
  }

  /// 이미지 선택 옵션 다이얼로그
  Future<void> _showImageSourceDialog() async {
    await showModalBottomSheet(
      context: context,
      builder: (context) => SafeArea(
        child: Wrap(
          children: [
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: const Text('갤러리에서 선택'),
              onTap: () {
                Navigator.pop(context);
                _pickImageFromGallery();
              },
            ),
            ListTile(
              leading: const Icon(Icons.camera_alt),
              title: const Text('카메라로 촬영'),
              onTap: () {
                Navigator.pop(context);
                _pickImageFromCamera();
              },
            ),
          ],
        ),
      ),
    );
  }

  /// 완료 처리
  void _handleComplete() {
    if (_imagePath == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('이미지를 선택해주세요.')),
      );
      return;
    }

    if (_pins.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('최소 1개 이상의 수선 부위를 표시해주세요'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    // 완료 콜백 호출
    widget.onComplete?.call(_imagePath!, _pins);

    // 핀을 JSON으로 변환하여 반환
    final pinsJson = _pins.map((pin) => pin.toJson()).toList();

    // 결과를 반환하며 페이지 닫기
    Navigator.of(context).pop({
      'imagePath': _imagePath,
      'pins': pinsJson, // JSON 형태로 변환
      'pinsCount': _pins.length, // 개수도 함께 전달
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      resizeToAvoidBottomInset: false, // 키보드가 올라올 때 레이아웃 변경 방지
      appBar: AppBar(
        title: const Text('수선 부위 표시'),
        actions: [
          if (_imagePath != null)
            TextButton(
              onPressed: _handleComplete,
              child: const Text(
                '완료',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
        ],
      ),
      body: _imagePath == null ? _buildEmptyState() : _buildEditor(),
    );
  }

  /// 이미지가 없을 때의 UI
  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.image_outlined,
            size: 100,
            color: Colors.grey.shade400,
          ),
          const SizedBox(height: 24),
          Text(
            '의류 사진을 선택해주세요',
            style: TextStyle(
              fontSize: 18,
              color: Colors.grey.shade600,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 40),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              ElevatedButton.icon(
                onPressed: _pickImageFromGallery,
                icon: const Icon(Icons.photo_library),
                label: const Text('갤러리'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 12,
                  ),
                ),
              ),
              const SizedBox(width: 16),
              ElevatedButton.icon(
                onPressed: _pickImageFromCamera,
                icon: const Icon(Icons.camera_alt),
                label: const Text('카메라'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 12,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// 에디터 UI
  Widget _buildEditor() {
    return Column(
      children: [
        // 안내 메시지
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                const Color(0xFF00C896).withOpacity(0.1),
                const Color(0xFF00C896).withOpacity(0.05),
              ],
            ),
            border: Border(
              bottom: BorderSide(
                color: const Color(0xFF00C896).withOpacity(0.3),
                width: 2,
              ),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF00C896),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(
                      Icons.touch_app,
                      color: Colors.white,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          '수선 부위를 체크해주세요',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.black87,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '📍 탭: 핀 추가 | 🖐️ 드래그: 핀 이동',
                          style: TextStyle(
                            color: Colors.grey.shade700,
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                  // 핀 개수 표시
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: _pins.isEmpty 
                          ? Colors.grey.shade300
                          : const Color(0xFF00C896),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      '${_pins.length}개',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: _pins.isEmpty 
                            ? Colors.grey.shade700
                            : Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        
        // 이미지 에디터
        Expanded(
          child: Container(
            color: Colors.black,
            child: Center(
              child: ImagePinEditor(
                imagePath: _imagePath!,
                initialPins: _pins,
                onPinsChanged: (pins) {
                  setState(() {
                    _pins = pins;
                  });
                },
                pinColor: const Color(0xFF00C896), // 녹색 (메인 컬러)
                maxPins: 5, // 최대 5개 핀
              ),
            ),
          ),
        ),
        
        // 하단 버튼
        SafeArea(
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  offset: const Offset(0, -2),
                  blurRadius: 8,
                ),
              ],
            ),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _showImageSourceDialog,
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    child: const Text('이미지 변경'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: ElevatedButton(
                    onPressed: _pins.isEmpty ? null : _handleComplete,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Theme.of(context).primaryColor,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      disabledBackgroundColor: Colors.grey.shade300,
                    ),
                    child: const Text(
                      '완료',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

