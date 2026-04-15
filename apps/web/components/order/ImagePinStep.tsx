"use client";

import { useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { ImageWithPins } from "./OrderNewClient";
import {
  Camera,
  X,
  Pin,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MapPin,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";

interface PinData {
  id: string;
  relative_x: number;
  relative_y: number;
  memo: string;
}

interface ImageEntry {
  imageUrl: string;
  pins: PinData[];
}

interface Props {
  clothingType: string;
  initialImages: ImageWithPins[];
  onNext: (imagesWithPins: ImageWithPins[]) => void;
  onBack: () => void;
}

export function ImagePinStep({ clothingType, initialImages, onNext, onBack }: Props) {
  const [images, setImages] = useState<ImageEntry[]>(
    initialImages.length > 0
      ? initialImages.map((i) => ({
          imageUrl: i.imageUrl,
          pins: i.pins,
        }))
      : []
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState<number | null>(null);
  const [pendingPin, setPendingPin] = useState<{ x: number; y: number } | null>(null);
  const [memoInput, setMemoInput] = useState("");
  const [editingPinId, setEditingPinId] = useState<string | null>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadImages = useCallback(async (files: FileList) => {
    setUploading(true);
    setUploadError(null);
    const supabase = createClient();
    const uploaded: ImageEntry[] = [];

    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop() ?? "jpg";
      const fileName = `${Date.now()}-${uuidv4()}.${ext}`;
      const storagePath = `orders/${fileName}`;

      const { error } = await supabase.storage
        .from("order-images")
        .upload(storagePath, file, { contentType: file.type });

      if (error) {
        setUploadError("일부 이미지 업로드에 실패했습니다.");
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("order-images")
        .getPublicUrl(storagePath);

      uploaded.push({ imageUrl: urlData.publicUrl, pins: [] });
    }

    setImages((prev) => [...prev, ...uploaded]);
    setUploading(false);

    if (uploaded.length > 0) {
      setActiveImageIdx((prev) =>
        prev === null ? images.length : prev
      );
    }
  }, [images.length]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      uploadImages(e.target.files);
    }
    e.target.value = "";
  }

  function handleImageClick(e: React.MouseEvent<HTMLDivElement>) {
    if (activeImageIdx === null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setPendingPin({ x, y });
    setMemoInput("");
    setEditingPinId(null);
  }

  function confirmPin() {
    if (activeImageIdx === null || !pendingPin) return;
    if (!memoInput.trim()) return;

    const newPin: PinData = {
      id: uuidv4(),
      relative_x: pendingPin.x,
      relative_y: pendingPin.y,
      memo: memoInput.trim(),
    };

    setImages((prev) =>
      prev.map((img, idx) =>
        idx === activeImageIdx
          ? { ...img, pins: [...img.pins, newPin] }
          : img
      )
    );
    setPendingPin(null);
    setMemoInput("");
  }

  function startEditPin(pin: PinData) {
    setEditingPinId(pin.id);
    setMemoInput(pin.memo);
    setPendingPin(null);
  }

  function confirmEditPin() {
    if (!editingPinId || activeImageIdx === null) return;
    setImages((prev) =>
      prev.map((img, idx) =>
        idx === activeImageIdx
          ? {
              ...img,
              pins: img.pins.map((p) =>
                p.id === editingPinId ? { ...p, memo: memoInput.trim() } : p
              ),
            }
          : img
      )
    );
    setEditingPinId(null);
    setMemoInput("");
  }

  function deletePin(pinId: string) {
    if (activeImageIdx === null) return;
    setImages((prev) =>
      prev.map((img, idx) =>
        idx === activeImageIdx
          ? { ...img, pins: img.pins.filter((p) => p.id !== pinId) }
          : img
      )
    );
    if (editingPinId === pinId) {
      setEditingPinId(null);
      setMemoInput("");
    }
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    if (activeImageIdx === idx) {
      setActiveImageIdx(null);
    } else if (activeImageIdx !== null && activeImageIdx > idx) {
      setActiveImageIdx((prev) => (prev !== null ? prev - 1 : null));
    }
  }

  function handleNext() {
    onNext(
      images.map((img) => ({
        imageUrl: img.imageUrl,
        pins: img.pins,
      }))
    );
  }

  const activeImage = activeImageIdx !== null ? images[activeImageIdx] : null;

  return (
    <div className="flex flex-col h-full">
      {/* 설명 헤더 */}
      <div className="px-4 pt-4 pb-2">
        <p className="text-sm font-semibold text-gray-800">
          {clothingType} 사진을 찍어 수선 부위를 표시해 주세요
        </p>
        <p className="text-xs text-gray-400 mt-1">
          사진을 탭하면 핀을 추가할 수 있어요 · 선택사항 (건너뛰기 가능)
        </p>
      </div>

      {/* 이미지 그리드 */}
      <div className="px-4 py-2 grid grid-cols-3 gap-2">
        {images.map((img, idx) => (
          <div
            key={img.imageUrl + idx}
            className={`relative aspect-square rounded-xl overflow-hidden border-2 cursor-pointer ${
              activeImageIdx === idx
                ? "border-[#00C896]"
                : "border-gray-200"
            }`}
            onClick={() => {
              setActiveImageIdx(idx);
              setPendingPin(null);
              setEditingPinId(null);
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.imageUrl}
              alt={`사진 ${idx + 1}`}
              className="w-full h-full object-cover"
            />
            {img.pins.length > 0 && (
              <div className="absolute top-1 left-1 bg-[#00C896] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {img.pins.length}
              </div>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeImage(idx);
              }}
              className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        {/* 사진 추가 버튼 */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-[#00C896] hover:text-[#00C896] transition-colors"
        >
          {uploading ? (
            <div className="w-5 h-5 border-2 border-[#00C896] border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Camera className="w-5 h-5" />
              <span className="text-[10px]">사진 추가</span>
            </>
          )}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {uploadError && (
        <p className="px-4 text-xs text-red-500">{uploadError}</p>
      )}

      {/* 핀 편집 영역 */}
      {activeImage && (
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="mt-3 mb-1 flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-600 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#00C896]" />
              이미지를 탭해 수선 부위를 표시하세요
            </p>
            <div className="flex gap-1">
              <button
                onClick={() =>
                  setActiveImageIdx((prev) =>
                    prev !== null && prev > 0 ? prev - 1 : prev
                  )
                }
                disabled={activeImageIdx === 0}
                className="p-1 rounded text-gray-400 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-400 self-center">
                {(activeImageIdx ?? 0) + 1} / {images.length}
              </span>
              <button
                onClick={() =>
                  setActiveImageIdx((prev) =>
                    prev !== null && prev < images.length - 1 ? prev + 1 : prev
                  )
                }
                disabled={activeImageIdx === images.length - 1}
                className="p-1 rounded text-gray-400 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 핀 에디터 */}
          <div
            ref={imageRef}
            className="relative w-full rounded-2xl overflow-hidden select-none cursor-crosshair bg-gray-100"
            style={{ aspectRatio: "4/3" }}
            onClick={handleImageClick}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeImage.imageUrl}
              alt="주석 이미지"
              className="w-full h-full object-contain pointer-events-none"
              draggable={false}
            />

            {/* 기존 핀들 */}
            {activeImage.pins.map((pin, pinIdx) => (
              <button
                key={pin.id}
                className={`absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-lg border-2 border-white transition-transform active:scale-110 ${
                  editingPinId === pin.id
                    ? "bg-orange-500 text-white scale-110"
                    : "bg-[#00C896] text-white"
                }`}
                style={{
                  left: `${pin.relative_x * 100}%`,
                  top: `${pin.relative_y * 100}%`,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (editingPinId === pin.id) {
                    setEditingPinId(null);
                    setMemoInput("");
                  } else {
                    startEditPin(pin);
                  }
                }}
              >
                {pinIdx + 1}
              </button>
            ))}

            {/* 배치 예정 핀 (미확정) */}
            {pendingPin && (
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-orange-400 flex items-center justify-center shadow-lg border-2 border-white animate-pulse pointer-events-none"
                style={{
                  left: `${pendingPin.x * 100}%`,
                  top: `${pendingPin.y * 100}%`,
                }}
              >
                <Pin className="w-3.5 h-3.5 text-white" />
              </div>
            )}
          </div>

          {/* 메모 입력 (새 핀 or 편집) */}
          {(pendingPin || editingPinId) && (
            <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-2xl">
              <p className="text-xs font-semibold text-orange-700 mb-2">
                {editingPinId ? "핀 메모 수정" : "핀 메모 입력"}
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={memoInput}
                  onChange={(e) => setMemoInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      editingPinId ? confirmEditPin() : confirmPin();
                    }
                    if (e.key === "Escape") {
                      setPendingPin(null);
                      setEditingPinId(null);
                    }
                  }}
                  placeholder="예: 소매 끝 헤짐, 지퍼 교체 등"
                  autoFocus
                  className="flex-1 text-sm border border-orange-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                />
                <button
                  onClick={editingPinId ? confirmEditPin : confirmPin}
                  disabled={!memoInput.trim()}
                  className="px-3 py-2 bg-orange-500 text-white text-xs font-semibold rounded-lg disabled:opacity-40"
                >
                  저장
                </button>
                <button
                  onClick={() => {
                    setPendingPin(null);
                    setEditingPinId(null);
                    setMemoInput("");
                  }}
                  className="px-3 py-2 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg"
                >
                  취소
                </button>
              </div>
              {editingPinId && (
                <button
                  onClick={() => deletePin(editingPinId)}
                  className="mt-2 flex items-center gap-1 text-xs text-red-500"
                >
                  <Trash2 className="w-3 h-3" /> 이 핀 삭제
                </button>
              )}
            </div>
          )}

          {/* 핀 목록 */}
          {activeImage.pins.length > 0 && !pendingPin && !editingPinId && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-semibold text-gray-600">표시된 수선 부위</p>
              {activeImage.pins.map((pin, pinIdx) => (
                <div
                  key={pin.id}
                  className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-3 py-2.5"
                >
                  <div className="w-6 h-6 rounded-full bg-[#00C896] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {pinIdx + 1}
                  </div>
                  <p className="text-sm text-gray-700 flex-1">{pin.memo}</p>
                  <div className="flex gap-1">
                    <button
                      onClick={() => startEditPin(pin)}
                      className="text-xs text-gray-400 px-2 py-1 rounded-lg hover:bg-gray-100"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => deletePin(pin.id)}
                      className="text-xs text-red-400 px-2 py-1 rounded-lg hover:bg-red-50"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeImage.pins.length === 0 && !pendingPin && (
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
              <Plus className="w-4 h-4" />
              이미지를 탭해서 수선이 필요한 부위에 핀을 추가하세요
            </div>
          )}
        </div>
      )}

      {/* 이미지가 없을 때 빈 안내 */}
      {images.length === 0 && !uploading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
            <Camera className="w-8 h-8 text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700">
              의류 사진을 추가해 보세요
            </p>
            <p className="text-xs text-gray-400 mt-1">
              사진을 보내주시면 수선 담당자가 더 정확하게 확인할 수 있어요
            </p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-2 flex items-center gap-2 px-5 py-3 bg-[#00C896] text-white text-sm font-semibold rounded-xl"
          >
            <Camera className="w-4 h-4" /> 사진 추가하기
          </button>
        </div>
      )}

      {/* 하단 버튼 */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-3 flex gap-2">
        <button onClick={onBack} className="btn-outline px-5 py-4">
          이전
        </button>
        <button
          onClick={handleNext}
          disabled={uploading}
          className="btn-brand flex-1 py-4"
        >
          {images.length > 0
            ? `사진 ${images.length}장 첨부 → 다음`
            : "건너뛰기"}
        </button>
      </div>
    </div>
  );
}
