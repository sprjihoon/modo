/**
 * 수거예약 상태 확인 스크립트
 * 
 * 사용법:
 * deno run --allow-net --allow-env check_pickup_status.ts
 */

import { getResInfo } from './apps/edge/supabase/functions/_shared/epost/index.ts';

// 로그에서 받은 정보 입력
const custNo = Deno.env.get('EPOST_CUSTOMER_ID') || '';
const orderNo = '15fe3418-aa0d-45d2-930a-02cd8c7f66a5'; // 주문 ID
const reqYmd = '20251201'; // resDate에서 추출 (YYYYMMDD)

console.log('🔍 수거예약 상태 확인 시작...');
console.log('파라미터:', {
  custNo,
  reqType: '1',
  orderNo,
  reqYmd,
});

try {
  const resInfo = await getResInfo({
    custNo,
    reqType: '1', // 1:일반소포
    orderNo,
    reqYmd,
  });
  
  console.log('✅ 수거예약 상태 확인 결과:');
  console.log(JSON.stringify({
    reqNo: resInfo.reqNo,
    resNo: resInfo.resNo,
    regiNo: resInfo.regiNo,
    treatStusCd: resInfo.treatStusCd,
    treatStusMeaning: {
      '00': '신청준비',
      '01': '소포신청 (실제 수거예약 등록됨)',
      '02': '운송장출력',
      '03': '집하완료',
      '04': '배송중',
      '05': '배송완료',
    }[resInfo.treatStusCd] || '알 수 없음',
    regiPoNm: resInfo.regiPoNm,
    resDate: resInfo.resDate,
  }, null, 2));
  
  // 수거예약 상태 확인
  if (resInfo.treatStusCd === '00' || resInfo.treatStusCd === '01') {
    console.log('✅ 수거예약이 정상적으로 등록되었습니다!');
  } else {
    console.warn('⚠️ 수거예약 상태가 예상과 다릅니다:', resInfo.treatStusCd);
  }
} catch (error) {
  console.error('❌ 수거예약 상태 확인 실패:', error);
}

