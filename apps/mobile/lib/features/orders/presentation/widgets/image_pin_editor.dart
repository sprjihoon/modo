import 'dart:io';

import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../domain/models/image_pin.dart';
import 'pin_marker.dart';
import 'pin_memo_bottom_sheet.dart';
import '../../../../../core/utils/snackbar_util.dart';

/// 이미지 핀 에디터 위젯
/// 이미지 위에 핀을 추가하고, 드래그로 이동하고, 메모를 달 수 있는 기능 제공
class ImagePinEditor extends StatefulWidget {
  final String imagePath;
  final List<ImagePin> initialPins;
  final Function(List<ImagePin> pins)? onPinsChanged;
  final Color pinColor;
  final int? maxPins;

  const ImagePinEditor({
    required this.imagePath,
    super.key,
    this.initialPins = const [],
    this.onPinsChanged,
    this.pinColor = Colors.red,
    this.maxPins,
  });

  @override
  State<ImagePinEditor> createState() => _ImagePinEditorState();
}

class _ImagePinEditorState extends State<ImagePinEditor> {
  late List<ImagePin> _pins;
  String? _selectedPinId;
  String? _draggingPinId; // 현재 드래그 중인 핀
  
  // 이미지 크기
  Size? _imageSize;
  
  // 초기 constraints 저장 (바텀시트가 열려도 일관된 계산 위해)
  BoxConstraints? _initialConstraints;
  
  // 바텀시트 표시 상태
  bool _isBottomSheetShowing = false;
  
  // 더블탭 방지
  DateTime? _lastPinAddTime;
  
  // 드래그 감지 (탭과 구분하기 위함)
  Offset? _dragStartPosition;
  static const double _minDragDistance = 5.0;

  @override
  void initState() {
    super.initState();
    _pins = List.from(widget.initialPins);
    _resolveImageSize();
  }

