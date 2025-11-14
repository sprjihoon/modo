import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { User, Mail, Phone, Package, Calendar, TrendingUp, ArrowLeft } from "lucide-react";
import { getCustomerById } from "@/lib/api/customers";

interface CustomerDetailPageProps {
  params: {
    id: string;
  };
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  let customer;
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/customers/${params.id}`, {
      cache: 'no-store',
    });
    
    if (!response.ok) {
      notFound();
    }
    
    customer = await response.json();
  } catch (error) {
    console.error('고객 정보 조회 실패:', error);
    notFound();
  }

  if (!customer) {
    notFound();
  }

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).replace(/\./g, '.').replace(/\s/g, '');
  };

  // 고객 상태 계산
  const getCustomerStatus = () => {
    const createdAt = new Date(customer.created_at);
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    if (createdAt >= thisMonth) {
      return "신규";
    }
    
    if (customer.orders && customer.orders.length > 0) {
      const lastOrder = new Date(customer.orders[0].created_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      if (lastOrder >= thirtyDaysAgo) {
        return "활성";
      }
    }
    
    return "일반";
  };

  const status = getCustomerStatus();
  const orders = customer.orders || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/customers">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              뒤로가기
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{customer.name}</h1>
            <p className="text-muted-foreground">{customer.id}</p>
          </div>
        </div>
        <Badge
          variant={status === "활성" ? "default" : status === "신규" ? "secondary" : "outline"}
          className="text-sm"
        >
          {status}
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>총 주문 수</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customer.totalOrders}건</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>총 구매액</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₩{customer.totalSpent.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>평균 주문 금액</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₩{customer.averageOrderValue.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>가입일</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDate(customer.created_at)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              고객 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">이름</p>
              <p className="font-medium">{customer.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">이메일</p>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium">{customer.email}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">전화번호</p>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium">{customer.phone}</p>
              </div>
            </div>
            {(customer.default_address || customer.default_address_detail) && (
              <div>
                <p className="text-sm text-muted-foreground">주소</p>
                <p className="font-medium">
                  {customer.default_address || ''}
                  {customer.default_address_detail ? ` ${customer.default_address_detail}` : ''}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">가입일</p>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium">{formatDate(customer.created_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              주문 이력
            </CardTitle>
            <CardDescription>최근 주문 내역입니다</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  주문 내역이 없습니다
                </div>
              ) : (
                orders.map((order: any) => (
                  <Link key={order.id} href={`/dashboard/orders/${order.id}`}>
                    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <div>
                        <p className="font-medium">{order.item_name || '수선 항목'}</p>
                        <p className="text-sm text-muted-foreground">{order.id}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">
                            {formatDate(order.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₩{(order.total_price || 0).toLocaleString()}</p>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {order.status || '대기중'}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

