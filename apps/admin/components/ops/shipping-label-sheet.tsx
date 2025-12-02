/**
 * 우체국 출고송장 (신형 C형) 컴포넌트
 * 규격: 168mm x 107mm (세로 x 가로)
 * 좌표 기준: 제공된 이미지 좌표 (가로 800px 기준)
 */

import React from "react";

export interface ShippingLabelData {
  trackingNo: string;       // 32, 36
  
  // 주문 정보
  orderDate: string;        // 2: 송장출력일
  recipientName: string;    // 9, 28: 수령자명
  sellerName: string;       // 11: 판매처 (모두의수선)
  orderNumber: string;      // 14: 주문번호 (짧은 형식)
  customerOrderId?: string; // 고객 주문처 UUID
  
  // 보내는 분 (송화인)
  senderAddress: string;    // 19: 송화인주소
  senderName: string;       // 20: 송화인명
  senderPhone: string;      // 21: 송화인전화
  
  // 받는 분 (수령자)
  recipientZipcode: string; // 23: 수령자우편번호
  recipientAddress: string; // 27: 수령자주소
  recipientPhone: string;   // 29: 수령자핸드폰
  recipientTel?: string;    // 30: 수령자전화번호
  
  // 상품 정보
  totalQuantity: number;    // 26: 총상품수
  itemsList: string;        // 34: 상품리스트 (줄바꿈 문자 포함)
  memo?: string;            // 37: 메모
  
  // 기타
  weight?: string;          // 중량 (기본값 2kg)
  volume?: string;          // 용적 (기본값 60cm)
  deliveryCode?: string;    // 배송코드
  
  // 우체국 분류 코드 (상단 큰 글씨)
  deliveryPlaceCode?: string; // 배송코드2 (도착 집중국) - arrCnpoNm
  deliveryTeamCode?: string;  // 배송코드3 (배달 우체국) - delivPoNm
  deliverySequence?: string;  // 배송코드4 (배달 순서) - delivAreaCd
  
  // 집배코드조회 API에서 받는 상세 분류 코드
  sortCode1?: string;  // 경1
  sortCode2?: string;  // 701
  sortCode3?: string;  // 56
  sortCode4?: string;  // 05
  printAreaCd?: string; // 인쇄용 집배코드 (우체국 API: printAreaCd) - 예: "경1 701 56 05"
}

interface LabelLayoutElement {
  fieldKey: string;
  x: number; // mm 단위
  y: number; // mm 단위
  width: number; // mm 단위
  height: number; // mm 단위
  fontSize: number;
  isBold: boolean;
  borderColor?: string;
  type: "text" | "barcode";
}

interface Props {
  data: ShippingLabelData;
  customLayout?: LabelLayoutElement[]; // 저장된 레이아웃 (선택적)
}

// 좌표 타입: [x, y, width, height]
type Coord = [number, number, number, number];

// 좌표 매핑 (이미지 기반)
const COORDS: Record<string, Coord> = {
  orderDate: [109, 70, 200, 19],       // 2
  recipientNameTop: [94, 109, 140, 19], // 9
  sellerName: [145, 133, 200, 19],     // 11
  orderNumber: [114, 157, 140, 19],    // 14
  
  senderAddress: [377, 106, 420, 50],  // 19
  senderName: [379, 160, 140, 19],     // 20
  senderPhone: [565, 160, 200, 19],    // 21
  
  recipientZipcodeBar: [55, 234, 139, 44], // 22
  recipientZipcode: [67, 285, 100, 19],    // 23
  totalQuantity: [205, 315, 100, 19],      // 26
  
  recipientAddress: [378, 212, 450, 75],   // 27
  recipientName: [378, 292, 160, 20],      // 28
  recipientPhone: [621, 292, 200, 20],     // 29
  recipientTel: [621, 316, 200, 20],       // 30
  
  trackingNoText: [621, 357, 200, 20],     // 32
  itemsList: [13, 340, 327, 190],          // 34
  
  trackingNoBarcode: [547, 434, 300, 70],  // 35
  trackingNoBottom: [604, 508, 200, 20],   // 36
  
  // 분류 코드 (상단) - CSV 파일 기준으로 업데이트
  sortCode1: [363, 12, 100, 50],           // 배송코드1 (항목 13) - 글자크기 35
  sortCode2: [444, 70, 120, 20],           // 배송코드2 (항목 3) - 글자크기 13
  sortCode3: [611, 70, 120, 20],           // 배송코드3 (항목 5) - 글자크기 13
  sortCode4: [511, 13, 120, 50],            // 배송코드4 (항목 4) - 글자크기 35
  
  deliverySequence: [511, 13, 120, 50],    // 배송코드4와 동일 위치 (항목 4)
  deliveryPlaceCode: [444, 70, 120, 20],    // 배송코드2 (항목 3)
  deliveryTeamCode: [611, 70, 120, 20],     // 배송코드3 (항목 5)
  
  memo: [13, 566, 800, 22],                // 37
};

