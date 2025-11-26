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
  const yy = now.getFullYear().toString().slice(-2);
  const mm = (now.getMonth() + 1).toString().padStart(2, '0');
  const dd = now.getDate().toString().padStart(2, '0');
  const dateStr = yy + mm + dd;

  return {
    reqNo: `${dateStr}64036480${Math.floor(Math.random() * 90 + 10)}`,
    resNo: `${dateStr}52119${Math.floor(Math.random() * 9000 + 1000)}`,
    regiNo: `601${dateStr}${Math.floor(Math.random() * 90000 + 10000)}`, // 우체국 등기번호 형식
    orderNo: params.orderNo,
    regiPoNm: '나주우체국',
    resDate: now.toISOString().replace(/[^0-9]/g, '').substring(0, 14),
    price: '3300',
    vTelNo: `0505${Math.floor(Math.random() * 9000000 + 1000000)}`,
  };
}

