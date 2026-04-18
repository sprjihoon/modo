/**
 * 우체국 배송추적
 * 1차: 공공데이터포털 종적조회 API (공식 JSON/XML API)
 * 2차: 웹 스크래핑 (HTML 파싱 fallback)
 * 
 * 공공데이터포털 API:
 *   http://openapi.epost.go.kr/trace/retrieveLongitudinalCombinedService/...
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

const EPOST_TRACE_URL = `https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm`;
const EPOST_HEADERS = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
};

/**
 * 국내우편물 종적 조회 (웹 스크래핑)
 * @param trackingNo 등기번호 (13-15자리)
 */
export async function getTrackingInfo(trackingNo: string): Promise<TrackingResponse> {
  const attempts = [
    // 시도 1: GET + displayHeader=N (원래 동작하던 방식)
    () => fetch(`${EPOST_TRACE_URL}?sid1=${encodeURIComponent(trackingNo)}&displayHeader=N`, {
      method: 'GET', headers: EPOST_HEADERS,
    }),
    // 시도 2: GET (displayHeader=N 없이)
    () => fetch(`${EPOST_TRACE_URL}?sid1=${encodeURIComponent(trackingNo)}`, {
      method: 'GET', headers: EPOST_HEADERS,
    }),
    // 시도 3: POST
    () => fetch(EPOST_TRACE_URL, {
      method: 'POST',
      headers: { ...EPOST_HEADERS, 'Content-Type': 'application/x-www-form-urlencoded', 'Referer': EPOST_TRACE_URL },
      body: `sid1=${encodeURIComponent(trackingNo)}`,
    }),
  ];

  for (let i = 0; i < attempts.length; i++) {
    const label = ['GET+displayHeader=N', 'GET', 'POST'][i];
    try {
      console.log(`🔍 우체국 배송조회 시도 ${i + 1} (${label}):`, trackingNo);
      const response = await attempts[i]();
      console.log(`📡 응답 status (${label}):`, response.status, response.headers.get('content-type'));

      if (!response.ok) {
        console.warn(`⚠️ ${label} 실패 HTTP ${response.status}`);
        continue;
      }

      const html = await response.text();
      console.log(`📥 HTML 길이 (${label}):`, html.length, '| 첫200자:', html.slice(0, 200));

      const result = _parseTrackingHtml(html, trackingNo);
      if (result.success && result.events.length > 0) {
        console.log(`✅ ${label}로 이벤트 파싱 성공:`, result.events.length, '건');
        return result;
      }
      // 결과 없음이지만 에러는 아닌 경우(조회 불가 우편물)도 즉시 반환
      if (result.success && result.events.length === 0 && !result.error) {
        console.log(`ℹ️ ${label}: 추적 결과 없음 (정상 응답)`);
        return result;
      }
    } catch (err: any) {
      console.warn(`⚠️ ${label} 예외:`, err?.message);
    }
  }

  console.error('❌ 모든 방식 실패');
  return { success: false, events: [], error: '우체국 서버에서 추적 정보를 가져올 수 없습니다.' };
}

/**
 * 우체국 배송조회 HTML 파싱 (내부 함수)
 * 날짜(YYYY.MM.DD) | 시간(HH:MM) | 발송국 | 처리현황 4열 테이블 구조
 */
