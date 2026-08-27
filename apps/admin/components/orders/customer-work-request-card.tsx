"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, CalendarDays, MapPin, Phone, StickyNote, X } from "lucide-react";
import { WorkOrderPrintDialog } from "@/components/orders/work-order-print-dialog";
import { parseWorkOrderImages, customerRequestSummary } from "@/lib/work-order-images";
import { measurementLinesFromParts } from "@/lib/repair-parts";
import { formatOrderDate } from "@/lib/missing-pickup";

interface CustomerWorkRequestCardProps {
  order: any;
}

export function CustomerWorkRequestCard({ order }: CustomerWorkRequestCardProps) {
  const images = parseWorkOrderImages(order);
  const notes = (order?.notes ?? "").trim();
  const repairDetail = (order?.repair_detail ?? "").trim();
  const summary = customerRequestSummary(order);
  const measurements = measurementLinesFromParts(order?.repair_parts);
  const pinMemos = images.flatMap((image, imgIdx) =>
    (image.pins ?? [])
      .map((pin, pinIdx) => ({
        imgIdx,
        pinIdx,
        memo: (pin.memo ?? "").trim(),
      }))
      .filter((p) => p.memo)
  );
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const preview = previewIndex != null ? images[previewIndex] : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              고객 접수 내용
            </CardTitle>
            <CardDescription>
              고객이 주문 시 선택한 수거일, 주소, 사진, 요청 메모입니다
            </CardDescription>
          </div>
          <WorkOrderPrintDialog order={order} buttonClassName="w-auto" />
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              희망 수거일
            </p>
            <p className="mt-1 font-medium">
              {formatOrderDate(order?.pickup_date) || "날짜 미지정"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              수거 연락처
            </p>
            <p className="mt-1 font-medium">
              {order?.pickup_phone || order?.customer_phone || "없음"}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              수거지
            </p>
            <p className="mt-1 font-medium">
              {[order?.pickup_zipcode ? `[${order.pickup_zipcode}]` : null, order?.pickup_address, order?.pickup_address_detail]
                .filter(Boolean)
                .join(" ") || "주소 없음"}
            </p>
          </div>
        </div>

        <div>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <StickyNote className="h-3.5 w-3.5" />
            요청 메모
          </p>
          {notes || repairDetail ? (
            <p className="mt-1 whitespace-pre-wrap font-medium">
              {[notes, repairDetail].filter(Boolean).join("\n")}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              {summary === "수선 요청 정보 없음" ? "작성된 메모가 없습니다" : summary}
            </p>
          )}
        </div>

        {measurements.length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground">고객 입력 수치</p>
            <div className="mt-2 space-y-2">
              {measurements.map((line, idx) => (
                <div key={`${line.name}-${idx}`} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <p className="text-sm font-medium">{line.name}</p>
                  <p className="text-sm font-semibold text-emerald-800">{line.detail}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-sm text-muted-foreground mb-2">
            접수 사진 {images.length > 0 ? `${images.length}장` : ""}
          </p>
          {images.length === 0 ? (
            <p className="text-sm text-muted-foreground">첨부된 사진이 없습니다</p>
          ) : (
            <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {images.map((image, idx) => (
                <button
                  key={`${image.url}-${idx}`}
                  type="button"
                  className="relative aspect-square overflow-hidden rounded-lg border bg-gray-50 text-left"
                  onClick={() => setPreviewIndex(idx)}
                >
                  <img
                    src={image.url}
                    alt={`접수 사진 ${idx + 1}`}
                    className="h-full w-full object-contain"
                  />
                  {image.pins?.map((pin, pinIdx) => (
                    <span
                      key={pinIdx}
                      className="absolute w-5 h-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500 border-2 border-white text-[10px] font-bold text-white flex items-center justify-center shadow"
                      style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }}
                    >
                      {pinIdx + 1}
                    </span>
                  ))}
                  <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-white">
                    사진 {idx + 1}
                    {(image.pins?.length ?? 0) > 0 ? ` · 핀 ${image.pins?.length}` : ""}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {pinMemos.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm font-medium text-red-800 flex items-center gap-1.5 mb-2">
              <MapPin className="h-3.5 w-3.5" />
              수선 부위 메모
            </p>
            <div className="space-y-1.5">
              {pinMemos.map((item) => (
                <div key={`${item.imgIdx}-${item.pinIdx}`} className="flex items-start gap-2 text-sm bg-white rounded border border-red-100 px-2 py-1.5">
                  <span className="w-5 h-5 shrink-0 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                    {item.pinIdx + 1}
                  </span>
                  <p className="flex-1">
                    {item.memo}
                    <span className="text-muted-foreground ml-1">(사진 {item.imgIdx + 1})</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {preview && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewIndex(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-white rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <p className="font-medium">접수 사진 {previewIndex! + 1}</p>
              <button
                type="button"
                className="p-1 rounded hover:bg-gray-100"
                onClick={() => setPreviewIndex(null)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="relative bg-gray-50">
              <img
                src={preview.url}
                alt={`접수 사진 ${previewIndex! + 1}`}
                className="w-full max-h-[75vh] object-contain"
              />
              {preview.pins?.map((pin, pinIdx) => (
                <div
                  key={pinIdx}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }}
                >
                  <div className="w-7 h-7 rounded-full bg-red-500 border-2 border-white text-white text-xs font-bold flex items-center justify-center shadow-lg">
                    {pinIdx + 1}
                  </div>
                  {pin.memo && (
                    <div className="absolute left-8 top-0 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap max-w-[220px] truncate">
                      {pin.memo}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
