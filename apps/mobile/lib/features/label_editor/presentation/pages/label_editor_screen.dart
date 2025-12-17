import 'dart:convert';
import 'package:flutter/material.dart';

import '../../domain/models/label_element_model.dart';
import '../../utils/label_utils.dart';

/// 우체국 C형 송장 WYSIWYG 에디터 화면
class LabelEditorScreen extends StatefulWidget {
  const LabelEditorScreen({super.key});

  @override
  State<LabelEditorScreen> createState() => _LabelEditorScreenState();
}

class _LabelEditorScreenState extends State<LabelEditorScreen> {
  // 캔버스에 배치된 요소들
  final List<LabelElementModel> _elements = [];
  
  // 현재 드래그 중인 요소
  LabelElementModel? _draggingElement;
  Offset? _dragOffset;
  
  // 캔버스 크기
  Size? _canvasSize;
  final GlobalKey _canvasKey = GlobalKey();

  @override
  void initState() {
    super.initState();
  }

  /// 팔레트 버튼 클릭 시 요소 추가
  void _addElement(FieldConfig config) {
    setState(() {
      final newElement = LabelElementModel(
        fieldKey: config.fieldKey,
        label: config.label,
        exampleValue: config.exampleValue,
        x: 50, // 기본 위치
        y: 50,
        width: _estimateWidth(config),
        height: _estimateHeight(config),
        style: config.style,
        type: config.type,
      );
      _elements.add(newElement);
    });
  }

  /// 요소 너비 추정
  double _estimateWidth(FieldConfig config) {
    if (config.type == LabelFieldType.barcode) {
      return 200; // 바코드 기본 너비
    }
    // 텍스트 너비 추정 (대략적)
    return config.exampleValue.length * config.style.fontSize * 0.6;
  }

  /// 요소 높이 추정
  double _estimateHeight(FieldConfig config) {
    if (config.type == LabelFieldType.barcode) {
      return 60; // 바코드 기본 높이
    }
    return config.style.fontSize * 1.5;
  }

  /// 드래그 시작
  void _onPanStart(DragStartDetails details, LabelElementModel element) {
    setState(() {
      _draggingElement = element;
      final renderBox = _canvasKey.currentContext?.findRenderObject() as RenderBox?;
      if (renderBox != null) {
        final localPosition = renderBox.globalToLocal(details.globalPosition);
        _dragOffset = Offset(
          localPosition.dx - element.x,
          localPosition.dy - element.y,
        );
      }
    });
  }

  /// 드래그 업데이트
  void _onPanUpdate(DragUpdateDetails details) {
    if (_draggingElement == null || _dragOffset == null) return;

    final renderBox = _canvasKey.currentContext?.findRenderObject() as RenderBox?;
    if (renderBox == null) return;

    final localPosition = renderBox.globalToLocal(details.globalPosition);
    final newX = (localPosition.dx - _dragOffset!.dx).clamp(0.0, renderBox.size.width - _draggingElement!.width);
    final newY = (localPosition.dy - _dragOffset!.dy).clamp(0.0, renderBox.size.height - _draggingElement!.height);

    setState(() {
      final index = _elements.indexWhere((e) => e.fieldKey == _draggingElement!.fieldKey && 
                                                  e.x == _draggingElement!.x && 
                                                  e.y == _draggingElement!.y,);
      if (index != -1) {
        _elements[index] = _elements[index].copyWith(x: newX, y: newY);
        _draggingElement = _elements[index];
      }
    });
  }

  /// 드래그 종료
  void _onPanEnd(DragEndDetails details) {
    setState(() {
      _draggingElement = null;
      _dragOffset = null;
    });
  }

  /// 요소 삭제 (길게 누르기)
  void _deleteElement(LabelElementModel element) {
    setState(() {
      _elements.removeWhere((e) => 
        e.fieldKey == element.fieldKey && 
        e.x == element.x && 
        e.y == element.y,
      );
    });
  }

