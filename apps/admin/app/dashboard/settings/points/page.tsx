"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Settings, Edit, Trash2, CheckCircle } from "lucide-react";
import PointSettingDialog from "@/components/settings/PointSettingDialog";

interface PointSetting {
  id: string;
  name: string;
  description: string;
  earning_rate: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  is_default: boolean;
  priority: number;
  created_at: string;
}

export default function PointSettingsPage() {
  const [settings, setSettings] = useState<PointSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<PointSetting | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/points/settings");
      const data = await response.json();
      setSettings(data.settings || []);
    } catch (error) {
      console.error("포인트 설정 조회 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingSetting(null);
    setDialogOpen(true);
  };

  const handleEdit = (setting: PointSetting) => {
    setEditingSetting(setting);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 포인트 설정을 삭제하시겠습니까?")) {
      return;
    }

    try {
      const response = await fetch(`/api/points/settings/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("삭제 실패");
      }

      alert("포인트 설정이 삭제되었습니다.");
      fetchSettings();
    } catch (error) {
      console.error("포인트 설정 삭제 실패:", error);
      alert("포인트 설정 삭제 중 오류가 발생했습니다.");
    }
  };

  const handleToggleActive = async (setting: PointSetting) => {
    try {
      const response = await fetch(`/api/points/settings/${setting.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: !setting.is_active,
        }),
      });

      if (!response.ok) {
        throw new Error("상태 변경 실패");
      }

      fetchSettings();
    } catch (error) {
      console.error("포인트 설정 상태 변경 실패:", error);
      alert("포인트 설정 상태 변경 중 오류가 발생했습니다.");
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR");
  };

  const getCurrentSetting = () => {
    const now = new Date();
    const currentDate = now.toISOString().split("T")[0];

    return settings
      .filter((s) => {
        if (!s.is_active) return false;
        if (s.start_date > currentDate) return false;
        if (s.end_date && s.end_date < currentDate) return false;
        return true;
      })
      .sort((a, b) => b.priority - a.priority)[0];
  };

  const currentSetting = getCurrentSetting();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">포인트 적립률 설정</h1>
          <p className="text-muted-foreground">
            기간별 포인트 적립률을 설정하고 관리합니다
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          새 설정 추가
        </Button>
      </div>

      {/* 현재 적용 중인 설정 */}
      {currentSetting && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              현재 적용 중인 설정
            </CardTitle>
            <CardDescription>
              고객이 주문 완료 시 자동으로 적립되는 포인트 비율입니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">설정명</p>
                <p className="font-semibold">{currentSetting.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">적립률</p>
                <p className="text-2xl font-bold text-blue-600">
                  {currentSetting.earning_rate}%
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">기간</p>
                <p className="font-medium">
                  {formatDate(currentSetting.start_date)} ~{" "}
                  {currentSetting.end_date ? formatDate(currentSetting.end_date) : "무기한"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 포인트 설정 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            포인트 적립률 설정 목록
          </CardTitle>
          <CardDescription>
            총 {settings.length}개의 설정이 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">로딩 중...</div>
          ) : settings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              포인트 설정이 없습니다. 새 설정을 추가해주세요.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>설정명</TableHead>
                  <TableHead>적립률</TableHead>
                  <TableHead>시작일</TableHead>
                  <TableHead>종료일</TableHead>
                  <TableHead>우선순위</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settings.map((setting) => (
                  <TableRow key={setting.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{setting.name}</p>
                        {setting.description && (
                          <p className="text-xs text-muted-foreground">
                            {setting.description}
                          </p>
                        )}
                        {setting.is_default && (
                          <Badge variant="outline" className="mt-1">
                            기본 설정
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-blue-600">
                        {setting.earning_rate}%
                      </span>
                    </TableCell>
                    <TableCell>{formatDate(setting.start_date)}</TableCell>
                    <TableCell>
                      {setting.end_date ? formatDate(setting.end_date) : "무기한"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{setting.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(setting)}
                      >
                        <Badge variant={setting.is_active ? "default" : "secondary"}>
                          {setting.is_active ? "활성" : "비활성"}
                        </Badge>
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(setting)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(setting.id)}
                          disabled={setting.is_default}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 포인트 설정 다이얼로그 */}
      <PointSettingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        setting={editingSetting}
        onSuccess={() => {
          fetchSettings();
          setDialogOpen(false);
        }}
      />
    </div>
  );
}