function _parseTrackingHtml(html: string, trackingNo: string): TrackingResponse {
  console.log('📄 HTML 파싱 시작, 길이:', html.length);

  // 조회 결과 없음 체크
  const noResultPatterns = [
    '조회된 결과가 없습니다', '조회하신 우편물 정보가 없습니다',
    '등기번호를 다시 확인', '조회결과가 없습니다', '데이터가 없습니다',
  ];
  for (const pattern of noResultPatterns) {
    if (html.includes(pattern)) {
      console.log('⚠️ 조회 결과 없음:', pattern);
      return { success: true, trackingNo, events: [] };
    }
  }

  const extractText = (s: string) =>
    s.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

  const events: TrackingEvent[] = [];
  let match: RegExpExecArray | null;

  // ── 방법 1: 4열 테이블 (날짜 | 시간 | 발송국 | 처리현황) ──
  // 우체국 배송조회 기본 테이블 구조
  const trRegex1 = /<tr[^>]*>[\s\S]*?<td[^>]*>(\d{4}\.\d{2}\.\d{2})<\/td>[\s\S]*?<td[^>]*>(\d{2}:\d{2})<\/td>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/gi;
  while ((match = trRegex1.exec(html)) !== null) {
    const date = match[1]?.trim() || '';
    const time = match[2]?.trim() || '';
    const location = extractText(match[3] || '');
    // 처리현황: span.evtnm 또는 일반 텍스트
    const statusRaw = match[4] || '';
    const evtnmMatch = statusRaw.match(/<span[^>]*class="evtnm"[^>]*>([\s\S]*?)<\/span>/i);
    const status = evtnmMatch ? extractText(evtnmMatch[1]) : extractText(statusRaw);
    if (date && time && status) {
      events.push({ date, time, location, status });
    }
  }
  console.log('📋 방법1(4열):', events.length, '건');

  // ── 방법 2: 날짜+시간 합쳐진 3열 테이블 ──
  if (events.length === 0) {
    const trRegex2 = /<tr[^>]*>[\s\S]*?<td[^>]*>(\d{4}\.\d{2}\.\d{2}\s+\d{2}:\d{2})<\/td>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/gi;
    while ((match = trRegex2.exec(html)) !== null) {
      const [date, time] = (match[1]?.trim() || '').split(/\s+/);
      const location = extractText(match[2] || '');
      const status = extractText(match[3] || '');
      if (date && time && status) events.push({ date, time, location, status });
    }
    console.log('📋 방법2(3열 날짜+시간):', events.length, '건');
  }

  // ── 방법 3: class="detail_off/on" tr 행 ──
  if (events.length === 0) {
    const trRegex3 = /<tr\s+class="(?:detail_off|detail_on)"[^>]*>([\s\S]*?)<\/tr>/gi;
    while ((match = trRegex3.exec(html)) !== null) {
      const tds = (match[1].match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || []).map(extractText);
      if (tds.length >= 4) {
        const dateM = tds[0].match(/(\d{4}\.\d{2}\.\d{2})/);
        const timeM = tds[1].match(/(\d{2}:\d{2})/);
        if (dateM && timeM) {
          events.push({ date: dateM[1], time: timeM[1], location: tds[2], status: tds[3] });
        }
      }
    }
    console.log('📋 방법3(detail_off):', events.length, '건');
  }

  // 보내는 분 / 받는 분 (마스킹 포함)
  const senderMatch = html.match(/보내는\s*분[^<]*<[^>]*>([^<]+)/i) ||
                      html.match(/<td[^>]*>([가-힣\*]+)<br\s*\/?>\s*\d{4}\.\d{2}\.\d{2}/i);
  const senderName = senderMatch ? extractText(senderMatch[1]) : undefined;

  // 배달 상태 (prgsHere 값 또는 현재 진행 단계)
  const prgsHereMatch = html.match(/id="prgsHere"[^>]*value="([^"]+)"/i);
  const deliveryStatus = prgsHereMatch ? (() => {
    const step = parseInt(prgsHereMatch[1]);
    return ['접수', '발송', '배달준비', '배달완료'][Math.min(step - 1, 3)] || undefined;
  })() : undefined;

  console.log('📋 최종:', { eventCount: events.length, deliveryStatus, senderName });

  if (events.length === 0) {
    const hasTable = html.includes('<table');
    console.log('⚠️ 이벤트 파싱 실패, 테이블 존재:', hasTable);
    return { success: true, trackingNo, events: [] };
  }

  return { success: true, trackingNo, deliveryStatus, senderName, events };
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
 * 공공데이터포털 우체국 종적조회 API (공식 XML API)
 * ServiceKey = EPOST_TRACKING_API_KEY 환경변수
 * 
 * 요청: GET openapi.epost.go.kr/.../getLongitudinalCombinedList?ServiceKey=...&rgist=...
 * 응답: XML <longitudinals><longitudinal><postingDt><postingTime><nowLc><sttusList>
 */
