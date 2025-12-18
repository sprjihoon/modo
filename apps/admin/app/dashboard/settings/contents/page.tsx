"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save, Loader2, Image as ImageIcon, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import * as React from "react";

interface AppContent {
  key: string;
  title: string;
  content: string;
  images?: string[] | null;
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

  const handleSave = async (key: string, content: string, images: string[]) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/contents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, content, images }),
      });
      const json = await res.json();
      if (json.success) {
        alert("저장되었습니다.");
        fetchContents(); // Refresh to update timestamp
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
            가격표, 쉬운가이드, 이용약관, 개인정보처리방침 내용을 관리합니다
          </p>
        </div>
      </div>

      <Tabs defaultValue="price_list" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="price_list">가격표</TabsTrigger>
          <TabsTrigger value="easy_guide">쉬운가이드</TabsTrigger>
          <TabsTrigger value="terms_of_service">이용약관</TabsTrigger>
          <TabsTrigger value="privacy_policy">개인정보처리방침</TabsTrigger>
        </TabsList>

        <TabsContent value="price_list">
          <ContentEditor
            title="가격표"
            description="앱의 가격표 화면에 표시될 텍스트와 이미지를 설정합니다."
            value={getContent("price_list")}
            images={getImages("price_list")}
            onSave={(val: string, imgs: string[]) => handleSave("price_list", val, imgs)}
            saving={saving}
          />
        </TabsContent>

        <TabsContent value="easy_guide">
          <ContentEditor
            title="쉬운가이드"
            description="앱의 쉬운가이드 화면에 표시될 텍스트와 이미지를 설정합니다."
            value={getContent("easy_guide")}
            images={getImages("easy_guide")}
            onSave={(val: string, imgs: string[]) => handleSave("easy_guide", val, imgs)}
            saving={saving}
          />
        </TabsContent>

        <TabsContent value="terms_of_service">
          <ContentEditor
            title="서비스 이용약관"
            description="앱에서 표시되는 서비스 이용약관 전문을 수정합니다."
            value={getContent("terms_of_service")}
            images={getImages("terms_of_service")}
            onSave={(val: string, imgs: string[]) => handleSave("terms_of_service", val, imgs)}
            saving={saving}
          />
        </TabsContent>

        <TabsContent value="privacy_policy">
          <ContentEditor
            title="개인정보처리방침"
            description="앱에서 표시되는 개인정보처리방침 전문을 수정합니다."
            value={getContent("privacy_policy")}
            images={getImages("privacy_policy")}
            onSave={(val: string, imgs: string[]) => handleSave("privacy_policy", val, imgs)}
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

