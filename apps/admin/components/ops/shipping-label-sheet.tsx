import React from "react";

export interface ShippingLabelData {
  trackingNo: string;
  
  // 주문 정보
  orderDate: string;
  recipientName: string;
  sellerName: string;
  orderNumber: string;
  customerOrderId?: string;
  customerOrderSource?: string;
  
  // 보내는 분 (송화인)
  senderAddress: string;
  senderName: string;
  senderPhone: string;
  
  // 받는 분 (수령자)
  recipientZipcode: string;
  recipientAddress: string;
  recipientPhone: string;
  recipientTel?: string;
  
  // 상품 정보
  totalQuantity: number;
  itemsList: string;
  memo?: string;
  
  // 기타
  weight?: string;
  volume?: string;
  deliveryCode?: string;
  
  // 우체국 분류 코드
  deliveryPlaceCode?: string;
  deliveryTeamCode?: string;
  deliverySequence?: string;
  
  // 집배코드조회 API 상세
  sortCode1?: string;
  sortCode2?: string;
  sortCode3?: string;
  sortCode4?: string;
  printAreaCd?: string;
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
  letterSpacing?: number; // 자간 (px)
  type: "text" | "barcode";
}

interface Props {
  data: ShippingLabelData;
  customLayout?: LabelLayoutElement[];
}

// 상수 정의
const LABEL_WIDTH_MM = 168; // 우체국 C형 송장 규격 (가로)
const LABEL_HEIGHT_MM = 107; // 우체국 C형 송장 규격 (세로)
const DPI = 96;

// 단위 변환
const mmToPx = (mm: number) => mm * (DPI / 25.4);
const pxToMm = (px: number) => px * (25.4 / DPI);

// 레이아웃 에디터 기준 상수
const BASE_WIDTH = 800; // 에디터 기준 너비 (px)
const BASE_HEIGHT = BASE_WIDTH * (LABEL_HEIGHT_MM / LABEL_WIDTH_MM); // 비율 유지

// 폰트 스타일
const FONT_STYLE = {
  fontFamily: "Nanum Gothic, Malgun Gothic, Dotum, sans-serif",
  lineHeight: "1.2",
  color: "#000",
};

