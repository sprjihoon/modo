"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";

interface AppContent {
  key: string;
  title: string;
  content: string;
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
        setContents(json.data);
      } else {
        alert("컨텐츠 로드 실패: " + json.error);
      }
    } catch (e) {
      alert("컨텐츠 로드 중 오류 발생");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (key: string, content: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/contents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, content }),
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
          <p className="text-muted-foreground">가격표와 이용가이드를 수정합니다</p>
        </div>
      </div>

      <Tabs defaultValue="price_list" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="price_list">가격표</TabsTrigger>
          <TabsTrigger value="easy_guide">쉬운가이드</TabsTrigger>
        </TabsList>

        <TabsContent value="price_list">
          <ContentEditor
            title="가격표"
            description="앱의 가격표 화면에 표시될 텍스트입니다."
            value={getContent("price_list")}
            onSave={(val: string) => handleSave("price_list", val)}
            saving={saving}
          />
        </TabsContent>

        <TabsContent value="easy_guide">
          <ContentEditor
            title="쉬운가이드"
            description="앱의 쉬운가이드 화면에 표시될 텍스트입니다."
            value={getContent("easy_guide")}
            onSave={(val: string) => handleSave("easy_guide", val)}
            saving={saving}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ContentEditor({ title, description, value, onSave, saving }: any) {
  const [text, setText] = useState(value);

  // Sync state if prop changes (e.g. after fresh load)
  useEffect(() => {
    setText(value);
  }, [value]);

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
        <div className="flex justify-end">
          <Button onClick={() => onSave(text)} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            저장
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

