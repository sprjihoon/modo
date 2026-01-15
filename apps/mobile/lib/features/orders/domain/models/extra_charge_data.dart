/// 추가 과금 상세 데이터 모델
class ExtraChargeData {
  /// 현장 상황 메모 (작업자 또는 관리자가 작성)
  final String? workerMemo;
  
  /// 추가 청구 금액 (관리자가 입력)
  final int? managerPrice;
  
  /// 고객에게 보여질 안내 멘트
  final String? managerNote;
  
  /// 요청 시각
  final DateTime? requestedAt;
  
  /// 승인 시각
  final DateTime? approvedAt;
  
  /// 완료 시각
  final DateTime? completedAt;
  
  /// 요청자 ID
  final String? requestedBy;
  
  /// 승인자 ID
  final String? approvedBy;
  
  /// 고객의 액션 ('PAY', 'SKIP', 'RETURN')
  final String? customerAction;
  
  /// 반송 배송비 (기본 6,000원)
  final int? returnFee;

  const ExtraChargeData({
    this.workerMemo,
    this.managerPrice,
    this.managerNote,
    this.requestedAt,
    this.approvedAt,
    this.completedAt,
    this.requestedBy,
    this.approvedBy,
    this.customerAction,
    this.returnFee,
  });

  /// JSON에서 ExtraChargeData 생성
  factory ExtraChargeData.fromJson(Map<String, dynamic> json) {
    return ExtraChargeData(
      workerMemo: json['workerMemo'] as String?,
      managerPrice: json['managerPrice'] as int?,
      managerNote: json['managerNote'] as String?,
      requestedAt: json['requestedAt'] != null
          ? DateTime.parse(json['requestedAt'] as String)
          : null,
      approvedAt: json['approvedAt'] != null
          ? DateTime.parse(json['approvedAt'] as String)
          : null,
      completedAt: json['completedAt'] != null
          ? DateTime.parse(json['completedAt'] as String)
          : null,
      requestedBy: json['requestedBy'] as String?,
      approvedBy: json['approvedBy'] as String?,
      customerAction: json['customerAction'] as String?,
      returnFee: json['returnFee'] as int?,
    );
  }

  /// ExtraChargeData를 JSON으로 변환
  Map<String, dynamic> toJson() {
    return {
      if (workerMemo != null) 'workerMemo': workerMemo,
      if (managerPrice != null) 'managerPrice': managerPrice,
      if (managerNote != null) 'managerNote': managerNote,
      if (requestedAt != null) 'requestedAt': requestedAt!.toIso8601String(),
      if (approvedAt != null) 'approvedAt': approvedAt!.toIso8601String(),
      if (completedAt != null) 'completedAt': completedAt!.toIso8601String(),
      if (requestedBy != null) 'requestedBy': requestedBy,
      if (approvedBy != null) 'approvedBy': approvedBy,
      if (customerAction != null) 'customerAction': customerAction,
      if (returnFee != null) 'returnFee': returnFee,
    };
  }

  /// 빈 ExtraChargeData
  static const ExtraChargeData empty = ExtraChargeData();

  /// copyWith 메서드
  ExtraChargeData copyWith({
    String? workerMemo,
    int? managerPrice,
    String? managerNote,
    DateTime? requestedAt,
    DateTime? approvedAt,
    DateTime? completedAt,
    String? requestedBy,
    String? approvedBy,
    String? customerAction,
    int? returnFee,
  }) {
    return ExtraChargeData(
      workerMemo: workerMemo ?? this.workerMemo,
      managerPrice: managerPrice ?? this.managerPrice,
      managerNote: managerNote ?? this.managerNote,
      requestedAt: requestedAt ?? this.requestedAt,
      approvedAt: approvedAt ?? this.approvedAt,
      completedAt: completedAt ?? this.completedAt,
      requestedBy: requestedBy ?? this.requestedBy,
      approvedBy: approvedBy ?? this.approvedBy,
      customerAction: customerAction ?? this.customerAction,
      returnFee: returnFee ?? this.returnFee,
    );
  }

  @override
  String toString() {
    return 'ExtraChargeData(workerMemo: $workerMemo, managerPrice: $managerPrice, managerNote: $managerNote)';
  }
}

