"use client";

import { MapPin } from "lucide-react";

export interface WorkOrderData {
  trackingNo: string;
  outboundTrackingNo?: string;
  customerName: string;
  customerPhone?: string;
  itemName: string;
  summary: string;
  repairParts?: string[];
  images?: WorkOrderImage[];
}

export interface WorkOrderImage {
  url: string;
  pins?: WorkOrderPin[];
}

export interface WorkOrderPin {
  x: number;
  y: number;
  memo: string;
}

export function WorkOrderSheet({ data }: { data: WorkOrderData }) {
  const imageCount = data.images?.length || 0;
  const getImageLayout = () => {
    if (imageCount === 0) return { cols: 0, rows: 0 };
    if (imageCount === 1) return { cols: 1, rows: 1 };
    if (imageCount === 2) return { cols: 2, rows: 1 };
    if (imageCount <= 4) return { cols: 2, rows: 2 };
    if (imageCount <= 6) return { cols: 3, rows: 2 };
    return { cols: 3, rows: 3 };
  };
  const layout = getImageLayout();
  // 핀을 가진 사진 인덱스 수집 (수선 요청 상세 참조용)
  const photoIndexesWithPins = (data.images || [])
    .map((img, idx) => (img.pins && img.pins!.length > 0 ? idx + 1 : null))
    .filter((v): v is number => !!v);

  return (
    <div
      className="work-order-container w-full bg-white"
      style={{
        width: "210mm",
        height: "297mm",
        padding: "8mm",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        border: "1px solid #e5e7eb",
      }}
    >
      {/* print 전용 스타일: 스크롤 제거 및 잘림 방지 */}
      <style>{`
        @media print {
          .work-order-container {
            page-break-after: avoid !important;
            page-break-before: avoid !important;
            page-break-inside: avoid !important;
            max-height: 297mm !important;
            height: 297mm !important;
            overflow: hidden !important;
            border: none !important;
          }
          .pin-memo-list { 
            max-height: none !important; 
            overflow: visible !important; 
          }
          .pin-memo-item { 
            page-break-inside: avoid !important; 
          }
        }
      `}</style>
      <div
        style={{
          flexBasis: "40%",
          maxHeight: "40%",
          position: "relative",
          overflow: "hidden",
          marginBottom: 12,
          borderRadius: 8,
          border: "1px solid #e5e7eb",
          backgroundColor: "#f9fafb",
        }}
      >
        {imageCount > 0 && (
          <div
            className="grid gap-2 h-full w-full"
            style={{
              gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
              gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
            }}
          >
            {data.images?.map((image, idx) => (
              <div
                key={idx}
                className="relative bg-gray-50 overflow-hidden"
                style={{ width: "100%", height: "100%" }}
              >
                <img
                  src={image.url}
                  alt={`사진 ${idx + 1}`}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    display: "block",
                  }}
                />
                {image.pins?.map((pin, pinIdx) => (
                  <div
                    key={pinIdx}
                    className="absolute"
                    style={{
                      left: `${pin.x * 100}%`,
                      top: `${pin.y * 100}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <div className="relative">
                      <div className="w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                        <span className="text-white text-xs font-bold">{pinIdx + 1}</span>
                      </div>
                      {pin.memo && (
                        <div className="absolute left-8 top-0 bg-black bg-opacity-80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                          {pin.memo}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div className="absolute bottom-1 left-1 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                  사진 {idx + 1}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <div className="border-b-2 border-gray-800 pb-1">
          <h1 className="text-xl font-bold text-gray-900">작업 지시서</h1>
          <p className="text-xs text-gray-600 mt-0.5">Work Order Sheet</p>
        </div>
        <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-gray-50 rounded text-xs">
          <div>
            <label className="text-xs font-medium text-gray-600">입고 송장번호</label>
            <p className="text-xs font-mono font-semibold mt-0 break-all leading-tight">{data.trackingNo}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">출고 송장번호</label>
            <p className="text-xs font-mono font-semibold mt-0 break-all leading-tight">
              {data.outboundTrackingNo || "-"}
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">고객명</label>
            <p className="text-xs font-semibold mt-0 leading-tight">{data.customerName}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">전화번호</label>
            <p className="text-xs font-semibold mt-0 leading-tight">
              {data.customerPhone ? (
                <a href={`tel:${data.customerPhone}`} className="text-blue-600 hover:underline">
                  {data.customerPhone}
                </a>
              ) : (
                "-"
              )}
            </p>
          </div>
        </div>
        <div className="p-1.5 border border-gray-300 rounded text-xs">
          <label className="text-xs font-medium text-gray-600">수선 항목</label>
          <p className="text-xs font-bold mt-0 leading-tight">{data.itemName}</p>
          {data.repairParts && data.repairParts.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {data.repairParts.map((part, idx) => (
                <span key={idx} className="px-1 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                  {part}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="p-1.5 border border-gray-300 rounded text-xs">
          <label className="text-xs font-medium text-gray-600">수선 요청 상세</label>
          <p className="text-xs mt-0 whitespace-pre-wrap leading-tight">{data.summary}</p>
          {photoIndexesWithPins.length > 0 && (
            <p className="text-[11px] text-gray-500 mt-0.5">
              참조 사진: {photoIndexesWithPins.join(", ")}
            </p>
          )}
        </div>
        {data.images && data.images.some((img) => img.pins && img.pins.length > 0) && (
          <div className="p-1.5 border-2 border-red-200 bg-red-50 rounded text-xs">
            <label className="text-xs font-bold text-gray-800 flex items-center gap-1 mb-0.5">
              <MapPin className="h-3 w-3 text-red-600" />
              수선 부위 메모 (핀 위치별)
            </label>
            <div className="pin-memo-list mt-0.5 space-y-0.5">
              {data.images.map((image, imgIdx) =>
                image.pins?.map((pin, pinIdx) => {
                  if (!pin.memo || pin.memo.trim() === "") return null;
                  return (
                    <div key={`${imgIdx}-${pinIdx}`} className="pin-memo-item flex items-start gap-1 text-xs bg-white p-1 rounded border border-red-200">
                      <span className="w-3.5 h-3.5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                        {pinIdx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-gray-800 font-medium leading-tight text-xs">{pin.memo}</span>
                        <span className="text-gray-500 text-xs ml-1">(사진 {imgIdx + 1})</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
        <div className="mt-1 p-1.5 border border-gray-300 rounded text-xs">
          <div className="grid grid-cols-3 gap-1.5">
            <div>
              <label className="text-xs font-medium text-gray-600">작업자</label>
              <div className="mt-3 border-b border-gray-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">검수자</label>
              <div className="mt-3 border-b border-gray-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">완료일시</label>
              <div className="mt-3 border-b border-gray-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