// 폰트 스타일 - 나눔폰트 사용 (저작권 이슈 없음)
const FONT_STYLE = {
  fontFamily: "Nanum Gothic, Malgun Gothic, Dotum, sans-serif", // 나눔고딕 폰트
  fontSize: "12px",
  lineHeight: "1.2",
  color: "#000",
};

// mm를 픽셀로 변환 (96 DPI 기준)
const mmToPx = (mm: number) => mm * (96 / 25.4);

// 운송장 번호 포맷팅 (xxxxx-xxxx-xxxx 형식)
const formatTrackingNo = (trackingNo: string) => {
  if (!trackingNo) return '';
  const cleaned = trackingNo.replace(/[^0-9]/g, '');
  if (cleaned.length === 13) {
    return `${cleaned.substring(0, 5)}-${cleaned.substring(5, 9)}-${cleaned.substring(9, 13)}`;
  }
  return trackingNo;
};

// 실제 데이터 매핑 함수 (저장된 레이아웃 사용 시)
const mapFieldToActualValue = (fieldKey: string, orderData: ShippingLabelData): string => {
  const mapping: Record<string, (data: ShippingLabelData) => string> = {
    output_label: () => "0차 출력",
    sorting_code_large: (data) => {
      // printAreaCd 우선 사용 (우체국 API에서 제공하는 인쇄용 집배코드)
      if (data.printAreaCd) {
        return data.printAreaCd;
      }
      // printAreaCd가 없으면 sortCode 조합
      if (data.sortCode1 && data.sortCode2 && data.sortCode3 && data.sortCode4) {
        return `${data.sortCode1} ${data.sortCode2} ${data.sortCode3} ${data.sortCode4}`;
      }
      return "";
    },
    delivery_center_info: (data) => {
      const parts = [];
      if (data.deliveryPlaceCode) parts.push(data.deliveryPlaceCode);
      if (data.deliveryTeamCode) parts.push(data.deliveryTeamCode);
      if (data.deliverySequence) {
        let seq = data.deliverySequence;
        if (!seq.includes('-')) seq = `-${seq}-`;
        parts.push(seq);
      }
      return parts.join(' ');
    },
    order_date: (data) => `신청일: ${data.orderDate || ''}`,
    orderer_name: (data) => `주문인: ${data.recipientName || ''}`,
    customer_order_source: (data) => `고객 주문처: 틸리언 수기`,
    order_number: (data) => `주문번호: ${data.orderNumber || ''}`,
    package_info: (data) => `중량:${data.weight || '2'}kg 용적:${data.volume || '60'}cm 요금: 신용 0`,
    zipcode_barcode: (data) => data.recipientZipcode || "",
    total_quantity: (data) => `[총 ${data.totalQuantity || 1}개]`,
    items_list: (data) => {
      if (data.itemsList) {
        const items = data.itemsList.split('\n').filter(Boolean);
        return items.map((item, idx) => `${idx + 1}. ${item}`).join('\n');
      }
      return "1. 거래물품-1개";
    },
    sender_address: (data) => data.senderAddress || "",
    sender_name: (data) => data.senderName || "틸리언",
    sender_phone: (data) => data.senderPhone || "",
    receiver_address: (data) => data.recipientAddress || "",
    receiver_name: (data) => data.recipientName || "",
    receiver_phone: (data) => data.recipientPhone || "",
    tracking_no_text: (data) => `등기번호: ${formatTrackingNo(data.trackingNo)}`,
    waybill_statement: (data) => "모두의수선에서 제공되는 서비스입니다.",
    tracking_no_barcode: (data) => data.trackingNo || "",
    bottom_info: (data) => `[총 ${data.totalQuantity || 1}개] [0회 재출력]`,
  };

  const mapper = mapping[fieldKey];
  return mapper ? mapper(orderData) : "";
};

