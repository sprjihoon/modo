/**
 * 우체국 송장 라벨 컴포넌트
 * C형 라벨: 168mm x 107mm
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
            width: 168mm;
            height: 107mm;
            page-break-after: always;
          }
          @page {
            size: 168mm 107mm landscape;
            margin: 0;
          }
        }
      `}</style>

      <div
        className="shipping-label"
        style={{
          width: "168mm",
          height: "107mm",
          border: "2px solid #000",
          padding: "8mm",
          fontFamily: "Arial, sans-serif",
          fontSize: "10pt",
          backgroundColor: "#fff",
          position: "relative",
        }}
      >
        {/* C형 라벨 레이아웃 (168mm x 107mm - 가로형) */}
        <div style={{ display: "flex", height: "100%" }}>
          {/* 좌측 영역 - 송장번호 + 바코드 */}
          <div style={{ width: "60mm", borderRight: "2px solid #000", padding: "3mm", display: "flex", flexDirection: "column" }}>
            {/* 로고 */}
            <div style={{ textAlign: "center", marginBottom: "3mm", paddingBottom: "2mm", borderBottom: "1px solid #ccc" }}>
              <div style={{ fontSize: "16pt", fontWeight: "bold" }}>🧵 모두의수선</div>
              <div style={{ fontSize: "8pt", color: "#666" }}>우체국 택배</div>
            </div>

            {/* 운송장번호 */}
            <div style={{ textAlign: "center", marginBottom: "3mm" }}>
              <div style={{ fontSize: "8pt", color: "#666", marginBottom: "1mm" }}>운송장번호</div>
              <div style={{ fontSize: "14pt", fontWeight: "bold", letterSpacing: "1px", fontFamily: "monospace" }}>
                {data.trackingNo}
              </div>
            </div>

            {/* 바코드 영역 */}
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #ccc", backgroundColor: "#fff" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "monospace", fontSize: "7pt", color: "#999", marginBottom: "2mm" }}>
                  ||||| {data.trackingNo} |||||
                </div>
                <div style={{ fontSize: "6pt", color: "#999" }}>
                  바코드 스캔 영역
                </div>
              </div>
            </div>

            {/* 하단 정보 */}
            <div style={{ marginTop: "2mm", fontSize: "6pt", color: "#666", textAlign: "center" }}>
              <div>{data.orderNumber}</div>
              <div>{new Date().toLocaleDateString("ko-KR")}</div>
            </div>
          </div>

          {/* 우측 영역 - 주소 정보 */}
          <div style={{ flex: 1, padding: "3mm", display: "flex", flexDirection: "column" }}>
            {/* 발송인 */}
            <div style={{ marginBottom: "3mm", padding: "2mm", border: "1px solid #999", backgroundColor: "#f9f9f9" }}>
              <div style={{ fontSize: "8pt", fontWeight: "bold", marginBottom: "1mm", color: "#0066cc" }}>
                📤 발송인 (보내는 곳)
              </div>
              <div style={{ fontSize: "8pt", lineHeight: "1.3" }}>
                <div><strong>{data.senderName}</strong> ☎ {data.senderPhone}</div>
                <div>〒 {data.senderZipcode}</div>
                <div>{data.senderAddress}</div>
              </div>
            </div>

            {/* 수취인 */}
            <div style={{ marginBottom: "3mm", padding: "3mm", border: "2px solid #000" }}>
              <div style={{ fontSize: "9pt", fontWeight: "bold", marginBottom: "1mm" }}>
                📥 받는 분 (수취인)
              </div>
              <div style={{ fontSize: "10pt", lineHeight: "1.4" }}>
                <div style={{ fontSize: "12pt", fontWeight: "bold" }}>{data.recipientName}</div>
                <div>〒 {data.recipientZipcode}</div>
                <div>{data.recipientAddress}</div>
                <div>☎ {data.recipientPhone}</div>
              </div>
            </div>

            {/* 상품 정보 */}
            <div style={{ marginBottom: "2mm", padding: "2mm", border: "1px solid #ccc", fontSize: "8pt", display: "flex", justifyContent: "space-between" }}>
              <div><strong>품목:</strong> {data.goodsName}</div>
              <div><strong>중량:</strong> {data.weight || 2}kg</div>
            </div>

            {/* 커스텀 영역 */}
            <div style={{ flex: 1, display: "flex", gap: "2mm" }}>
              {/* 메모 */}
              {data.memo && (
                <div style={{ flex: 1, padding: "2mm", backgroundColor: "#fffbcc", border: "1px dashed #ffcc00", fontSize: "7pt" }}>
                  <div style={{ fontWeight: "bold", marginBottom: "1mm" }}>📝 메모</div>
                  <div style={{ lineHeight: "1.2" }}>{data.memo}</div>
                </div>
              )}

              {/* 특별 지시사항 + QR */}
              <div style={{ width: "25mm", display: "flex", flexDirection: "column", gap: "2mm" }}>
                {data.specialInstructions && (
                  <div style={{ padding: "2mm", backgroundColor: "#ffe6e6", border: "1px solid #ff6666", fontSize: "6pt", textAlign: "center" }}>
                    <div style={{ fontWeight: "bold" }}>⚠️</div>
                    <div>{data.specialInstructions}</div>
                  </div>
                )}
                {/* QR코드 */}
                <div style={{ width: "20mm", height: "20mm", border: "1px solid #ccc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "5pt", color: "#999", margin: "0 auto" }}>
                  QR
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

