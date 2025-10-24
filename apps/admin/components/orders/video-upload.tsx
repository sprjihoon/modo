"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Video } from "lucide-react";

interface VideoUploadProps {
  orderId: string;
  trackingNo: string;
}

export function VideoUpload({ orderId, trackingNo }: VideoUploadProps) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (type: "inbound" | "outbound") => {
    setUploading(true);
    
    try {
      // TODO: Cloudflare Stream 업로드 구현
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert(`${type === "inbound" ? "입고" : "출고"} 영상이 업로드되었습니다`);
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>입출고 영상 관리</CardTitle>
        <CardDescription>송장번호: {trackingNo}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Inbound Video */}
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">입고 영상</h3>
              <Video className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
              <p className="text-sm text-muted-foreground">영상 없음</p>
            </div>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => handleUpload("inbound")}
              disabled={uploading}
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? "업로드 중..." : "입고 영상 업로드"}
            </Button>
          </div>

          {/* Outbound Video */}
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">출고 영상</h3>
              <Video className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
              <p className="text-sm text-muted-foreground">영상 없음</p>
            </div>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => handleUpload("outbound")}
              disabled={uploading}
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? "업로드 중..." : "출고 영상 업로드"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

