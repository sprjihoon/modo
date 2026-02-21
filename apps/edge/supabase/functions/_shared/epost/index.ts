/**
 * 우체국 계약소포 OpenAPI 모듈
 * http://ship.epost.go.kr
 * 
 * 참고: 우체국 계약소포 OpenAPI 매뉴얼 (2023.12)
 * 
 * 이 모듈은 우체국 API를 구조화된 방식으로 제공합니다.
 * 
 * 사용 예시:
 * ```typescript
 * import { insertOrder, getApprovalNumber, mockInsertOrder } from '../_shared/epost/index.ts';
 * 
 * // 소포신청
 * const result = await insertOrder({
 *   custNo: '0005085217',
 *   apprNo: '1234567890',
 *   // ...
 * });
 * ```
 */

// 타입 export
export type {
  EPostConfig,
  InsertOrderParams,
  InsertOrderResponse,
  GetResInfoParams,
  GetResInfoResponse,
  CancelOrderParams,
  CancelOrderResponse,
  DeliveryCodeParams,
  DeliveryCodeResponse,
} from './types.ts';

// 종추적조회 타입 export
export type {
  TrackingEvent,
  TrackingResponse,
} from './tracking.ts';

// 설정
export { getEPostConfig, getEPostBaseUrl } from './config.ts';

// 클라이언트 (내부용, 필요시 export)
export { callEPostAPI, parseXmlValue } from './client.ts';

// 소포신청 관련
export {
  insertOrder,
  getResInfo,
  cancelOrder,
  getStoppedZipCodes,
  getTrackingUrl,
  getDeliveryCode,
} from './order.ts';

// 승인번호 조회
export { getApprovalNumber } from './approval.ts';

// 종추적조회 (배송추적)
export {
  getTrackingInfo,
  mapDeliveryStatusToCode,
  getStatusFromEvents,
} from './tracking.ts';

// Mock 함수들
export { mockInsertOrder } from './mock.ts';

