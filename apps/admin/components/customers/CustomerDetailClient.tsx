"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  User, 
  Mail, 
  Phone, 
  Package, 
  Calendar, 
  ArrowLeft,
  Coins,
  Plus,
  Minus
} from "lucide-react";
import PointManagementDialog from "./PointManagementDialog";
import CouponIssueDialog from "./CouponIssueDialog";
import { deviceOsInfo, formatLastSeenAt } from "@/lib/customer-device-os";
import { DeviceOsBadge } from "@/components/customers/DeviceOsBadge";

interface CustomerDetailClientProps {
  customer: any;
  status: string;
}

export default function CustomerDetailClient({ 
  customer, 
  status
}: CustomerDetailClientProps) {
  // 날짜 포맷팅 함수
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).replace(/\./g, '.').replace(/\s/g, '');
  };
  const [pointDialogOpen, setPointDialogOpen] = useState(false);
  const [couponDialogOpen, setCouponDialogOpen] = useState(false);
  const [coupons, setCoupons] = useState<Array<{
    id: string;
    code: string;
    discount_type: string;
    discount_value: number;
    used_count: number;
    valid_until: string | null;
    is_active: boolean;
    source: string;
    issued_note: string | null;
  }>>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const orders = customer.orders || [];

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/admin/customers/${customer.id}/coupons`);
        const json = await res.json();
        if (res.ok && json.success) setCoupons(json.data || []);
      } catch (error) {
        console.error("전용 쿠폰 조회 실패:", error);
      }
    };
    load();
  }, [customer.id, refreshKey]);

  const handlePointSuccess = () => {
    // 페이지 새로고침
    setRefreshKey(prev => prev + 1);
    window.location.reload();
  };

  return (
    <>
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
              <div className="text-2xl font-bold">{customer.totalOrders || 0}건</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>총 구매액</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₩{(customer.totalSpent || 0).toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>평균 주문 금액</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₩{(customer.averageOrderValue || 0).toLocaleString()}</div>
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
              <div>
                <p className="text-sm text-muted-foreground">마지막 접속</p>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{formatLastSeenAt(customer.last_seen_at) || "기록 없음"}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">최근 접속 OS</p>
                <div className="flex items-center gap-2 mt-1">
                  <DeviceOsBadge deviceOs={customer.last_device_os} />
                  <p className="font-medium">
                    {deviceOsInfo(customer.last_device_os)?.detail || "기록 없음"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Points Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5" />
                포인트 관리
              </CardTitle>
              <CardDescription>고객의 포인트 적립 및 사용 현황</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 포인트 잔액 */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">현재 포인트 잔액</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {(customer.point_balance || 0).toLocaleString()}P
                </p>
              </div>

              {/* 포인트 통계 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 border rounded-lg">
                  <p className="text-xs text-muted-foreground">총 적립</p>
                  <p className="text-lg font-semibold text-green-600">
                    +{(customer.total_earned_points || 0).toLocaleString()}P
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="text-xs text-muted-foreground">총 사용</p>
                  <p className="text-lg font-semibold text-red-600">
                    -{(customer.total_used_points || 0).toLocaleString()}P
                  </p>
                </div>
              </div>

              {/* 포인트 관리 버튼 */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setPointDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  포인트 지급/차감
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>전용 쿠폰</CardTitle>
              <CardDescription>이 고객만 사용할 수 있는 코드입니다</CardDescription>
            </div>
            <Button onClick={() => setCouponDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              쿠폰 발급
            </Button>
          </CardHeader>
          <CardContent>
            {coupons.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">발급된 전용 쿠폰이 없습니다</p>
            ) : (
              <div className="space-y-2">
                {coupons.map((coupon) => {
                  const expired = coupon.valid_until && new Date(coupon.valid_until) < new Date();
                  const used = (coupon.used_count || 0) > 0;
                  const label = !coupon.is_active ? "비활성" : used ? "사용" : expired ? "만료" : "사용가능";
                  return (
                    <div key={coupon.id} className="flex items-center justify-between border rounded-lg p-3">
                      <div>
                        <p className="font-mono font-bold">{coupon.code}</p>
                        <p className="text-sm text-muted-foreground">
                          {coupon.discount_type === "PERCENTAGE"
                            ? `${coupon.discount_value}% 할인`
                            : `${coupon.discount_value.toLocaleString()}원 할인`}
                          {coupon.valid_until
                            ? ` · ${new Date(coupon.valid_until).toLocaleDateString("ko-KR")}까지`
                            : " · 기한 없음"}
                          {coupon.issued_note ? ` · ${coupon.issued_note}` : ""}
                        </p>
                      </div>
                      <Badge variant={label === "사용가능" ? "default" : "outline"}>{label}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
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
                          {({
                            PAID: '결제완료', BOOKED: '수거예약', INBOUND: '입고완료',
                            PROCESSING: '수선중', READY_TO_SHIP: '출고완료',
                            DELIVERED: '배송완료', CANCELLED: '취소',
                            RETURN_PENDING: '반송대기', RETURN_DONE: '반송완료',
                          } as Record<string,string>)[order.status] || order.status || '대기중'}
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

      {/* 포인트 관리 다이얼로그 */}
      <PointManagementDialog
        open={pointDialogOpen}
        onOpenChange={setPointDialogOpen}
        customerId={customer.id}
        customerName={customer.name}
        currentBalance={customer.point_balance || 0}
        onSuccess={handlePointSuccess}
      />
      <CouponIssueDialog
        open={couponDialogOpen}
        onOpenChange={setCouponDialogOpen}
        customerId={customer.id}
        customerName={customer.name}
        onSuccess={() => setRefreshKey((prev) => prev + 1)}
      />
    </>
  );
}

