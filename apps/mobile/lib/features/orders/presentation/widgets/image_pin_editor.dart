import 'dart:io';

import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../domain/models/image_pin.dart';
import 'pin_marker.dart';
import 'pin_memo_bottom_sheet.dart';

/// 이미지 핀 에디터 위젯
/// 이미지 위에 핀을 추가하고 메모를 달 수 있는 기능 제공
class ImagePinEditor extends StatefulWidget {
  /// 이미지 경로 (URL 또는 로컬 파일 경로)
  final String imagePath;
  
  /// 초기 핀 리스트
  final List<ImagePin> initialPins;
  
  /// 핀 변경 콜백
  final Function(List<ImagePin> pins)? onPinsChanged;
  
  /// 핀 색상
  final Color pinColor;
  
  /// 최대 핀 개수 (null이면 제한 없음)
  final int? maxPins;

  const ImagePinEditor({
    required this.imagePath, super.key,
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
  String? _draggingPinId; // 드래그 중인 핀
  Size? _baseCanvasSize; // 최초 탭 시의 캔버스 크기(안정된 기준)
  bool _isBaseCanvasSizeInitialized = false; // 초기화 완료 플래그

  @override
  void initState() {
    super.initState();
    _pins = List.from(widget.initialPins);
  }

  @override
  void didUpdateWidget(ImagePinEditor oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.imagePath != widget.imagePath) {
      setState(() {
        _pins = List.from(widget.initialPins);
        _selectedPinId = null;
        _baseCanvasSize = null; // 이미지 변경 시 기준 리셋
        _isBaseCanvasSizeInitialized = false; // 초기화 플래그도 리셋
      });
    }
  }

  /// 이미지 탭 시 핀 추가
  void _handleImageTap(TapDownDetails details, BoxConstraints constraints) {
    // 최대 핀 개수 체크
    if (widget.maxPins != null && _pins.length >= widget.maxPins!) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('최대 ${widget.maxPins}개까지 핀을 추가할 수 있습니다.'),
          duration: const Duration(seconds: 2),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    // 상대 좌표로 변환 (0.0 ~ 1.0) - 현재 탭 시점의 constraints 기준
    // _baseCanvasSize를 사용하지 않고 현재 constraints 기준으로 상대 좌표 계산
    // 왜냐하면 탭 이벤트(details.localPosition)는 현재 화면 크기 기준이기 때문
    final currentWidth = constraints.maxWidth;
    final currentHeight = constraints.maxHeight;
    
    final relativePosition = Offset(
      (details.localPosition.dx / currentWidth).clamp(0.0, 1.0),
      (details.localPosition.dy / currentHeight).clamp(0.0, 1.0),
    );

    // 최초 탭 시의 캔버스 크기 고정 (이후 렌더링 시 사용)
    if (_baseCanvasSize == null) {
      _baseCanvasSize = Size(currentWidth, currentHeight);
      _isBaseCanvasSizeInitialized = true;
    }

    print('📍 Pin added at: ${details.localPosition} -> relative: $relativePosition');

    // 임시 핀 추가 - 즉시 추가하여 위치 고정
    final newPin = ImagePin(
      relativePosition: relativePosition,
      memo: '', 
    );
    
    setState(() {
      _pins.add(newPin);
    });

    // 약간의 지연 후 메모 입력창 표시 (핀은 이미 추가됨)
    Future.delayed(const Duration(milliseconds: 100), () {
      if (mounted) {
        _showMemoInput(pin: newPin);
      }
    });
  }

  /// 핀 탭 시 메모 수정
  void _handlePinTap(ImagePin pin) {
    setState(() {
      _selectedPinId = pin.id;
    });

    _showMemoInput(pin: pin);
  }

  /// 메모 입력 바텀시트 표시
  Future<void> _showMemoInput({
    ImagePin? pin,
  }) async {
    final result = await PinMemoBottomSheet.showMemoBottomSheet(
      context,
      initialMemo: pin?.memo,
      onDelete: pin != null ? () => _handlePinDelete(pin) : null,
    );

    if (result != null) {
      if (result['action'] == 'save') {
        final memo = result['memo'] as String;
        // 메모 저장 시 핀 위치는 변경하지 않고 메모만 업데이트
        // 즉시 업데이트하여 위치 변경 방지
        if (mounted) {
          setState(() {
            if (pin != null) {
              // 기존 핀에 메모 추가/수정 (위치는 그대로 유지)
              final index = _pins.indexWhere((p) => p.id == pin.id);
              if (index != -1) {
                // relativePosition은 변경하지 않고 memo만 업데이트
                _pins[index] = _pins[index].copyWith(memo: memo);
                print('📝 Memo saved for pin ${pin.id}: "$memo"');
              }
            }
            _selectedPinId = null;
          });

          widget.onPinsChanged?.call(_pins);
        }
      }
      // 삭제는 onDelete 콜백에서 처리됨
    } else {
      // 취소된 경우: 핀은 유지하되 선택 상태만 해제
      // 메모가 없는 핀도 표시되도록 유지 (사용자가 나중에 메모를 추가할 수 있음)
      if (mounted) {
        setState(() {
          _selectedPinId = null;
        });
      }
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

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('핀이 삭제되었습니다.'),
        duration: Duration(seconds: 2),
      ),
    );
  }