export async function getPublicTrackingInfo(trackingNo: string): Promise<TrackingResponse> {
  const serviceKey = Deno.env.get('EPOST_TRACKING_API_KEY');
  if (!serviceKey) {
    console.warn('⚠️ EPOST_TRACKING_API_KEY 미설정 - 공공데이터포털 API 건너뜀');
    return { success: false, events: [], error: 'EPOST_TRACKING_API_KEY not set' };
  }

  const url =
    `http://openapi.epost.go.kr/trace/retrieveLongitudinalCombinedService` +
    `/retrieveLongitudinalCombinedService/getLongitudinalCombinedList` +
    `?ServiceKey=${encodeURIComponent(serviceKey)}&rgist=${encodeURIComponent(trackingNo)}`;

  console.log('🔍 공공데이터포털 종적조회 API 호출:', trackingNo);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/xml, text/xml, */*' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.error('❌ 공공데이터포털 API HTTP 에러:', response.status);
      return { success: false, events: [], error: `HTTP ${response.status}` };
    }

    const xml = await response.text();
    console.log('📥 공공데이터포털 응답 길이:', xml.length);
    if (xml.length < 2000) console.log('📄 XML:', xml);

    // 에러 응답 체크
    const resultCode = xml.match(/<resultCode>(.*?)<\/resultCode>/i)?.[1]?.trim();
    if (resultCode && resultCode !== '00' && resultCode !== '0000') {
      const resultMsg = xml.match(/<resultMsg>(.*?)<\/resultMsg>/i)?.[1]?.trim() || '알 수 없는 오류';
      console.warn('⚠️ 공공데이터포털 API 에러:', resultCode, resultMsg);
      return { success: false, events: [], error: `${resultCode}: ${resultMsg}` };
    }

    // 조회 결과 없음 체크
    if (xml.includes('SERVICE_RESULT_NOT_FOUND') || xml.includes('결과가 없습니다') || !xml.includes('<longitudinal>')) {
      console.log('⚠️ 공공데이터포털 - 추적 결과 없음');
      return { success: true, events: [] };
    }

    // 종적 이벤트 파싱
    const events: TrackingEvent[] = [];
    const longitudinalRegex = /<longitudinal>([\s\S]*?)<\/longitudinal>/gi;
    let match;

    while ((match = longitudinalRegex.exec(xml)) !== null) {
      const block = match[1];
      const rawDate  = block.match(/<postingDt>(.*?)<\/postingDt>/i)?.[1]?.trim() || '';
      const rawTime  = block.match(/<postingTime>(.*?)<\/postingTime>/i)?.[1]?.trim() || '';
      const location = block.match(/<nowLc>(.*?)<\/nowLc>/i)?.[1]?.trim() || '';
      const status   = block.match(/<sttusList>(.*?)<\/sttusList>/i)?.[1]?.trim() || '';

      // 날짜: "20260416" → "2026.04.16"
      const date = rawDate.length === 8
        ? `${rawDate.slice(0, 4)}.${rawDate.slice(4, 6)}.${rawDate.slice(6, 8)}`
        : rawDate;

      // 시간: "1740" → "17:40"
      const time = rawTime.length === 4
        ? `${rawTime.slice(0, 2)}:${rawTime.slice(2, 4)}`
        : rawTime;

      if (date && status) {
        events.push({ date, time, location, status });
      }
    }

    // 배달 상태 (최상위 dlvStusNm)
    const deliveryStatus = xml.match(/<dlvStusNm>(.*?)<\/dlvStusNm>/i)?.[1]?.trim();
    const senderName     = xml.match(/<sndrNm>(.*?)<\/sndrNm>/i)?.[1]?.trim();
    const receiverName   = xml.match(/<rcperNm>(.*?)<\/rcperNm>/i)?.[1]?.trim();

    console.log('✅ 공공데이터포털 종적조회 성공:', {
      eventCount: events.length,
      deliveryStatus,
      latestEvent: events[events.length - 1],
    });

    return { success: true, events, deliveryStatus, senderName, receiverName };

  } catch (err: any) {
    const isTimeout = err?.name === 'AbortError';
    console.error('❌ 공공데이터포털 API 오류:', isTimeout ? '타임아웃' : err?.message);
    return { success: false, events: [], error: isTimeout ? 'timeout' : err?.message };
  }
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
