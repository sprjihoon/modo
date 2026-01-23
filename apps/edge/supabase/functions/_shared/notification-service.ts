/**
 * 통합 알림 서비스
 * 
 * FCM 푸시 알림 + 카카오 알림톡을 한 번에 처리
 * 모든 알림 발송에서 이 모듈을 사용
 */

import { sendFCMNotification, sendFCMToMultiple } from './fcm.ts';
import { 
  sendAlimtalk, 
  AlimtalkRequest, 
  AlimtalkResponse,
  ALIMTALK_TEMPLATES 
} from './kakao-alimtalk.ts';

// 알림 타입 정의
export type NotificationType = 
  | 'order_paid'
  | 'order_booked'
  | 'order_inbound'
  | 'order_processing'
  | 'order_hold'
  | 'order_ready_to_ship'
  | 'order_delivered'
  | 'order_cancelled'
  | 'extra_charge_pending'
  | 'extra_charge_completed'
  | 'extra_charge_skipped'
  | 'extra_charge_return'
  | 'pickup_reminder_d1'
  | 'pickup_reminder_today'
  | 'announcement';

// 알림 요청 인터페이스
export interface NotificationRequest {
  // 수신자 정보
  userId?: string;
  fcmToken?: string;
  phoneNumber?: string;
  
  // 알림 내용
  type: NotificationType;
  title: string;
  body: string;
  
  // 추가 데이터
  orderId?: string;
  orderNumber?: string;
  data?: Record<string, string>;
  
  // 알림톡 변수 (템플릿 변수 치환용)
  alimtalkVariables?: Record<string, string>;
  
  // 옵션
  skipFcm?: boolean;      // FCM 발송 스킵
  skipAlimtalk?: boolean; // 알림톡 발송 스킵
}

// 알림 결과 인터페이스
export interface NotificationResult {
  success: boolean;
  fcm?: {
    sent: boolean;
    error?: string;
  };
  alimtalk?: {
    sent: boolean;
    messageId?: string;
    error?: string;
  };
}

// 알림 타입 → 알림톡 템플릿 코드 매핑
const NOTIFICATION_TO_ALIMTALK_TEMPLATE: Record<NotificationType, string | null> = {
  order_paid: ALIMTALK_TEMPLATES.ORDER_PAID,
  order_booked: ALIMTALK_TEMPLATES.ORDER_BOOKED,
  order_inbound: ALIMTALK_TEMPLATES.ORDER_INBOUND,
  order_processing: ALIMTALK_TEMPLATES.ORDER_PROCESSING,
  order_hold: null, // 알림톡 없음
  order_ready_to_ship: ALIMTALK_TEMPLATES.ORDER_READY_TO_SHIP,
  order_delivered: ALIMTALK_TEMPLATES.ORDER_DELIVERED,
  order_cancelled: ALIMTALK_TEMPLATES.ORDER_CANCELLED,
  extra_charge_pending: ALIMTALK_TEMPLATES.EXTRA_CHARGE_REQUEST,
  extra_charge_completed: ALIMTALK_TEMPLATES.EXTRA_CHARGE_COMPLETED,
  extra_charge_skipped: null, // 알림톡 없음
  extra_charge_return: null, // 알림톡 없음
  pickup_reminder_d1: ALIMTALK_TEMPLATES.PICKUP_REMINDER_D1,
  pickup_reminder_today: ALIMTALK_TEMPLATES.PICKUP_REMINDER_TODAY,
  announcement: null, // 공지사항은 별도 처리
};

// 주문 상태 → 알림 타입 매핑
export function orderStatusToNotificationType(status: string): NotificationType | null {
  const mapping: Record<string, NotificationType> = {
    PAID: 'order_paid',
    BOOKED: 'order_booked',
    INBOUND: 'order_inbound',
    PROCESSING: 'order_processing',
    HOLD: 'order_hold',
    READY_TO_SHIP: 'order_ready_to_ship',
    DELIVERED: 'order_delivered',
    CANCELLED: 'order_cancelled',
  };
  return mapping[status] || null;
}

// 추가결제 상태 → 알림 타입 매핑
export function extraChargeStatusToNotificationType(status: string): NotificationType | null {
  const mapping: Record<string, NotificationType> = {
    PENDING_CUSTOMER: 'extra_charge_pending',
    COMPLETED: 'extra_charge_completed',
    SKIPPED: 'extra_charge_skipped',
    RETURN_REQUESTED: 'extra_charge_return',
  };
  return mapping[status] || null;
}

/**
 * 통합 알림 발송
 * FCM 푸시와 카카오 알림톡을 동시에 발송
 */
