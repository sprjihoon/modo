/**
 * 우체국 출고송장 (신형 C형) 컴포넌트
 * 규격: 107mm x 168mm (세로형)
 * 좌표 기준: 제공된 이미지 좌표 (가로 800px 기준) -> 세로형으로 변환 필요?
 * 
 * [중요] 제공된 좌표(X=765 등)는 가로가 긴 형태입니다.
 * 하지만 "107*168"은 세로가 긴 형태입니다.
 * 만약 송장이 가로로 출력되어 스티커가 세로로 나오는 방식이라면
 * CSS에서 rotate(90deg)가 필요할 수 있습니다.
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
}

interface Props {
  data: ShippingLabelData;
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
  
  // 분류 코드 (상단) - 이지어드민 송장 기준
  sortCode1: [300, 30, 80, 30],            // 경1 (좌측)
  sortCode2: [400, 30, 80, 30],            // 701
  sortCode3: [500, 30, 80, 30],            // 56
  sortCode4: [600, 30, 80, 30],            // 05 (우측)
  
  deliverySequence: [511, 13, 120, 50],    // -560- (가장 큼, 중앙 상단)
  deliveryPlaceCode: [444, 70, 120, 20],   // 대구M (중앙)
  deliveryTeamCode: [611, 70, 120, 20],    // 동대구 (우측)
  
  memo: [13, 566, 800, 22],                // 37
};

// 폰트 스타일
const FONT_STYLE = {
  fontFamily: "Malgun Gothic, Dotum, sans-serif", // 한글 폰트
  fontSize: "12px",
  lineHeight: "1.2",
  color: "#000",
};

export function ShippingLabelSheet({ data }: Props) {
  // 운송장 번호 포맷팅 (xxxxx-xxxx-xxxx 형식)
  const formatTrackingNo = (trackingNo: string) => {
    if (!trackingNo) return '';
    // 13자리 숫자를 5-4-4 형식으로 변환
    const cleaned = trackingNo.replace(/[^0-9]/g, '');
    if (cleaned.length === 13) {
      return `${cleaned.substring(0, 5)}-${cleaned.substring(5, 9)}-${cleaned.substring(9, 13)}`;
    }
    return trackingNo;
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
        
        {/* 상품 목록 */}
        <div
          style={{
            position: "absolute",
            left: `${x}px`,
            top: `${y}px`,
            width: `${w}px`,
            height: `${h}px`,
            overflow: "hidden",
            ...FONT_STYLE,
            fontSize: "11px",
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
        @media print {
          body * {
            visibility: hidden;
          }
          .shipping-label-container,
          .shipping-label-container * {
            visibility: visible;
          }
          .shipping-label-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 107mm;  /* 우체국 C형 가로 */
            height: 168mm; /* 우체국 C형 세로 */
            /* 내용이 크면 축소 */
            transform: scale(0.5); 
            transform-origin: top left;
          }
          @page {
            size: 107mm 168mm; /* 용지 크기 설정 */
            margin: 0;
          }
        }
      `}</style>

      {/* 라벨 배경 및 데이터 */}
      <div
        style={{
          position: "relative",
          width: "800px", // 원본 좌표계 기준 너비
          height: "1200px", // 원본 좌표계 기준 높이 (세로형으로 확장)
          backgroundColor: "#fff",
          margin: "0 auto",
          border: "1px solid #ddd",
          /* 화면에서 볼 때 스케일 조정 (선택사항) */
          transform: "scale(0.8)", 
          transformOrigin: "top left"
        }}
      >
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
        
        {renderText('orderDate', `신청일: ${data.orderDate}`)}
        {renderText('recipientNameTop', data.recipientName)}
        {renderText('sellerName', data.sellerName)}
        {renderText('orderNumber', `주문번호: ${data.orderNumber}`)}
        
        {/* 상단 분류 코드 - 우체국 자동 분류용 */}
        {/* 상세 분류 코드: 경1 701 56 05 */}
        {data.sortCode1 && renderText('sortCode1', data.sortCode1, { 
          fontSize: "24px", 
          fontWeight: "bold",
          textAlign: "center" 
        })}
        {data.sortCode2 && renderText('sortCode2', data.sortCode2, { 
          fontSize: "24px", 
          fontWeight: "bold",
          textAlign: "center" 
        })}
        {data.sortCode3 && renderText('sortCode3', data.sortCode3, { 
          fontSize: "24px", 
          fontWeight: "bold",
          textAlign: "center" 
        })}
        {data.sortCode4 && renderText('sortCode4', data.sortCode4, { 
          fontSize: "24px", 
          fontWeight: "bold",
          textAlign: "center" 
        })}
        
        {/* 배달 지역 코드: -560- (가운데 크게) */}
        {data.deliverySequence && renderText('deliverySequence', data.deliverySequence, { 
          fontSize: "40px", 
          fontWeight: "900",
          textAlign: "center",
          letterSpacing: "1px"
        })}
        
        {/* 도착 집중국과 배달 우체국: 대구M 동대구 */}
        {data.deliveryPlaceCode && renderText('deliveryPlaceCode', data.deliveryPlaceCode, { 
          fontSize: "18px", 
          fontWeight: "bold",
          textAlign: "center" 
        })}
        {data.deliveryTeamCode && renderText('deliveryTeamCode', data.deliveryTeamCode, { 
          fontSize: "18px", 
          fontWeight: "bold",
          textAlign: "center" 
        })}
        
        {/* 주문인 정보 */}
        <div style={{ position: "absolute", left: "20px", top: "100px", ...FONT_STYLE, fontSize: "11px" }}>
          주문인: {data.recipientName}
        </div>
        <div style={{ position: "absolute", left: "20px", top: "115px", ...FONT_STYLE, fontSize: "11px" }}>
          고객 주문처: {data.sellerName} 수기
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
        {renderText('senderAddress', data.senderAddress, { whiteSpace: "normal", fontSize: "13px" })}
        {renderText('senderName', data.senderName)}
        {renderText('senderPhone', data.senderPhone)}

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
        {/* 우편번호 바코드 */}
        <img
          src={`https://barcode.tec-it.com/barcode.ashx?data=${data.recipientZipcode}&code=Code128&translate-esc=on`}
          alt="우편번호 바코드"
          style={{
            position: "absolute",
            left: `${COORDS.recipientZipcodeBar[0]}px`,
            top: `${COORDS.recipientZipcodeBar[1]}px`,
            width: `${COORDS.recipientZipcodeBar[2]}px`,
            height: `${COORDS.recipientZipcodeBar[3]}px`,
            objectFit: "contain",
          }}
        />
        
        {renderText('recipientZipcode', data.recipientZipcode, { fontSize: "14px", fontWeight: "bold" })}
        {renderText('totalQuantity', `[총 ${data.totalQuantity}개]`)}
        
        {renderText('recipientAddress', data.recipientAddress, { 
          whiteSpace: "normal", 
          fontSize: "16px", 
          fontWeight: "bold",
          lineHeight: "1.4"
        })}
        {renderText('recipientName', data.recipientName, { fontSize: "16px", fontWeight: "bold" })}
        {renderText('recipientPhone', data.recipientPhone, { fontSize: "14px" })}
        {/* 받는 분 전화번호 2번째 줄 (동일 번호) */}
        {renderText('recipientTel', data.recipientPhone, { fontSize: "14px" })}
        
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
        {renderText('trackingNoText', formatTrackingNo(data.trackingNo), { fontSize: "14px", fontWeight: "bold" })}
        
        {/* --- 5. 상품 리스트 --- */}
        {renderItemsList()}
        
        {/* --- 6. 운송장 바코드 --- */}
        <img
          src={`https://barcode.tec-it.com/barcode.ashx?data=${data.trackingNo}&code=Code128&translate-esc=on&dpi=203`}
          alt="운송장 바코드"
          style={{
            position: "absolute",
            left: `${COORDS.trackingNoBarcode[0]}px`,
            top: `${COORDS.trackingNoBarcode[1]}px`,
            width: `${COORDS.trackingNoBarcode[2]}px`,
            height: `${COORDS.trackingNoBarcode[3]}px`,
            objectFit: "contain",
          }}
        />
        
        {renderText('trackingNoBottom', formatTrackingNo(data.trackingNo), { 
          fontSize: "16px", 
          fontWeight: "bold", 
          textAlign: "center",
          letterSpacing: "2px" 
        })}
        
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
          ★글로박스에서 출력된 송장입니다.★
        </div>
        
        {/* --- 7. 메모 --- */}
        {renderText('memo', data.memo, { fontSize: "11px" })}
        
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
      </div>
    </div>
  );
}