  /// 핀 드래그 시작
  void _handlePinDragStart(ImagePin pin) {
    setState(() {
      _draggingPinId = pin.id;
      _selectedPinId = null;
    });
  }

  /// 핀 드래그 업데이트
  void _handlePinDragUpdate(
    ImagePin pin,
    DragUpdateDetails details,
    BoxConstraints constraints,
  ) {
    final baseWidth = _baseCanvasSize?.width ?? constraints.maxWidth;
    final baseHeight = _baseCanvasSize?.height ?? constraints.maxHeight;

    setState(() {
      final index = _pins.indexWhere((p) => p.id == pin.id);
      if (index != -1) {
        final currentPosition = _pins[index].relativePosition;
        
        // 상대 좌표로 변환하여 업데이트
        final newRelativePosition = Offset(
          (currentPosition.dx * baseWidth + details.delta.dx) / baseWidth,
          (currentPosition.dy * baseHeight + details.delta.dy) / baseHeight,
        );

        // 이미지 경계 내로 제한
        final clampedPosition = Offset(
          newRelativePosition.dx.clamp(0.0, 1.0),
          newRelativePosition.dy.clamp(0.0, 1.0),
        );

        _pins[index] = pin.copyWith(relativePosition: clampedPosition);
      }
    });
  }

  /// 핀 드래그 종료
  void _handlePinDragEnd(ImagePin pin) {
    setState(() {
      _draggingPinId = null;
    });
    widget.onPinsChanged?.call(_pins);
    
    // 드래그 완료 피드백
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('핀 위치가 변경되었습니다'),
        duration: Duration(seconds: 1),
        backgroundColor: Color(0xFF00C896),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        // 레이아웃이 처음 계산될 때 _baseCanvasSize 설정 (한 번만 설정)
        if (!_isBaseCanvasSizeInitialized && constraints.maxWidth > 0 && constraints.maxHeight > 0) {
          _baseCanvasSize = Size(constraints.maxWidth, constraints.maxHeight);
          _isBaseCanvasSizeInitialized = true;
          // 디버그 로그
          print('🖼️ Base canvas size initialized: $_baseCanvasSize');
        }
        
        return Stack(
          children: [
            // 이미지 (탭 감지용) - 실제 이미지 크기를 측정하기 위해 GlobalKey 사용
            GestureDetector(
              onTapDown: (details) => _handleImageTap(details, constraints),
              child: _buildImage(),
            ),
            
            // 핀들 (녹색으로 표시) - 이미지 위에 배치되어 탭 차단
            ..._pins.map((pin) => _buildPin(pin, constraints)),
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
        fit: BoxFit.contain,
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
        fit: BoxFit.contain,
        errorBuilder: (context, error, stackTrace) => const Center(
          child: Icon(Icons.error, size: 50, color: Colors.red),
        ),
      );
    }
  }

