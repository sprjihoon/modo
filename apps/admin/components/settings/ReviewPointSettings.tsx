"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ReviewPointSettings() {
  const [textPoints, setTextPoints] = useState(200);
  const [photoPoints, setPhotoPoints] = useState(500);
  const [active, setActive] = useState(true);
  const [minLength, setMinLength] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/review-settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.success === false) throw new Error(data.error || "조회 실패");
        setTextPoints(data.text_review_points ?? 200);
        setPhotoPoints(data.photo_review_points ?? 500);
        setActive(data.is_active ?? true);
        setMinLength(data.min_content_length ?? 10);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "조회 실패"))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!Number.isInteger(textPoints) || textPoints < 0 || !Number.isInteger(photoPoints) || photoPoints < 0) {
      alert("포인트는 0 이상의 정수여야 합니다.");
      return;
    }
    if (!Number.isInteger(minLength) || minLength < 1) {
      alert("최소 글자 수는 1 이상이어야 합니다.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/review-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text_review_points: textPoints,
          photo_review_points: photoPoints,
          is_active: active,
          min_content_length: minLength,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "저장 실패");
      alert("리뷰 적립 설정이 저장되었습니다.");
    } catch (e) {
      alert(e instanceof Error ? e.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">설정을 불러오는 중...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>리뷰 적립 사용</CardTitle>
          <CardDescription>
            끄면 리뷰는 받을 수 있지만 포인트는 지급하지 않습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="accent-blue-600"
            />
            리뷰 작성 시 포인트 지급
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>글 리뷰 적립</CardTitle>
          <CardDescription>사진 없이 글만 남긴 경우 지급되는 포인트입니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs">
            <label className="text-sm text-muted-foreground">적립 금액 (P)</label>
            <Input
              type="number"
              min={0}
              step={1}
              value={textPoints}
              onChange={(e) => setTextPoints(Number(e.target.value))}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>포토 리뷰 적립</CardTitle>
          <CardDescription>사진을 1장 이상 첨부하면 글 리뷰 대신 이 금액이 지급됩니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs">
            <label className="text-sm text-muted-foreground">적립 금액 (P)</label>
            <Input
              type="number"
              min={0}
              step={1}
              value={photoPoints}
              onChange={(e) => setPhotoPoints(Number(e.target.value))}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>작성 조건</CardTitle>
          <CardDescription>별점은 1~5점 정수만 가능합니다. 글자 수는 여기서 바꿀 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs">
            <label className="text-sm text-muted-foreground">최소 글자 수</label>
            <Input
              type="number"
              min={1}
              step={1}
              value={minLength}
              onChange={(e) => setMinLength(Number(e.target.value))}
              className="mt-1"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            고객 화면 안내: 글 {textPoints.toLocaleString("ko-KR")}P
            {photoPoints !== textPoints && ` · 포토 ${photoPoints.toLocaleString("ko-KR")}P`}
            {active ? "" : " · 현재 적립 꺼짐"}
          </p>
          <Button onClick={save} disabled={saving}>
            {saving ? "저장 중..." : "리뷰 적립 저장"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
