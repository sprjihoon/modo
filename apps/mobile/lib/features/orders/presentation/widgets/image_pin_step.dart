import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../../../../core/utils/snackbar_util.dart';
import '../../../../services/image_service.dart';
import '../../domain/models/image_pin.dart';
import '../../domain/models/order_draft.dart';
import '../../domain/order_image_upload.dart';
import 'image_pin_editor.dart';

const _brandColor = Color(0xFF00C896);

class ImagePinStep extends StatefulWidget {
  final String clothingType;
  final List<ImageWithPins> existingImages;
  final void Function(List<ImageWithPins> images) onComplete;
  final void Function(List<ImageWithPins> images)? onImagesChanged;

  const ImagePinStep({
    required this.clothingType,
    required this.existingImages,
    required this.onComplete,
    this.onImagesChanged,
    super.key,
  });

  @override
  State<ImagePinStep> createState() => _ImagePinStepState();
}

class _ImagePinStepState extends State<ImagePinStep> {
  ImageService? _imageService;
  late List<ImageWithPins> _images;
  int? _activeIndex;
  bool _isUploading = false;
  int _reservedUploads = 0;

  ImageService get _imagesApi => _imageService ??= ImageService();

  @override
  void initState() {
    super.initState();
    _images = List<ImageWithPins>.from(widget.existingImages);
    if (_images.isNotEmpty) _activeIndex = 0;
  }

  List<ImagePin> _pinsOf(ImageWithPins image) {
    return image.pins
        .map(
          (p) => ImagePin(
            id: p.id,
            relativePosition: Offset(p.relativeX, p.relativeY),
            memo: p.memo,
          ),
        )
        .toList();
  }

  List<PinData> _pinDataOf(List<ImagePin> pins) {
    return pins
        .map(
          (p) => PinData(
            id: p.id,
            relativeX: p.relativePosition.dx,
            relativeY: p.relativePosition.dy,
            memo: p.memo,
          ),
        )
        .toList();
  }

  List<ImageWithPins> _payload() {
    return _images
        .map(
          (img) => img.copyWith(coordSpace: img.coordSpace ?? 'image'),
        )
        .toList();
  }

  void _syncParent() {
    widget.onImagesChanged?.call(_payload());
  }

  void _selectImage(int index) {
    setState(() => _activeIndex = index);
  }

  void _updateActivePins(List<ImagePin> pins) {
    final idx = _activeIndex;
    if (idx == null || idx >= _images.length) return;
    setState(() {
      _images[idx] = _images[idx].copyWith(
        pins: _pinDataOf(pins),
        coordSpace: 'image',
      );
    });
    _syncParent();
  }

  Future<void> _addFromCamera() async {
    await _uploadPicked(
      () async {
        final url = await _imagesApi.pickAndUploadImage(
          source: ImageSource.camera,
          bucket: 'order-images',
          folder: 'repairs',
        );
        return url == null ? const <String>[] : [url];
      },
      reserveCount: 1,
    );
  }

  Future<void> _addFromGallery() async {
    final plan = planOrderImageUpload(
      pickedCount: kMaxOrderImages,
      currentCount: _images.length,
      reservedCount: _reservedUploads,
    );
    if (plan.remainingSlots <= 0) {
      SnackBarUtil.showWarning(
        context,
        message: '사진은 최대 $kMaxOrderImages장까지 첨부할 수 있어요',
      );
      return;
    }
    await _uploadPicked(() async {
      final files = await _imagesApi.pickMultipleImages(
        maxImages: plan.remainingSlots,
      );
      if (files.isEmpty) return const <String>[];
      if (files.length > plan.remainingSlots && mounted) {
        SnackBarUtil.showWarning(
          context,
          message:
              '최대 $kMaxOrderImages장까지만 가능해요 · ${plan.remainingSlots}장만 업로드합니다',
        );
      }
      return _imagesApi.uploadMultipleImages(
        xFiles: files.take(plan.remainingSlots).toList(),
        bucket: 'order-images',
        folder: 'repairs',
      );
    });
  }

