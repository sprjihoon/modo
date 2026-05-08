import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../../../../services/image_service.dart';
import '../../../../core/utils/snackbar_util.dart';
import '../../domain/models/order_draft.dart';
import '../../domain/models/image_pin.dart';
import 'image_pin_editor.dart';

const _brandColor = Color(0xFF00C896);

class ImagePinStep extends StatefulWidget {
  final String clothingType;
  final List<ImageWithPins> existingImages;
  final void Function(List<ImageWithPins> images) onComplete;

  const ImagePinStep({
    required this.clothingType,
    required this.existingImages,
    required this.onComplete,
    super.key,
  });

  @override
  State<ImagePinStep> createState() => _ImagePinStepState();
}

class _ImagePinStepState extends State<ImagePinStep> {
  final _imageService = ImageService();
  String? _currentImageUrl;
  List<ImagePin> _pins = [];
  bool _isUploading = false;

  @override
  void initState() {
    super.initState();
    if (widget.existingImages.isNotEmpty) {
      final first = widget.existingImages.first;
      _currentImageUrl = first.imageUrl;
      _pins = first.pins
          .map((p) => ImagePin(
                id: p.id,
                relativePosition: Offset(p.relativeX, p.relativeY),
                memo: p.memo,
              ))
          .toList();
    }
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      setState(() => _isUploading = true);

      final imageUrl = await _imageService.pickAndUploadImage(
        source: source,
        bucket: 'order-images',
        folder: 'repairs',
      );

      if (imageUrl == null) {
        setState(() => _isUploading = false);
        return;
      }

      if (mounted) {
        setState(() {
          _currentImageUrl = imageUrl;
          _pins = [];
          _isUploading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isUploading = false);
        SnackBarUtil.showError(context, message: '사진 추가 실패: $e');
      }
    }
  }

  void _showImageSourceSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                margin: const EdgeInsets.only(top: 12, bottom: 16),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Text(
                  '${widget.clothingType} 사진을 추가해주세요',
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(height: 20),
              ListTile(
                leading: Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: _brandColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.camera_alt_rounded, color: _brandColor),
                ),
                title: const Text('카메라로 촬영', style: TextStyle(fontWeight: FontWeight.w600)),
                subtitle: const Text('지금 바로 사진 촬영', style: TextStyle(fontSize: 13)),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickImage(ImageSource.camera);
                },
              ),
              const Divider(height: 1),
              ListTile(
                leading: Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: Colors.blue.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.photo_library_rounded, color: Colors.blue),
                ),
                title: const Text('갤러리에서 선택', style: TextStyle(fontWeight: FontWeight.w600)),
                subtitle: const Text('저장된 사진 불러오기', style: TextStyle(fontSize: 13)),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickImage(ImageSource.gallery);
                },
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  void _handleComplete() {
    if (_currentImageUrl == null) {
      SnackBarUtil.showError(context, message: '사진을 먼저 추가해주세요');
      return;
    }

    final images = [
      ImageWithPins(
        imageUrl: _currentImageUrl!,
        pins: _pins
            .map((p) => PinData(
                  id: p.id,
                  relativeX: p.relativePosition.dx,
                  relativeY: p.relativePosition.dy,
                  memo: p.memo,
                ))
            .toList(),
      ),
    ];
    widget.onComplete(images);
  }

  @override
  Widget build(BuildContext context) {
    if (_isUploading) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(_brandColor),
            ),
            const SizedBox(height: 16),
            Text('사진 업로드 중...', style: TextStyle(color: Colors.grey.shade600)),
          ],
        ),
      );
    }

    if (_currentImageUrl == null) {
      return _buildEmptyState();
    }

    return _buildEditor();
  }

  Widget _buildEmptyState() {
    return Column(
      children: [
        // Header
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: _brandColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  widget.clothingType,
                  style: const TextStyle(
                    fontSize: 13,
                    color: _brandColor,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(height: 12),
              const Text(
                '수선할 부위를 사진으로\n보여주세요',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: Colors.black87,
                  height: 1.3,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                '사진을 찍고 수선할 부위에 핀을 표시해주세요',
                style: TextStyle(fontSize: 13, color: Colors.grey.shade500),
              ),
            ],
          ),
        ),
        const Spacer(),
        // Action buttons
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Row(
            children: [
              Expanded(
                child: _buildSourceButton(
                  icon: Icons.camera_alt_rounded,
                  label: '카메라 촬영',
                  color: _brandColor,
                  onTap: () => _pickImage(ImageSource.camera),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildSourceButton(
                  icon: Icons.photo_library_rounded,
                  label: '갤러리 선택',
                  color: Colors.blue,
                  onTap: () => _pickImage(ImageSource.gallery),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 40),
        const Spacer(),
      ],
    );
  }

  Widget _buildSourceButton({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 24),
        decoration: BoxDecoration(
          color: color.withOpacity(0.08),
          border: Border.all(color: color.withOpacity(0.3)),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          children: [
            Icon(icon, size: 40, color: color),
            const SizedBox(height: 8),
            Text(
              label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEditor() {
    return Column(
      children: [
        // Guide bar
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                _brandColor.withOpacity(0.1),
                _brandColor.withOpacity(0.05),
              ],
            ),
            border: Border(
              bottom: BorderSide(color: _brandColor.withOpacity(0.3), width: 2),
            ),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: _brandColor,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.touch_app, color: Colors.white, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      '수선 부위를 체크해주세요',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '탭: 핀 추가 | 드래그: 핀 이동',
                      style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: _pins.isEmpty ? Colors.grey.shade300 : _brandColor,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '${_pins.length}개',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: _pins.isEmpty ? Colors.grey.shade700 : Colors.white,
                  ),
                ),
              ),
            ],
          ),
        ),

        // Image editor
        Expanded(
          child: Container(
            color: Colors.black,
            child: Center(
              child: ImagePinEditor(
                imagePath: _currentImageUrl!,
                initialPins: _pins,
                onPinsChanged: (pins) => setState(() => _pins = pins),
                pinColor: _brandColor,
                maxPins: 5,
              ),
            ),
          ),
        ),

        // Bottom buttons
        SafeArea(
          top: false,
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
                    onPressed: _showImageSourceSheet,
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
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
                      backgroundColor: _brandColor,
                      foregroundColor: Colors.white,
                      disabledBackgroundColor: Colors.grey.shade300,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 0,
                    ),
                    child: const Text(
                      '완료',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
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
