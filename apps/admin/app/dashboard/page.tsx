"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, ShoppingCart, TrendingUp, Users, AlertCircle, Clock, CreditCard } from "lucide-react";

export default function DashboardPage() {
  // TODO: Fetch real data from Supabase
  const stats = [
    {
      title: "전체 주문",
      value: "124",
      change: "+12%",
      icon: ShoppingCart,
      color: "text-blue-600",
    },
    {
      title: "처리 중",
      value: "23",
      change: "+5%",
      icon: Package,
      color: "text-purple-600",
    },
    {
      title: "전체 고객",
      value: "89",
      change: "+18%",
      icon: Users,
      color: "text-green-600",
    },
    {
      title: "월 매출",
      value: "₩2,450,000",
      change: "+23%",
      icon: TrendingUp,
      color: "text-orange-600",
    },
  ];

  const recentOrders = [
    {
      id: "ORDER-2024-0001",
      item: "청바지 기장 수선",
      trackingNo: "1234567890",
      status: "수선중",
      amount: 15000,
      date: "2024.01.15",
      urgent: false,
    },
    {
      id: "ORDER-2024-0002",
      item: "셔츠 수선",
      trackingNo: "1234567891",
      status: "입고완료",
      amount: 20000,
      date: "2024.01.14",
      urgent: true,
    },
    {
      id: "ORDER-2024-0003",
      item: "코트 수선",
      trackingNo: "1234567892",
      status: "출고완료",
      amount: 40000,
      date: "2024.01.13",
      urgent: false,
    },
    {
      id: "ORDER-2024-0004",
      item: "바지 수선",
      trackingNo: "1234567893",
      status: "수거예약",
      amount: 18000,
      date: "2024.01.12",
      urgent: false,
    },
    {
      id: "ORDER-2024-0005",
      item: "재킷 수선",
      trackingNo: "1234567894",
      status: "배송완료",
      amount: 35000,
      date: "2024.01.11",
      urgent: false,
    },
  ];

  const urgentOrders = recentOrders.filter((o) => o.urgent);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">대시보드</h1>
        <p className="text-muted-foreground">모두의수선 운영 현황을 확인하세요</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">{stat.change}</span> 지난 달 대비
              </p>
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
              <CardDescription>즉시 처리 필요한 주문입니다</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {urgentOrders.map((order) => (
                  <Link key={order.id} href={`/dashboard/orders/${order.id}`}>
                    <div className="flex items-center justify-between p-3 border border-red-200 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <div>
                        <p className="font-medium">{order.item}</p>
                        <p className="text-sm text-muted-foreground">{order.id}</p>
                      </div>
                      <Badge variant="destructive">긴급</Badge>
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
                  <p className="font-medium">입고 대기</p>
                  <p className="text-sm text-muted-foreground">5건</p>
                </div>
                <Button size="sm" variant="outline">
                  확인
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">영상 업로드 대기</p>
                  <p className="text-sm text-muted-foreground">3건</p>
                </div>
                <Button size="sm" variant="outline">
                  확인
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">출고 대기</p>
                  <p className="text-sm text-muted-foreground">2건</p>
                </div>
                <Button size="sm" variant="outline">
                  확인
                </Button>
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
            {recentOrders.map((order) => (
              <Link key={order.id} href={`/dashboard/orders/${order.id}`}>
                <div className="flex items-center justify-between border-b pb-4 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors rounded-lg p-2 -m-2">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{order.item}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.id} • 송장: {order.trackingNo}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline">{order.status}</Badge>
                    <div className="text-right">
                      <p className="font-medium">₩{order.amount.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">{order.date}</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
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

