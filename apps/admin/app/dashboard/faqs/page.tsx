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
  HelpCircle,
} from "lucide-react";

interface Faq {
  id: string;
  question: string;
  answer: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function FaqsPage() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingFaq, setEditingFaq] = useState<Faq | null>(null);

  useEffect(() => {
    loadFaqs();
  }, []);

  const loadFaqs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/faqs");
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "FAQ를 불러올 수 없습니다.");
      }
      setFaqs(result.data || []);
    } catch (e: any) {
      setError(e.message || "FAQ를 불러올 수 없습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/faqs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentStatus }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "상태 변경에 실패했습니다.");
      }
      loadFaqs();
    } catch (e: any) {
      alert(e.message || "상태 변경에 실패했습니다.");
    }
  };

  const deleteFaq = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      const response = await fetch(`/api/admin/faqs/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "삭제에 실패했습니다.");
      }
      loadFaqs();
    } catch (e: any) {
      alert(e.message || "삭제에 실패했습니다.");
    }
  };

  const moveOrder = async (id: string, direction: "up" | "down") => {
    const sorted = [...faqs].sort((a, b) => a.display_order - b.display_order);
    const currentIndex = sorted.findIndex((f) => f.id === id);
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
        fetch(`/api/admin/faqs/${current.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ display_order: target.display_order }),
        }),
        fetch(`/api/admin/faqs/${target.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ display_order: current.display_order }),
        }),
      ]);
      loadFaqs();
    } catch {
      alert("순서 변경에 실패했습니다.");
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
          <Button onClick={loadFaqs} className="mt-4">
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  const sorted = [...faqs].sort((a, b) => a.display_order - b.display_order);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">FAQ 관리</h1>
          <p className="text-gray-600 mt-1">
            고객센터 · 자주 묻는 질문 내용을 관리합니다
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingFaq(null);
            setShowModal(true);
          }}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          FAQ 추가
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div className="bg-white rounded-lg border p-12 text-center">
          <HelpCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">등록된 FAQ가 없습니다</p>
          <Button onClick={() => setShowModal(true)}>첫 FAQ 만들기</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((faq, index) => (
            <div
              key={faq.id}
              className="bg-white rounded-lg border p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="flex flex-col gap-1 pt-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={index === 0}
                    onClick={() => moveOrder(faq.id, "up")}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={index === sorted.length - 1}
                    onClick={() => moveOrder(faq.id, "down")}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-400 font-medium">
                      #{faq.display_order}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        faq.is_active
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {faq.is_active ? "노출중" : "숨김"}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    <span className="text-[#00C896] mr-1">Q.</span>
                    {faq.question}
                  </p>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-3 whitespace-pre-wrap">
                    <span className="text-gray-400 mr-1">A.</span>
                    {faq.answer}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActive(faq.id, faq.is_active)}
                  >
                    {faq.is_active ? (
                      <>
                        <X className="h-3.5 w-3.5 mr-1" />
                        숨기기
                      </>
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1" />
                        노출
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingFaq(faq);
                      setShowModal(true);
                    }}
                  >
                    <Edit className="h-3.5 w-3.5 mr-1" />
                    수정
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => deleteFaq(faq.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <FaqModal
          faq={editingFaq}
          onClose={() => {
            setShowModal(false);
            setEditingFaq(null);
          }}
          onSuccess={() => {
            setShowModal(false);
            setEditingFaq(null);
            loadFaqs();
          }}
        />
      )}
    </div>
  );
}

function FaqModal({
  faq,
  onClose,
  onSuccess,
}: {
  faq: Faq | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [question, setQuestion] = useState(faq?.question ?? "");
  const [answer, setAnswer] = useState(faq?.answer ?? "");
  const [displayOrder, setDisplayOrder] = useState(
    faq?.display_order?.toString() ?? ""
  );
  const [isActive, setIsActive] = useState(faq?.is_active ?? true);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {
        question,
        answer,
        is_active: isActive,
      };
      if (displayOrder.trim() !== "") {
        const n = Number(displayOrder);
        if (!Number.isFinite(n) || n < 0) {
          throw new Error("표시 순서는 0 이상 숫자여야 합니다.");
        }
        payload.display_order = n;
      }

      const url = faq ? `/api/admin/faqs/${faq.id}` : "/api/admin/faqs";
      const method = faq ? "PUT" : "POST";
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
      <div className="bg-white rounded-lg max-w-xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">
            {faq ? "FAQ 수정" : "FAQ 추가"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <Label htmlFor="question">질문 *</Label>
            <Input
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="예: 수선에는 얼마나 걸리나요?"
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="answer">답변 *</Label>
            <Textarea
              id="answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="고객에게 보여줄 답변을 입력하세요"
              rows={6}
              required
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="order">표시 순서</Label>
              <Input
                id="order"
                type="number"
                min={0}
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                placeholder="비우면 자동"
                className="mt-1"
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4"
                />
                고객 앱/웹에 노출
              </label>
            </div>
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