  @override
  void didUpdateWidget(ImagePinEditor oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.imagePath != widget.imagePath) {
      setState(() {
        _pins = List.from(widget.initialPins);
        _selectedPinId = null;
        _imageSize = null;
        _initialConstraints = null; // 이미지 변경 시 constraints도 리셋
      });
      _resolveImageSize();
    }
  }

  @override
  void dispose() {
    super.dispose();
  }

  /// 이미지 크기 해상
  void _resolveImageSize() {
    final ImageProvider imageProvider;
    if (widget.imagePath.startsWith('http')) {
      imageProvider = CachedNetworkImageProvider(widget.imagePath);
    } else {
      imageProvider = FileImage(File(widget.imagePath));
    }

    final imageStream = imageProvider.resolve(const ImageConfiguration());
    imageStream.addListener(
      ImageStreamListener(
        (ImageInfo info, bool synchronousCall) {
          if (mounted) {
            setState(() {
              _imageSize = Size(
                info.image.width.toDouble(),
                info.image.height.toDouble(),
              );
            });
          }
        },
        onError: (exception, stackTrace) {
          debugPrint('❌ Failed to resolve image size: $exception');
        },
      ),
    );
  }

  /// 이미지 탭 - 핀 추가
  void _handleImageTap(TapDownDetails details, BoxConstraints constraints) {
    if (_imageSize == null) return;
    
    // 바텀시트가 열려있으면 무시 (사용자가 메모 입력 중)
    if (_isBottomSheetShowing) {
      debugPrint('⏸️ 바텀시트 열려있어 무시됨');
      return;
    }
    
    // 더블탭 방지: 마지막 핀 추가 후 200ms 이내 탭 무시
    final now = DateTime.now();
    if (_lastPinAddTime != null && 
        now.difference(_lastPinAddTime!) < const Duration(milliseconds: 200)) {
      debugPrint('⏱️ 더블탭 방지: 무시됨');
      return;
    }

    // 최대 핀 개수 체크
    if (widget.maxPins != null && _pins.length >= widget.maxPins!) {
      SnackBarUtil.showWarning(
        context,
        message: '최대 ${widget.maxPins}개까지 핀을 추가할 수 있습니다.',
      );
      return;
    }

    // 실제 이미지가 그려지는 영역 계산 (BoxFit.cover)
    final FittedSizes sizes = applyBoxFit(
      BoxFit.cover,
      _imageSize!,
      constraints.biggest,
    );
    
    final dstSize = sizes.destination;
    final dx = (constraints.maxWidth - dstSize.width) / 2;
    final dy = (constraints.maxHeight - dstSize.height) / 2;
    
    // 탭 위치를 상대 좌표로 변환
    final relativeX = (details.localPosition.dx - dx) / dstSize.width;
    final relativeY = (details.localPosition.dy - dy) / dstSize.height;
    
    // 범위를 0.0 ~ 1.0 으로 제한 (BoxFit.cover는 모든 영역이 이미지)
    final clampedX = relativeX.clamp(0.0, 1.0);
    final clampedY = relativeY.clamp(0.0, 1.0);
    
    debugPrint('📍 탭: (${details.localPosition.dx.toInt()}, ${details.localPosition.dy.toInt()}) → (${clampedX.toStringAsFixed(2)}, ${clampedY.toStringAsFixed(2)})');

    final newPin = ImagePin(
      relativePosition: Offset(clampedX, clampedY),
      memo: '',
    );

    setState(() {
      _pins.add(newPin);
      _lastPinAddTime = now; // 핀 추가 시각 기록 (실제 추가된 경우에만)
    });
    
    debugPrint('📍 핀 추가됨: ${newPin.id}');

    // 즉시 메모 입력 바텀시트 표시
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && !_isBottomSheetShowing) {
        _showMemoInput(pin: newPin);
      }
    });
  }

  /// 핀 탭 - 메모 수정
  void _handlePinTap(ImagePin pin) {
    if (_isBottomSheetShowing) return;
    
    setState(() {
      _selectedPinId = pin.id;
    });
    
    debugPrint('🎯 핀 탭됨: ${pin.id}');
    _showMemoInput(pin: pin);
  }

  /// 핀 드래그 시작
  void _handlePinDragStart(ImagePin pin, DragStartDetails details) {
    setState(() {
      _draggingPinId = pin.id;
      _dragStartPosition = details.globalPosition;
      _selectedPinId = null; // 드래그 중에는 선택 해제
    });
    debugPrint('🖐️ 드래그 시작: ${pin.id}');
  }

  /// 핀 드래그 업데이트
  void _handlePinDragUpdate(
    ImagePin pin,
    DragUpdateDetails details,
    BoxConstraints constraints,
  ) {
    if (_imageSize == null || _draggingPinId != pin.id) return;

    // 실제 이미지가 그려지는 영역 계산
    final FittedSizes sizes = applyBoxFit(
      BoxFit.cover,
      _imageSize!,
      constraints.biggest,
    );
    
    final dstSize = sizes.destination;

    setState(() {
      final index = _pins.indexWhere((p) => p.id == pin.id);
      if (index != -1) {
        final currentRelativePos = _pins[index].relativePosition;
        
        // delta를 상대 좌표로 변환
        final deltaX = details.delta.dx / dstSize.width;
        final deltaY = details.delta.dy / dstSize.height;
        
        // 새 상대 좌표 계산 및 경계 제한
        final newRelativeX = (currentRelativePos.dx + deltaX).clamp(0.0, 1.0);
        final newRelativeY = (currentRelativePos.dy + deltaY).clamp(0.0, 1.0);
        
        _pins[index] = pin.copyWith(
          relativePosition: Offset(newRelativeX, newRelativeY),
        );
      }
    });
  }

  /// 핀 드래그 종료
  void _handlePinDragEnd(ImagePin pin, DragEndDetails details) {
    // 최소 드래그 거리 확인 (탭과 구분)
    bool wasDragging = false;
    
    if (_dragStartPosition != null && _draggingPinId != null) {
      // 실제 이동 거리 계산
      final distance = (details.globalPosition - _dragStartPosition!).distance;
      wasDragging = distance >= _minDragDistance;
      
      if (wasDragging) {
        debugPrint('📏 드래그 거리: ${distance.toStringAsFixed(1)}px');
      } else {
        debugPrint('📏 드래그 거리 부족: ${distance.toStringAsFixed(1)}px < ${_minDragDistance}px');
      }
    }

    setState(() {
      _draggingPinId = null;
      _dragStartPosition = null;
    });

    if (wasDragging) {
      debugPrint('✅ 드래그 완료: ${pin.id}');
      widget.onPinsChanged?.call(_pins);
      
      SnackBarUtil.showSuccess(
        context,
        message: '핀 위치가 변경되었습니다',
        duration: const Duration(seconds: 1),
      );
    } else {
      // 드래그가 아니었으면 탭으로 처리
      debugPrint('🎯 탭으로 감지됨: ${pin.id}');
      _handlePinTap(pin);
    }
  }

  /// 핀 삭제
  void _handlePinDelete(ImagePin pin) {
    setState(() {
      _pins.removeWhere((p) => p.id == pin.id);
      if (_selectedPinId == pin.id) {
        _selectedPinId = null;
      }
    });
    
    widget.onPinsChanged?.call(_pins);
    
    debugPrint('🗑️ 핀 삭제됨: ${pin.id}');
    
    SnackBarUtil.show(
      context,
      message: '핀이 삭제되었습니다.',
      duration: const Duration(seconds: 2),
    );
  }

  /// 메모 입력 바텀시트 표시
  Future<void> _showMemoInput({ImagePin? pin}) async {
    if (!mounted || _isBottomSheetShowing) return;
    
    setState(() => _isBottomSheetShowing = true);
    
    debugPrint('📱 메모 바텀시트 표시: ${pin?.id}');

    final result = await PinMemoBottomSheet.showMemoBottomSheet(
      context,
      initialMemo: pin?.memo,
      onDelete: pin != null ? () => _handlePinDelete(pin) : null,
    );

    if (!mounted) return;
    
    setState(() => _isBottomSheetShowing = false);

    if (result != null && result['action'] == 'save' && pin != null) {
      setState(() {
        final index = _pins.indexWhere((p) => p.id == pin.id);
        if (index != -1) {
          _pins[index] = _pins[index].copyWith(memo: result['memo']);
        }
        _selectedPinId = null;
      });
      widget.onPinsChanged?.call(_pins);
      debugPrint('💾 메모 저장됨: ${pin.id}');
    } else {
      setState(() => _selectedPinId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        // 초기 constraints 저장 (바텀시트가 열려도 핀 위치 고정)
        _initialConstraints ??= constraints;
        
        if (_imageSize == null) {
          return Stack(
            children: [
              _buildImage(),
              const Center(child: CircularProgressIndicator()),
            ],
          );
        }

        // 핀 렌더링은 항상 초기 constraints 사용
        final renderConstraints = _initialConstraints!;

        return Stack(
          children: [
            // 이미지
            _buildImage(),
            
            // 탭 감지 레이어 (투명, 전체 영역)
            Positioned.fill(
              child: GestureDetector(
                behavior: HitTestBehavior.translucent,
                onTapDown: (details) => _handleImageTap(details, renderConstraints),
                child: Container(
                  color: Colors.transparent,
                ),
              ),
            ),
            
            // 핀들 (제일 위에 배치)
            ..._pins.map((pin) => _buildPin(pin, renderConstraints)),
          ],
        );
      },
    );
  }

  /// 이미지 빌드
  Widget _buildImage() {
    final isUrl = widget.imagePath.startsWith('http://') ||
        widget.imagePath.startsWith('https://');

    if (isUrl) {
      return CachedNetworkImage(
        imageUrl: widget.imagePath,
        fit: BoxFit.cover, // contain → cover로 변경 (화면 가득 채우기)
        width: double.infinity,
        height: double.infinity,
        placeholder: (context, url) => const Center(
          child: CircularProgressIndicator(),
        ),
        errorWidget: (context, url, error) => const Center(
          child: Icon(Icons.error, size: 50, color: Colors.red),
        ),
      );
    } else {
      return Image.file(
        File(widget.imagePath),
        fit: BoxFit.cover, // contain → cover로 변경 (화면 가득 채우기)
        width: double.infinity,
        height: double.infinity,
        errorBuilder: (context, error, stackTrace) => const Center(
          child: Icon(Icons.error, size: 50, color: Colors.red),
        ),
      );
    }
  }

  /// 핀 빌드
  Widget _buildPin(ImagePin pin, BoxConstraints constraints) {
    if (_imageSize == null) return const SizedBox.shrink();

    // 실제 이미지가 그려지는 영역 계산
    final FittedSizes sizes = applyBoxFit(
      BoxFit.cover,
      _imageSize!,
      constraints.biggest,
    );
    
    final dstSize = sizes.destination;
    final dx = (constraints.maxWidth - dstSize.width) / 2;
    final dy = (constraints.maxHeight - dstSize.height) / 2;

    // 상대 좌표를 절대 좌표로 변환
    final absoluteX = dx + pin.relativePosition.dx * dstSize.width;
    final absoluteY = dy + pin.relativePosition.dy * dstSize.height;

    final isSelected = _selectedPinId == pin.id;
    final isDragging = _draggingPinId == pin.id;
    const pinSize = 40.0;

    return Positioned(
      left: absoluteX - pinSize,
      top: absoluteY - pinSize,
      child: GestureDetector(
        behavior: HitTestBehavior.translucent,
        onPanStart: (details) => _handlePinDragStart(pin, details),
        onPanUpdate: (details) => _handlePinDragUpdate(pin, details, constraints),
        onPanEnd: (details) => _handlePinDragEnd(pin, details),
        child: Container(
          width: 80,
          height: 80,
          alignment: Alignment.center,
          child: AnimatedScale(
            scale: isDragging ? 1.3 : 1.0,
            duration: const Duration(milliseconds: 150),
            child: PinMarker(
              label: pin.memo,
              onTap: () => _handlePinTap(pin),
              onDelete: () => _handlePinDelete(pin),
              color: widget.pinColor,
              isSelected: isSelected,
            ),
          ),
        ),
      ),
    );
  }
}
