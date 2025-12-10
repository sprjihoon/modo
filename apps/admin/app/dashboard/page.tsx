"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, ShoppingCart, TrendingUp, Users, AlertCircle, Clock, CreditCard, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Order {
  id: string;
  order_number: string;
  user_id: string;
  customer_name: string | null;
  customer_email: string | null;
  item_name: string | null;
  clothing_type: string;
  repair_type: string;
  base_price: number;
  total_price: number;
  original_total_price: number | null;
  promotion_discount_amount: number | null;
  status: string;
  payment_status: string;
  tracking_no: string | null;
  created_at: string;
  promotion_codes: {
    code: string;
    discount_type: string;
    discount_value: number;
  } | null;
}

interface Stats {
  total: number;
  pending: number;
  paid: number;
  booked: number;
  inbound: number;
  processing: number;
  readyToShip: number;
  delivered: number;
  cancelled: number;
  promotionUsed: number;
  totalDiscount: number;
  totalRevenue: number;
}

interface CustomerStats {
  totalCustomers: number;
  newCustomers: number;
  activeCustomers: number;
  totalSales: number;
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

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [customerStats, setCustomerStats] = useState<CustomerStats | null>(null);
  const [monthlyRevenue, setMonthlyRevenue] = useState<number>(0);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 날짜 필터 (기본값: 최근 30일)
  const [startDate, setStartDate] = useState<string>(getDaysAgo(30));
  const [endDate, setEndDate] = useState<string>(getToday());
  const [datePreset, setDatePreset] = useState<string>("30days");

  useEffect(() => {
    loadDashboardData();
  }, [startDate, endDate]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // 날짜 필터 파라미터 생성
      const dateParams = startDate && endDate 
        ? `&startDate=${startDate}&endDate=${endDate}` 
        : '';

      // 1. Load overall stats and recent orders (날짜 필터 적용)
      const overallResponse = await fetch(`/api/orders?pageSize=5${dateParams}`);
      const overallResult = await overallResponse.json();
      
      if (overallResult.success) {
        setStats(overallResult.stats);
        setRecentOrders(overallResult.data || []);
      }

      // 2. Load monthly revenue (이번 달 기준)
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
      
      const monthlyResponse = await fetch(`/api/orders?startDate=${firstDayOfMonth}&endDate=${lastDayOfMonth}`);
      const monthlyResult = await monthlyResponse.json();

      if (monthlyResult.success && monthlyResult.stats) {
        setMonthlyRevenue(monthlyResult.stats.totalRevenue);
      }

      // 3. Load customer stats (날짜 필터와 무관하게 전체 고객 수)
      const customerResponse = await fetch('/api/customers');
      const customerResult = await customerResponse.json();
      
      if (customerResult.stats) {
        setCustomerStats(customerResult.stats);
      }

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
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

  const getUrgentOrders = () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    return recentOrders.filter(o => {
      const isPendingOrPaid = o.status === 'PENDING' || o.status === 'PAID';
      const isOld = new Date(o.created_at) < threeDaysAgo;
      return isPendingOrPaid && isOld;
    });
  };

  const urgentOrders = getUrgentOrders();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const dashboardStats = [
    {
      title: "전체 주문",
      value: stats?.total.toLocaleString() || "0",
      change: "",
      icon: ShoppingCart,
      color: "text-blue-600",
    },
    {
      title: "처리 중",
      value: stats?.processing.toLocaleString() || "0",
      change: "",
      icon: Package,
      color: "text-purple-600",
    },
    {
      title: "전체 고객",
      value: customerStats?.totalCustomers.toLocaleString() || "0",
      change: "",
      icon: Users,
      color: "text-green-600",
    },
    {
      title: "월 매출",
      value: formatCurrency(monthlyRevenue),
      change: "",
      icon: TrendingUp,
      color: "text-orange-600",
    },
  ];

  if (isLoading && !stats) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">대시보드</h1>
          <p className="text-muted-foreground">모두의수선 운영 현황을 확인하세요</p>
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
              <Select value={datePreset} onValueChange={handleDatePreset}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="기간 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">오늘</SelectItem>
                  <SelectItem value="7days">최근 7일</SelectItem>
                  <SelectItem value="30days">최근 30일</SelectItem>
                  <SelectItem value="90days">최근 90일</SelectItem>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="custom">사용자 지정</SelectItem>
                </SelectContent>
              </Select>
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

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {dashboardStats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              {/* <p className="text-xs text-muted-foreground">
                <span className="text-green-600">{stat.change}</span> 지난 달 대비
              </p> */}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Urgent Orders */}
        {urgentOrders.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                긴급 주문
              </CardTitle>
              <CardDescription>3일 이상 처리가 지연된 주문입니다</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {urgentOrders.map((order) => (
                  <Link key={order.id} href={`/dashboard/orders/${order.id}`}>
                    <div className="flex items-center justify-between p-3 border border-red-200 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <div>
                        <p className="font-medium">{order.item_name || "수선 품목"}</p>
                        <p className="text-sm text-muted-foreground">{order.order_number}</p>
                      </div>
                      <Badge variant="destructive">지연</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pending Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              대기 중인 작업
            </CardTitle>
            <CardDescription>처리가 필요한 작업 목록입니다</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">입고 대기 (수거예약)</p>
                  <p className="text-sm text-muted-foreground">{stats?.booked || 0}건</p>
                </div>
                <Link href="/dashboard/orders?status=BOOKED">
                  <Button size="sm" variant="outline">
                    확인
                  </Button>
                </Link>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">영상 업로드 대기 (입고완료)</p>
                  <p className="text-sm text-muted-foreground">{stats?.inbound || 0}건</p>
                </div>
                <Link href="/dashboard/orders?status=INBOUND">
                  <Button size="sm" variant="outline">
                    확인
                  </Button>
                </Link>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">출고 대기</p>
                  <p className="text-sm text-muted-foreground">{stats?.readyToShip || 0}건</p>
                </div>
                <Link href="/dashboard/orders?status=READY_TO_SHIP">
                  <Button size="sm" variant="outline">
                    확인
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>최근 주문</CardTitle>
              <CardDescription>최근 접수된 수선 주문입니다</CardDescription>
            </div>
            <Link href="/dashboard/orders">
              <Button variant="outline" size="sm">
                전체 보기
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentOrders.length === 0 ? (
               <div className="text-center py-4 text-muted-foreground">최근 주문이 없습니다.</div>
            ) : (
              recentOrders.map((order) => (
                <Link key={order.id} href={`/dashboard/orders/${order.id}`}>
                  <div className="flex items-center justify-between border-b pb-4 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors rounded-lg p-2 -m-2">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{order.item_name || "수선 품목"}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.order_number} {order.tracking_no && `• 송장: ${order.tracking_no}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline">{order.status}</Badge>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(order.total_price)}</p>
                        <p className="text-sm text-muted-foreground">{formatDate(order.created_at)}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Access */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/dashboard/analytics">
          <Card className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                통계 및 분석
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">종합 통계 확인</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/payments">
          <Card className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                결제 내역
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">결제 현황 모니터링</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/points">
          <Card className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                포인트 관리
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">포인트 적립/사용 내역</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/customers">
          <Card className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                고객 관리
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">고객 정보 및 통계</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
