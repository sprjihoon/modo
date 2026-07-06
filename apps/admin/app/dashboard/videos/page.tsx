"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Video, Play, Calendar, Package, Trash2, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { HLSVideoPlayer } from "@/components/video/hls-video-player";

const getToday = () => new Date().toISOString().split("T")[0];
const getDaysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
};

interface VideoItem {
  id: string;
  final_waybill_no: string;
  type: string;
  provider: string;
  path: string;
  created_at: string;
  sequence?: number;
  duration_seconds?: number;
  order_id?: string | null;
  order_number?: string | null;
  customer_name?: string | null;
  item_name?: string | null;
  pickup_tracking_no?: string | null;
  delivery_tracking_no?: string | null;
}

const VIDEO_TYPES = [
  { value: "outbound_video", label: "출고 영상" },
  { value: "inbound_video", label: "입고 영상 (구)" },
  { value: "box_open_video", label: "박스오픈 (구)" },
  { value: "packing_video", label: "포장 영상 (구)" },
  { value: "merged_video", label: "병합 영상 (구)" },
  { value: "work_video", label: "작업 영상 (구)" },
  { value: "all", label: "전체" },
];

const PAGE_SIZE = 24;

export default function VideosPage() {
  const [search, setSearch] = useState("");
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [total, setTotal] = useState(0);
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VideoItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [startDate, setStartDate] = useState<string>(getDaysAgo(30));
  const [endDate, setEndDate] = useState<string>(getToday());
  const [datePreset, setDatePreset] = useState<string>("30days");
  const [typeFilter, setTypeFilter] = useState<string>("outbound_video");
  const [page, setPage] = useState(1);

  const loadVideos = useCallback(async (resetPage = false) => {
    setIsLoading(true);
    const currentPage = resetPage ? 1 : page;
    if (resetPage) setPage(1);
    try {
      const params = new URLSearchParams({
        type: typeFilter,
        page: String(currentPage),
        limit: String(PAGE_SIZE),
        ...(search && { search }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      });
      const res = await fetch(`/api/admin/videos?${params}`);
      const data = await res.json();
      if (data.success) {
        setVideos(data.videos || []);
        setTotal(data.total ?? 0);
        setTypeCounts(data.typeCounts ?? {});
      }
    } catch (e) {
      console.error("영상 로드 실패:", e);
    } finally {
      setIsLoading(false);
    }
  }, [page, typeFilter, search, startDate, endDate]);

  useEffect(() => {
    loadVideos(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, startDate, endDate]);

  useEffect(() => {
    loadVideos(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleDatePreset = (preset: string) => {
    setDatePreset(preset);
    const today = getToday();
    switch (preset) {
      case "today": setStartDate(today); setEndDate(today); break;
      case "7days": setStartDate(getDaysAgo(7)); setEndDate(today); break;
      case "30days": setStartDate(getDaysAgo(30)); setEndDate(today); break;
      case "90days": setStartDate(getDaysAgo(90)); setEndDate(today); break;
      case "all": setStartDate(""); setEndDate(""); break;
    }
  };

  const handleSearch = () => loadVideos(true);

  const getVideoUrl = (v: VideoItem) => {
    if (v.path.startsWith("http")) return v.path;
    if (v.provider === "cloudflare") return `https://videodelivery.net/${v.path}/manifest/video.m3u8`;
    return v.path;
  };

  const getTypeBadgeClass = (type: string) => {
    if (type === "outbound_video") return "bg-blue-500 text-white";
    if (type === "box_open_video") return "bg-orange-500 text-white";
    if (type === "inbound_video") return "bg-gray-400 text-white";
    if (type === "packing_video") return "bg-gray-400 text-white";
    if (type === "merged_video") return "bg-gray-400 text-white";
    return "bg-gray-300 text-gray-700";
  };

  const getTypeLabel = (type: string) => VIDEO_TYPES.find((t) => t.value === type)?.label ?? type;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/ops/video/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId: deleteTarget.id }),
      });
      const json = await res.json();
      if (json.success) {
        setVideos((prev) => prev.filter((v) => v.id !== deleteTarget.id));
        setTotal((prev) => Math.max(0, prev - 1));
        setDeleteTarget(null);
      } else {
        alert("삭제 실패: " + (json.error || "알 수 없는 오류"));
      }
    } catch (e: any) {
      alert("삭제 실패: " + e.message);
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">영상 관리</h1>
          <p className="text-muted-foreground">출고 영상을 조회하고 관리합니다</p>
        </div>
        <Button onClick={() => loadVideos(true)} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          새로고침
        </Button>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>전체 영상</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.values(typeCounts).reduce((a, b) => a + b, 0)}개
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-colors ${typeFilter === "outbound_video" ? "ring-2 ring-blue-500" : "hover:bg-muted/50"}`}
          onClick={() => setTypeFilter("outbound_video")}
        >
          <CardHeader className="pb-2">
            <CardDescription>📤 출고 영상 (현재)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {typeCounts["outbound_video"] ?? 0}개
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-colors ${typeFilter === "inbound_video" || typeFilter === "box_open_video" ? "ring-2 ring-gray-400" : "hover:bg-muted/50"}`}
          onClick={() => setTypeFilter("inbound_video")}
        >
          <CardHeader className="pb-2">
            <CardDescription>📥 입고 영상 (구)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500">
              {(typeCounts["inbound_video"] ?? 0) + (typeCounts["box_open_video"] ?? 0)}개
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-colors ${typeFilter === "all" ? "ring-2 ring-purple-500" : "hover:bg-muted/50"}`}
          onClick={() => setTypeFilter("all")}
        >
          <CardHeader className="pb-2">
            <CardDescription>📁 기타 (병합/포장 등)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-400">
              {(typeCounts["merged_video"] ?? 0) + (typeCounts["packing_video"] ?? 0) + (typeCounts["work_video"] ?? 0)}개
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* 타입 필터 */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">영상 유형:</span>
            {VIDEO_TYPES.map((t) => (
              <Button
                key={t.value}
                variant={typeFilter === t.value ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter(t.value)}
              >
                {t.label}
              </Button>
            ))}
          </div>

          {/* 날짜 필터 */}
          <div className="flex flex-wrap items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">기간:</span>
            {[
              { key: "today", label: "오늘" },
              { key: "7days", label: "7일" },
              { key: "30days", label: "30일" },
              { key: "90days", label: "90일" },
              { key: "all", label: "전체" },
            ].map((p) => (
              <Button
                key={p.key}
                variant={datePreset === p.key ? "default" : "outline"}
                size="sm"
                onClick={() => handleDatePreset(p.key)}
              >
                {p.label}
              </Button>
            ))}
            <Input
              type="date"
              className="w-36 h-9"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setDatePreset("custom"); }}
            />
            <span className="text-muted-foreground">~</span>
            <Input
              type="date"
              className="w-36 h-9"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setDatePreset("custom"); }}
            />
          </div>

          {/* 검색 */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="송장번호, 주문번호, 고객명으로 검색..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch}>검색</Button>
          </div>
        </CardContent>
      </Card>

      {/* 결과 수 */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>총 {total}개 영상</span>
        {totalPages > 1 && (
          <span>{page} / {totalPages} 페이지</span>
        )}
      </div>

      {/* 영상 목록 */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          <p className="mt-4 text-muted-foreground">영상 로딩 중...</p>
        </div>
      ) : videos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            영상이 없습니다.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {videos.map((video) => {
            const date = new Date(video.created_at);
            const formatted = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
            return (
              <Card key={video.id} className="overflow-hidden">
                <div className="relative aspect-video bg-gray-900 flex items-center justify-center">
                  <Video className="h-12 w-12 text-gray-600" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Button variant="secondary" size="sm" onClick={() => setSelectedVideo(video)}>
                      <Play className="h-4 w-4 mr-1" />
                      재생
                    </Button>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge className={`text-xs ${getTypeBadgeClass(video.type)}`}>
                      {getTypeLabel(video.type)}
                    </Badge>
                  </div>
                  {video.sequence && video.sequence > 1 && (
                    <div className="absolute bottom-2 left-2">
                      <Badge variant="outline" className="text-xs bg-black/50 text-white border-white/20">
                        #{video.sequence}
                      </Badge>
                    </div>
                  )}
                </div>
                <CardContent className="p-3">
                  <div className="space-y-1">
                    {video.customer_name && (
                      <p className="font-medium text-sm truncate">{video.customer_name}</p>
                    )}
                    {video.item_name && (
                      <p className="text-xs text-muted-foreground truncate">{video.item_name}</p>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Package className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">
                        {video.order_number || video.final_waybill_no}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 flex-shrink-0" />
                      <span>{formatted}</span>
                    </div>
                    {video.duration_seconds && (
                      <p className="text-xs text-muted-foreground">{video.duration_seconds}초</p>
                    )}
                    <div className="pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-red-500 hover:text-red-700 hover:bg-red-50 h-7 text-xs"
                        onClick={() => setDeleteTarget(video)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        삭제
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || isLoading}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
            let p: number;
            if (totalPages <= 7) p = i + 1;
            else if (page <= 4) p = i + 1;
            else if (page >= totalPages - 3) p = totalPages - 6 + i;
            else p = page - 3 + i;
            return (
              <Button
                key={p}
                variant={page === p ? "default" : "outline"}
                size="sm"
                className="w-9"
                onClick={() => setPage(p)}
                disabled={isLoading}
              >
                {p}
              </Button>
            );
          })}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || isLoading}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* 영상 재생 모달 */}
      {selectedVideo && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedVideo(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">
                  {getTypeLabel(selectedVideo.type)} 영상
                  {selectedVideo.sequence && selectedVideo.sequence > 1 && ` #${selectedVideo.sequence}`}
                </h2>
                <p className="text-sm text-gray-500">
                  {selectedVideo.customer_name && `${selectedVideo.customer_name} · `}
                  {selectedVideo.order_number || selectedVideo.final_waybill_no}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedVideo(null)}>닫기</Button>
            </div>
            <div className="p-4">
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <HLSVideoPlayer
                  src={getVideoUrl(selectedVideo)}
                  controls
                  autoplay
                  className="w-full h-full"
                  onError={(e) => console.error("Video error:", e)}
                />
              </div>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {selectedVideo.customer_name && (
                  <div><p className="text-gray-500">고객</p><p className="font-medium">{selectedVideo.customer_name}</p></div>
                )}
                {selectedVideo.item_name && (
                  <div><p className="text-gray-500">제품</p><p className="font-medium truncate">{selectedVideo.item_name}</p></div>
                )}
                <div><p className="text-gray-500">주문번호</p><p className="font-medium">{selectedVideo.order_number || "-"}</p></div>
                <div><p className="text-gray-500">출고 송장</p><p className="font-medium">{selectedVideo.delivery_tracking_no || selectedVideo.final_waybill_no}</p></div>
                <div><p className="text-gray-500">촬영 시간</p><p className="font-medium">{new Date(selectedVideo.created_at).toLocaleString("ko-KR")}</p></div>
                {selectedVideo.duration_seconds && (
                  <div><p className="text-gray-500">길이</p><p className="font-medium">{selectedVideo.duration_seconds}초</p></div>
                )}
                <div><p className="text-gray-500">영상 ID</p><p className="font-mono text-xs truncate">{selectedVideo.path}</p></div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => { setSelectedVideo(null); setDeleteTarget(selectedVideo); }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  이 영상 삭제
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2">영상 삭제</h3>
            <p className="text-sm text-gray-600 mb-4">
              이 영상을 삭제하면 복구할 수 없습니다. 계속하시겠습니까?
            </p>
            <div className="bg-gray-50 rounded p-3 text-xs text-gray-500 mb-4 space-y-1">
              <p>유형: {getTypeLabel(deleteTarget.type)}</p>
              {deleteTarget.customer_name && <p>고객: {deleteTarget.customer_name}</p>}
              <p>송장: {deleteTarget.final_waybill_no}</p>
              <p>촬영: {new Date(deleteTarget.created_at).toLocaleString("ko-KR")}</p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                취소
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? "삭제 중..." : "삭제"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