  /// 핀 빌드
  Widget _buildPin(ImagePin pin, BoxConstraints constraints) {
    final isSelected = _selectedPinId == pin.id;
    final isDragging = _draggingPinId == pin.id;

    // _baseCanvasSize가 설정되지 않은 경우 현재 constraints 사용
    // 주의: 핀을 렌더링할 때는 항상 현재 화면 크기(constraints)를 기준으로 해야 함
    // _baseCanvasSize는 핀을 처음 찍을 때 상대 좌표를 계산하기 위한 기준일 뿐,
    // 화면 크기가 변하면(예: 키보드/바텀시트로 인해) 핀도 그 비율에 맞춰 이동해야 함
    final currentWidth = constraints.maxWidth;
    final currentHeight = constraints.maxHeight;

    // 디버그: 핀 위치 계산 로깅
    if (isSelected) {
      print('📍 Pin ${pin.id} position calculation: relative=${pin.relativePosition}, currentSize=${Size(currentWidth, currentHeight)}');
    }

    // 핀의 실제 크기 (PinMarker의 최대 크기 + 여유 공간)
    // PinMarker: 최대 32px (선택 시 외곽 링) + 라벨 높이
    // 드래그 영역: 80x80
    const pinSize = 40.0; // 핀 중심점에서의 오프셋 (드래그 영역의 절반)
    const dragAreaSize = 80.0; // 드래그 영역 크기
    
    // 상대 위치를 절대 위치로 변환 (핀 중심점 기준)
    // relativePosition은 0.0~1.0 범위이므로 현재 화면 크기에 비례하여 계산
    final pinLeft = pin.relativePosition.dx * currentWidth;
    final pinTop = pin.relativePosition.dy * currentHeight;
    
    // Positioned의 left/top는 왼쪽 상단 모서리 기준이므로, 핀 중심점에서 오프셋을 빼야 함
    final positionedLeft = pinLeft - pinSize;
    final positionedTop = pinTop - pinSize;
    
    // 경계 체크: 드래그 영역이 이미지 밖으로 나가지 않도록
    final clampedLeft = positionedLeft.clamp(0.0, currentWidth - dragAreaSize);
    final clampedTop = positionedTop.clamp(0.0, currentHeight - dragAreaSize);

    return Positioned(
      left: clampedLeft,
      top: clampedTop,
      child: GestureDetector(
        // 드래그 영역 확대 (더 쉽게 잡힘)
        behavior: HitTestBehavior.translucent, // 투명하지만 제스처 감지
        onPanStart: (_) => _handlePinDragStart(pin),
        onPanUpdate: (details) =>
            _handlePinDragUpdate(pin, details, constraints),
        onPanEnd: (_) => _handlePinDragEnd(pin),
        // 탭은 PinMarker에서 처리 (드래그와 분리)
        child: Container(
          width: 80, // 드래그 영역 80x80으로 확대
          height: 80,
          alignment: Alignment.center, // 핀을 중앙에 배치
          // 디버그용: 드래그 영역 시각화 (주석 해제하면 확인 가능)
          // decoration: BoxDecoration(
          //   border: Border.all(color: Colors.blue.withOpacity(0.3)),
          // ),
          child: AnimatedScale(
            scale: isDragging ? 1.4 : 1.0, // 드래그 중 더 크게
            duration: const Duration(milliseconds: 100),
            child: PinMarker(
              label: pin.memo,
              onTap: () {
                // 탭 시 레이아웃 재계산을 방지하기 위해 약간의 지연 추가
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  _handlePinTap(pin);
                });
              },
              onDelete: () => _handlePinDelete(pin),
              color: const Color(0xFF00C896), // 녹색 (메인 컬러)
              isSelected: isSelected,
            ),
          ),
        ),
      ),
    );
  }
}

