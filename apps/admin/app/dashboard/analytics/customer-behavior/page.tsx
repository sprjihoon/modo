"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, ShoppingCart, CreditCard, TrendingDown, TrendingUp, Activity, Calendar, ArrowRight, ArrowDown, Filter, Smartphone, Monitor, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

// 날짜 헬퍼
const getToday = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

const getDaysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
};

interface OverviewStats {
  totalEvents: number;
  uniqueUsers: number;
  cart: {
    added: number;
    removed: number;
    netAdditions: number;
  };
  orders: {
    started: number;
    paymentAttempted: number;
    completed: number;
    failed: number;
    conversionRate: string;
  };
}

interface FunnelStage {
  stage: string;
  count: number;
  dropoffCount: number;
  dropoffRate: string;
  conversionRate: string;
}

interface DropoffPoint {
  eventType: string;
  count: number;
  percentage: string;
}

interface DropoffAnalysis {
  totalSessions: number;
  dropoffPoints: DropoffPoint[];
}

interface SessionData {
  summary: {
    totalSessions: number;
    avgDuration: number;
    avgEventsPerSession: number;
    bounceRate: number;
  };
  daily: any[];
}

interface TimePatternData {
  hourly: any[];
  daily: any[];
}

interface DeviceData {
  device_type: string;
  device_os: string;
  total_sessions: number;
  total_events: number;
  conversion_rate: number;
}

interface CohortData {
  performance: any[];
  dailyRetention: any[];
  weeklyRetention: any[];
}

interface RetentionData {
  type: string;
  data: any[];
}

interface JourneyData {
  type: string;
  data: any[];
}