  /// 저장 버튼 클릭
  void _saveLayout() {
    if (_canvasSize == null) return;
    
    // 요소들을 mm 단위로 변환하여 JSON 생성
    final layoutData = _elements.map((element) {
      final xMm = LabelUtils.canvasToLabelMm(element.x, _canvasSize!.width);
      final yMm = LabelUtils.canvasToLabelMm(element.y, _canvasSize!.width);
      final widthMm = LabelUtils.canvasToLabelMm(element.width, _canvasSize!.width);
      final heightMm = LabelUtils.canvasToLabelMm(element.height, _canvasSize!.width);

      return {
        'fieldKey': element.fieldKey,
        'x': xMm,
        'y': yMm,
        'width': widthMm,
        'height': heightMm,
        'style': element.style.toJson(),
        'type': element.type.name,
        // 실제 PDF 생성 시에는 exampleValue 대신 DB에서 넘어온 실제 데이터가 들어가야 함
        // 예: data[element.fieldKey] 또는 orderData[element.fieldKey]
      };
    }).toList();

    final jsonString = const JsonEncoder.withIndent('  ').convert(layoutData);
    print('📋 저장된 레이아웃 데이터 (mm 단위):');
    print(jsonString);
    
    // 실제로는 여기서 서버에 저장하거나 로컬 저장소에 저장
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('레이아웃이 저장되었습니다. 콘솔을 확인하세요.'),
        duration: Duration(seconds: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('우체국 송장 레이아웃 에디터'),
        actions: [
          IconButton(
            icon: const Icon(Icons.save),
            onPressed: _saveLayout,
            tooltip: '저장',
          ),
        ],
      ),
      body: LayoutBuilder(
        builder: (context, constraints) {
          // 캔버스 크기 계산
          _canvasSize ??= LabelUtils.calculateCanvasSize(constraints.maxWidth);
          
          return Column(
            children: [
              // 캔버스 영역
              Expanded(
                child: Center(
                  child: Container(
                    key: _canvasKey,
                    width: _canvasSize!.width,
                    height: _canvasSize!.height,
                    decoration: BoxDecoration(
                      color: Colors.grey[200], // 회색 배경
                      border: Border.all(color: Colors.grey[400]!),
                    ),
                    child: Stack(
                      children: [
                        // 실제 송장 영역 (흰색)
                        Positioned.fill(
                          child: Container(
                            margin: EdgeInsets.all(LabelUtils.mmToPx(5)), // 5mm 여백
                            color: Colors.white,
                            child: Stack(
                              children: _elements.map((element) {
                                return _buildElement(element);
                              }).toList(),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              
              // 팔레트 영역
              Container(
                height: 120,
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  border: Border(top: BorderSide(color: Colors.grey[300]!)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(8.0),
                      child: Text(
                        '필드 추가',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey[700],
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    Expanded(
                      child: ListView(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        children: FieldConfig.getDefaultFields().map((config) {
                          return Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: _buildPaletteButton(config),
                          );
                        }).toList(),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  /// 팔레트 버튼 빌드
  Widget _buildPaletteButton(FieldConfig config) {
    return GestureDetector(
      onTap: () => _addElement(config),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Colors.grey[300]!),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.1),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (config.type == LabelFieldType.barcode)
              Icon(Icons.qr_code_scanner, size: 20, color: Colors.grey[700])
            else
              Icon(Icons.text_fields, size: 20, color: Colors.grey[700]),
            const SizedBox(height: 4),
            Text(
              config.label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: Colors.grey[800],
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// 캔버스 요소 빌드
  Widget _buildElement(LabelElementModel element) {
    final isDragging = _draggingElement?.fieldKey == element.fieldKey &&
                       _draggingElement?.x == element.x &&
                       _draggingElement?.y == element.y;

    Widget content;
    
    if (element.type == LabelFieldType.barcode) {
      // 바코드 위젯 (실제 바코드 라이브러리 사용 시 교체 필요)
      // 예: barcode_widget 패키지 사용 시
      // content = BarcodeWidget(
      //   barcode: Barcode.code128(),
      //   data: element.exampleValue,
      //   width: element.width,
      //   height: element.height,
      //   color: Colors.black,
      // );
      
      // 임시: 바코드 시각화 (실제 바코드 이미지로 교체 필요)
      // 실제 바코드 라이브러리 사용 시: barcode_widget 또는 qr_flutter 패키지 사용
      content = Container(
        width: element.width,
        height: element.height,
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: Colors.black, width: 1),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // 바코드 패턴 시각화 (임시)
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(20, (index) {
                final width = (index % 3 == 0) ? 2.0 : 1.0;
                return Container(
                  width: width,
                  height: element.height * 0.6,
                  color: Colors.black,
                  margin: const EdgeInsets.symmetric(horizontal: 0.5),
                );
              }),
            ),
            const SizedBox(height: 4),
            Text(
              element.exampleValue,
              style: TextStyle(
                fontSize: element.style.fontSize * 0.6,
                color: Colors.black,
              ),
            ),
          ],
        ),
      );
    } else {
      // 텍스트 위젯
      content = Text(
        element.exampleValue, // 예시 값 표시
        style: TextStyle(
          fontSize: element.style.fontSize,
          fontWeight: element.style.isBold ? FontWeight.bold : FontWeight.normal,
          color: Colors.black,
        ),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      );
    }

    // 집배코드는 테두리 추가
    if (element.style.borderColor != null) {
      content = Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          border: Border.all(
            color: Color(int.parse(element.style.borderColor!.replaceFirst('#', '0xFF'))),
            width: 2,
          ),
        ),
        child: content,
      );
    }

    return Positioned(
      left: element.x,
      top: element.y,
      width: element.width,
      height: element.height,
      child: GestureDetector(
        onPanStart: (details) => _onPanStart(details, element),
        onPanUpdate: _onPanUpdate,
        onPanEnd: _onPanEnd,
        onLongPress: () => _deleteElement(element),
        child: Opacity(
          opacity: isDragging ? 0.7 : 1.0,
          child: Container(
            decoration: BoxDecoration(
              color: Colors.transparent,
              border: isDragging 
                ? Border.all(color: Colors.blue, width: 2, style: BorderStyle.solid)
                : null,
            ),
            child: content,
          ),
        ),
      ),
    );
  }
}

