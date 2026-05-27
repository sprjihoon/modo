/**
 * Mock 우체국 API 함수들
 * 개발/테스트용
 */

import type { InsertOrderParams, InsertOrderResponse } from './types.ts';

/**
 * Mock 소포신청 (개발/테스트용)
 * testYn=Y로 호출하거나, 보안키가 없을 때 사용
 */
export async function mockInsertOrder(params: InsertOrderParams): Promise<InsertOrderResponse> {
  console.warn('⚠️ Mock 소포신청을 사용합니다 (실제 우체국 API 호출 없음)');

  const now = new Date();
  const ymd = params.retVisitYmd && /^\d{8}$/.test(params.retVisitYmd)
    ? params.retVisitYmd
    : `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const dateStr = ymd.slice(2);
  const timePart = String(now.getHours()).padStart(2, '0')
    + String(now.getMinutes()).padStart(2, '0')
    + String(now.getSeconds()).padStart(2, '0');

  return {
    reqNo: `${dateStr}64036480${Math.floor(Math.random() * 90 + 10)}`,
    resNo: `${dateStr}52119${Math.floor(Math.random() * 9000 + 1000)}`,
    regiNo: `601${dateStr}${Math.floor(Math.random() * 90000 + 10000)}`, // 우체국 등기번호 형식
    orderNo: params.orderNo,
    regiPoNm: '나주우체국',
    resDate: `${ymd}${timePart}`,
    price: '3300',
    vTelNo: `0505${Math.floor(Math.random() * 9000000 + 1000000)}`,
  };
}

