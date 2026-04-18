"use client";

import { useState, useRef, useCallback, useEffect } from "react";
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
  Move,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";

const MAX_PINS_PER_IMAGE = 5;
const MAX_IMAGES = 5;
const DRAG_THRESHOLD_PX = 5;

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

interface Toast {
  id: number;
  type: "info" | "warning" | "success";
  text: string;
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
  const [draggingPinId, setDraggingPinId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const imageRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragStateRef = useRef<{
    pinId: string;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const suppressNextContainerClickRef = useRef(false);

  function pushToast(type: Toast["type"], text: string) {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2200);
  }

  const uploadImages = useCallback(
    async (files: FileList) => {
      setUploadError(null);

      const remainingSlots = MAX_IMAGES - images.length;
      if (remainingSlots <= 0) {
        pushToast("warning", `사진은 최대 ${MAX_IMAGES}장까지 첨부할 수 있어요`);
        return;
      }

      const fileList = Array.from(files);
      const limitedFiles = fileList.slice(0, remainingSlots);
      if (fileList.length > limitedFiles.length) {
        pushToast(
          "warning",
          `최대 ${MAX_IMAGES}장까지만 가능해요 · ${limitedFiles.length}장만 업로드합니다`
        );
      }

      setUploading(true);
      const supabase = createClient();
      const uploaded: ImageEntry[] = [];

      for (const file of limitedFiles) {
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
        setActiveImageIdx((prev) => (prev === null ? images.length : prev));
      }
    },
    [images.length]
  );

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      uploadImages(e.target.files);
    }
    e.target.value = "";
  }

  function handleImageClick(e: React.MouseEvent<HTMLDivElement>) {
    if (activeImageIdx === null) return;

    if (suppressNextContainerClickRef.current) {
      suppressNextContainerClickRef.current = false;
      return;
    }

    const activeImage = images[activeImageIdx];
    if (!activeImage) return;

    if (activeImage.pins.length >= MAX_PINS_PER_IMAGE) {
      pushToast(
        "warning",
        `핀은 최대 ${MAX_PINS_PER_IMAGE}개까지 추가할 수 있어요`
      );
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setPendingPin({ x, y });
    setMemoInput("");
    setEditingPinId(null);
  }

  function confirmPin() {
    if (activeImageIdx === null || !pendingPin) return;

    const newPin: PinData = {
      id: uuidv4(),
      relative_x: pendingPin.x,
      relative_y: pendingPin.y,
      memo: memoInput.trim(),
    };

    setImages((prev) =>
      prev.map((img, idx) =>
        idx === activeImageIdx ? { ...img, pins: [...img.pins, newPin] } : img
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
    pushToast("info", "핀이 삭제되었습니다");
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    if (activeImageIdx === idx) {
      setActiveImageIdx(null);
    } else if (activeImageIdx !== null && activeImageIdx > idx) {
      setActiveImageIdx((prev) => (prev !== null ? prev - 1 : null));
    }
  }

  function handlePinPointerDown(
    e: React.PointerEvent<HTMLButtonElement>,
    pin: PinData
  ) {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragStateRef.current = {
      pinId: pin.id,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    };
  }

  function handlePinPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const state = dragStateRef.current;
    if (!state || !imageRef.current) return;

    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (!state.moved && distance < DRAG_THRESHOLD_PX) {
      return;
    }

    if (!state.moved) {
      state.moved = true;
      setDraggingPinId(state.pinId);
    }

    if (activeImageIdx === null) return;

    const rect = imageRef.current.getBoundingClientRect();
    const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const relY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    setImages((prev) =>
      prev.map((img, idx) =>
        idx === activeImageIdx
          ? {
              ...img,
              pins: img.pins.map((p) =>
                p.id === state.pinId
                  ? { ...p, relative_x: relX, relative_y: relY }
                  : p
              ),
            }
          : img
      )
    );
  }

  function handlePinPointerUp(
    e: React.PointerEvent<HTMLButtonElement>,
    pin: PinData
  ) {
    const state = dragStateRef.current;
    dragStateRef.current = null;

    try {
      (e.target as Element).releasePointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }

    if (state?.moved) {
      e.stopPropagation();
      suppressNextContainerClickRef.current = true;
      setDraggingPinId(null);
      pushToast("success", "핀 위치가 변경되었어요");
      return;
    }

    setDraggingPinId(null);

    if (editingPinId === pin.id) {
      setEditingPinId(null);
      setMemoInput("");
    } else {
      startEditPin(pin);
    }
  }

  function handlePinPointerCancel() {
    dragStateRef.current = null;
    setDraggingPinId(null);
  }

  // 안전망: 드래그 도중 컴포넌트가 언마운트되거나 포인터가 벗어나면 상태 정리
  useEffect(() => {
    function onWindowPointerUp() {
      if (dragStateRef.current?.moved) {
        suppressNextContainerClickRef.current = true;
      }
      dragStateRef.current = null;
      setDraggingPinId(null);
    }
    window.addEventListener("pointerup", onWindowPointerUp);
    window.addEventListener("pointercancel", onWindowPointerUp);
    return () => {
      window.removeEventListener("pointerup", onWindowPointerUp);
      window.removeEventListener("pointercancel", onWindowPointerUp);
    };
  }, []);

  function handleNext() {
    onNext(
      images.map((img) => ({
        imageUrl: img.imageUrl,
        pins: img.pins,
      }))
    );
  }

  const activeImage = activeImageIdx !== null ? images[activeImageIdx] : null;
  const reachedImageLimit = images.length >= MAX_IMAGES;
  const reachedPinLimit =
    activeImage !== null && activeImage.pins.length >= MAX_PINS_PER_IMAGE;

  return (
    <div className="flex flex-col h-full">
      {/* 설명 헤더 */}
      <div className="px-4 pt-4 pb-2">
        <p className="text-sm font-semibold text-gray-800">
          {clothingType} 사진을 찍어 수선 부위를 표시해 주세요
        </p>
        <p className="text-xs text-gray-400 mt-1">
          📍 탭: 핀 추가 · 🖐️ 드래그: 핀 이동 · 사진 {MAX_IMAGES}장, 핀 {MAX_PINS_PER_IMAGE}개까지 (선택사항)
        </p>
      </div>

      {/* 이미지 그리드 */}
      <div className="px-4 py-2 grid grid-cols-3 gap-2">
        {images.map((img, idx) => (
          <div
            key={img.imageUrl + idx}
            className={`relative aspect-square rounded-xl overflow-hidden border-2 cursor-pointer ${
              activeImageIdx === idx ? "border-[#00C896]" : "border-gray-200"
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
        {!reachedImageLimit && (
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
                <span className="text-[10px]">
                  사진 추가 ({images.length}/{MAX_IMAGES})
                </span>
              </>
            )}
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {reachedImageLimit && (
        <p className="px-4 text-[11px] text-gray-400">
          사진은 최대 {MAX_IMAGES}장까지 첨부할 수 있어요
        </p>
      )}

      {uploadError && (
        <p className="px-4 text-xs text-red-500">{uploadError}</p>
      )}

      {/* 핀 편집 영역 */}
      {activeImage && (
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="mt-3 mb-1 flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-600 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#00C896]" />
              {reachedPinLimit
                ? `핀 ${MAX_PINS_PER_IMAGE}개를 모두 사용했어요`
                : "이미지를 탭해 수선 부위를 표시하세요"}
            </p>
            <div className="flex items-center gap-1">
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  reachedPinLimit
                    ? "bg-orange-100 text-orange-600"
                    : "bg-[#00C896]/10 text-[#00C896]"
                }`}
              >
                {activeImage.pins.length}/{MAX_PINS_PER_IMAGE}
              </span>
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
            className={`relative w-full rounded-2xl overflow-hidden select-none bg-gray-100 ${
              reachedPinLimit ? "cursor-not-allowed" : "cursor-crosshair"
            }`}
            style={{ aspectRatio: "4/3", touchAction: "none" }}
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
            {activeImage.pins.map((pin, pinIdx) => {
              const isEditing = editingPinId === pin.id;
              const isDragging = draggingPinId === pin.id;
              const showLabel = pin.memo.trim().length > 0;
              return (
                <div
                  key={pin.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  style={{
                    left: `${pin.relative_x * 100}%`,
                    top: `${pin.relative_y * 100}%`,
                    zIndex: isDragging || isEditing ? 30 : 20,
                  }}
                >
                  {/* 메모 라벨 (핀 위쪽) */}
                  {showLabel && !isDragging && (
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 whitespace-nowrap max-w-[160px]">
                      <div
                        className={`px-2 py-0.5 rounded-md bg-white text-[11px] font-medium text-gray-800 shadow-md border truncate ${
                          isEditing ? "border-orange-400" : "border-gray-300"
                        }`}
                      >
                        {pin.memo}
                      </div>
                    </div>
                  )}

                  {/* 핀 본체 (드래그 가능) */}
                  <button
                    type="button"
                    aria-label={`핀 ${pinIdx + 1}`}
                    className={`pointer-events-auto relative -translate-x-0 -translate-y-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-lg border-2 border-white transition-transform touch-none ${
                      isEditing
                        ? "bg-orange-500 text-white scale-110"
                        : "bg-[#00C896] text-white"
                    } ${isDragging ? "scale-125 cursor-grabbing" : "cursor-grab active:scale-110"}`}
                    onPointerDown={(e) => handlePinPointerDown(e, pin)}
                    onPointerMove={handlePinPointerMove}
                    onPointerUp={(e) => handlePinPointerUp(e, pin)}
                    onPointerCancel={handlePinPointerCancel}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {pinIdx + 1}
                  </button>
                </div>
              );
            })}

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

            {/* 토스트 (이미지 영역 위) */}
            {toasts.length > 0 && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col gap-1 z-40 pointer-events-none">
                {toasts.map((t) => (
                  <div
                    key={t.id}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-semibold shadow-md ${
                      t.type === "warning"
                        ? "bg-orange-500 text-white"
                        : t.type === "success"
                        ? "bg-[#00C896] text-white"
                        : "bg-black/70 text-white"
                    }`}
                  >
                    {t.text}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 메모 입력 (새 핀 or 편집) */}
          {(pendingPin || editingPinId) && (
            <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-2xl">
              <p className="text-xs font-semibold text-orange-700 mb-2">
                {editingPinId ? "핀 메모 수정" : "핀 메모 입력 (선택)"}
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={memoInput}
                  onChange={(e) => setMemoInput(e.target.value)}
                  maxLength={200}
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
                  className="px-3 py-2 bg-orange-500 text-white text-xs font-semibold rounded-lg"
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
              <p className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                표시된 수선 부위
                <span className="text-[10px] text-gray-400 font-normal">
                  · 핀을 드래그해 위치를 옮길 수 있어요
                </span>
              </p>
              {activeImage.pins.map((pin, pinIdx) => (
                <div
                  key={pin.id}
                  className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-3 py-2.5"
                >
                  <div className="w-6 h-6 rounded-full bg-[#00C896] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {pinIdx + 1}
                  </div>
                  <p className="text-sm text-gray-700 flex-1 truncate">
                    {pin.memo || (
                      <span className="text-gray-400">메모 없음</span>
                    )}
                  </p>
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

          {activeImage.pins.length > 0 && (
            <div className="mt-2 flex items-center gap-1 text-[11px] text-gray-400">
              <Move className="w-3 h-3" />
              핀을 길게 눌러 드래그하면 위치를 변경할 수 있어요
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