export function ShippingLabelSheet({ data, customLayout }: Props) {
  // 디버깅: 집배코드 데이터 확인 (API/Supabase에서 가져온 실제 데이터)
  console.log('📋 ShippingLabelSheet 데이터 (API/Supabase에서 가져온 실제 값):', {
    sortCode1: data.sortCode1, // 우체국 API: sortCode1
    sortCode2: data.sortCode2, // 우체국 API: sortCode2
    sortCode3: data.sortCode3, // 우체국 API: sortCode3
    sortCode4: data.sortCode4, // 우체국 API: sortCode4
    deliverySequence: data.deliverySequence, // 우체국 API: delivAreaCd
    deliveryPlaceCode: data.deliveryPlaceCode, // 우체국 API: arrCnpoNm
    deliveryTeamCode: data.deliveryTeamCode, // 우체국 API: delivPoNm
    trackingNo: data.trackingNo, // Supabase: delivery_tracking_no 또는 regiNo
    recipientZipcode: data.recipientZipcode, // Supabase: delivery_zipcode
    recipientAddress: data.recipientAddress, // Supabase: delivery_address
    recipientName: data.recipientName, // Supabase: customer_name
    recipientPhone: data.recipientPhone, // Supabase: customer_phone
    hasCustomLayout: !!customLayout,
  });

  // 저장된 레이아웃이 있으면 사용, 없으면 기존 하드코딩된 좌표 사용
  const useCustomLayout = customLayout && customLayout.length > 0;

  // 저장된 레이아웃으로 렌더링
  const renderCustomLayout = () => {
    if (!useCustomLayout) return null;

    // 캔버스 크기 (800px x 1200px 기준)
    const canvasWidth = 800;
    const canvasHeight = 1200;
    const scaleFactor = canvasWidth / mmToPx(171); // 171mm = 가로

    return (
      <>
        {customLayout.map((element, index) => {
          // mm를 픽셀로 변환 (스케일 팩터 적용)
          const x = mmToPx(element.x) * scaleFactor;
          const y = mmToPx(element.y) * scaleFactor;
          const width = mmToPx(element.width) * scaleFactor;
          const height = mmToPx(element.height) * scaleFactor;

          // 실제 데이터 값 가져오기
          const actualValue = mapFieldToActualValue(element.fieldKey, data);

          if (!actualValue) return null;

          if (element.type === "barcode") {
            // 바코드 렌더링
            return (
              <div
                key={`${element.fieldKey}-${index}`}
                style={{
                  position: "absolute",
                  left: `${x}px`,
                  top: `${y}px`,
                  width: `${width}px`,
                  height: `${height}px`,
                  overflow: "hidden",
                }}
              >
                <img
                  src={`https://barcode.tec-it.com/barcode.ashx?data=${actualValue}&code=Code128&translate-esc=on&showastext=off&dpi=203`}
                  alt={`${element.fieldKey} 바코드`}
                  style={{
                    width: "100%",
                    height: "auto",
                    objectFit: "contain",
                    display: "block",
                  }}
                />
              </div>
            );
          } else {
            // 텍스트 렌더링
            return (
              <div
                key={`${element.fieldKey}-${index}`}
                style={{
                  position: "absolute",
                  left: `${x}px`,
                  top: `${y}px`,
                  width: `${width}px`,
                  height: `${height}px`,
                  ...FONT_STYLE,
                  fontSize: `${element.fontSize}px`,
                  fontWeight: element.isBold ? "bold" : "normal",
                  whiteSpace: "pre-wrap",
                  overflow: "hidden",
                  wordBreak: "break-word",
                  border: element.borderColor ? `2px solid ${element.borderColor}` : "none",
                  padding: element.borderColor ? "2px" : "0",
                  printColorAdjust: "exact",
                  WebkitPrintColorAdjust: "exact",
                }}
              >
                {actualValue}
              </div>
            );
          }
        })}
      </>
    );
  };

  // 좌표 기반 텍스트 렌더링 헬퍼
  const renderText = (key: string, text: string | number | undefined, style: React.CSSProperties = {}) => {
    const coord = COORDS[key];
    if (!coord || !text) return null;
    
    const [x, y, w, h] = coord;
    
    return (
      <div
        style={{
          position: "absolute",
          left: `${x}px`,
          top: `${y}px`,
          width: `${w}px`,
          height: `${h}px`,
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          ...FONT_STYLE,
          ...style,
        }}
      >
        {text}
      </div>
    );
  };

  // 상품 리스트 렌더링 (멀티라인)
  const renderItemsList = () => {
    const coord = COORDS['itemsList'];
    const [x, y, w, h] = coord;
    
    // 상품 목록을 번호 매기기
    const items = data.itemsList.split('\n').filter(Boolean);
    const formattedList = items.map((item, idx) => `${idx + 1}. ${item}`).join('\n');
    
    return (
      <>
        {/* "품목 (총 N개)" 레이블 */}
        <div style={{
          position: "absolute",
          left: `${x}px`,
          top: `${y - 25}px`,
          ...FONT_STYLE,
          fontSize: "12px",
          fontWeight: "bold"
        }}>
          품목 (총 {items.length}개)
        </div>
        
        {/* 상품 목록 - CSV 기준: 항목 34 - 상품리스트 (13px) */}
        <div
          style={{
            position: "absolute",
            left: `${x}px`,
            top: `${y}px`,
            width: `${w}px`,
            height: `${h}px`,
            overflow: "hidden",
            ...FONT_STYLE,
            fontSize: "13px",
            whiteSpace: "pre-wrap",
          }}
        >
          {formattedList}
        </div>
      </>
    );
  };

  return (
    <div className="shipping-label-container">
      {/* 인쇄 전용 스타일 */}
      <style>{`
        .shipping-label-container {
          font-family: "Nanum Gothic", "Malgun Gothic", "Dotum", sans-serif;
        }
        
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            margin: 0;
            padding: 0;
          }
          body * {
            visibility: hidden;
          }
          .shipping-label-container,
          .shipping-label-container * {
            visibility: visible !important;
          }
          .shipping-label-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 168mm !important;  /* 우체국 C형 세로 */
            height: 107mm !important; /* 우체국 C형 가로 */
            overflow: visible !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
          }
          .shipping-label-content {
            /* 인쇄 시 안정적인 크기 조정 - 우체국 C형 (168mm x 107mm) */
            /* 800px x 1200px를 168mm x 107mm에 맞추기 */
            /* 168mm ≈ 635px, 107mm ≈ 404px (96dpi 기준) */
            /* 가로: 404/800 = 0.505, 세로: 635/1200 = 0.529 */
            /* 가로에 맞추면: 0.505 사용 (가로가 더 작으므로) */
            width: 800px !important;
            height: 1200px !important;
            /* 인쇄 시 스케일 조정 제거 - 브라우저가 자동으로 맞춤 */
            transform: none !important;
            -webkit-transform: none !important;
            transform-origin: top left !important;
            -webkit-transform-origin: top left !important;
            overflow: visible !important; /* 집배코드가 잘리지 않도록 */
            page-break-inside: avoid !important;
            border: none !important; /* 인쇄 시 테두리 제거 */
            background: white !important; /* 배경색 명시 */
            /* 인쇄 시 크기 조정 */
            max-width: 168mm !important;
            max-height: 107mm !important;
          }
          
          /* 집배코드 인쇄 시 색상 유지 */
          .shipping-label-content > div {
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
          .shipping-label-container {
            border: none !important; /* 인쇄 시 테두리 제거 */
          }
          @page {
            size: 168mm 107mm; /* 용지 크기 설정 (세로 x 가로) */
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>

      {/* 라벨 배경 및 데이터 */}
      {/* 우체국 C형: 168mm x 107mm 사이즈로 출력되도록 설정 */}
      <div
        className="shipping-label-content"
        style={{
          position: "relative",
          width: "800px", // 원본 좌표계 기준 너비
          height: "1200px", // 원본 좌표계 기준 높이
          backgroundColor: "#fff",
          margin: "0 auto",
          border: "1px solid #ddd", // 화면에서 보이는 테두리 (인쇄 시 제거됨)
          /* 화면에서 볼 때 스케일 조정 */
          transform: "scale(0.8)", 
          transformOrigin: "top left",
          printColorAdjust: "exact", // 인쇄 시 색상 유지
          WebkitPrintColorAdjust: "exact",
        }}
      >
        {/* 저장된 레이아웃이 있으면 사용, 없으면 기존 하드코딩된 좌표 사용 */}
        {useCustomLayout ? (
          renderCustomLayout()
        ) : (
          <>
            {/* --- 1. 상단 정보 --- */}
            {/* 0차 출력 표시 */}
            <div style={{ 
              position: "absolute", 
              left: "20px", 
              top: "20px", 
              ...FONT_STYLE,
              fontSize: "14px",
              fontWeight: "bold"
            }}>
              0차 출력
            </div>
        
        {/* CSV 기준: 항목 2 - 송장출력일 (12px) */}
        {renderText('orderDate', `신청일: ${data.orderDate}`, { fontSize: "12px" })}
        {/* CSV 기준: 항목 9 - 수령자명 (12px) */}
        {renderText('recipientNameTop', data.recipientName, { fontSize: "12px" })}
        {/* CSV 기준: 항목 11 - 판매처 (12px) */}
        {renderText('sellerName', data.sellerName, { fontSize: "12px" })}
        {/* CSV 기준: 항목 14 - 주문번호 (12px) */}
        {renderText('orderNumber', `주문번호: ${data.orderNumber}`, { fontSize: "12px" })}
        
        {/* 상단 집배코드 - 우체국 표준 형식: "A1 110 02 09 - 021 -" */}
        {/* ① 집중국·물류센터 번호 ② 배달국(센터) 번호 ③ 집배팀 번호 ④ 집배구 번호 ⑤ 구분코스 */}
        {(data.sortCode1 || data.sortCode2 || data.sortCode3 || data.sortCode4) && (
          <div style={{
            position: "absolute",
            left: "363px", // CSV 기준 sortCode1의 X 좌표
            top: "12px",   // CSV 기준 sortCode1의 Y 좌표
            width: "500px", // 더 넓은 너비로 잘림 방지
            maxWidth: "none", // 최대 너비 제한 제거
            ...FONT_STYLE,
            fontSize: "35px",
            fontWeight: "bold", // 굵게 표시
            letterSpacing: "6px", // 코드 간 간격 조정
            whiteSpace: "nowrap",
            lineHeight: "1",
            overflow: "visible",
            textAlign: "left",
            zIndex: 10,
            color: "#000",
            printColorAdjust: "exact", // 인쇄 시 색상 유지
            WebkitPrintColorAdjust: "exact",
          }}>
            {/* 우체국 표준 형식: A1 110 02 09 - 021 - */}
            {/* ① 집중국·물류센터 번호 ② 배달국(센터) 번호 ③ 집배팀 번호 ④ 집배구 번호 ⑤ 구분코스 */}
            {[data.sortCode1, data.sortCode2, data.sortCode3, data.sortCode4]
              .filter(Boolean)
              .join(' ')}
            {data.deliverySequence && ` ${data.deliverySequence}`}
          </div>
        )}
        
        {/* 도착 집중국과 배달 우체국, 배달 지역 코드: "대구M 동대구 -560-" 형태 */}
        {/* 이지어드민 기준: 한 줄에 표시, 하이픈 포함 형식 */}
        {data.deliveryPlaceCode && data.deliveryTeamCode && data.deliverySequence && (() => {
          // deliverySequence가 하이픈 없이 숫자만 있으면 하이픈 추가
          let formattedSequence = data.deliverySequence;
          if (formattedSequence && !formattedSequence.includes('-')) {
            formattedSequence = `-${formattedSequence}-`;
          }
          return (
            <div style={{
              position: "absolute",
              left: "444px", // CSV 기준 deliveryPlaceCode의 X 좌표
              top: "70px",   // CSV 기준 deliveryPlaceCode의 Y 좌표
              ...FONT_STYLE,
              fontSize: "13px",
              fontWeight: "normal",
              whiteSpace: "nowrap",
              letterSpacing: "2px"
            }}>
              {data.deliveryPlaceCode} {data.deliveryTeamCode} {formattedSequence}
            </div>
          );
        })()}
        
        {/* 주문인 정보 */}
        <div style={{ position: "absolute", left: "20px", top: "100px", ...FONT_STYLE, fontSize: "11px" }}>
          주문인: {data.recipientName}
        </div>
        <div style={{ position: "absolute", left: "20px", top: "115px", ...FONT_STYLE, fontSize: "11px" }}>
          고객 주문처: 모두의수선 수기
        </div>
        {data.orderNumber && (
          <div style={{ position: "absolute", left: "20px", top: "133px", ...FONT_STYLE, fontSize: "11px" }}>
            주문번호: {data.orderNumber}
          </div>
        )}
        
        {/* 중량/용적/요금 */}
        <div style={{ position: "absolute", left: "20px", top: "153px", ...FONT_STYLE, fontSize: "11px" }}>
          중량:{data.weight || "2kg"} 용적:{data.volume || "60cm"} 요금: 신용 0
        </div>

        {/* --- 2. 보내는 분 --- */}
        <div style={{ 
          position: "absolute", 
          left: "350px", 
          top: "85px", 
          ...FONT_STYLE,
          fontSize: "14px",
          fontWeight: "bold"
        }}>
          보내는 분
        </div>
        {/* CSV 기준: 항목 19 - 송화인주소 (12px) */}
        {renderText('senderAddress', data.senderAddress, { whiteSpace: "normal", fontSize: "12px" })}
        {/* CSV 기준: 항목 20 - 송화인명 (12px) */}
        {renderText('senderName', data.senderName, { fontSize: "12px" })}
        {/* CSV 기준: 항목 21 - 송화인전화 (12px) */}
        {renderText('senderPhone', data.senderPhone, { fontSize: "12px" })}

        {/* --- 3. 받는 분 --- */}
        <div style={{ 
          position: "absolute", 
          left: "350px", 
          top: "195px", 
          ...FONT_STYLE,
          fontSize: "14px",
          fontWeight: "bold"
        }}>
          받는 분
        </div>
        {/* 우편번호 바코드 - 아래 숫자 제거를 위해 컨테이너로 감싸기 */}
        <div
          style={{
            position: "absolute",
            left: `${COORDS.recipientZipcodeBar[0]}px`,
            top: `${COORDS.recipientZipcodeBar[1]}px`,
            width: `${COORDS.recipientZipcodeBar[2]}px`,
            height: `${COORDS.recipientZipcodeBar[3] * 0.4}px`, // 높이를 40%로 더 줄여서 숫자 부분 완전히 제거
            overflow: "hidden",
            clipPath: "inset(0 0 60% 0)", // CSS clip-path로 아래 60% 부분 완전히 제거
            WebkitClipPath: "inset(0 0 60% 0)", // 웹킷 브라우저 지원
          }}
        >
          <img
            src={`https://barcode.tec-it.com/barcode.ashx?data=${data.recipientZipcode}&code=Code128&translate-esc=on&showastext=off`}
            alt="우편번호 바코드"
            style={{
              width: "100%",
              height: "auto",
              objectFit: "contain",
              objectPosition: "top",
              display: "block",
              transform: "scaleY(0.4)", // 세로 방향으로 축소하여 숫자 부분 제거
            }}
          />
        </div>
        
        {/* CSV 기준: 항목 23 - 수령자우편번호 (12px) */}
        {renderText('recipientZipcode', data.recipientZipcode, { fontSize: "12px", fontWeight: "normal" })}
        {/* CSV 기준: 항목 26 - 총상품수 (12px) */}
        {renderText('totalQuantity', `[총 ${data.totalQuantity}개]`, { fontSize: "12px" })}
        
        {/* CSV 기준: 항목 27 - 수령자주소 (14px) */}
        {renderText('recipientAddress', data.recipientAddress, { 
          whiteSpace: "normal", 
          fontSize: "14px", 
          fontWeight: "normal",
          lineHeight: "1.4"
        })}
        {/* CSV 기준: 항목 28 - 수령자명 (13px) */}
        {renderText('recipientName', data.recipientName, { fontSize: "13px", fontWeight: "normal" })}
        {/* CSV 기준: 항목 29 - 수령자핸드폰 (13px) */}
        {renderText('recipientPhone', data.recipientPhone, { fontSize: "13px" })}
        {/* CSV 기준: 항목 30 - 수령자전화번호 (13px) */}
        {renderText('recipientTel', data.recipientPhone, { fontSize: "13px" })}
        
        {/* --- 4. 운송장 번호 --- */}
        {/* 등기번호 레이블과 값 */}
        <div style={{ 
          position: "absolute", 
          left: "378px", 
          top: "335px", 
          ...FONT_STYLE,
          fontSize: "11px"
        }}>
          등기번호:
        </div>
        {/* CSV 기준: 항목 32 - 운송장번호 (12px) */}
        {renderText('trackingNoText', formatTrackingNo(data.trackingNo), { fontSize: "12px", fontWeight: "normal" })}
        
        {/* --- 5. 상품 리스트 --- */}
        {renderItemsList()}
        
        {/* --- 6. 운송장 바코드 --- */}
        {/* 바코드 이미지를 div로 감싸서 아래 숫자 부분 숨기기 (overflow: hidden으로 숫자 영역 제거) */}
        <div
          style={{
            position: "absolute",
            left: `${COORDS.trackingNoBarcode[0]}px`,
            top: `${COORDS.trackingNoBarcode[1]}px`,
            width: `${COORDS.trackingNoBarcode[2]}px`,
            height: `${COORDS.trackingNoBarcode[3] * 0.75}px`, // 높이를 75%로 줄여서 숫자 부분 제거
            overflow: "hidden",
          }}
        >
          <img
            src={`https://barcode.tec-it.com/barcode.ashx?data=${data.trackingNo}&code=Code128&translate-esc=on&dpi=203`}
            alt="운송장 바코드"
            style={{
              width: "100%",
              height: "auto",
              objectFit: "contain",
              objectPosition: "top",
              display: "block",
            }}
          />
        </div>
        
        {/* 바코드 아래 숫자 제거 (주석 처리) */}
        {/* {renderText('trackingNoBottom', formatTrackingNo(data.trackingNo), { 
          fontSize: "16px", 
          fontWeight: "bold", 
          textAlign: "center",
          letterSpacing: "2px" 
        })} */}
        
        {/* 출력된 송장 표시 */}
        <div style={{ 
          position: "absolute", 
          left: "13px", 
          top: "530px", 
          ...FONT_STYLE,
          fontSize: "12px",
          fontWeight: "bold",
          textAlign: "center",
          width: "780px"
        }}>
          ★모두의수선에서 출력된 송장입니다.★
        </div>
        
        {/* --- 7. 메모 --- CSV 기준: 항목 37 - 메모 (13px) */}
        {renderText('memo', data.memo, { fontSize: "13px" })}
        
            {/* 배경 그리드 (디버깅용 - 주석 처리) */}
            {/* 
            <div style={{
              position: "absolute",
              inset: 0,
              border: "1px solid red",
              pointerEvents: "none",
              zIndex: 100,
            }}>
              {Object.entries(COORDS).map(([key, [x, y, w, h]]) => (
                <div
                  key={key}
                  style={{
                    position: "absolute",
                    left: x,
                    top: y,
                    width: w,
                    height: h,
                    border: "1px dashed rgba(255,0,0,0.3)",
                    fontSize: "8px",
                    color: "red",
                  }}
                >
                  {key}
                </div>
              ))}
            </div>
            */}
          </>
        )}
      </div>
    </div>
  );
}
