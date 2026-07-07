/// 주문 상태 Enum
enum OrderStatus {
  /// 결제 대기
  PENDING,

  /// 결제 완료
  PAID,

  /// 수거예약 완료
  BOOKED,

  /// 수거 완료 (우체국에서 픽업됨, 센터 미도착)
  PICKED_UP,

  /// 입고 완료 (센터 도착, 작업자 수동 처리)
  INBOUND,

  /// 수선 중
  PROCESSING,

  /// 작업 일시정지 (추가 과금 처리 중)
  HOLD,

  /// 출고 완료
  READY_TO_SHIP,

  /// 배송 중
  OUT_FOR_DELIVERY,

  /// 배송 완료
  DELIVERED,

  /// 취소·반송 대기
  RETURN_PENDING,

  /// 취소·반송 중
  RETURN_SHIPPING,

  /// 반송 완료 (종료)
  RETURN_DONE,

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
      case 'PICKED_UP':
        return OrderStatus.PICKED_UP;
      case 'INBOUND':
        return OrderStatus.INBOUND;
      case 'PROCESSING':
        return OrderStatus.PROCESSING;
      case 'HOLD':
        return OrderStatus.HOLD;
      case 'READY_TO_SHIP':
        return OrderStatus.READY_TO_SHIP;
      case 'OUT_FOR_DELIVERY':
        return OrderStatus.OUT_FOR_DELIVERY;
      case 'DELIVERED':
        return OrderStatus.DELIVERED;
      case 'RETURN_PENDING':
        return OrderStatus.RETURN_PENDING;
      case 'RETURN_SHIPPING':
        return OrderStatus.RETURN_SHIPPING;
      case 'RETURN_DONE':
        return OrderStatus.RETURN_DONE;
      case 'CANCELLED':
        return OrderStatus.CANCELLED;
      default:
        return OrderStatus.PENDING;
    }
  }

  /// OrderStatus를 String으로 변환
  String toShortString() => toString().split('.').last;

  /// 한글 상태명 반환
  String get displayName {
    switch (this) {
      case OrderStatus.PENDING:
        return '결제 대기';
      case OrderStatus.PAID:
        return '결제 완료';
      case OrderStatus.BOOKED:
        return '수거예약 완료';
      case OrderStatus.PICKED_UP:
        return '수거 완료';
      case OrderStatus.INBOUND:
        return '입고 완료';
      case OrderStatus.PROCESSING:
        return '수선 중';
      case OrderStatus.HOLD:
        return '추가결제 대기';
      case OrderStatus.READY_TO_SHIP:
        return '출고 대기';
      case OrderStatus.OUT_FOR_DELIVERY:
        return '배송 중';
      case OrderStatus.DELIVERED:
        return '배송 완료';
      case OrderStatus.RETURN_PENDING:
        return '반송 대기';
      case OrderStatus.RETURN_SHIPPING:
        return '반송 중';
      case OrderStatus.RETURN_DONE:
        return '반송 완료';
      case OrderStatus.CANCELLED:
        return '취소됨';
    }
  }

  /// 상태 컬러 (UI용)
  String get colorHex {
    switch (this) {
      case OrderStatus.PENDING:
        return '#FFA726';
      case OrderStatus.PAID:
        return '#66BB6A';
      case OrderStatus.BOOKED:
        return '#42A5F5';
      case OrderStatus.PICKED_UP:
        return '#5C6BC0';
      case OrderStatus.INBOUND:
        return '#7E57C2';
      case OrderStatus.PROCESSING:
        return '#26C6DA';
      case OrderStatus.HOLD:
        return '#FF7043';
      case OrderStatus.READY_TO_SHIP:
        return '#9CCC65';
      case OrderStatus.OUT_FOR_DELIVERY:
        return '#29B6F6';
      case OrderStatus.DELIVERED:
        return '#66BB6A';
      case OrderStatus.RETURN_PENDING:
        return '#EF5350';
      case OrderStatus.RETURN_SHIPPING:
        return '#EF5350';
      case OrderStatus.RETURN_DONE:
        return '#BDBDBD';
      case OrderStatus.CANCELLED:
        return '#BDBDBD';
    }
  }
}