  Future<void> _uploadPicked(
    Future<List<String>> Function() pick, {
    int? reserveCount,
  }) async {
    final plan = planOrderImageUpload(
      pickedCount: reserveCount ?? kMaxOrderImages,
      currentCount: _images.length,
      reservedCount: _reservedUploads,
    );
    if (plan.remainingSlots <= 0) {
      if (mounted) {
        SnackBarUtil.showWarning(
          context,
          message: '사진은 최대 $kMaxOrderImages장까지 첨부할 수 있어요',
        );
      }
      return;
    }
    final reserved = reserveCount ?? plan.remainingSlots;

    setState(() {
      _isUploading = true;
      _reservedUploads += reserved;
    });

    var uploaded = <String>[];
    try {
      uploaded = await pick();
      if (!mounted) {
        if (uploaded.isNotEmpty) {
          _imagesApi.deleteOrderImages(uploaded);
        }
        return;
      }
      if (uploaded.isEmpty) return;

      setState(() {
        final start = _images.length;
        _images = [
          ..._images,
          ...uploaded.map(
            (url) => ImageWithPins(
              imageUrl: url,
              coordSpace: 'image',
            ),
          ),
        ];
        _activeIndex ??= start;
      });
      _syncParent();
    } catch (e) {
      if (uploaded.isNotEmpty) {
        _imagesApi.deleteOrderImages(uploaded);
      }
      if (mounted) {
        SnackBarUtil.showError(context, message: '사진 추가 실패: $e');
      }
    } finally {
      _reservedUploads = (_reservedUploads - reserved).clamp(0, kMaxOrderImages);
      if (mounted) {
        setState(() => _isUploading = _reservedUploads > 0);
      }
    }
  }

  void _removeImage(int index) {
    if (index < 0 || index >= _images.length) return;
    final url = _images[index].imageUrl;
    _imagesApi.deleteOrderImages([url]);
    setState(() {
      _images = List<ImageWithPins>.from(_images)..removeAt(index);
      if (_images.isEmpty) {
        _activeIndex = null;
      } else if (_activeIndex == null || _activeIndex! >= _images.length) {
        _activeIndex = _images.length - 1;
      } else if (_activeIndex! > index) {
        _activeIndex = _activeIndex! - 1;
      }
    });
    _syncParent();
  }