export async function sendNotification(
  request: NotificationRequest
): Promise<NotificationResult> {
  const result: NotificationResult = {
    success: false,
    fcm: { sent: false },
    alimtalk: { sent: false },
  };

  console.log('📱 통합 알림 발송:', {
    type: request.type,
    userId: request.userId,
    hasToken: !!request.fcmToken,
    hasPhone: !!request.phoneNumber,
  });

  // 1. FCM 푸시 발송
  if (!request.skipFcm && request.fcmToken) {
    try {
      await sendFCMNotification(request.fcmToken, {
        title: request.title,
        body: request.body,
        data: {
          type: request.type,
          order_id: request.orderId || '',
          ...request.data,
        },
      });
      result.fcm = { sent: true };
      console.log('✅ FCM 발송 성공');
    } catch (error) {
      console.error('❌ FCM 발송 실패:', error);
      result.fcm = { sent: false, error: error.message };
    }
  }

  // 2. 카카오 알림톡 발송
  if (!request.skipAlimtalk && request.phoneNumber) {
    const templateCode = NOTIFICATION_TO_ALIMTALK_TEMPLATE[request.type];
    
    if (templateCode) {
      try {
        const alimtalkResult = await sendAlimtalk({
          phoneNumber: request.phoneNumber,
          templateCode,
          templateVariables: request.alimtalkVariables || {},
        });
        
        result.alimtalk = {
          sent: alimtalkResult.success,
          messageId: alimtalkResult.messageId,
          error: alimtalkResult.error,
        };
        
        if (alimtalkResult.success) {
          console.log('✅ 알림톡 발송 성공:', alimtalkResult.messageId);
        } else {
          console.warn('⚠️ 알림톡 발송 실패:', alimtalkResult.error);
        }
      } catch (error) {
        console.error('❌ 알림톡 발송 오류:', error);
        result.alimtalk = { sent: false, error: error.message };
      }
    } else {
      console.log('ℹ️ 알림톡 템플릿 없음, 스킵:', request.type);
    }
  }

  // 성공 여부 판단 (FCM 또는 알림톡 중 하나라도 성공)
  result.success = result.fcm?.sent || result.alimtalk?.sent || false;

  return result;
}

/**
 * 주문 상태 변경 알림 발송
 */
export async function sendOrderStatusNotification(params: {
  userId: string;
  orderId: string;
  orderNumber: string;
  newStatus: string;
  fcmToken?: string;
  phoneNumber?: string;
  customerName?: string;
  trackingNumber?: string;
  pickupDate?: string;
  amount?: number;
}): Promise<NotificationResult> {
  const notificationType = orderStatusToNotificationType(params.newStatus);
  
  if (!notificationType) {
    console.log('ℹ️ 알림 대상 아닌 상태:', params.newStatus);
    return { success: false };
  }

  // 알림 메시지 생성
  const { title, body } = getOrderStatusMessage(params.newStatus, params.orderNumber);

  // 알림톡 변수 설정
  const alimtalkVariables: Record<string, string> = {
    '고객명': params.customerName || '고객',
    '주문번호': params.orderNumber,
  };

  // 상태별 추가 변수
  if (params.newStatus === 'BOOKED' && params.pickupDate) {
    alimtalkVariables['수거일'] = params.pickupDate;
  }
  if (params.newStatus === 'READY_TO_SHIP' && params.trackingNumber) {
    alimtalkVariables['송장번호'] = params.trackingNumber;
  }
  if (params.newStatus === 'PAID' && params.amount) {
    alimtalkVariables['결제금액'] = params.amount.toLocaleString();
  }

  return sendNotification({
    userId: params.userId,
    fcmToken: params.fcmToken,
    phoneNumber: params.phoneNumber,
    type: notificationType,
    title,
    body,
    orderId: params.orderId,
    orderNumber: params.orderNumber,
    alimtalkVariables,
  });
}

/**
 * 추가 결제 알림 발송
 */
export async function sendExtraChargeNotification(params: {
  userId: string;
  orderId: string;
  orderNumber: string;
  status: string;
  fcmToken?: string;
  phoneNumber?: string;
  customerName?: string;
  amount?: number;
}): Promise<NotificationResult> {
  const notificationType = extraChargeStatusToNotificationType(params.status);
  
  if (!notificationType) {
    console.log('ℹ️ 알림 대상 아닌 상태:', params.status);
    return { success: false };
  }

  // 알림 메시지 생성
  const { title, body } = getExtraChargeMessage(params.status, params.orderNumber, params.amount);

  // 알림톡 변수 설정
  const alimtalkVariables: Record<string, string> = {
    '고객명': params.customerName || '고객',
    '주문번호': params.orderNumber,
  };

  if (params.amount) {
    alimtalkVariables['추가금액'] = params.amount.toLocaleString();
  }

  return sendNotification({
    userId: params.userId,
    fcmToken: params.fcmToken,
    phoneNumber: params.phoneNumber,
    type: notificationType,
    title,
    body,
    orderId: params.orderId,
    orderNumber: params.orderNumber,
    alimtalkVariables,
  });
}

