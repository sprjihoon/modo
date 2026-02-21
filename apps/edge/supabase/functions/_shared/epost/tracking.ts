/**
 * 우체국 배송추적 (웹 스크래핑 방식)
 * 우체국 배송조회 페이지에서 직접 데이터를 파싱
 * 
 * URL: https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm
 */

/**
 * 종적 이벤트 (배송 추적 이력)
 */
export interface TrackingEvent {
  date: string;        // 날짜 (yyyy.mm.dd)
  time: string;        // 시간 (HH:mm)
  location: string;    // 현재위치
  status: string;      // 처리현황
  description?: string; // 상세설명
}

/**
 * 종추적조회 응답
 */
export interface TrackingResponse {
  success: boolean;
  senderName?: string;      // 발송인명
  receiverName?: string;    // 수취인명
  trackingNo?: string;      // 등기번호
  mailType?: string;        // 우편물종류 (소포, 등기 등)
  serviceType?: string;     // 취급구분 (일일특급 등)
  deliveryDate?: string;    // 배달일자
  deliveryStatus?: string;  // 배달상태 (배달완료, 배달준비 등)
  events: TrackingEvent[];  // 종적목록
  error?: string;           // 에러 메시지
}

/**
 * 국내우편물 종적 조회 (웹 스크래핑)
 * @param trackingNo 등기번호 (13-15자리)
 */
export async function getTrackingInfo(trackingNo: string): Promise<TrackingResponse> {
  const url = `https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=${trackingNo}&displayHeader=N`;
  
  console.log('🔍 우체국 배송조회 페이지 호출:', trackingNo);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml',
        'User-Agent': 'Mozilla/5.0 (compatible; ModoApp/1.0)',
      },
    });
    
    if (!response.ok) {
      console.error('❌ 우체국 페이지 HTTP 에러:', response.status);
      return {
        success: false,
        events: [],
        error: `HTTP Error: ${response.status}`,
      };
    }
    
    const html = await response.text();
    console.log('📥 HTML 길이:', html.length);
    
    // 조회 결과 없음 체크 (정확한 문구로 체크)
    if (html.includes('조회된 결과가 없습니다') || html.includes('조회하신 우편물 정보가 없습니다')) {
      console.log('⚠️ 조회 결과 없음');
      return {
        success: true,
        trackingNo,
        events: [],
      };
    }
    
    // 정규식으로 이벤트 추출 - while exec 방식 (테스트 함수와 동일)
    const trRegex = /<tr[^>]*>[\s\S]*?<td[^>]*>(\d{4}\.\d{2}\.\d{2})<\/td>[\s\S]*?<td[^>]*>(\d{2}:\d{2})<\/td>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/gi;
    
    const events: TrackingEvent[] = [];
    let match;
    while ((match = trRegex.exec(html)) !== null) {
      const date = match[1]?.trim() || '';
      const time = match[2]?.trim() || '';
      
      // 위치에서 우체국명 추출 (HTML 태그 제거)
      let location = (match[3] || '')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      // goPostDetail 함수에서 상태 추출
      let status = '';
      const statusMatch = (match[3] || '').match(/goPostDetail\([^,]+,\s*'([^']+)'/);
      if (statusMatch) {
        status = statusMatch[1];
      } else {
        // 상태 td에서 추출
        status = (match[4] || '')
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }
      
      if (date && time) {
        events.push({
          date,
          time,
          location,
          status,
          description: undefined,
        });
      }
    }
    console.log('📋 정규식 매칭 수:', events.length);
    
    console.log('📋 추출된 이벤트 수:', events.length);
    
    // 배달 상태 추출
    let deliveryStatus: string | undefined;
    const deliveryValMatch = html.match(/<input[^>]*id="deliveryVal"[^>]*value="([^"]*)"[^>]*>/i);
    if (deliveryValMatch) {
      deliveryStatus = deliveryValMatch[1];
    }
    
    // 데이터가 없는 경우
    if (events.length === 0) {
      console.log('⚠️ 배송 이벤트를 파싱할 수 없음');
      return {
        success: true,
        trackingNo,
        events: [],
      };
    }
    
    console.log('✅ 우체국 배송조회 성공:', {
      deliveryStatus,
      eventCount: events.length,
      latestEvent: events[events.length - 1],
    });
    
    return {
      success: true,
      trackingNo,
      deliveryStatus,
      events,
    };
    
  } catch (error: any) {
    console.error('❌ 우체국 배송조회 실패:', error?.message);
    return {
      success: false,
      events: [],
      error: error?.message || '알 수 없는 오류',
    };
  }
}

/**
 * 배달 상태를 표준 상태 코드로 변환
 */
export function mapDeliveryStatusToCode(deliveryStatus: string | undefined): string {
  if (!deliveryStatus) return '00';
  
  const statusLower = deliveryStatus.toLowerCase();
  
  if (statusLower.includes('배달완료') || statusLower.includes('수령')) {
    return '05'; // 배송완료
  }
  if (statusLower.includes('배달중') || statusLower.includes('배달준비')) {
    return '04'; // 배송중
  }
  if (statusLower.includes('집하') || statusLower.includes('접수')) {
    return '03'; // 집하완료
  }
  if (statusLower.includes('운송장') || statusLower.includes('출력')) {
    return '02'; // 운송장출력
  }
  if (statusLower.includes('신청')) {
    return '01'; // 소포신청
  }
  
  return '00'; // 신청준비
}

/**
 * 처리현황에서 상태 코드 추출
 */
export function getStatusFromEvents(events: TrackingEvent[]): string {
  if (events.length === 0) return '00';
  
  // 가장 최근 이벤트 (마지막)
  const latestEvent = events[events.length - 1];
  const status = latestEvent.status;
  
  if (status.includes('배달완료') || status.includes('수령')) {
    return '05';
  }
  if (status.includes('배달중') || status.includes('배달준비') || status.includes('도착')) {
    return '04';
  }
  if (status.includes('발송') || status.includes('출발') || status.includes('이동')) {
    return '04';
  }
  if (status.includes('집하') || status.includes('접수')) {
    return '03';
  }
  
  return '03'; // 이벤트가 있으면 최소 집하완료
}
