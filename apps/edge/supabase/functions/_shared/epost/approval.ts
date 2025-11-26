/**
 * 계약 승인번호 조회
 * API ID: COMAPI-R01-02
 */

import { callEPostAPI, parseXmlValue } from './client.ts';

/**
 * 계약 승인번호 조회
 */
export async function getApprovalNumber(custNo: string): Promise<string> {
  const xml = await callEPostAPI('api.GetApprNo.jparcel', {
    custNo,
  });

  // XML에서 apprNo 추출
  const apprNo = parseXmlValue(xml, 'apprNo');
  if (!apprNo) {
    throw new Error('계약 승인번호를 찾을 수 없습니다');
  }

  return apprNo;
}