export default function CustomerBehaviorPage() {
  // 날짜 필터
  const [startDate, setStartDate] = useState<string>(getDaysAgo(30));
  const [endDate, setEndDate] = useState<string>(getToday());
  const [datePreset, setDatePreset] = useState<string>("30days");

  // 데이터 상태
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);
  const [funnelData, setFunnelData] = useState<FunnelStage[]>([]);
  const [dropoffData, setDropoffData] = useState<DropoffAnalysis | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [timePatternData, setTimePatternData] = useState<TimePatternData | null>(null);
  const [deviceData, setDeviceData] = useState<DeviceData[]>([]);
  const [cohortData, setCohortData] = useState<CohortData | null>(null);
  const [retentionData, setRetentionData] = useState<RetentionData | null>(null);
  const [journeyData, setJourneyData] = useState<JourneyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("funnel");

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
      default:
        break;
    }
  };

  // 데이터 로드
  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  // 탭 변경 시 해당 데이터 로드
  useEffect(() => {
    loadTabData(activeTab);
  }, [activeTab, startDate, endDate]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadOverviewStats(),
        loadFunnelData(),
        loadDropoffData(),
      ]);
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTabData = async (tab: string) => {
    try {
      switch (tab) {
        case "sessions":
          if (!sessionData) await loadSessionData();
          break;
        case "time":
          if (!timePatternData) await loadTimePatternData();
          break;
        case "devices":
          if (deviceData.length === 0) await loadDeviceData();
          break;
        case "cohort":
          if (!cohortData) await loadCohortData();
          break;
        case "retention":
          if (!retentionData) await loadRetentionData();
          break;
        case "journey":
          if (!journeyData) await loadJourneyData();
          break;
      }
    } catch (error) {
      console.error(`${tab} 데이터 로드 실패:`, error);
    }
  };

  const loadOverviewStats = async () => {
    try {
      const params = new URLSearchParams({
        type: 'overview',
        startDate,
        endDate,
      });

      const response = await fetch(`/api/analytics/customer-behavior?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setOverviewStats(result.data);
      }
    } catch (error) {
      console.error('개요 통계 로드 실패:', error);
    }
  };

  const loadFunnelData = async () => {
    try {
      const params = new URLSearchParams({
        type: 'funnel',
        startDate,
        endDate,
      });

      const response = await fetch(`/api/analytics/customer-behavior?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setFunnelData(result.data);
      }
    } catch (error) {
      console.error('퍼널 데이터 로드 실패:', error);
    }
  };

  const loadDropoffData = async () => {
    try {
      const params = new URLSearchParams({
        type: 'dropoff',
        startDate,
        endDate,
      });

      const response = await fetch(`/api/analytics/customer-behavior?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setDropoffData(result.data);
      }
    } catch (error) {
      console.error('이탈 데이터 로드 실패:', error);
    }
  };

  const loadSessionData = async () => {
    try {
      const params = new URLSearchParams({
        type: 'session',
        startDate,
        endDate,
      });

      const response = await fetch(`/api/analytics/customer-behavior?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setSessionData(result.data);
      }
    } catch (error) {
      console.error('세션 데이터 로드 실패:', error);
    }
  };

  const loadTimePatternData = async () => {
    try {
      const params = new URLSearchParams({
        type: 'time-pattern',
        startDate,
        endDate,
      });

      const response = await fetch(`/api/analytics/customer-behavior?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setTimePatternData(result.data);
      }
    } catch (error) {
      console.error('시간 패턴 데이터 로드 실패:', error);
    }
  };

  const loadDeviceData = async () => {
    try {
      const params = new URLSearchParams({
        type: 'device',
        startDate,
        endDate,
      });

      const response = await fetch(`/api/analytics/customer-behavior?${params}`);
      const result = await response.json();
      
      if (result.success && Array.isArray(result.data)) {
        setDeviceData(result.data);
      }
    } catch (error) {
      console.error('디바이스 데이터 로드 실패:', error);
    }
  };

  const loadCohortData = async () => {
    try {
      const params = new URLSearchParams({
        type: 'cohort',
        startDate,
        endDate,
      });

      const response = await fetch(`/api/analytics/customer-behavior?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setCohortData(result.data);
      }
    } catch (error) {
      console.error('코호트 데이터 로드 실패:', error);
    }
  };

  const loadRetentionData = async () => {
    try {
      const params = new URLSearchParams({
        type: 'retention',
        retentionType: 'n-day',
        startDate,
        endDate,
      });

      const response = await fetch(`/api/analytics/customer-behavior?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setRetentionData(result.data);
      }
    } catch (error) {
      console.error('리텐션 데이터 로드 실패:', error);
    }
  };

  const loadJourneyData = async () => {
    try {
      const params = new URLSearchParams({
        type: 'journey',
        journeyType: 'sequences',
      });

      const response = await fetch(`/api/analytics/customer-behavior?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setJourneyData(result.data);
      }
    } catch (error) {
      console.error('여정 데이터 로드 실패:', error);
    }
  };

  // 이벤트 타입 한글 변환
  const getEventTypeLabel = (eventType: string) => {
    const labels: Record<string, string> = {
      'APP_OPEN': '앱 실행',
      'PAGE_VIEW': '페이지 조회',
      'PRODUCT_VIEW': '상품 조회',
      'REPAIR_MENU_VIEW': '수선 메뉴 조회',
      'CART_ADD': '장바구니 추가',
      'CART_REMOVE': '장바구니 삭제',
      'ORDER_START': '주문 시작',
      'ORDER_INFO_FILL': '주문 정보 입력',
      'ORDER_ADDRESS_FILL': '배송지 입력',
      'ORDER_PAYMENT_START': '결제 시도',
      'ORDER_PAYMENT_SUCCESS': '결제 완료',
      'ORDER_PAYMENT_FAIL': '결제 실패',
      'PICKUP_REQUEST_START': '수거 신청 시작',
      'PICKUP_REQUEST_COMPLETE': '수거 신청 완료',
      'IMAGE_UPLOAD_START': '이미지 업로드 시작',
      'IMAGE_UPLOAD_COMPLETE': '이미지 업로드 완료',
      'EXTRA_CHARGE_VIEW': '추가금 확인',
      'EXTRA_CHARGE_ACCEPT': '추가금 승인',
      'EXTRA_CHARGE_REJECT': '추가금 거부',
    };
    return labels[eventType] || eventType;
  };

  // 시간 포맷
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}초`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}분 ${seconds % 60}초`;
    return `${Math.floor(seconds / 3600)}시간 ${Math.floor((seconds % 3600) / 60)}분`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">고객 행동 분석</h1>
          <p className="text-muted-foreground">
            고객의 모든 액션을 추적하고 이탈 지점을 분석합니다
          </p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          새로고침
        </Button>
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
            <Button onClick={loadData} size="sm" variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              적용
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 개요 통계 */}
      {overviewStats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                총 이벤트
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overviewStats.totalEvents.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                <Activity className="h-3 w-3 inline mr-1" />
                모든 고객 액션
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                활성 사용자
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overviewStats.uniqueUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                <Users className="h-3 w-3 inline mr-1" />
                고유 사용자 수
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                장바구니 추가
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                +{overviewStats.cart.added.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                <ShoppingCart className="h-3 w-3 inline mr-1" />
                삭제: {overviewStats.cart.removed} | 순증: {overviewStats.cart.netAdditions}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                전환율
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {overviewStats.orders.conversionRate}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                <CreditCard className="h-3 w-3 inline mr-1" />
                {overviewStats.orders.completed} / {overviewStats.orders.started} 주문
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 탭 컨텐츠 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-9 gap-1">
          <TabsTrigger value="funnel">퍼널</TabsTrigger>
          <TabsTrigger value="dropoff">이탈</TabsTrigger>
          <TabsTrigger value="sessions">세션</TabsTrigger>
          <TabsTrigger value="time">시간</TabsTrigger>
          <TabsTrigger value="devices">디바이스</TabsTrigger>
          <TabsTrigger value="cohort">코호트</TabsTrigger>
          <TabsTrigger value="retention">리텐션</TabsTrigger>
          <TabsTrigger value="journey">여정</TabsTrigger>
          <TabsTrigger value="orders">주문</TabsTrigger>
        </TabsList>

        {/* 퍼널 분석 */}
        <TabsContent value="funnel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>고객 전환 퍼널</CardTitle>
              <CardDescription>
                각 단계별 고객 수와 전환율을 확인할 수 있습니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              {funnelData.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>퍼널 데이터가 없습니다</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {funnelData.map((stage, index) => {
                    const maxCount = funnelData[0]?.count || 1;
                    const widthPercentage = (stage.count / maxCount) * 100;

                    return (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium">{stage.stage}</p>
                              <p className="text-xs text-muted-foreground">
                                {stage.count.toLocaleString()}명
                                {index > 0 && (
                                  <span className="ml-2 text-green-600">
                                    전환율: {stage.conversionRate}%
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          {index > 0 && stage.dropoffCount > 0 && (
                            <Badge variant="destructive" className="gap-1">
                              <TrendingDown className="h-3 w-3" />
                              이탈 {stage.dropoffCount}명 ({stage.dropoffRate}%)
                            </Badge>
                          )}
                        </div>
                        <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-blue-400 flex items-center justify-end px-3"
                            style={{ width: `${widthPercentage}%` }}
                          >
                            <span className="text-white text-sm font-medium">
                              {widthPercentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        {index < funnelData.length - 1 && (
                          <div className="flex justify-center">
                            <ArrowDown className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 이탈 지점 분석 */}
        <TabsContent value="dropoff" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>주요 이탈 지점</CardTitle>
              <CardDescription>
                고객이 어느 시점에서 가장 많이 이탈하는지 확인할 수 있습니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dropoffData ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">총 세션 수</p>
                      <p className="text-2xl font-bold">{dropoffData.totalSessions.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {dropoffData.dropoffPoints.slice(0, 10).map((point, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-white font-semibold text-sm ${
                              index === 0 ? 'bg-red-500' :
                              index === 1 ? 'bg-orange-500' :
                              index === 2 ? 'bg-yellow-500' :
                              'bg-gray-400'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium">{getEventTypeLabel(point.eventType)}</p>
                              <p className="text-xs text-muted-foreground">
                                {point.count.toLocaleString()}명 이탈
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline">{point.percentage}%</Badge>
                        </div>
                        <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden ml-11">
                          <div
                            className={`absolute inset-y-0 left-0 rounded-full ${
                              index === 0 ? 'bg-red-500' :
                              index === 1 ? 'bg-orange-500' :
                              index === 2 ? 'bg-yellow-500' :
                              'bg-gray-400'
                            }`}
                            style={{ width: `${point.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>이탈 데이터가 없습니다</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 세션 분석 */}
        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>세션 분석</CardTitle>
              <CardDescription>
                사용자 세션의 품질과 참여도를 분석합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sessionData?.summary ? (
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">총 세션 수</p>
                    <p className="text-2xl font-bold">{sessionData.summary.totalSessions.toLocaleString()}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">평균 체류 시간</p>
                    <p className="text-2xl font-bold">{formatDuration(sessionData.summary.avgDuration)}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">세션당 이벤트</p>
                    <p className="text-2xl font-bold">{sessionData.summary.avgEventsPerSession}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">바운스율</p>
                    <p className="text-2xl font-bold text-orange-600">{sessionData.summary.bounceRate}%</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>세션 데이터가 없습니다</p>
                  <p className="text-sm mt-2">고객 이벤트가 수집되면 세션 분석이 표시됩니다</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 시간 패턴 분석 */}
        <TabsContent value="time" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>시간 패턴 분석</CardTitle>
              <CardDescription>
                시간대 및 요일별 활동 패턴을 분석합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              {timePatternData?.hourly && timePatternData.hourly.length > 0 ? (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-3">시간대별 활동</h4>
                    <div className="grid grid-cols-12 gap-1">
                      {Array.from({ length: 24 }, (_, hour) => {
                        const data = timePatternData.hourly.find((h: any) => h.hour_of_day === hour);
                        const count = data?.event_count || 0;
                        const maxCount = Math.max(...timePatternData.hourly.map((h: any) => h.event_count || 0), 1);
                        const intensity = count / maxCount;
                        return (
                          <div key={hour} className="text-center">
                            <div
                              className="h-16 rounded"
                              style={{
                                backgroundColor: `rgba(59, 130, 246, ${intensity})`,
                              }}
                              title={`${hour}시: ${count}건`}
                            />
                            <span className="text-xs text-muted-foreground">{hour}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>시간 패턴 데이터가 없습니다</p>
                  <p className="text-sm mt-2">고객 이벤트가 수집되면 시간대별 분석이 표시됩니다</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 디바이스 분석 */}
        <TabsContent value="devices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>디바이스별 분석</CardTitle>
              <CardDescription>
                디바이스 타입 및 OS별 성과를 비교합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              {deviceData.length > 0 ? (
                <div className="space-y-4">
                  {deviceData.map((device, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {device.device_type === 'mobile' ? (
                          <Smartphone className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Monitor className="h-5 w-5 text-gray-600" />
                        )}
                        <div>
                          <p className="font-medium">{device.device_os || device.device_type || '알 수 없음'}</p>
                          <p className="text-xs text-muted-foreground">
                            {device.total_sessions?.toLocaleString() || 0}개 세션 · {device.total_events?.toLocaleString() || 0}개 이벤트
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">
                        전환율 {(device.conversion_rate || 0).toFixed(1)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Smartphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>디바이스 데이터가 없습니다</p>
                  <p className="text-sm mt-2">고객 이벤트가 수집되면 디바이스별 분석이 표시됩니다</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 코호트 분석 */}
        <TabsContent value="cohort" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>코호트 분석</CardTitle>
              <CardDescription>
                사용자 그룹별 행동 패턴과 리텐션을 분석합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cohortData?.performance && cohortData.performance.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">분석 코호트 수</p>
                      <p className="text-2xl font-bold">{cohortData.performance.length}개</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">최근 코호트</p>
                      <p className="text-2xl font-bold">{cohortData.performance[0]?.cohort_month || '-'}</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">총 사용자</p>
                      <p className="text-2xl font-bold">
                        {cohortData.performance.reduce((sum: number, c: any) => sum + (c.user_count || 0), 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>코호트 데이터가 없습니다</p>
                  <p className="text-sm mt-2">사용자 데이터가 누적되면 코호트 분석이 표시됩니다</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 리텐션 분석 */}
        <TabsContent value="retention" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>리텐션 분석</CardTitle>
              <CardDescription>
                사용자의 재방문 패턴과 재구매율을 분석합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              {retentionData?.data && retentionData.data.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-5">
                    {['Day 1', 'Day 3', 'Day 7', 'Day 14', 'Day 30'].map((day, index) => {
                      const colors = ['bg-blue-50', 'bg-green-50', 'bg-purple-50', 'bg-orange-50', 'bg-red-50'];
                      const textColors = ['text-blue-600', 'text-green-600', 'text-purple-600', 'text-orange-600', 'text-red-600'];
                      return (
                        <Card key={day} className={colors[index]}>
                          <CardContent className="pt-6 text-center">
                            <div className={`text-3xl font-bold ${textColors[index]}`}>{day}</div>
                            <div className="text-sm text-muted-foreground mt-2">재방문율</div>
                            <div className="text-2xl font-bold mt-2">
                              {retentionData.data[0]?.[`day_${[1, 3, 7, 14, 30][index]}_retention`]?.toFixed(1) || '-'}%
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>리텐션 데이터가 없습니다</p>
                  <p className="text-sm mt-2">사용자 재방문 데이터가 누적되면 리텐션 분석이 표시됩니다</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 고객 여정 분석 */}
        <TabsContent value="journey" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>고객 여정 시각화</CardTitle>
              <CardDescription>
                사용자의 행동 경로와 전환 패턴을 분석합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              {journeyData?.data && journeyData.data.length > 0 ? (
                <div className="space-y-4">
                  <h4 className="font-medium">주요 이벤트 시퀀스</h4>
                  {journeyData.data.slice(0, 10).map((seq: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2 flex-wrap">
                        {seq.event_sequence?.split(' → ').map((event: string, i: number, arr: string[]) => (
                          <span key={i} className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs">
                              {getEventTypeLabel(event)}
                            </Badge>
                            {i < arr.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                          </span>
                        ))}
                      </div>
                      <Badge>{seq.sequence_count?.toLocaleString() || 0}회</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>여정 데이터가 없습니다</p>
                  <p className="text-sm mt-2">고객 이벤트가 수집되면 여정 분석이 표시됩니다</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 주문 흐름 */}
        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>주문 및 결제 흐름</CardTitle>
              <CardDescription>
                주문부터 결제까지의 전체 흐름을 분석합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              {overviewStats && (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">주문 시작</p>
                      <p className="text-3xl font-bold text-blue-600">
                        {overviewStats.orders.started.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">결제 시도</p>
                      <p className="text-3xl font-bold text-purple-600">
                        {overviewStats.orders.paymentAttempted.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {overviewStats.orders.started > 0 
                          ? ((overviewStats.orders.paymentAttempted / overviewStats.orders.started) * 100).toFixed(1)
                          : 0}% 전환
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">결제 완료</p>
                      <p className="text-3xl font-bold text-green-600">
                        {overviewStats.orders.completed.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {overviewStats.orders.paymentAttempted > 0
                          ? ((overviewStats.orders.completed / overviewStats.orders.paymentAttempted) * 100).toFixed(1)
                          : 0}% 성공률
                      </p>
                    </div>
                  </div>

                  {overviewStats.orders.failed > 0 && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingDown className="h-5 w-5 text-red-600" />
                        <p className="font-semibold text-red-900">결제 실패</p>
                      </div>
                      <p className="text-2xl font-bold text-red-600">
                        {overviewStats.orders.failed.toLocaleString()}건
                      </p>
                      <p className="text-sm text-red-700 mt-2">
                        전체 결제 시도의{' '}
                        {overviewStats.orders.paymentAttempted > 0
                          ? ((overviewStats.orders.failed / overviewStats.orders.paymentAttempted) * 100).toFixed(1)
                          : 0}%
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
