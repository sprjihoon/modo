"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Bell,
  Activity,
  Calendar,
} from "lucide-react";

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

export default function AnalyticsPage() {
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

  // TODO: Fetch real data from Supabase
  const userStats = {
    total: 89,
    newToday: 5,
    active: 67,
    inactive: 22,
  };

  const orderStats = {
    total: 124,
    today: 8,
    thisWeek: 45,
    thisMonth: 124,
    byStatus: {
      booked: 12,
      inbound: 8,
      processing: 23,
      readyToShip: 5,
      delivered: 76,
    },
  };

  const paymentStats = {
    total: 2450000,
    today: 120000,
    thisWeek: 850000,
    thisMonth: 2450000,
    average: 19758,
    completed: 98,
    pending: 3,
    failed: 2,
  };

  const pointStats = {
    totalIssued: 245000,
    totalUsed: 120000,
    active: 125000,
    averagePerUser: 2752,
  };

  const imageStats = {
    total: 248,
    withPins: 186,
    averagePinsPerImage: 3.2,
    totalPins: 595,
  };

  const addressStats = {
    total: 134,
    active: 98,
    default: 67,
  };

  const activityLogs = [
    {
      id: 1,
      type: "order",
      action: "주문 생성",
      user: "홍길동",
      orderId: "ORDER-2024-0001",
      timestamp: "2024.01.15 14:30",
    },
    {
      id: 2,
      type: "payment",
      action: "결제 완료",
      user: "김철수",
      orderId: "ORDER-2024-0002",
      timestamp: "2024.01.15 14:25",
    },
    {
      id: 3,
      type: "image",
      action: "이미지 업로드",
      user: "이영희",
      orderId: "ORDER-2024-0003",
      timestamp: "2024.01.15 14:20",
    },
    {
      id: 4,
      type: "pin",
      action: "핀 추가",
      user: "박민수",
      orderId: "ORDER-2024-0004",
      timestamp: "2024.01.15 14:15",
    },
    {
      id: 5,
      type: "address",
      action: "배송지 추가",
      user: "최지영",
      timestamp: "2024.01.15 14:10",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">통계 및 분석</h1>
          <p className="text-muted-foreground">앱 사용 현황을 종합적으로 모니터링합니다</p>
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

      {/* User Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            사용자 통계
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">전체 사용자</p>
              <p className="text-2xl font-bold">{userStats.total}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">오늘 가입</p>
              <p className="text-2xl font-bold text-green-600">+{userStats.newToday}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">활성 사용자</p>
              <p className="text-2xl font-bold text-blue-600">{userStats.active}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">비활성 사용자</p>
              <p className="text-2xl font-bold text-gray-600">{userStats.inactive}</p>
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
              <p className="text-2xl font-bold">{orderStats.total}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">오늘 주문</p>
              <p className="text-2xl font-bold text-green-600">+{orderStats.today}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">이번 주</p>
              <p className="text-2xl font-bold">{orderStats.thisWeek}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">이번 달</p>
              <p className="text-2xl font-bold">{orderStats.thisMonth}</p>
            </div>
          </div>
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">상태별 주문 수</p>
            <div className="grid gap-2 md:grid-cols-5">
              <div className="p-3 border rounded-lg">
                <p className="text-xs text-muted-foreground">수거예약</p>
                <p className="text-xl font-bold">{orderStats.byStatus.booked}</p>
              </div>
              <div className="p-3 border rounded-lg">
                <p className="text-xs text-muted-foreground">입고완료</p>
                <p className="text-xl font-bold">{orderStats.byStatus.inbound}</p>
              </div>
              <div className="p-3 border rounded-lg">
                <p className="text-xs text-muted-foreground">수선중</p>
                <p className="text-xl font-bold">{orderStats.byStatus.processing}</p>
              </div>
              <div className="p-3 border rounded-lg">
                <p className="text-xs text-muted-foreground">출고완료</p>
                <p className="text-xl font-bold">{orderStats.byStatus.readyToShip}</p>
              </div>
              <div className="p-3 border rounded-lg">
                <p className="text-xs text-muted-foreground">배송완료</p>
                <p className="text-xl font-bold">{orderStats.byStatus.delivered}</p>
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
                <p className="text-xl font-bold text-green-600">{paymentStats.completed}</p>
              </div>
              <div className="p-3 border rounded-lg">
                <p className="text-xs text-muted-foreground">결제 대기</p>
                <p className="text-xl font-bold text-yellow-600">{paymentStats.pending}</p>
              </div>
              <div className="p-3 border rounded-lg">
                <p className="text-xs text-muted-foreground">결제 실패</p>
                <p className="text-xl font-bold text-red-600">{paymentStats.failed}</p>
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
                <p className="text-2xl font-bold">{imageStats.total}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">핀이 있는 이미지</p>
                <p className="text-2xl font-bold text-blue-600">{imageStats.withPins}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">전체 핀 수</p>
                <p className="text-2xl font-bold">{imageStats.totalPins}</p>
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
                <p className="text-2xl font-bold">{addressStats.total}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">활성 배송지</p>
                <p className="text-2xl font-bold text-green-600">{addressStats.active}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">기본 배송지</p>
                <p className="text-2xl font-bold text-blue-600">{addressStats.default}</p>
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
                          : log.type === "pin"
                          ? "bg-orange-500"
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