  void _showImageSourceSheet() {
    if (_images.length >= kMaxOrderImages) {
      SnackBarUtil.showWarning(
        context,
        message: '사진은 최대 $kMaxOrderImages장까지 첨부할 수 있어요',
      );
      return;
    }
    showModalBottomSheet<void>(
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
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 20),
                child: Text(
                  '사진을 추가해주세요',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(height: 12),
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
                  _addFromCamera();
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
                subtitle: const Text('여러 장도 한 번에 고를 수 있어요', style: TextStyle(fontSize: 13)),
                onTap: () {
                  Navigator.pop(ctx);
                  _addFromGallery();
                },
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  void _handleNext() {
    widget.onComplete(_payload());
  }

  void _handleSkip() {
    widget.onComplete(const []);
  }

  @override
  Widget build(BuildContext context) {
    final active = _activeIndex != null && _activeIndex! < _images.length
        ? _images[_activeIndex!]
        : null;

    return Stack(
      children: [
        Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (widget.clothingType.isNotEmpty)
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
                    '수선할 부위를 사진으로 보여주세요',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '사진 $kMaxOrderImages장, 핀 $kMaxPinsPerImage개까지 (선택사항)',
                    style: TextStyle(fontSize: 13, color: Colors.grey.shade500),
                  ),
                ],
              ),
            ),
            if (_images.isNotEmpty) _buildThumbnails(),
            Expanded(
              child: active == null ? _buildEmptyState() : _buildEditor(active),
            ),
            _buildBottomBar(),
          ],
        ),
        if (_isUploading)
          Container(
            color: Colors.white.withOpacity(0.72),
            child: const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircularProgressIndicator(
                    valueColor: AlwaysStoppedAnimation<Color>(_brandColor),
                  ),
                  SizedBox(height: 16),
                  Text('사진 업로드 중...'),
                ],
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildThumbnails() {
    final canAdd = _images.length < kMaxOrderImages;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
      child: SizedBox(
        height: 76,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          itemCount: _images.length + (canAdd ? 1 : 0),
          separatorBuilder: (_, __) => const SizedBox(width: 8),
          itemBuilder: (context, index) {
            if (index == _images.length) {
              return _AddThumbButton(
                label: '${_images.length}/$kMaxOrderImages',
                onTap: _showImageSourceSheet,
              );
            }
            final img = _images[index];
            final selected = _activeIndex == index;
            return _ImageThumb(
              url: img.imageUrl,
              selected: selected,
              pinCount: img.pins.length,
              onTap: () => _selectImage(index),
              onRemove: () => _removeImage(index),
            );
          },
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: _SourceButton(
                  icon: Icons.camera_alt_rounded,
                  label: '카메라 촬영',
                  color: _brandColor,
                  onTap: _addFromCamera,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _SourceButton(
                  icon: Icons.photo_library_rounded,
                  label: '갤러리 선택',
                  color: Colors.blue,
                  onTap: _addFromGallery,
                ),
              ),
            ],
          ),
          const Spacer(),
        ],
      ),
    );
  }

  Widget _buildEditor(ImageWithPins image) {
    final pins = _pinsOf(image);
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
          child: Row(
            children: [
              Icon(Icons.push_pin_outlined, size: 16, color: Colors.grey.shade600),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  pins.length >= kMaxPinsPerImage
                      ? '핀 $kMaxPinsPerImage개를 모두 사용했어요'
                      : '이미지를 탭해 수선 부위를 표시하세요',
                  style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                ),
              ),
              Text(
                '${pins.length}/$kMaxPinsPerImage',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: pins.length >= kMaxPinsPerImage
                      ? Colors.orange.shade700
                      : _brandColor,
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: Container(
            color: Colors.black,
            child: ImagePinEditor(
              key: ValueKey(image.imageUrl),
              imagePath: image.imageUrl,
              initialPins: pins,
              onPinsChanged: _updateActivePins,
              pinColor: _brandColor,
              maxPins: kMaxPinsPerImage,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildBottomBar() {
    final hasPhotos = _images.isNotEmpty;
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (!hasPhotos)
              SizedBox(
                width: double.infinity,
                height: 52,
                child: OutlinedButton(
                  onPressed: _isUploading ? null : _handleSkip,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.grey.shade700,
                    side: BorderSide(color: Colors.grey.shade300),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text(
                    '사진 없이 건너뛰기',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                ),
              )
            else
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _isUploading ? null : _handleNext,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _brandColor,
                    foregroundColor: Colors.white,
                    disabledBackgroundColor: Colors.grey.shade300,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    elevation: 0,
                  ),
                  child: Text(
                    '사진 ${_images.length}장 첨부 → 다음',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _SourceButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _SourceButton({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
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
}

class _AddThumbButton extends StatelessWidget {
  final String label;
  final VoidCallback onTap;

  const _AddThumbButton({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: 76,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade300, width: 2),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.add_a_photo_outlined, color: Colors.grey.shade500, size: 22),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
            ),
          ],
        ),
      ),
    );
  }
}

class _ImageThumb extends StatelessWidget {
  final String url;
  final bool selected;
  final int pinCount;
  final VoidCallback onTap;
  final VoidCallback onRemove;

  const _ImageThumb({
    required this.url,
    required this.selected,
    required this.pinCount,
    required this.onTap,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Stack(
        children: [
          Container(
            width: 76,
            height: 76,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: selected ? _brandColor : Colors.grey.shade300,
                width: selected ? 2.5 : 1,
              ),
            ),
            clipBehavior: Clip.antiAlias,
            child: CachedNetworkImage(
              imageUrl: url,
              fit: BoxFit.cover,
              errorWidget: (_, __, ___) => const ColoredBox(
                color: Color(0xFFF3F4F6),
                child: Icon(Icons.image_not_supported_outlined),
              ),
            ),
          ),
          if (pinCount > 0)
            Positioned(
              left: 4,
              top: 4,
              child: Container(
                width: 18,
                height: 18,
                decoration: const BoxDecoration(
                  color: _brandColor,
                  shape: BoxShape.circle,
                ),
                alignment: Alignment.center,
                child: Text(
                  '$pinCount',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          Positioned(
            right: 0,
            top: 0,
            child: GestureDetector(
              onTap: onRemove,
              child: Container(
                width: 22,
                height: 22,
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.55),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.close, size: 14, color: Colors.white),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
