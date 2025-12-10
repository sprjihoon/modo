/// 주문 상태 Enum
enum OrderStatus {
  /// 결제 대기
  PENDING,
  
  /// 결제 완료
  PAID,
  
  /// 수거예약 완료
  BOOKED,
  
  /// 입고 완료
  INBOUND,
  
  /// 수선 중
  PROCESSING,
  
  /// 작업 일시정지 (추가 과금 처리 중)
  HOLD,
  
  /// 출고 완료
  READY_TO_SHIP,
  
  /// 배송 완료
  DELIVERED,
  
  /// 반송 대기
  RETURN_PENDING,
  
  /// 취소
  CANCELLED;

  /// String에서 OrderStatus로 변환
  static OrderStatus fromString(String status) {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return OrderStatus.PENDING;
      case 'PAID':
        return OrderStatus.PAID;
      case 'BOOKED':
        return OrderStatus.BOOKED;
      case 'INBOUND':
        return OrderStatus.INBOUND;
      case 'PROCESSING':
        return OrderStatus.PROCESSING;
      case 'HOLD':
        return OrderStatus.HOLD;
      case 'READY_TO_SHIP':
        return OrderStatus.READY_TO_SHIP;
      case 'DELIVERED':
        return OrderStatus.DELIVERED;
      case 'RETURN_PENDING':
        return OrderStatus.RETURN_PENDING;
      case 'CANCELLED':
        return OrderStatus.CANCELLED;
      default:
        return OrderStatus.PENDING; // 기본값
    }
  }

  /// OrderStatus를 String으로 변환
  String toShortString() {
    return toString().split('.').last;
  }

  /// 한글 상태명 반환
  String get displayName {
    switch (this) {
      case OrderStatus.PENDING:
        return '결제 대기';
      case OrderStatus.PAID:
        return '결제 완료';
      case OrderStatus.BOOKED:
        return '수거예약 완료';
      case OrderStatus.INBOUND:
        return '입고 완료';
      case OrderStatus.PROCESSING:
        return '수선 중';
      case OrderStatus.HOLD:
        return '작업 대기';
      case OrderStatus.READY_TO_SHIP:
        return '출고 완료';
      case OrderStatus.DELIVERED:
        return '배송 완료';
      case OrderStatus.RETURN_PENDING:
        return '반송 대기';
      case OrderStatus.CANCELLED:
        return '취소됨';
    }
  }

  /// 상태 컬러 (UI용)
  String get colorHex {
    switch (this) {
      case OrderStatus.PENDING:
        return '#FFA726'; // 주황
      case OrderStatus.PAID:
        return '#66BB6A'; // 녹색
      case OrderStatus.BOOKED:
        return '#42A5F5'; // 파랑
      case OrderStatus.INBOUND:
        return '#7E57C2'; // 보라
      case OrderStatus.PROCESSING:
        return '#26C6DA'; // 청록
      case OrderStatus.HOLD:
        return '#FF7043'; // 진한 주황
      case OrderStatus.READY_TO_SHIP:
        return '#9CCC65'; // 연두
      case OrderStatus.DELIVERED:
        return '#66BB6A'; // 녹색
      case OrderStatus.RETURN_PENDING:
        return '#EF5350'; // 빨강
      case OrderStatus.CANCELLED:
        return '#BDBDBD'; // 회색
    }
  }
}

