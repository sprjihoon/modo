/**
 * 우체국 송장 라벨 컴포넌트
 * 표준 크기: 100mm x 150mm (A6)
 * 인쇄 최적화 포함
 */

import React from "react";

export interface ShippingLabelData {
  trackingNo: string;
  
  // 발송인 (센터)
  senderName: string;
  senderZipcode: string;
  senderAddress: string;
  senderPhone: string;
  
  // 수취인 (고객)
  recipientName: string;
  recipientZipcode: string;
  recipientAddress: string;
  recipientPhone: string;
  
  // 상품 정보
  goodsName: string;
  weight?: number;
  
  // 커스텀 정보
  orderNumber?: string;
  memo?: string;
  specialInstructions?: string;
}

interface Props {
  data: ShippingLabelData;
}

export function ShippingLabelSheet({ data }: Props) {
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
            width: 100mm;
            height: 150mm;
            page-break-after: always;
          }
          @page {
            size: 100mm 150mm;
            margin: 0;
          }
        }
      `}</style>

      <div
        className="shipping-label"
        style={{
          width: "100mm",
          height: "150mm",
          border: "2px solid #000",
          padding: "8mm",
          fontFamily: "Arial, sans-serif",
          fontSize: "10pt",
          backgroundColor: "#fff",
          position: "relative",
        }}
      >
        {/* 헤더 - 로고 및 타이틀 */}
        <div style={{ textAlign: "center", marginBottom: "4mm", borderBottom: "2px solid #000", paddingBottom: "3mm" }}>
          <div style={{ fontSize: "18pt", fontWeight: "bold", marginBottom: "2mm" }}>
            🧵 모두의수선
          </div>
          <div style={{ fontSize: "12pt", fontWeight: "bold" }}>
            우체국 택배 송장
          </div>
        </div>

        {/* 운송장번호 + 바코드 */}
        <div style={{ textAlign: "center", margin: "4mm 0", padding: "3mm", backgroundColor: "#f0f0f0" }}>
          <div style={{ fontSize: "9pt", marginBottom: "2mm", color: "#666" }}>운송장번호</div>
          <div style={{ fontSize: "16pt", fontWeight: "bold", letterSpacing: "2px", fontFamily: "monospace" }}>
            {data.trackingNo}
          </div>
          {/* 바코드 영역 (실제 바코드 라이브러리 사용 권장) */}
          <div style={{ marginTop: "3mm", height: "12mm", backgroundColor: "#fff", border: "1px solid #ccc", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontFamily: "monospace", fontSize: "8pt", color: "#999" }}>
              ||||| {data.trackingNo} |||||
            </div>
          </div>
        </div>

        {/* 발송인 정보 */}
        <div style={{ marginBottom: "3mm", padding: "3mm", border: "1px solid #ccc", backgroundColor: "#f9f9f9" }}>
          <div style={{ fontSize: "9pt", fontWeight: "bold", marginBottom: "2mm", color: "#0066cc" }}>
            📤 발송인
          </div>
          <div style={{ fontSize: "9pt", lineHeight: "1.4" }}>
            <div><strong>{data.senderName}</strong></div>
            <div>〒 {data.senderZipcode}</div>
            <div>{data.senderAddress}</div>
            <div>☎ {data.senderPhone}</div>
          </div>
        </div>

        {/* 수취인 정보 */}
        <div style={{ marginBottom: "3mm", padding: "3mm", border: "2px solid #000" }}>
          <div style={{ fontSize: "10pt", fontWeight: "bold", marginBottom: "2mm" }}>
            📥 수취인
          </div>
          <div style={{ fontSize: "10pt", lineHeight: "1.5" }}>
            <div style={{ fontSize: "12pt", fontWeight: "bold" }}>{data.recipientName}</div>
            <div>〒 {data.recipientZipcode}</div>
            <div>{data.recipientAddress}</div>
            <div>☎ {data.recipientPhone}</div>
          </div>
        </div>

        {/* 상품 정보 */}
        <div style={{ marginBottom: "3mm", padding: "2mm", border: "1px solid #ccc", fontSize: "9pt" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <strong>품목:</strong> {data.goodsName}
            </div>
            <div>
              <strong>중량:</strong> {data.weight || 2}kg
            </div>
          </div>
        </div>

        {/* 커스텀 영역 - 메모 */}
        {data.memo && (
          <div style={{ marginBottom: "2mm", padding: "2mm", backgroundColor: "#fffbcc", border: "1px dashed #ffcc00", fontSize: "8pt" }}>
            <div style={{ fontWeight: "bold", marginBottom: "1mm" }}>📝 작업 메모</div>
            <div>{data.memo}</div>
          </div>
        )}

        {/* 특별 지시사항 */}
        {data.specialInstructions && (
          <div style={{ marginBottom: "2mm", padding: "2mm", backgroundColor: "#ffe6e6", border: "1px solid #ff6666", fontSize: "8pt" }}>
            <div style={{ fontWeight: "bold", marginBottom: "1mm" }}>⚠️ 특별 지시사항</div>
            <div>{data.specialInstructions}</div>
          </div>
        )}

        {/* 하단 - QR코드 및 주문번호 */}
        <div style={{ position: "absolute", bottom: "8mm", left: "8mm", right: "8mm", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #ccc", paddingTop: "2mm" }}>
          <div style={{ fontSize: "7pt", color: "#666" }}>
            {data.orderNumber && (
              <div>주문번호: {data.orderNumber}</div>
            )}
            <div>인쇄일시: {new Date().toLocaleString("ko-KR")}</div>
          </div>
          {/* QR코드 영역 (실제 QR 라이브러리 사용 권장) */}
          <div style={{ width: "15mm", height: "15mm", border: "1px solid #ccc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "6pt", color: "#999" }}>
            QR
          </div>
        </div>
      </div>
    </div>
  );
}