/**
 * 수거일 알림 발송
 */
export async function sendPickupReminderNotification(params: {
  userId: string;
  orderId: string;
  reminderType: 'D-1' | 'TODAY';
  fcmToken?: string;
  phoneNumber?: string;
  customerName?: string;
  pickupDate?: string;
  trackingNo?: string;
}): Promise<NotificationResult> {
  const notificationType = params.reminderType === 'D-1' 
    ? 'pickup_reminder_d1' 
    : 'pickup_reminder_today';

  const title = params.reminderType === 'D-1' 
    ? '📦 내일 수거 예정'
    : '🚚 오늘 수거일입니다';
  
  const body = params.reminderType === 'D-1'
    ? `${params.pickupDate || '내일'} 의류 수거가 예정되어 있습니다. 의류를 준비해주세요!`
    : '택배기사님이 방문 예정입니다. 문 앞에 의류를 준비해주세요!';

  // 알림톡 변수 설정
  const alimtalkVariables: Record<string, string> = {
    '고객명': params.customerName || '고객',
  };

  if (params.pickupDate) {
    alimtalkVariables['수거일'] = params.pickupDate;
  }

  return sendNotification({
    userId: params.userId,
    fcmToken: params.fcmToken,
    phoneNumber: params.phoneNumber,
    type: notificationType,
    title,
    body,
    orderId: params.orderId,
    alimtalkVariables,
    data: {
      tracking_no: params.trackingNo || '',
    },
  });
}

// 주문 상태별 메시지 생성
function getOrderStatusMessage(status: string, orderNumber: string): { title: string; body: string } {
  const messages: Record<string, { title: string; body: string }> = {
    PAID: {
      title: '결제 완료',
      body: `주문(${orderNumber})의 결제가 완료되었습니다.`,
    },
    BOOKED: {
      title: '수거예약 완료',
      body: `주문(${orderNumber})의 수거예약이 완료되었습니다. 곧 방문 예정입니다.`,
    },
    INBOUND: {
      title: '입고 완료',
      body: `주문(${orderNumber})이 입고되었습니다. 곧 수선을 시작합니다.`,
    },
    PROCESSING: {
      title: '수선 중',
      body: `주문(${orderNumber})의 수선 작업이 시작되었습니다.`,
    },
    HOLD: {
      title: '작업 대기',
      body: `주문(${orderNumber})이 일시 대기 중입니다. 확인이 필요합니다.`,
    },
    READY_TO_SHIP: {
      title: '출고 완료',
      body: `주문(${orderNumber})의 수선이 완료되어 출고되었습니다.`,
    },
    DELIVERED: {
      title: '배송 완료',
      body: `주문(${orderNumber})이 배송 완료되었습니다. 감사합니다!`,
    },
    CANCELLED: {
      title: '주문 취소',
      body: `주문(${orderNumber})이 취소되었습니다.`,
    },
  };

  return messages[status] || {
    title: '주문 상태 변경',
    body: `주문(${orderNumber})의 상태가 변경되었습니다.`,
  };
}

// 추가 결제 상태별 메시지 생성
function getExtraChargeMessage(
  status: string, 
  orderNumber: string, 
  amount?: number
): { title: string; body: string } {
  const amountStr = amount ? amount.toLocaleString() + '원' : '';
  
  const messages: Record<string, { title: string; body: string }> = {
    PENDING_CUSTOMER: {
      title: '추가 결제 요청',
      body: amount 
        ? `주문(${orderNumber})에 추가 작업이 필요합니다. 추가 금액: ${amountStr}`
        : `주문(${orderNumber})에 추가 작업이 필요합니다. 확인해주세요.`,
    },
    COMPLETED: {
      title: '추가 결제 완료',
      body: `주문(${orderNumber})의 추가 결제가 완료되었습니다. 작업을 재개합니다.`,
    },
    SKIPPED: {
      title: '원안대로 진행',
      body: `주문(${orderNumber})을 추가 작업 없이 원안대로 진행합니다.`,
    },
    RETURN_REQUESTED: {
      title: '반송 요청',
      body: `주문(${orderNumber})의 반송이 요청되었습니다.`,
    },
  };

  return messages[status] || {
    title: '주문 업데이트',
    body: `주문(${orderNumber})에 변경사항이 있습니다.`,
  };
}

// 내보내기
export { ALIMTALK_TEMPLATES };

