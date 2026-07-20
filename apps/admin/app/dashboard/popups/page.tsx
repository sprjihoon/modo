"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

interface PopupItem {
  title: string;
  description: string;
}

interface Popup {
  id: string;
  subtitle: string | null;
  title: string;
  highlight_text: string | null;
  items: PopupItem[];
  cta_text: string;
  dismiss_label: string;
  dismiss_hours: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  display_priority: number;
  created_at: string;
  updated_at: string;
}

function toDatetimeLocal(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(value: string) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function renderTitle(title: string, highlight: string | null) {
  if (!highlight || !title.includes(highlight)) {
    return <span className="whitespace-pre-line">{title}</span>;
  }
  const parts = title.split(highlight);
  return (
    <span className="whitespace-pre-line">
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && (
            <span className="text-[#00C896]">{highlight}</span>
          )}
        </span>
      ))}
    </span>
  );
}

export default function PopupsPage() {
  const [popups, setPopups] = useState<Popup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPopup, setEditingPopup] = useState<Popup | null>(null);

  useEffect(() => {
    loadPopups();
  }, []);

  const loadPopups = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/popups");
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "팝업을 불러올 수 없습니다.");
      }
      setPopups(result.data || []);
    } catch (e: any) {
      setError(e.message || "팝업을 불러올 수 없습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/popups/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentStatus }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "상태 변경에 실패했습니다.");
      }
      loadPopups();
    } catch (e: any) {
      alert(e.message || "상태 변경에 실패했습니다.");
    }
  };

  const deletePopup = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      const response = await fetch(`/api/admin/popups/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "삭제에 실패했습니다.");
      }
      loadPopups();
    } catch (e: any) {
      alert(e.message || "삭제에 실패했습니다.");
    }
  };

  const movePriority = async (id: string, direction: "up" | "down") => {
    const sorted = [...popups].sort(
      (a, b) => b.display_priority - a.display_priority
    );
    const currentIndex = sorted.findIndex((p) => p.id === id);
    if (currentIndex < 0) return;
    if (
      (direction === "up" && currentIndex === 0) ||
      (direction === "down" && currentIndex === sorted.length - 1)
    ) {
      return;
    }
    const targetIndex =
      direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const current = sorted[currentIndex];
    const target = sorted[targetIndex];

    try {
      await Promise.all([
        fetch(`/api/admin/popups/${current.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ display_priority: target.display_priority }),
        }),
        fetch(`/api/admin/popups/${target.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ display_priority: current.display_priority }),
        }),
      ]);
      loadPopups();
    } catch {
      alert("우선순위 변경에 실패했습니다.");
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold mb-2">오류 발생</h3>
          <p className="text-red-600 whitespace-pre-wrap">{error}</p>
          <Button onClick={loadPopups} className="mt-4">
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  const sorted = [...popups].sort(
    (a, b) => b.display_priority - a.display_priority
  );

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">팝업 관리</h1>
          <p className="text-gray-600 mt-1">
            홈 화면에 표시되는 안내 팝업을 관리합니다
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingPopup(null);
            setShowModal(true);
          }}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          팝업 추가
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div className="bg-white rounded-lg border p-12 text-center">
          <p className="text-gray-500 mb-4">등록된 팝업이 없습니다</p>
          <Button onClick={() => setShowModal(true)}>첫 팝업 만들기</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map((popup, index) => (
            <div
              key={popup.id}
              className="bg-white rounded-lg border p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-6">
                {/* 미리보기 */}
                <div className="w-64 shrink-0 rounded-2xl border bg-white shadow-sm p-4">
                  {popup.subtitle && (
                    <p className="text-[10px] font-semibold tracking-wide text-[#00C896] text-center mb-1">
                      {popup.subtitle}
                    </p>
                  )}
                  <p className="text-sm font-bold text-gray-900 text-center leading-snug mb-3">
                    {renderTitle(popup.title, popup.highlight_text)}
                  </p>
                  <div className="space-y-2 mb-3">
                    {(popup.items || []).slice(0, 2).map((item, i) => (
                      <div
                        key={i}
                        className="rounded-lg bg-gray-50 px-2.5 py-2"
                      >
                        <p className="text-[11px] font-bold text-gray-900">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-gray-600">
                          {item.description}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="w-full rounded-lg bg-[#00C896] text-white text-center text-xs font-bold py-2">
                    {popup.cta_text}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-4 gap-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-1 whitespace-pre-line">
                        {popup.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                        <span>우선순위: {popup.display_priority}</span>
                        <span>숨김: {popup.dismiss_hours}시간</span>
                        {popup.starts_at && (
                          <span>
                            시작: {new Date(popup.starts_at).toLocaleString("ko-KR")}
                          </span>
                        )}
                        {popup.ends_at && (
                          <span>
                            종료: {new Date(popup.ends_at).toLocaleString("ko-KR")}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleActive(popup.id, popup.is_active)}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium shrink-0 ${
                        popup.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {popup.is_active ? (
                        <>
                          <Check className="mr-1 h-3 w-3" />
                          활성
                        </>
                      ) : (
                        <>
                          <X className="mr-1 h-3 w-3" />
                          비활성
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => movePriority(popup.id, "up")}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => movePriority(popup.id, "down")}
                      disabled={index === sorted.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingPopup(popup);
                        setShowModal(true);
                      }}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      수정
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deletePopup(popup.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      삭제
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <PopupModal
          popup={editingPopup}
          onClose={() => {
            setShowModal(false);
            setEditingPopup(null);
          }}
          onSuccess={() => {
            setShowModal(false);
            setEditingPopup(null);
            loadPopups();
          }}
        />
      )}
    </div>
  );
}

function PopupModal({
  popup,
  onClose,
  onSuccess,
}: {
  popup: Popup | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [subtitle, setSubtitle] = useState(popup?.subtitle || "");
  const [title, setTitle] = useState(popup?.title || "");
  const [highlightText, setHighlightText] = useState(
    popup?.highlight_text || ""
  );
  const [items, setItems] = useState<PopupItem[]>(
    popup?.items?.length
      ? popup.items
      : [
          { title: "", description: "" },
          { title: "", description: "" },
        ]
  );
  const [ctaText, setCtaText] = useState(popup?.cta_text || "확인");
  const [dismissLabel, setDismissLabel] = useState(
    popup?.dismiss_label || "오늘 그만보기"
  );
  const [dismissHours, setDismissHours] = useState(popup?.dismiss_hours ?? 24);
  const [isActive, setIsActive] = useState(popup?.is_active ?? true);
  const [displayPriority, setDisplayPriority] = useState(
    popup?.display_priority ?? 0
  );
  const [startsAt, setStartsAt] = useState(toDatetimeLocal(popup?.starts_at ?? null));
  const [endsAt, setEndsAt] = useState(toDatetimeLocal(popup?.ends_at ?? null));
  const [isSaving, setIsSaving] = useState(false);

  const updateItem = (
    index: number,
    field: keyof PopupItem,
    value: string
  ) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const payload = {
        subtitle: subtitle || null,
        title,
        highlight_text: highlightText || null,
        items: items.filter((i) => i.title.trim() || i.description.trim()),
        cta_text: ctaText,
        dismiss_label: dismissLabel,
        dismiss_hours: dismissHours,
        is_active: isActive,
        display_priority: displayPriority,
        starts_at: fromDatetimeLocal(startsAt),
        ends_at: fromDatetimeLocal(endsAt),
      };

      const url = popup
        ? `/api/admin/popups/${popup.id}`
        : "/api/admin/popups";
      const method = popup ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "저장에 실패했습니다.");
      }
      onSuccess();
    } catch (e: any) {
      alert(e.message || "저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">
            {popup ? "팝업 수정" : "팝업 추가"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="rounded-2xl border bg-gray-50 p-4">
            <p className="text-xs text-gray-500 mb-3">미리보기</p>
            <div className="bg-white rounded-2xl border shadow-sm px-5 py-5 max-w-[300px] mx-auto">
              {subtitle && (
                <p className="text-xs font-semibold tracking-wide text-[#00C896] text-center mb-2">
                  {subtitle}
                </p>
              )}
              <p className="text-lg font-bold text-gray-900 text-center leading-snug mb-4">
                {renderTitle(title || "제목을 입력하세요", highlightText || null)}
              </p>
              <div className="space-y-2 mb-4">
                {items
                  .filter((i) => i.title || i.description)
                  .map((item, i) => (
                    <div key={i} className="rounded-xl bg-gray-50 px-3 py-2.5">
                      <p className="text-sm font-bold text-gray-900">
                        {item.title || "항목 제목"}
                      </p>
                      <p className="text-sm text-gray-600">
                        {item.description || "설명"}
                      </p>
                    </div>
                  ))}
              </div>
              <label className="flex items-center justify-center gap-2 mb-3 text-xs text-gray-500">
                <input type="checkbox" disabled className="h-3.5 w-3.5" />
                {dismissLabel || "오늘 그만보기"}
              </label>
              <div className="w-full rounded-xl bg-[#00C896] text-white text-center text-sm font-bold py-3">
                {ctaText || "확인"}
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="subtitle">상단 문구</Label>
            <Input
              id="subtitle"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="예: OPENING SOON"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="title">제목 *</Label>
            <Textarea
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={"웹 서비스\n정식 오픈 예정"}
              rows={2}
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="highlight">강조 문구</Label>
            <Input
              id="highlight"
              value={highlightText}
              onChange={(e) => setHighlightText(e.target.value)}
              placeholder="제목 안에서 초록색으로 강조할 문구"
              className="mt-1"
            />
          </div>

          <div className="space-y-3">
            <Label>본문 항목</Label>
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-2 gap-3">
                <Input
                  value={item.title}
                  onChange={(e) => updateItem(index, "title", e.target.value)}
                  placeholder={`항목 ${index + 1} 제목`}
                />
                <Input
                  value={item.description}
                  onChange={(e) =>
                    updateItem(index, "description", e.target.value)
                  }
                  placeholder={`항목 ${index + 1} 설명`}
                />
              </div>
            ))}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setItems((prev) => [...prev, { title: "", description: "" }])
                }
              >
                항목 추가
              </Button>
              {items.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setItems((prev) => prev.slice(0, -1))}
                >
                  마지막 항목 삭제
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cta">확인 버튼 텍스트</Label>
              <Input
                id="cta"
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="dismissLabel">오늘 그만보기 체크박스 문구</Label>
              <Input
                id="dismissLabel"
                value={dismissLabel}
                onChange={(e) => setDismissLabel(e.target.value)}
                placeholder="오늘 그만보기"
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dismissHours">숨김 시간 (시간)</Label>
              <Input
                id="dismissHours"
                type="number"
                min={0}
                value={dismissHours}
                onChange={(e) => setDismissHours(Number(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="priority">우선순위</Label>
              <Input
                id="priority"
                type="number"
                value={displayPriority}
                onChange={(e) =>
                  setDisplayPriority(Number(e.target.value) || 0)
                }
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                숫자가 클수록 먼저 표시됩니다
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startsAt">시작 일시 (선택)</Label>
              <Input
                id="startsAt"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="endsAt">종료 일시 (선택)</Label>
              <Input
                id="endsAt"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="isActive"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="isActive">활성화</Label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-primary hover:bg-primary/90"
            >
              {isSaving ? "저장 중..." : "저장"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
