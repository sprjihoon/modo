"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Video, Upload, Play, Calendar, Package, ExternalLink } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase";
import { HLSVideoPlayer } from "@/components/video/hls-video-player";

// 오늘 날짜 (YYYY-MM-DD 형식)
const getToday = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

// N일 전 날짜
const getDaysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
};

interface MediaVideo {
  id: string;
  final_waybill_no: string;
  type: string;
  provider: string;
  path: string;
  created_at: string;
  pickup_tracking_no?: string;  // 추가: 입고 송장번호
  delivery_tracking_no?: string;  // 추가: 출고 송장번호
}

export default function VideosPage() {
  const [search, setSearch] = useState("");
  const [videos, setVideos] = useState<MediaVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<MediaVideo | null>(null);
  
  // 날짜 필터 (기본값: 최근 30일)
  const [startDate, setStartDate] = useState<string>(getDaysAgo(30));
  const [endDate, setEndDate] = useState<string>(getToday());
  const [datePreset, setDatePreset] = useState<string>("30days");

  // 날짜 프리셋 변경
  const handleDatePreset = (preset: string) => {
    setDatePreset(preset);
    const today = getToday();
    
    switch (preset) {
      case "today":
        setStartDate(today);
        setEndDate(today);
        break;
      case "7days":
        setStartDate(getDaysAgo(7));
        setEndDate(today);
        break;
      case "30days":
        setStartDate(getDaysAgo(30));
        setEndDate(today);
        break;
      case "90days":
        setStartDate(getDaysAgo(90));
        setEndDate(today);
        break;
      case "all":
        setStartDate("");
        setEndDate("");
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/videos');
      const data = await response.json();
      if (data.success) {
        setVideos(data.videos || []);
      }
    } catch (error) {
      console.error('영상 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getVideoUrl = (video: MediaVideo) => {
    if (video.path.startsWith('http')) {
      return video.path;
    }
    if (video.provider === 'cloudflare') {
      return `https://videodelivery.net/${video.path}/manifest/video.m3u8`;
    }
    return video.path;
  };

  const getVideoTypeLabel = (type: string) => {
    if (type === 'inbound_video') return '입고';
    if (type === 'outbound_video') return '출고';
    if (type === 'merged_video') return '병합';
    return type;
  };

  const filteredVideos = videos.filter(
    (video) => {
      const searchLower = search.toLowerCase();
      const matchesSearch = (
        video.final_waybill_no?.toLowerCase().includes(searchLower) ||
        video.type?.toLowerCase().includes(searchLower) ||
        video.pickup_tracking_no?.toLowerCase().includes(searchLower) ||
        video.delivery_tracking_no?.toLowerCase().includes(searchLower)
      );
      
      // 날짜 필터 적용
      let matchesDate = true;
      if (startDate && endDate) {
        const videoDate = new Date(video.created_at);
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // 종료일의 끝까지 포함
        matchesDate = videoDate >= start && videoDate <= end;
      }
      
      return matchesSearch && matchesDate;
    }
  );

  console.log('🎬 검색어:', search);
  console.log('🎬 필터링된 영상:', filteredVideos.length, '/ 전체:', videos.length);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">영상 관리</h1>
          <p className="text-muted-foreground">입고/출고/병합 영상을 관리합니다</p>
        </div>
        <Button onClick={loadVideos}>
          <Video className="mr-2 h-4 w-4" />
          새로고침
        </Button>
      </div>

      {/* 날짜 필터 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">기간 선택:</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={datePreset === "today" ? "default" : "outline"}
                size="sm"
                onClick={() => handleDatePreset("today")}
              >
                오늘
              </Button>
              <Button
                variant={datePreset === "7days" ? "default" : "outline"}
                size="sm"
                onClick={() => handleDatePreset("7days")}
              >
                7일
              </Button>
              <Button
                variant={datePreset === "30days" ? "default" : "outline"}
                size="sm"
                onClick={() => handleDatePreset("30days")}
              >
                30일
              </Button>
              <Button
                variant={datePreset === "90days" ? "default" : "outline"}
                size="sm"
                onClick={() => handleDatePreset("90days")}
              >
                90일
              </Button>
              <Button
                variant={datePreset === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => handleDatePreset("all")}
              >
                전체
              </Button>
            </div>
            <div className="flex items-center gap-2 ml-2">
              <Input
                type="date"
                className="w-36 h-9"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset("custom");
                }}
              />
              <span className="text-muted-foreground">~</span>
              <Input
                type="date"
                className="w-36 h-9"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset("custom");
                }}
              />
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="송장번호로 검색..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>전체 영상</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{videos.length}개</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>입고 영상</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {videos.filter((v) => v.type === "inbound_video").length}개
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>출고 영상</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {videos.filter((v) => v.type === "outbound_video").length}개
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>병합 영상</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {videos.filter((v) => v.type === "merged_video").length}개
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Videos Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-muted-foreground">영상 로딩 중...</p>
        </div>
      ) : filteredVideos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            영상이 없습니다.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredVideos.map((video) => {
            const videoUrl = getVideoUrl(video);
            const typeLabel = getVideoTypeLabel(video.type);
            const date = new Date(video.created_at);
            const formattedDate = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
            
            return (
              <Card key={video.id} className="overflow-hidden">
                <div className="relative aspect-video bg-gray-900 flex items-center justify-center">
                  <Video className="h-16 w-16 text-gray-600" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSelectedVideo(video)}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      재생
                    </Button>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge
                      variant={video.type === "inbound_video" ? "default" : video.type === "outbound_video" ? "secondary" : "outline"}
                      className="text-xs"
                    >
                      {typeLabel}
                    </Badge>
                  </div>
                  <div className="absolute bottom-2 left-2">
                    <Badge variant="outline" className="text-xs bg-black/50 text-white border-white/20">
                      {video.provider}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm truncate">{typeLabel} 영상</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Package className="h-3 w-3" />
                      <span className="truncate">{video.final_waybill_no}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{formattedDate}</span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      ID: {video.path.substring(0, 20)}...
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Video Player Modal */}
      {selectedVideo && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedVideo(null)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">{getVideoTypeLabel(selectedVideo.type)} 영상</h2>
                <p className="text-sm text-gray-500">송장: {selectedVideo.final_waybill_no}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedVideo(null)}
              >
                닫기
              </Button>
            </div>
            <div className="p-4">
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <HLSVideoPlayer
                  src={getVideoUrl(selectedVideo)}
                  controls
                  autoplay
                  className="w-full h-full"
                  onError={(error) => {
                    console.error("Video playback error:", error);
                  }}
                />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Provider</p>
                  <p className="font-medium">{selectedVideo.provider}</p>
                </div>
                <div>
                  <p className="text-gray-500">Video ID</p>
                  <p className="font-mono text-xs truncate">{selectedVideo.path}</p>
                </div>
                <div>
                  <p className="text-gray-500">업로드 시간</p>
                  <p className="font-medium">{new Date(selectedVideo.created_at).toLocaleString('ko-KR')}</p>
                </div>
                <div>
                  <p className="text-gray-500">타입</p>
                  <p className="font-medium">{selectedVideo.type}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

