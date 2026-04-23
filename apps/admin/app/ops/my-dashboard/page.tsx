"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  User,
  Package,
  CheckCircle,
  Clock,
  TrendingUp,
  ArrowDown,
  ArrowUp,
  Loader2,
  RefreshCw,
  BarChart3,
  Target,
  Boxes,
  Truck,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { createClient } from "@/lib/supabase/client";

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

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface PerformanceStats {
  workComplete: number;
  scanInbound: number;
  scanOutbound: number;
  extraChargeRequest: number;
}

interface OverallStats {
  // 입고 관련
  inboundToday: number;
  inboundPending: number;
  inboundExpected: number;
  
  // 출고 관련
  outboundReady: number;
  outboundComplete: number;
  
  // 작업 관련
  workInProgress: number;
  workComplete: number;
}

interface DailyPerformance {
  date: string;
  count: number;
}

export default function MyDashboardPage() {
  // 날짜 필터 (기본값: 오늘)
  const [startDate, setStartDate] = useState<string>(getToday());
  const [endDate, setEndDate] = useState<string>(getToday());
  const [datePreset, setDatePreset] = useState<string>("today");

  // 상태
  const [isLoading, setIsLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [myPerformance, setMyPerformance] = useState<PerformanceStats>({
    workComplete: 0,
    scanInbound: 0,
    scanOutbound: 0,
    extraChargeRequest: 0,
  });
  const [overallStats, setOverallStats] = useState<OverallStats>({
    inboundToday: 0,
    inboundPending: 0,
    inboundExpected: 0,
    outboundReady: 0,
    outboundComplete: 0,
    workInProgress: 0,
    workComplete: 0,
  });
  const [weeklyPerformance, setWeeklyPerformance] = useState<DailyPerformance[]>([]);

  // 초기 로드
  useEffect(() => {
    loadUserInfo();
  }, []);

  // 날짜 변경 시 데이터 리로드
  useEffect(() => {
    if (userInfo) {
      loadDashboardData();
    }
  }, [startDate, endDate, userInfo]);

  // 사용자 정보 로드
  const loadUserInfo = async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;

      const { data: userData, error } = await supabase
        .from("users")
        .select("id, email, name, role")
        .eq("auth_id", session.user.id)
        .single();

      if (error || !userData) {
        console.error("사용자 정보 조회 실패:", error);
        return;
      }

      setUserInfo(userData);
    } catch (error) {
      console.error("사용자 정보 로드 실패:", error);
    }
  };

  // 대시보드 데이터 로드
  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadMyPerformance(),
        loadOverallStats(),
        loadWeeklyPerformance(),
      ]);
    } catch (error) {
      console.error("대시보드 데이터 로드 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 나의 성과 로드
  const loadMyPerformance = async () => {
    if (!userInfo) return;

    try {
      const supabase = createClient();
      
      // 날짜 범위로 action_logs 조회
      let query = supabase
        .from("action_logs")
        .select("action_type")
        .eq("actor_id", userInfo.id);

      if (startDate) {
        query = query.gte("timestamp", `${startDate}T00:00:00.000Z`);
      }
      if (endDate) {
        query = query.lte("timestamp", `${endDate}T23:59:59.999Z`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("성과 조회 실패:", error);
        return;
      }

      // 액션별 집계
      let workComplete = 0;
      let scanInbound = 0;
      let scanOutbound = 0;
      let extraChargeRequest = 0;

      data?.forEach((log) => {
        switch (log.action_type) {
          case "WORK_COMPLETE":
            workComplete++;
            break;
          case "SCAN_INBOUND":
            scanInbound++;
            break;
          case "SCAN_OUTBOUND":
            scanOutbound++;
            break;
          case "REQ_EXTRA_CHARGE":
            extraChargeRequest++;
            break;
        }
      });

      setMyPerformance({
        workComplete,
        scanInbound,
        scanOutbound,
        extraChargeRequest,
      });
    } catch (error) {
      console.error("성과 로드 실패:", error);
    }
  };

  // 전체 현황 로드
  const loadOverallStats = async () => {
    try {
      const supabase = createClient();
      const today = getToday();

      // 주문 상태별 카운트 조회
      const { data: orders, error } = await supabase
        .from("orders")
        .select("id, status, created_at, updated_at");

      if (error) {
        console.error("주문 조회 실패:", error);
        return;
      }

      // 상태별 집계
      let inboundToday = 0;
      let inboundPending = 0;
      let inboundExpected = 0;
      let outboundReady = 0;
      let outboundComplete = 0;
      let workInProgress = 0;
      let workComplete = 0;

      orders?.forEach((order) => {
        const createdDate = order.created_at?.split("T")[0];
        const updatedDate = order.updated_at?.split("T")[0];

        switch (order.status) {
          case "BOOKED":
            // 수거예약 = 입고 예정
            inboundExpected++;
            break;
          case "INBOUND":
            // 입고완료 = 작업 대기
            inboundPending++;
            if (updatedDate === today) {
              inboundToday++;
            }
            break;
          case "PROCESSING":
            // 수선중
            workInProgress++;
            break;
          case "READY_TO_SHIP":
            // 출고대기
            outboundReady++;
            break;
          case "DELIVERED":
            // 배송완료
            outboundComplete++;
            break;
        }
      });

      // 기간 내 작업 완료 건수 (action_logs에서)
      let workCompleteQuery = supabase
        .from("action_logs")
        .select("id", { count: "exact" })
        .eq("action_type", "WORK_COMPLETE");

      if (startDate) {
        workCompleteQuery = workCompleteQuery.gte("timestamp", `${startDate}T00:00:00.000Z`);
      }
      if (endDate) {
        workCompleteQuery = workCompleteQuery.lte("timestamp", `${endDate}T23:59:59.999Z`);
      }

      const { count: workCompleteCount } = await workCompleteQuery;

      setOverallStats({
        inboundToday,
        inboundPending,
        inboundExpected,
        outboundReady,
        outboundComplete,
        workInProgress,
        workComplete: workCompleteCount || 0,
      });
    } catch (error) {
      console.error("전체 현황 로드 실패:", error);
    }
  };

  // 주간 성과 로드
  const loadWeeklyPerformance = async () => {
    if (!userInfo) return;

    try {
      const supabase = createClient();
      const today = new Date();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(today.getDate() - 6);

      const { data, error } = await supabase
        .from("action_logs")
        .select("timestamp")
        .eq("actor_id", userInfo.id)
        .eq("action_type", "WORK_COMPLETE")
        .gte("timestamp", sevenDaysAgo.toISOString())
        .lte("timestamp", today.toISOString());

      if (error) {
        console.error("주간 성과 조회 실패:", error);
        return;
      }

      // 일별 집계
      const dailyMap: { [key: string]: number } = {};
      
      // 7일간 초기화
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(today.getDate() - i);
        const dateKey = date.toISOString().split("T")[0];
        dailyMap[dateKey] = 0;
      }

      // 로그 집계
      data?.forEach((log) => {
        const dateKey = log.timestamp.split("T")[0];
        if (dailyMap[dateKey] !== undefined) {
          dailyMap[dateKey]++;
        }
      });

      // 배열로 변환
      const performance: DailyPerformance[] = Object.entries(dailyMap).map(
        ([date, count]) => ({ date, count })
      );

      setWeeklyPerformance(performance);
    } catch (error) {
      console.error("주간 성과 로드 실패:", error);
    }
  };

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

  // 새로고침
  const handleRefresh = () => {
    loadDashboardData();
  };

  // 역할 표시
  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
        return <Badge className="bg-purple-100 text-purple-800">관리자</Badge>;
      case "MANAGER":
        return <Badge className="bg-blue-100 text-blue-800">매니저</Badge>;
      case "WORKER":
        return <Badge className="bg-green-100 text-green-800">작업자</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  // 요일 이름
  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    return days[date.getDay()];
  };

  // 시간대별 인사
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return "새벽에도 수고하세요 🌙";
    if (hour < 12) return "좋은 아침이에요 ☀️";
    if (hour < 18) return "좋은 오후에요 🌤️";
    return "수고 많으셨어요 🌙";
  };

  // 최대 성과 계산 (차트용)
  const maxPerformance = Math.max(...weeklyPerformance.map((p) => p.count), 1);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">나의 대시보드</h1>
          <p className="text-muted-foreground">
            {getGreeting()} {userInfo?.name}님
          </p>
        </div>
        <div className="flex items-center gap-2">
          {userInfo && getRoleBadge(userInfo.role)}
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2">새로고침</span>
          </Button>
        </div>
      </div>

      {/* 날짜 필터 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
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
        </CardContent>
      </Card>

      {/* 사용자 정보 카드 */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-green-100 rounded-full">
              <User className="h-8 w-8 text-green-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{userInfo?.name || "로딩 중..."}</h2>
              <p className="text-muted-foreground">{userInfo?.email}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">현재 역할</p>
              {userInfo && getRoleBadge(userInfo.role)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 나의 성과 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            나의 성과
          </CardTitle>
          <CardDescription>선택한 기간 동안의 내 작업 실적입니다</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-4">
              <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-muted-foreground">작업 완료</span>
                </div>
                <p className="text-3xl font-bold text-green-600">{myPerformance.workComplete}</p>
                <p className="text-xs text-muted-foreground mt-1">건</p>
              </div>
              <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowDown className="h-5 w-5 text-blue-600" />
                  <span className="text-sm text-muted-foreground">입고 스캔</span>
                </div>
                <p className="text-3xl font-bold text-blue-600">{myPerformance.scanInbound}</p>
                <p className="text-xs text-muted-foreground mt-1">건</p>
              </div>
              <div className="p-4 border rounded-lg bg-purple-50 border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowUp className="h-5 w-5 text-purple-600" />
                  <span className="text-sm text-muted-foreground">출고 스캔</span>
                </div>
                <p className="text-3xl font-bold text-purple-600">{myPerformance.scanOutbound}</p>
                <p className="text-xs text-muted-foreground mt-1">건</p>
              </div>
              <div className="p-4 border rounded-lg bg-orange-50 border-orange-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                  <span className="text-sm text-muted-foreground">추가비용 요청</span>
                </div>
                <p className="text-3xl font-bold text-orange-600">{myPerformance.extraChargeRequest}</p>
                <p className="text-xs text-muted-foreground mt-1">건</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 전체 현황 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* 입고 현황 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-5 w-5 text-blue-600" />
              입고 현황
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <span className="text-sm">입고 예정 (수거예약)</span>
                  <span className="text-xl font-bold text-yellow-600">{overallStats.inboundExpected}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm">오늘 입고</span>
                  <span className="text-xl font-bold text-blue-600">{overallStats.inboundToday}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <span className="text-sm">미처리 (입고완료 대기)</span>
                  <span className="text-xl font-bold text-orange-600">{overallStats.inboundPending}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 작업 현황 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Boxes className="h-5 w-5 text-purple-600" />
              작업 현황
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <span className="text-sm">작업 중</span>
                  <span className="text-xl font-bold text-purple-600">{overallStats.workInProgress}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm">기간 내 작업 완료</span>
                  <span className="text-xl font-bold text-green-600">{overallStats.workComplete}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 출고 현황 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="h-5 w-5 text-teal-600" />
              출고 현황
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                  <span className="text-sm">출고 대기</span>
                  <span className="text-xl font-bold text-amber-600">{overallStats.outboundReady}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-teal-50 rounded-lg">
                  <span className="text-sm">배송 완료</span>
                  <span className="text-xl font-bold text-teal-600">{overallStats.outboundComplete}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 주간 성과 차트 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            최근 7일 작업 완료 현황
          </CardTitle>
          <CardDescription>일별 작업 완료 건수입니다</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => getDayName(value)} 
                    tick={{ fontSize: 12, fill: "#6b7280" }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: "#6b7280" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f3f4f6' }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white border border-gray-200 p-2 rounded shadow-sm text-xs">
                            <p className="font-bold mb-1">{label} ({getDayName(String(label))})</p>
                            <p className="text-green-600">완료: {payload[0].value}건</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {weeklyPerformance.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.date === getToday() ? "#22c55e" : "#cbd5e1"} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 동기부여 메시지 */}
      <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="text-4xl">💪</div>
            <div>
              <p className="text-sm text-muted-foreground">오늘의 한마디</p>
              <p className="text-lg font-semibold">
                {getMotivationalMessage(myPerformance.workComplete)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// 동기부여 메시지
function getMotivationalMessage(todayCount: number): string {
  if (todayCount >= 50) {
    return "🏆 대단해요! 오늘 정말 열심히 하셨네요!";
  } else if (todayCount >= 30) {
    return "🌟 훌륭합니다! 이 속도면 최고예요!";
  } else if (todayCount >= 20) {
    return "💪 좋아요! 계속 파이팅하세요!";
  } else if (todayCount >= 10) {
    return "👍 잘하고 있어요! 힘내세요!";
  } else if (todayCount >= 5) {
    return "😊 좋은 시작이에요!";
  } else {
    return "🎯 오늘도 화이팅!";
  }
}