// 기본 레이아웃 생성 (label-editor 로직과 동기화 + 예시 이미지 스타일 반영)
const createDefaultLayout = (): LabelLayoutElement[] => {
  const labelWidth = BASE_WIDTH - mmToPx(10);
  
  const scale = labelWidth / mmToPx(LABEL_WIDTH_MM);
  const scaleFont = (size: number) => Math.max(10, size * scale * 0.8);

  // px 단위 요소 정의
  const elements = [
    // 상단
    { fieldKey: "output_label", x: labelWidth / 2 - 40, y: 10, width: 80, height: 20, fontSize: scaleFont(14), isBold: true, type: "text" },
    // 집배코드: 잘리지 않으면서 적당한 크기로 조정
    { fieldKey: "sorting_code_large", x: labelWidth * 0.38, y: 5, width: 400, height: 55, fontSize: scaleFont(40), isBold: true, letterSpacing: 12, type: "text" },
    { fieldKey: "delivery_center_info", x: labelWidth * 0.54, y: 55, width: 250, height: 20, fontSize: scaleFont(15), isBold: true, letterSpacing: 10, type: "text" },
    
    // 좌측 열
    { fieldKey: "order_date", x: 10, y: 30, width: 150, height: 20, fontSize: scaleFont(12), isBold: false, type: "text" },
    { fieldKey: "orderer_name", x: 10, y: 55, width: 150, height: 18, fontSize: scaleFont(11), isBold: false, type: "text" },
    { fieldKey: "customer_order_source", x: 10, y: 78, width: 200, height: 18, fontSize: scaleFont(11), isBold: false, type: "text" },
    { fieldKey: "order_number", x: 10, y: 101, width: 150, height: 18, fontSize: scaleFont(11), isBold: false, type: "text" },
    { fieldKey: "package_info", x: 10, y: 124, width: 250, height: 18, fontSize: scaleFont(11), isBold: false, type: "text" },
    
    // 우편번호 바코드 (숫자 표시를 위해 높이 증가)
    { fieldKey: "zipcode_barcode", x: 10, y: 150, width: 120, height: 60, fontSize: scaleFont(12), isBold: false, type: "barcode" },
    { fieldKey: "total_quantity", x: 140, y: 155, width: 80, height: 20, fontSize: scaleFont(12), isBold: false, type: "text" },
    
    { fieldKey: "items_list", x: 10, y: 220, width: 250, height: 150, fontSize: scaleFont(13), isBold: false, type: "text" },
    
    // 우측 열 - 보내는 분
    { fieldKey: "sender_address", x: labelWidth * 0.43, y: 95, width: labelWidth * 0.55, height: 40, fontSize: scaleFont(12), isBold: false, type: "text" },
    { fieldKey: "sender_name", x: labelWidth * 0.43, y: 140, width: 100, height: 20, fontSize: scaleFont(12), isBold: false, type: "text" },
    { fieldKey: "sender_phone", x: labelWidth * 0.43 + 110, y: 140, width: 120, height: 20, fontSize: scaleFont(12), isBold: false, type: "text" },
    
    // 우측 열 - 받는 분
    { fieldKey: "receiver_address", x: labelWidth * 0.43, y: 170, width: labelWidth * 0.55, height: 40, fontSize: scaleFont(16), isBold: true, type: "text" }, // 폰트 키움
    { fieldKey: "receiver_name", x: labelWidth * 0.43, y: 220, width: 100, height: 22, fontSize: scaleFont(14), isBold: true, type: "text" },
    { fieldKey: "receiver_phone", x: labelWidth * 0.43 + 110, y: 220, width: 120, height: 22, fontSize: scaleFont(14), isBold: true, type: "text" },
    
    { fieldKey: "tracking_no_text", x: labelWidth * 0.43, y: 255, width: 250, height: 20, fontSize: scaleFont(12), isBold: false, type: "text" },
    { fieldKey: "waybill_statement", x: labelWidth * 0.43, y: 280, width: 300, height: 20, fontSize: scaleFont(12), isBold: true, type: "text" },
    
    // 등기번호 바코드 (하단, 숫자 표시)
    { fieldKey: "tracking_no_barcode", x: labelWidth * 0.43, y: 305, width: 280, height: 70, fontSize: scaleFont(12), isBold: false, type: "barcode" },
    
    // 하단
    { fieldKey: "bottom_info", x: 10, y: BASE_HEIGHT - mmToPx(10) - 25, width: 200, height: 20, fontSize: scaleFont(12), isBold: false, type: "text" },
  ];

  // px -> mm 변환
  const scaleFactor = BASE_WIDTH / mmToPx(LABEL_WIDTH_MM);

  return elements.map(el => ({
    fieldKey: el.fieldKey,
    x: pxToMm(el.x / scaleFactor),
    y: pxToMm(el.y / scaleFactor),
    width: pxToMm(el.width / scaleFactor),
    height: pxToMm(el.height / scaleFactor),
    fontSize: el.fontSize,
    isBold: el.isBold,
    borderColor: el.borderColor,
    letterSpacing: el.letterSpacing,
    type: el.type as "text" | "barcode"
  }));
};

// 운송장 번호 포맷팅
const formatTrackingNo = (trackingNo: string) => {
  if (!trackingNo) return '';
  const cleaned = trackingNo.replace(/[^0-9]/g, '');
  if (cleaned.length === 13) {
    return `${cleaned.substring(0, 5)}-${cleaned.substring(5, 9)}-${cleaned.substring(9, 13)}`;
  }
  return trackingNo;
};

