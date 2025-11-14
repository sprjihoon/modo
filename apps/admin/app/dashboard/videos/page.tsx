"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Video, Upload, Play, Calendar, Package } from "lucide-react";
import { VideoUpload } from "@/components/orders/video-upload";

export default function VideosPage() {
  const [search, setSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);

  // Mock data
  const videos = Array.from({ length: 12 }, (_, i) => ({
    id: `VID-${(i + 1).toString().padStart(4, "0")}`,
    orderId: `ORDER-2024-${(i + 1).toString().padStart(4, "0")}`,
    orderItem: `청바지 기장 수선 ${i + 1}`,
    type: i % 2 === 0 ? "입고" : "출고",
    url: `https://example.com/video${i + 1}.mp4`,
    thumbnail: `https://via.placeholder.com/320x180?text=Video+${i + 1}`,
    duration: `${Math.floor(Math.random() * 5) + 1}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}`,
    uploadedAt: `2024.01.${((i % 28) + 1).toString().padStart(2, "0")} ${String(10 + (i % 12)).padStart(2, "0")}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}`,
    status: i % 3 === 0 ? "처리중" : i % 3 === 1 ? "완료" : "업로드중",
  }));

  const filteredVideos = videos.filter(
    (video) =>
      video.orderId.toLowerCase().includes(search.toLowerCase()) ||
      video.orderItem.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">영상 관리</h1>
          <p className="text-muted-foreground">수선 과정 영상을 관리합니다</p>
        </div>
        <Button onClick={() => setShowUpload(!showUpload)}>
          <Upload className="mr-2 h-4 w-4" />
          영상 업로드
        </Button>
      </div>

      {/* Upload Section */}
      {showUpload && (
        <Card>
          <CardHeader>
            <CardTitle>새 영상 업로드</CardTitle>
            <CardDescription>수선 과정 영상을 업로드하세요</CardDescription>
          </CardHeader>
          <CardContent>
            <VideoUpload orderId="" trackingNo="" />
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="주문번호, 수선 항목으로 검색..."
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
              {videos.filter((v) => v.type === "입고").length}개
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>출고 영상</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {videos.filter((v) => v.type === "출고").length}개
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>처리 완료</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {videos.filter((v) => v.status === "완료").length}개
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Videos Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredVideos.map((video) => (
          <Card key={video.id} className="overflow-hidden">
            <div className="relative aspect-video bg-gray-200">
              <img
                src={video.thumbnail}
                alt={video.orderItem}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => window.open(video.url, "_blank")}
                >
                  <Play className="h-4 w-4 mr-2" />
                  재생
                </Button>
              </div>
              <div className="absolute top-2 right-2">
                <Badge
                  variant={video.type === "입고" ? "default" : "secondary"}
                  className="text-xs"
                >
                  {video.type}
                </Badge>
              </div>
              <div className="absolute bottom-2 left-2">
                <Badge variant="outline" className="text-xs bg-black/50 text-white">
                  {video.duration}
                </Badge>
              </div>
            </div>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm truncate">{video.orderItem}</p>
                  <Badge
                    variant={
                      video.status === "완료"
                        ? "default"
                        : video.status === "처리중"
                        ? "secondary"
                        : "outline"
                    }
                    className="text-xs"
                  >
                    {video.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Package className="h-3 w-3" />
                  <span className="truncate">{video.orderId}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{video.uploadedAt}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

