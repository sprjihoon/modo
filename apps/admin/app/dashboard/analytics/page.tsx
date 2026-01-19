"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  ShoppingCart,
  CreditCard,
  TrendingUp,
  Image,
  MapPin,
  Activity,
  Calendar,
  Award,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

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

interface OrderStats {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  byStatus: {
    booked: number;
    inbound: number;
    processing: number;
    readyToShip: number;
    delivered: number;
  };
}

interface PaymentStats {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  average: number;
  completed: number;
  pending: number;
  failed: number;
}

interface PointStats {
  totalIssued: number;
  totalUsed: number;
  active: number;
  averagePerUser: number;
}

interface ImageStats {
  total: number;
  withPins: number;
  totalPins: number;
  averagePinsPerImage: number;
}

interface AddressStats {
  total: number;
  active: number;
  default: number;
}

interface ActivityLog {
  id: string;
  type: string;
  action: string;
  user: string;
  orderId?: string;
  timestamp: string;
}

interface UserStats {
  total: number;
  newThisMonth: number;
  active: number;
  inactive: number;
  deleted: number;
}

export default function AnalyticsPage() {
  // 날짜 필터 (기본값: 최근 30일)
  const [startDate, setStartDate] = useState<string>(getDaysAgo(30));
  const [endDate, setEndDate] = useState<string>(getToday());
  const [datePreset, setDatePreset] = useState<string>("30days");

  // 로딩 상태
  const [isLoading, setIsLoading] = useState(true);

  // 통계 데이터
  const [userStats, setUserStats] = useState<UserStats>({
    total: 0,
    newThisMonth: 0,
    active: 0,
    inactive: 0,
    deleted: 0,
  });
  const [orderStats, setOrderStats] = useState<OrderStats>({
    total: 0,
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    byStatus: {
      booked: 0,
      inbound: 0,
      processing: 0,
      readyToShip: 0,
      delivered: 0,
    },
  });
  const [paymentStats, setPaymentStats] = useState<PaymentStats>({
    total: 0,
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    average: 0,
    completed: 0,
    pending: 0,
    failed: 0,
  });
  const [pointStats, setPointStats] = useState<PointStats>({
    totalIssued: 0,
    totalUsed: 0,
    active: 0,
    averagePerUser: 0,
  });
  const [imageStats, setImageStats] = useState<ImageStats>({
    total: 0,
    withPins: 0,
    totalPins: 0,
    averagePinsPerImage: 0,
  });
  const [addressStats, setAddressStats] = useState<AddressStats>({
    total: 0,
    active: 0,
    default: 0,
  });
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

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

  // 전체 데이터 로드
  const loadAllData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadUserStats(),
        loadAnalyticsStats(),
      ]);
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 사용자 통계 로드
  const loadUserStats = async () => {
    try {
      const response = await fetch('/api/customers');
      const data = await response.json();
      
      if (data.stats) {
        setUserStats({
          total: data.stats.totalCustomers || 0,
          newThisMonth: data.stats.newCustomers || 0,
          active: data.stats.activeCustomers || 0,
          inactive: Math.max(0, (data.stats.totalCustomers || 0) - (data.stats.activeCustomers || 0) - (data.stats.deletedCustomers || 0)),
          deleted: data.stats.deletedCustomers || 0,
        });
      }
    } catch (error) {
      console.error('사용자 통계 로드 실패:', error);
    }
  };

  // 통합 통계 로드
  const loadAnalyticsStats = async () => {
    try {
      const params = new URLSearchParams();
      params.append('type', 'all');
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/analytics/stats?${params}`);
      const data = await response.json();

      if (data.success) {
        // 주문 통계
        if (data.orders) {
          setOrderStats({
            total: data.orders.total || 0,
            today: data.orders.today || 0,
            thisWeek: data.orders.thisWeek || 0,
            thisMonth: data.orders.thisMonth || 0,
            byStatus: data.orders.byStatus || {
              booked: 0,
              inbound: 0,
              processing: 0,
              readyToShip: 0,
              delivered: 0,
            },
          });
        }

        // 결제 통계
        if (data.payments) {
          setPaymentStats({
            total: data.payments.total || 0,
            today: data.payments.today || 0,
            thisWeek: data.payments.thisWeek || 0,
            thisMonth: data.payments.thisMonth || 0,
            average: data.payments.average || 0,
            completed: data.payments.completed || 0,
            pending: data.payments.pending || 0,
            failed: data.payments.failed || 0,
          });
        }

        // 포인트 통계
        if (data.points) {
          setPointStats({
            totalIssued: data.points.totalIssued || 0,
            totalUsed: data.points.totalUsed || 0,
            active: data.points.active || 0,
            averagePerUser: data.points.averagePerUser || 0,
          });
        }

        // 이미지 통계
        if (data.images) {
          setImageStats({
            total: data.images.total || 0,
            withPins: data.images.withPins || 0,
            totalPins: data.images.totalPins || 0,
            averagePinsPerImage: data.images.averagePinsPerImage || 0,
          });
        }

        // 배송지 통계
        if (data.addresses) {
          setAddressStats({
            total: data.addresses.total || 0,
            active: data.addresses.active || 0,
            default: data.addresses.default || 0,
          });
        }

        // 활동 로그
        if (data.activity?.logs) {
          setActivityLogs(data.activity.logs);
        }
      }
    } catch (error) {
      console.error('통계 데이터 로드 실패:', error);
    }
  };

  // 초기 로드 및 날짜 변경 시 재로드
  useEffect(() => {
    loadAllData();
  }, [startDate, endDate]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">통계 및 분석</h1>
          <p className="text-muted-foreground">앱 사용 현황을 종합적으로 모니터링합니다</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={loadAllData} variant="outline" size="sm" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            새로고침
          </Button>
          <Link href="/dashboard/analytics/performance">
            <Button className="gap-2">
              <Award className="h-4 w-4" />
              직원 성과 대시보드
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* 직원 성과 대시보드 카드 */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Award className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">직원 성과 대시보드</h3>
                <p className="text-sm text-muted-foreground">
                  작업자와 관리자의 업무 활동을 실시간으로 분석하고 KPI를 확인하세요
                </p>
              </div>
            </div>
            <Link href="/dashboard/analytics/performance">
              <Button variant="outline" className="gap-2">
                보러가기
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

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

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">데이터를 불러오는 중...</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* User Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                사용자 통계
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-5">
                <div>
                  <p className="text-sm text-muted-foreground">전체 사용자</p>
                  <p className="text-2xl font-bold">{userStats.total.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">신규 고객 (이번 달)</p>
                  <p className="text-2xl font-bold text-green-600">
                    {userStats.newThisMonth > 0 ? `+${userStats.newThisMonth.toLocaleString()}` : '0'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">활성 사용자</p>
                  <p className="text-2xl font-bold text-blue-600">{userStats.active.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">비활성 사용자</p>
                  <p className="text-2xl font-bold text-gray-600">{userStats.inactive.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">탈퇴 회원</p>
                  <p className="text-2xl font-bold text-red-600">{userStats.deleted.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                주문 통계
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4 mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">전체 주문</p>
                  <p className="text-2xl font-bold">{orderStats.total.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">오늘 주문</p>
                  <p className="text-2xl font-bold text-green-600">+{orderStats.today.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">이번 주</p>
                  <p className="text-2xl font-bold">{orderStats.thisWeek.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">이번 달</p>
                  <p className="text-2xl font-bold">{orderStats.thisMonth.toLocaleString()}</p>
                </div>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3">상태별 주문 수</p>
                <div className="grid gap-2 md:grid-cols-5">
                  <div className="p-3 border rounded-lg">
                    <p className="text-xs text-muted-foreground">수거예약</p>
                    <p className="text-xl font-bold">{orderStats.byStatus.booked.toLocaleString()}</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="text-xs text-muted-foreground">입고완료</p>
                    <p className="text-xl font-bold">{orderStats.byStatus.inbound.toLocaleString()}</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="text-xs text-muted-foreground">수선중</p>
                    <p className="text-xl font-bold">{orderStats.byStatus.processing.toLocaleString()}</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="text-xs text-muted-foreground">출고완료</p>
                    <p className="text-xl font-bold">{orderStats.byStatus.readyToShip.toLocaleString()}</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="text-xs text-muted-foreground">배송완료</p>
                    <p className="text-xl font-bold">{orderStats.byStatus.delivered.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                결제 통계
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4 mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">총 매출</p>
                  <p className="text-2xl font-bold">₩{paymentStats.total.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">오늘 매출</p>
                  <p className="text-2xl font-bold text-green-600">
                    ₩{paymentStats.today.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">이번 주</p>
                  <p className="text-2xl font-bold">₩{paymentStats.thisWeek.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">평균 주문 금액</p>
                  <p className="text-2xl font-bold">₩{paymentStats.average.toLocaleString()}</p>
                </div>
              </div>
              <div className="border-t pt-4">
                <div className="grid gap-2 md:grid-cols-3">
                  <div className="p-3 border rounded-lg">
                    <p className="text-xs text-muted-foreground">결제 완료</p>
                    <p className="text-xl font-bold text-green-600">{paymentStats.completed.toLocaleString()}</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="text-xs text-muted-foreground">결제 대기</p>
                    <p className="text-xl font-bold text-yellow-600">{paymentStats.pending.toLocaleString()}</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="text-xs text-muted-foreground">결제 실패</p>
                    <p className="text-xl font-bold text-red-600">{paymentStats.failed.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Point Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  포인트 통계
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">총 발급 포인트</p>
                    <p className="text-2xl font-bold">{pointStats.totalIssued.toLocaleString()}P</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">사용된 포인트</p>
                    <p className="text-2xl font-bold text-red-600">
                      {pointStats.totalUsed.toLocaleString()}P
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">보유 중인 포인트</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {pointStats.active.toLocaleString()}P
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">사용자당 평균</p>
                    <p className="text-2xl font-bold">{pointStats.averagePerUser.toLocaleString()}P</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Image & Pin Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="h-5 w-5" />
                  이미지 및 핀 통계
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">전체 이미지</p>
                    <p className="text-2xl font-bold">{imageStats.total.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">핀이 있는 이미지</p>
                    <p className="text-2xl font-bold text-blue-600">{imageStats.withPins.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">전체 핀 수</p>
                    <p className="text-2xl font-bold">{imageStats.totalPins.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">이미지당 평균 핀</p>
                    <p className="text-2xl font-bold">{imageStats.averagePinsPerImage}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Address Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  배송지 통계
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">전체 배송지</p>
                    <p className="text-2xl font-bold">{addressStats.total.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">활성 배송지</p>
                    <p className="text-2xl font-bold text-green-600">{addressStats.active.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">기본 배송지</p>
                    <p className="text-2xl font-bold text-blue-600">{addressStats.default.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Activity Log */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  실시간 활동 로그
                </CardTitle>
                <CardDescription>최근 사용자 활동 내역입니다</CardDescription>
              </CardHeader>
              <CardContent>
                {activityLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>최근 활동 내역이 없습니다</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activityLogs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              log.type === "order"
                                ? "bg-blue-500"
                                : log.type === "payment"
                                ? "bg-green-500"
                                : log.type === "image"
                                ? "bg-purple-500"
                                : log.type === "work"
                                ? "bg-orange-500"
                                : log.type === "extraCharge"
                                ? "bg-red-500"
                                : "bg-gray-500"
                            }`}
                          />
                          <div>
                            <p className="font-medium text-sm">{log.action}</p>
                            <p className="text-xs text-muted-foreground">
                              {log.user} {log.orderId && `• ${log.orderId}`}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{log.timestamp}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
