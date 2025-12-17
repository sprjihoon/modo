/// 라벨 유틸리티 함수
class LabelUtils {
  /// 우체국 C형 송장 규격 (mm)
  static const double labelWidthMm = 111.0; // 가로
  static const double labelHeightMm = 171.0; // 세로

  /// DPI (인치당 픽셀 수) - 일반적인 화면 DPI
  static const double dpi = 96.0;

  /// mm를 픽셀로 변환
  /// 1인치 = 25.4mm, 1인치 = dpi 픽셀
  /// 따라서 1mm = dpi / 25.4 픽셀
  static double mmToPx(double mm) {
    return mm * (dpi / 25.4);
  }

  /// 픽셀을 mm로 변환
  static double pxToMm(double px) {
    return px * (25.4 / dpi);
  }

  /// 캔버스 크기 계산 (화면에 맞게 스케일 조정)
  /// 화면 너비에 맞춰서 비율 유지하며 크기 조정
  static Size calculateCanvasSize(double screenWidth) {
    // 화면 여백 고려 (좌우 20px씩)
    final availableWidth = screenWidth - 40;
    
    // 송장 비율 계산 (111:171)
    const aspectRatio = labelWidthMm / labelHeightMm;
    
    // 가로에 맞춰서 높이 계산
    final canvasWidth = availableWidth;
    final canvasHeight = canvasWidth / aspectRatio;
    
    return Size(canvasWidth, canvasHeight);
  }

  /// 실제 송장 크기(mm)를 캔버스 크기(px)로 변환하는 스케일 팩터
  static double getScaleFactor(double canvasWidthPx) {
    final labelWidthPx = mmToPx(labelWidthMm);
    return canvasWidthPx / labelWidthPx;
  }

  /// 캔버스 좌표를 실제 송장 좌표(mm)로 변환
  static double canvasToLabelMm(double canvasPx, double canvasWidthPx) {
    final scaleFactor = getScaleFactor(canvasWidthPx);
    final labelPx = canvasPx / scaleFactor;
    return pxToMm(labelPx);
  }

  /// 실제 송장 좌표(mm)를 캔버스 좌표(px)로 변환
  static double labelMmToCanvas(double labelMm, double canvasWidthPx) {
    final labelPx = mmToPx(labelMm);
    final scaleFactor = getScaleFactor(canvasWidthPx);
    return labelPx * scaleFactor;
  }
}

/// Size 클래스 (Flutter의 Size와 동일)
class Size {
  final double width;
  final double height;

  const Size(this.width, this.height);
}

