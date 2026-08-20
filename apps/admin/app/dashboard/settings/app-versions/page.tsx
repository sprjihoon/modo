"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, Save } from "lucide-react";

type Platform = "ios" | "android";

interface AppVersionRow {
  id?: string;
  platform: Platform;
  latest_version: string;
  min_version: string;
  store_url: string;
  update_message: string;
  is_force_update: boolean;
  is_active: boolean;
}

const EMPTY: Record<Platform, AppVersionRow> = {
  ios: {
    platform: "ios",
    latest_version: "1.0",
    min_version: "1.0.0",
    store_url: "https://apps.apple.com/kr/app/id6759492888",
    update_message: "새로운 기능이 추가되었습니다. 업데이트해 주세요!",
    is_force_update: false,
    is_active: true,
  },
  android: {
    platform: "android",
    latest_version: "1.0.1",
    min_version: "1.0.0",
    store_url: "https://play.google.com/store/apps/details?id=com.modurepair.app",
    update_message: "새로운 기능이 추가되었습니다. 업데이트해 주세요!",
    is_force_update: false,
    is_active: true,
  },
};

function PlatformCard({
  title,
  row,
  onChange,
  onSave,
  saving,
}: {
  title: string;
  row: AppVersionRow;
  onChange: (next: AppVersionRow) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>
          스토어에 실제로 올라간 버전만 최신으로 넣으세요. 최소 버전보다 낮은 설치본은 앱을 막습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>최신 버전</Label>
            <Input
              value={row.latest_version}
              onChange={(e) => onChange({ ...row, latest_version: e.target.value })}
              placeholder="1.0.2"
            />
          </div>
          <div className="space-y-2">
            <Label>강제 최소 버전</Label>
            <Input
              value={row.min_version}
              onChange={(e) => onChange({ ...row, min_version: e.target.value })}
              placeholder="1.0.0"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>스토어 URL</Label>
          <Input
            value={row.store_url}
            onChange={(e) => onChange({ ...row, store_url: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>안내 문구</Label>
          <Textarea
            value={row.update_message}
            onChange={(e) => onChange({ ...row, update_message: e.target.value })}
            rows={3}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={row.is_force_update}
            onChange={(e) => onChange({ ...row, is_force_update: e.target.checked })}
          />
          최신 미만이면 강제 업데이트
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={row.is_active}
            onChange={(e) => onChange({ ...row, is_active: e.target.checked })}
          />
          안내 사용
        </label>
        <Button onClick={onSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          저장
        </Button>
      </CardContent>
    </Card>
  );
}

export default function AppVersionsPage() {
  const [rows, setRows] = useState(EMPTY);
  const [saving, setSaving] = useState<Platform | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    const res = await fetch("/api/admin/settings/app-versions");
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "불러오기 실패");
      return;
    }
    const next = { ...EMPTY };
    for (const item of json.data as AppVersionRow[]) {
      if (item.platform === "ios" || item.platform === "android") {
        next[item.platform] = { ...EMPTY[item.platform], ...item };
      }
    }
    setRows(next);
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(platform: Platform) {
    setSaving(platform);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings/app-versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rows[platform]),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "저장 실패");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">앱 버전</h1>
        <p className="text-muted-foreground">
          새 빌드를 스토어에 올린 뒤 최신 버전을 바꿔 주세요. 아직 안 올린 버전을 넣으면 사용자는 스토어에서 업데이트를 못 찾습니다.
        </p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid gap-6 lg:grid-cols-2">
        <PlatformCard
          title="아이폰"
          row={rows.ios}
          onChange={(row) => setRows((prev) => ({ ...prev, ios: row }))}
          onSave={() => save("ios")}
          saving={saving === "ios"}
        />
        <PlatformCard
          title="안드로이드"
          row={rows.android}
          onChange={(row) => setRows((prev) => ({ ...prev, android: row }))}
          onSave={() => save("android")}
          saving={saving === "android"}
        />
      </div>
    </div>
  );
}
