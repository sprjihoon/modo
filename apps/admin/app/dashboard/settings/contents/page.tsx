"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Loader2, Image as ImageIcon, Plus, Trash2, ArrowUp, ArrowDown, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import * as React from "react";

interface EasyGuideStep {
  emoji: string;
  title: string;
  desc: string;
}

interface AppContentMetadata {
  steps?: EasyGuideStep[];
}

interface AppContent {
  key: string;
  title: string;
  content: string;
  images?: string[] | null;
  metadata?: AppContentMetadata | null;
  updated_at: string;
}

export default function ContentsPage() {
  const [contents, setContents] = useState<AppContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchContents();
  }, []);

  const fetchContents = async () => {
    try {
      const res = await fetch("/api/admin/settings/contents");
      const json = await res.json();
      if (json.success) {
        setContents(
          (json.data || []).map((item: AppContent) => ({
            ...item,
            images: Array.isArray((item as any).images) ? (item as any).images : [],
            metadata:
              item.metadata && typeof item.metadata === "object"
                ? item.metadata
                : {},
          }))
        );
      } else {
        alert("컨텐츠 로드 실패: " + json.error);
      }
    } catch (e) {
      alert("컨텐츠 로드 중 오류 발생");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (
    key: string,
    payload: { content?: string; images?: string[]; metadata?: AppContentMetadata }
  ) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/contents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, ...payload }),
      });
      const json = await res.json();
      if (json.success) {
        alert("저장되었습니다.");
        fetchContents();
      } else {
        alert("저장 실패: " + json.error);
      }
    } catch (e) {
      alert("저장 중 오류 발생");
    } finally {
      setSaving(false);
    }
  };

  const getContent = (key: string) => contents.find(c => c.key === key)?.content || "";
  const getImages = (key: string) => contents.find(c => c.key === key)?.images || [];
  const getMetadata = (key: string) =>
    contents.find(c => c.key === key)?.metadata ?? {};

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">앱 컨텐츠 관리</h1>
          <p className="text-muted-foreground">
            쉬운가이드, 이용약관, 개인정보처리방침, 결제 · 취소 · 환불 정책 내용을 관리합니다
          </p>
        </div>
      </div>

      {/* 가격표 안내 배너 (가격표는 별도 메뉴에서 관리) */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-900">
          <p className="font-semibold">가격표는 어디서 관리하나요?</p>
          <p className="text-blue-800 mt-1">
            가격표는 <Link href="/dashboard/repair-types" className="underline font-medium">수선 종류 관리</Link> 메뉴에서 입력한
            데이터(<code className="px-1 py-0.5 rounded bg-blue-100 text-xs">repair_types</code>)가 웹/모바일 가격 안내에 자동으로 반영됩니다.
            여기서는 별도로 관리하지 않습니다.
          </p>
        </div>
      </div>

      <Tabs defaultValue="easy_guide" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="easy_guide">쉬운가이드</TabsTrigger>
          <TabsTrigger value="terms_of_service">이용약관</TabsTrigger>
          <TabsTrigger value="privacy_policy">개인정보처리방침</TabsTrigger>
          <TabsTrigger value="refund_policy">결제 · 환불</TabsTrigger>
        </TabsList>

        <TabsContent value="easy_guide">
          <EasyGuideEditor
            description="이용 방법(쉬운가이드)에 표시될 단계를 관리합니다. 단계는 추가/삭제/순서 변경이 가능하며, 웹과 모바일 앱에 동일하게 반영됩니다."
            intro={getContent("easy_guide")}
            steps={(getMetadata("easy_guide").steps as EasyGuideStep[] | undefined) ?? []}
            onSave={(intro, steps) =>
              handleSave("easy_guide", { content: intro, metadata: { steps } })
            }
            saving={saving}
          />
        </TabsContent>

        <TabsContent value="terms_of_service">
          <ContentEditor
            title="서비스 이용약관"
            description="앱에서 표시되는 서비스 이용약관 전문을 수정합니다."
            value={getContent("terms_of_service")}
            images={getImages("terms_of_service")}
            onSave={(val: string, imgs: string[]) =>
              handleSave("terms_of_service", { content: val, images: imgs })
            }
            saving={saving}
          />
        </TabsContent>

        <TabsContent value="privacy_policy">
          <ContentEditor
            title="개인정보처리방침"
            description="앱에서 표시되는 개인정보처리방침 전문을 수정합니다."
            value={getContent("privacy_policy")}
            images={getImages("privacy_policy")}
            onSave={(val: string, imgs: string[]) =>
              handleSave("privacy_policy", { content: val, images: imgs })
            }
            saving={saving}
          />
        </TabsContent>

        <TabsContent value="refund_policy">
          <ContentEditor
            title="결제 · 취소 · 환불 정책"
            description="결제수단, 주문 취소, 환불 처리 등에 관한 정책 전문을 수정합니다. (PG사 심사용 필수 컨텐츠)"
            value={getContent("refund_policy")}
            images={getImages("refund_policy")}
            onSave={(val: string, imgs: string[]) =>
              handleSave("refund_policy", { content: val, images: imgs })
            }
            saving={saving}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface ContentEditorProps {
  title: string;
  description: string;
  value: string;
  images: string[];
  onSave: (value: string, images: string[]) => void;
  saving: boolean;
}

function ContentEditor({ title, description, value, images, onSave, saving }: ContentEditorProps) {
  const [text, setText] = useState(value);
  const [imageUrls, setImageUrls] = useState<string[]>(images || []);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Sync state if prop changes (e.g. after fresh load)
  useEffect(() => {
    setText(value);
    setImageUrls(images || []);
  }, [value, images]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const newUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (!file.type.startsWith("image/")) {
          alert("이미지 파일만 업로드 가능합니다.");
          continue;
        }

        if (file.size > 5 * 1024 * 1024) {
          alert("파일 크기는 5MB 이하여야 합니다.");
          continue;
        }

        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/admin/settings/contents/upload", {
          method: "POST",
          body: formData,
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || "이미지 업로드에 실패했습니다.");
        }

        newUrls.push(json.url as string);
      }

      if (newUrls.length > 0) {
        setImageUrls((prev) => [...prev, ...newUrls]);
      }
    } catch (error: any) {
      console.error("이미지 업로드 실패:", error);
      alert(error.message || "이미지 업로드에 실패했습니다.");
    } finally {
      setIsUploading(false);
      // 같은 파일을 다시 선택할 수 있도록 value 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = (url: string) => {
    setImageUrls((prev) => prev.filter((u) => u !== url));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>내용</Label>
          <Textarea
            className="min-h-[400px] font-mono"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="내용을 입력하세요..."
          />
        </div>
        <div className="space-y-2">
          <Label>이미지 (선택)</Label>
          <div className="flex flex-wrap gap-4">
            {imageUrls.map((url) => (
              <div key={url} className="relative w-32 h-32 border rounded-md overflow-hidden">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  className="absolute top-1 right-1 rounded-full bg-black/60 text-white text-xs px-2 py-0.5"
                  onClick={() => handleRemoveImage(url)}
                >
                  삭제
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center text-xs text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
              disabled={isUploading}
            >
              <ImageIcon className="h-6 w-6 mb-1" />
              {isUploading ? "업로드 중..." : "이미지 추가"}
            </button>
          </div>
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageUpload}
          />
          <p className="text-xs text-muted-foreground">
            JPG, PNG, GIF, WEBP 형식의 이미지를 최대 5MB까지 업로드할 수 있습니다. 여러 장 등록 가능합니다.
          </p>
        </div>
        <div className="flex justify-end">
          <Button onClick={() => onSave(text, imageUrls)} disabled={saving || isUploading}>
            {(saving || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            저장
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// =====================================================
// 쉬운가이드 단계 편집기
// =====================================================
interface EasyGuideEditorProps {
  description: string;
  intro: string;
  steps: EasyGuideStep[];
  onSave: (intro: string, steps: EasyGuideStep[]) => void;
  saving: boolean;
}

function EasyGuideEditor({
  description,
  intro,
  steps,
  onSave,
  saving,
}: EasyGuideEditorProps) {
  const [introText, setIntroText] = useState(intro);
  const [items, setItems] = useState<EasyGuideStep[]>(steps);

  useEffect(() => {
    setIntroText(intro);
    setItems(steps);
  }, [intro, steps]);

  const updateStep = (index: number, field: keyof EasyGuideStep, value: string) => {
    setItems((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const addStep = () => {
    setItems((prev) => [...prev, { emoji: "✨", title: "새 단계", desc: "" }]);
  };

  const removeStep = (index: number) => {
    if (!confirm(`${index + 1}번째 단계를 삭제하시겠습니까?`)) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    setItems((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleSubmit = () => {
    const cleaned = items
      .map((s) => ({
        emoji: s.emoji.trim(),
        title: s.title.trim(),
        desc: s.desc.trim(),
      }))
      .filter((s) => s.title || s.desc);
    onSave(introText.trim(), cleaned);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>쉬운가이드</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 인트로 텍스트 */}
        <div className="space-y-2">
          <Label>안내 문구 (선택)</Label>
          <Textarea
            value={introText}
            onChange={(e) => setIntroText(e.target.value)}
            placeholder="예: 4단계 만에 끝나는 비대면 의류 수선 서비스"
            rows={2}
          />
          <p className="text-xs text-muted-foreground">
            단계 위에 표시되는 짧은 안내 문구입니다. 비워두면 표시되지 않습니다.
          </p>
        </div>

        {/* 단계 목록 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>단계 ({items.length}개)</Label>
            <Button variant="outline" size="sm" onClick={addStep}>
              <Plus className="h-4 w-4 mr-1" />
              단계 추가
            </Button>
          </div>

          {items.length === 0 && (
            <div className="rounded-md border border-dashed border-gray-300 p-6 text-center text-sm text-muted-foreground">
              아직 등록된 단계가 없습니다. 위의 “단계 추가” 버튼으로 시작하세요.
            </div>
          )}

          {items.map((step, index) => (
            <div
              key={index}
              className="rounded-lg border border-gray-200 p-4 bg-gray-50/50 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">
                  STEP {index + 1}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => moveStep(index, -1)}
                    disabled={index === 0}
                    title="위로"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => moveStep(index, 1)}
                    disabled={index === items.length - 1}
                    title="아래로"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => removeStep(index)}
                    title="삭제"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[80px_1fr] gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">이모지</Label>
                  <Input
                    value={step.emoji}
                    onChange={(e) => updateStep(index, "emoji", e.target.value)}
                    placeholder="📦"
                    maxLength={4}
                    className="text-center text-lg"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">제목</Label>
                  <Input
                    value={step.title}
                    onChange={(e) => updateStep(index, "title", e.target.value)}
                    placeholder="예: 수선 접수"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">설명</Label>
                <Textarea
                  value={step.desc}
                  onChange={(e) => updateStep(index, "desc", e.target.value)}
                  placeholder="단계에 대한 설명을 입력하세요."
                  rows={2}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            저장
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

