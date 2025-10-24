import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingCart, TrendingUp, Users } from "lucide-react";

export default function DashboardPage() {
  const stats = [
    {
      title: "전체 주문",
      value: "124",
      change: "+12%",
      icon: ShoppingCart,
    },
    {
      title: "처리 중",
      value: "23",
      change: "+5%",
      icon: Package,
    },
    {
      title: "전체 고객",
      value: "89",
      change: "+18%",
      icon: Users,
    },
    {
      title: "월 매출",
      value: "₩2,450,000",
      change: "+23%",
      icon: TrendingUp,
    },
  ];

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
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
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

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>최근 주문</CardTitle>
          <CardDescription>최근 접수된 수선 주문입니다</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between border-b pb-4 last:border-0">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">청바지 기장 수선 {i}</p>
                    <p className="text-sm text-muted-foreground">송장번호: 123456789{i}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">₩{(15000 * i).toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">2024.01.{i.toString().padStart(2, '0')}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