// 데이터 매핑 함수
const mapFieldToActualValue = (fieldKey: string, data: ShippingLabelData): string => {
  const mapping: Record<string, (data: ShippingLabelData) => string> = {
    output_label: () => "0차 출력",
    sorting_code_large: (data) => {
      if (data.printAreaCd) return data.printAreaCd;
      // 존재하는 sortCode만 필터링하여 조합
      const codes = [data.sortCode1, data.sortCode2, data.sortCode3, data.sortCode4].filter(Boolean);
      if (codes.length > 0) {
        return codes.join(' ');
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
      return parts.join('  '); // 간격을 넓게 (공백 2개)
    },
    order_date: (data) => `신청일: ${data.orderDate || ''}`,
    orderer_name: (data) => `주문인: ${data.recipientName || ''}`,
    customer_order_source: (data) => `고객 주문처: ${data.customerOrderSource || '모두의수선'}`,
    order_number: (data) => `주문번호: ${data.orderNumber || ''}`,
    package_info: (data) => `중량:${data.weight || '2'}kg 용적:${data.volume || '60'}cm 요금: 신용 0`,
    zipcode_barcode: (data) => data.recipientZipcode || "",
    total_quantity: (data) => `[총 ${data.totalQuantity || 1}개]`,
    items_list: (data) => {
      if (data.itemsList) {
        if (typeof data.itemsList === 'string') return data.itemsList;
        if (Array.isArray(data.itemsList)) return (data.itemsList as string[]).map((item, idx) => `${idx + 1}. ${item}`).join('\n');
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
    waybill_statement: (data) => "모두의수선에서 제공되는 서비스입니다.", // 예시 이미지는 "★글로박스..."지만 기본값은 유지
    tracking_no_barcode: (data) => data.trackingNo || "",
    bottom_info: (data) => `[총 ${data.totalQuantity || 1}개] [0회 재출력]`,
  };

  const mapper = mapping[fieldKey];
  return mapper ? mapper(data) : "";
};

export function ShippingLabelSheet({ data, customLayout }: Props) {
  // 레이아웃 결정: customLayout이 유효하면 사용, 아니면 기본값 생성
  const layout = customLayout && customLayout.length > 0 ? customLayout : createDefaultLayout();

  // 실제 출력 크기 (168mm x 107mm @ 96 DPI)
  const actualWidthPx = 635; // 168mm
  
  // 레이아웃 저장 기준 너비 (800px) - 폰트 스케일용
  const layoutBaseWidthPx = 800;
  const fontScaleFactor = actualWidthPx / layoutBaseWidthPx;

  return (
    <div className="shipping-label-container">
      <style>{`
        .shipping-label-container {
          font-family: "Nanum Gothic", "Malgun Gothic", "Dotum", sans-serif;
        }
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
            overflow: hidden !important;
          }
          .shipping-label-container, .shipping-label-container * {
            visibility: visible !important;
          }
          .shipping-label-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 168mm !important;
            height: 106.5mm !important; /* 2장 출력 방지를 위해 미세하게 줄임 */
            overflow: hidden !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
          }
          .shipping-label-content {
            width: 635px !important;
            height: 404px !important;
            transform: none !important;
            border: none !important;
            background: white !important;
          }
          @page { size: 168mm 107mm; margin: 0 !important; }
        }
      `}</style>

      <div
        className="shipping-label-content"
        style={{
          position: "relative",
          width: "635px",
          height: "404px",
          backgroundColor: "#fff",
          margin: "0 auto",
          border: "1px solid #ddd",
          transform: "none", // 화면 미리보기 시 원본 크기 유지 (스케일 제거)
          transformOrigin: "top center",
          printColorAdjust: "exact",
          WebkitPrintColorAdjust: "exact",
        }}
      >
        {layout.map((element, index) => {
          // mm -> px 변환 (96 DPI) - 실제 출력 크기(646px)에 맞음
          const x = mmToPx(element.x);
          const y = mmToPx(element.y);
          const width = mmToPx(element.width);
          const height = mmToPx(element.height);
          
          // 폰트 크기는 저장된 값이 에디터 기준(800px) 픽셀값이므로 스케일 조정 필요
          const fontSize = element.fontSize * fontScaleFactor;

          const actualValue = mapFieldToActualValue(element.fieldKey, data);
          if (!actualValue) return null;

          if (element.type === "barcode") {
            // tec-it 바코드 생성 URL
            // showastext 옵션을 제거하여 숫자 표시 (기본값)
            // 우편번호나 등기번호 바코드 아래 숫자가 나오도록 함
            const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${actualValue}&code=Code128&dpi=203&translate-esc=on`;
            
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
                  border: element.borderColor ? `2px solid ${element.borderColor}` : "none",
                }}
              >
                <img
                  src={barcodeUrl}
                  alt={`${element.fieldKey} 바코드`}
                  style={{
                    width: "100%",
                    height: "100%", // 꽉 채우기
                    objectFit: "contain", // 비율 유지하며 맞춤
                    display: "block",
                  }}
                />
              </div>
            );
          } else {
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
                  fontSize: `${fontSize}px`,
                  fontWeight: element.isBold ? "bold" : "normal",
                  whiteSpace: "pre-wrap",
                  overflow: "visible", // 줄바꿈 허용, 잘리지 않도록
                  wordBreak: "break-word",
                  border: element.borderColor ? `2px solid ${element.borderColor}` : "none",
                  padding: element.borderColor ? "2px" : "0",
                  lineHeight: "1.2",
                  letterSpacing: element.letterSpacing ? `${element.letterSpacing}px` : "normal", // 동적 자간 적용
                }}
              >
                {actualValue}
              </div>
            );
          }
        })}
      </div>
    </div>
  );
}
