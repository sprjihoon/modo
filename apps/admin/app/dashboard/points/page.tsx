"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  ChevronLeft, 
  ChevronRight,
  Settings,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  Loader2,
  Calendar
} from "lucide-react";
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

interface PointTransaction {
  id: string;
  userId: string | null;
  userName: string;
  userEmail: string | null;
  type: string;
  amount: number;
  description: string;
  orderId: string | null;
  orderName: string | null;
  createdAt: string;
}

interface PointStats {
  totalIssued: number;
  totalUsed: number;
  totalExpired: number;
  totalHolding: number;
}

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

export default function PointsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("settings");
  
  // 포인트 설정 관련 상태
  const [settings, setSettings] = useState<PointSetting[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<PointSetting | null>(null);

  // 포인트 통계 상태
  const [stats, setStats] = useState<PointStats>({
    totalIssued: 0,
    totalUsed: 0,
    totalExpired: 0,
    totalHolding: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // 포인트 내역 관련 상태
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
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

  // 포인트 만료 처리 관련 상태
  const [expiringPoints, setExpiringPoints] = useState<any[]>([]);
  const [expiringStats, setExpiringStats] = useState({
    totalExpiring: 0,
    expiringToday: 0,
    expiringCount: 0
  });
  const [expiringLoading, setExpiringLoading] = useState(false);
  const [expiringProcessing, setExpiringProcessing] = useState(false);

  // 포인트 통계 로드
  useEffect(() => {
    fetchStats();
    fetchExpiringPoints();
  }, []);

  // 포인트 설정 로드
  useEffect(() => {
    if (activeTab === "settings") {
      fetchSettings();
    } else if (activeTab === "history") {
      fetchTransactions();
    }
  }, [activeTab]);

  // 검색 및 필터 변경 시 거래 내역 다시 로드
  useEffect(() => {
    if (activeTab === "history") {
      setCurrentPage(1);
      fetchTransactions();
    }
  }, [search, typeFilter, startDate, endDate]);

  // 페이지 변경 시 거래 내역 다시 로드
  useEffect(() => {
    if (activeTab === "history") {
      fetchTransactions();
    }
  }, [currentPage]);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const response = await fetch("/api/points/stats");
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("포인트 통계 조회 실패:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchSettings = async () => {
    setLoadingSettings(true);
    try {
      const response = await fetch("/api/points/settings");
      const data = await response.json();
      setSettings(data.settings || []);
    } catch (error) {
      console.error("포인트 설정 조회 실패:", error);
    } finally {
      setLoadingSettings(false);
    }
  };

  const fetchTransactions = async () => {
    setLoadingTransactions(true);
    try {
      const offset = (currentPage - 1) * itemsPerPage;
      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: offset.toString(),
        type: typeFilter,
        search: search,
      });
      
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/points/transactions?${params}`);
      const data = await response.json();
      setTransactions(data.transactions || []);
      setTotalTransactions(data.total || 0);
    } catch (error) {
      console.error("포인트 거래 내역 조회 실패:", error);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const fetchExpiringPoints = async () => {
    setExpiringLoading(true);
    try {
      const response = await fetch('/api/points/expire?days=30');
      const data = await response.json();
      if (data.success) {
        setExpiringPoints(data.points || []);
        setExpiringStats(data.stats || {
          totalExpiring: 0,
          expiringToday: 0,
          expiringCount: 0
        });
      }
    } catch (error) {
      console.error("만료 예정 포인트 조회 실패:", error);
    } finally {
      setExpiringLoading(false);
    }
  };

  const handleExpirePoints = async () => {
    if (!confirm('만료된 포인트를 소멸 처리하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    setExpiringProcessing(true);
    try {
      const response = await fetch('/api/points/expire', {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        alert(data.message || `총 ${data.expiredCount}건의 만료된 포인트가 소멸되었습니다.`);
        // 통계 및 만료 예정 목록 새로고침
        await fetchStats();
        await fetchExpiringPoints();
      } else {
        throw new Error(data.error || '만료 처리 실패');
      }
    } catch (error: any) {
      alert(`만료 처리 실패: ${error.message}`);
    } finally {
      setExpiringProcessing(false);
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
    // 최소 1개의 설정은 유지
    if (settings.length === 1) {
      alert("최소 1개의 포인트 설정이 필요합니다.\n삭제하려면 먼저 새로운 설정을 추가해주세요.");
      return;
    }

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

  // Pagination
  const totalPages = Math.ceil(totalTransactions / itemsPerPage);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">포인트 관리</h1>
        <p className="text-muted-foreground">포인트 적립률 설정 및 거래 내역을 관리합니다</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>총 발급 포인트</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <div className="text-2xl font-bold text-muted-foreground">...</div>
            ) : (
              <div className="text-2xl font-bold text-green-600">
                {stats.totalIssued.toLocaleString()}P
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>사용된 포인트</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <div className="text-2xl font-bold text-muted-foreground">...</div>
            ) : (
              <div className="text-2xl font-bold text-red-600">
                {stats.totalUsed.toLocaleString()}P
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>만료된 포인트</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <div className="text-2xl font-bold text-muted-foreground">...</div>
            ) : (
              <div className="text-2xl font-bold text-gray-600">
                {stats.totalExpired.toLocaleString()}P
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>보유 중인 포인트</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <div className="text-2xl font-bold text-muted-foreground">...</div>
            ) : (
              <div className="text-2xl font-bold text-blue-600">
                {stats.totalHolding.toLocaleString()}P
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 포인트 만료 관리 */}
      <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-600" />
                포인트 만료 관리 (30일 만료 정책)
              </CardTitle>
              <CardDescription>
                만료된 포인트는 FIFO 방식으로 자동 소멸됩니다
              </CardDescription>
            </div>
            <Button
              onClick={handleExpirePoints}
              disabled={expiringProcessing || expiringStats.expiringToday === 0}
              variant="outline"
              className="border-orange-300"
            >
              {expiringProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  처리 중...
                </>
              ) : (
                <>
                  만료 처리 실행
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {expiringLoading ? (
            <div className="text-center py-4 text-muted-foreground">로딩 중...</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">오늘 만료 예정</p>
                <p className="text-2xl font-bold text-orange-600">
                  {expiringStats.expiringToday.toLocaleString()}P
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {expiringPoints.filter(
                    pt => pt.expires_at && new Date(pt.expires_at) <= new Date()
                  ).length}건
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">30일 내 만료 예정</p>
                <p className="text-2xl font-bold text-orange-500">
                  {expiringStats.totalExpiring.toLocaleString()}P
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {expiringStats.expiringCount}건
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">만료 정책</p>
                <p className="text-lg font-semibold text-orange-700">
                  30일 후 자동 소멸
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  오래된 포인트부터 순차 소멸
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            포인트 적립률 설정
          </TabsTrigger>
          <TabsTrigger value="history">
            <TrendingUp className="h-4 w-4 mr-2" />
            포인트 내역
          </TabsTrigger>
        </TabsList>

        {/* 포인트 설정 탭 */}
        <TabsContent value="settings" className="space-y-4">
          {/* 현재 적용 중인 설정 */}
          {currentSetting && (
            <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                  현재 적용 중인 적립률
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
                    {currentSetting.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {currentSetting.description}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">적립률</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {currentSetting.earning_rate}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      10,000원 → {Math.floor(10000 * currentSetting.earning_rate / 100).toLocaleString()}P 적립
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">적용 기간</p>
                    <p className="font-medium">
                      {formatDate(currentSetting.start_date)} ~{" "}
                      {currentSetting.end_date ? formatDate(currentSetting.end_date) : "무기한"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 설정 관리 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    적립률 설정 관리
                  </CardTitle>
                  <CardDescription>
                    기본 적립률 및 기간별 특별 적립률을 설정합니다
                  </CardDescription>
                </div>
                <Button onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  새 설정 추가
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingSettings ? (
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
                              disabled={settings.length === 1}
                              title={settings.length === 1 ? "최소 1개의 설정이 필요합니다" : "삭제"}
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

          {/* 적립률 설명 */}
          <Card>
            <CardHeader>
              <CardTitle>💡 적립률 설정 가이드</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <p className="text-sm font-semibold mb-1">💙 기본 적립률</p>
                <p className="text-xs text-muted-foreground">
                  기간 설정 없이 상시 적용되는 기본 포인트 적립률입니다. 언제든지 수정 가능합니다.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  💡 예시: 3%, 5%, 7% 등 자유롭게 설정
                </p>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                <p className="text-sm font-semibold mb-1">💜 기간별 특별 적립률</p>
                <p className="text-xs text-muted-foreground">
                  특정 기간 동안만 적용되는 프로모션 적립률입니다.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  💡 예시: 연말(12/20~12/31) 10%, 여름 시즌(7/1~8/31) 15%
                </p>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
                <p className="text-sm font-semibold mb-1">⭐ 우선순위</p>
                <p className="text-xs text-muted-foreground">
                  같은 날짜에 여러 설정이 활성화된 경우, 우선순위가 높은 설정이 적용됩니다.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  💡 예시: 기본(0) &lt; 시즌 이벤트(5) &lt; 특별 프로모션(10)
                </p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border-2 border-green-200 dark:border-green-800">
                <p className="text-sm font-semibold mb-1">✅ 중요 안내</p>
                <p className="text-xs text-muted-foreground">
                  • 모든 적립률은 자유롭게 수정 가능합니다 (0% ~ 100%)
                </p>
                <p className="text-xs text-muted-foreground">
                  • 최소 1개의 설정은 항상 유지되어야 합니다
                </p>
                <p className="text-xs text-muted-foreground">
                  • 변경사항은 즉시 적용됩니다
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 포인트 내역 탭 */}
        <TabsContent value="history" className="space-y-4">
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
              <div className="grid gap-4 md:grid-cols-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="사용자명으로 검색..."
                    className="pl-10"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="유형 필터" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">전체</SelectItem>
                    <SelectItem value="적립">적립</SelectItem>
                    <SelectItem value="사용">사용</SelectItem>
                    <SelectItem value="취소">취소</SelectItem>
                    <SelectItem value="만료">만료</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Points Table */}
          <Card>
            <CardHeader>
              <CardTitle>포인트 거래 내역</CardTitle>
              <CardDescription>
                총 {totalTransactions}건의 포인트 내역 {totalPages > 0 && `(페이지 ${currentPage} / ${totalPages})`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTransactions ? (
                <div className="text-center py-8 text-muted-foreground">로딩 중...</div>
              ) : (
                <div className="space-y-2">
                  {transactions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">포인트 내역이 없습니다.</div>
                  ) : (
                    transactions.map((point) => (
                    <div
                      key={point.id}
                      className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                        point.userId 
                          ? "hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer" 
                          : "bg-gray-50 dark:bg-gray-900 cursor-not-allowed opacity-60"
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        console.log('포인트 카드 클릭:', { userId: point.userId, userName: point.userName });
                        if (point.userId) {
                          const targetUrl = `/dashboard/customers/${point.userId}`;
                          console.log('이동할 URL:', targetUrl);
                          router.push(targetUrl);
                        } else {
                          console.warn('userId 없음:', point);
                          alert('해당 고객의 계정 정보를 찾을 수 없습니다.\n이메일: ' + (point.userEmail || '없음'));
                        }
                      }}
                      title={point.userId ? `${point.userName}님의 상세 정보 보기` : '고객 계정 정보 없음'}
                    >
                      <div className="flex items-center space-x-4">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            point.type === "적립"
                              ? "bg-green-100"
                              : point.type === "사용"
                              ? "bg-red-100"
                              : point.type === "취소"
                              ? "bg-orange-100"
                              : "bg-gray-100"
                          }`}
                        >
                          {point.type === "적립" ? (
                            <TrendingUp className="h-5 w-5 text-green-600" />
                          ) : point.type === "사용" ? (
                            <TrendingDown className="h-5 w-5 text-red-600" />
                          ) : point.type === "취소" ? (
                            <TrendingDown className="h-5 w-5 text-orange-600" />
                          ) : (
                            <TrendingDown className="h-5 w-5 text-gray-600" />
                          )}
                        </div>
                      <div>
                        <p className="font-medium">{point.description}</p>
                        <p className={`text-sm text-muted-foreground ${point.userId ? 'hover:text-blue-600' : ''} transition-colors`}>
                          👤 {point.userName} {point.orderName && `• ${point.orderName}`}
                        </p>
                        {point.userEmail && (
                          <p className="text-xs text-muted-foreground">✉️ {point.userEmail}</p>
                        )}
                        <p className="text-xs text-muted-foreground">{formatDateTime(point.createdAt)}</p>
                      </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-medium text-lg ${
                            point.type === "적립"
                              ? "text-green-600"
                              : point.type === "사용"
                              ? "text-red-600"
                              : "text-gray-600"
                          }`}
                        >
                          {point.type === "적립" ? "+" : "-"}
                          {point.amount.toLocaleString()}P
                        </p>
                        <Badge
                          variant={
                            point.type === "적립"
                              ? "default"
                              : point.type === "사용"
                              ? "destructive"
                              : point.type === "취소"
                              ? "secondary"
                              : "outline"
                          }
                          className="mt-1"
                        >
                          {point.type}
                        </Badge>
                      </div>
                    </div>
                    ))
                  )}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (page) =>
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                    )
                    .map((page, idx, arr) => (
                      <div key={page} className="flex items-center gap-2">
                        {idx > 0 && arr[idx - 1] !== page - 1 && (
                          <span className="px-2">...</span>
                        )}
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      </div>
                    ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
