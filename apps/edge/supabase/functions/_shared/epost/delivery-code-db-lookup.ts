/**
 * 집배코드 DB 조회 (Supabase 테이블)
 * 
 * delivery_codes 테이블에서 우편번호로 집배코드 조회
 */

import { createSupabaseClient } from '../supabase.ts';

export interface DeliveryCodeResult {
  sortCode1: string;      // 집중국번호 (경1)
  sortCode2: string;      // 배달국번호 (701)
  sortCode3: string;      // 집배팀번호 (56)
  sortCode4: string;      // 집배구번호 (05)
  arrCnpoNm: string;      // 집중국명 (대구M)
  delivPoNm: string;      // 배달국명 (동대구)
  delivAreaCd: string;    // 배달지역코드 (-560-)
}

/**
 * Supabase 테이블에서 집배코드 조회
 */
export async function lookupDeliveryCodeFromDB(
  supabase: any,
  zipcode: string
): Promise<DeliveryCodeResult | null> {
  const cleanZipcode = zipcode.replace(/-/g, '').substring(0, 5);
  
  if (!cleanZipcode || cleanZipcode.length !== 5) {
    return null;
  }
  
  try {
    const { data, error } = await supabase
      .from('delivery_codes')
      .select('*')
      .eq('zipcode', cleanZipcode)
      .single();
    
    if (error || !data) {
      console.log(`⚠️ 집배코드 DB 조회 실패 (${cleanZipcode}):`, error?.message || '데이터 없음');
      return null;
    }
    
    // 구분코스를 -560- 형식으로 변환
    const courseNo = data.course_no ? `-${data.course_no}-` : '';
    
    return {
      sortCode1: data.sort_code_1 || '',
      sortCode2: data.sort_code_2 || '',
      sortCode3: data.sort_code_3 || '',
      sortCode4: data.sort_code_4 || '',
      arrCnpoNm: data.arr_cnpo_nm || '',
      delivPoNm: data.deliv_po_nm || '',
      delivAreaCd: courseNo,
    };
  } catch (error: any) {
    console.error('❌ 집배코드 DB 조회 중 에러:', error);
    return null;
  }
}

