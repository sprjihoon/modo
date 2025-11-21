"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";

const statusMap = {
  ALL: { label: "전체", color: "bg-gray-100 text-gray-800" },
  PENDING: { label: "결제대기", color: "bg-yellow-100 text-yellow-800" },
  PAID: { label: "결제완료", color: "bg-blue-100 text-blue-800" },
  BOOKED: { label: "수거예약", color: "bg-cyan-100 text-cyan-800" },
  INBOUND: { label: "입고완료", color: "bg-orange-100 text-orange-800" },
  PROCESSING: { label: "수선중", color: "bg-purple-100 text-purple-800" },
  READY_TO_SHIP: { label: "출고완료", color: "bg-green-100 text-green-800" },
  DELIVERED: { label: "배송완료", color: "bg-gray-100 text-gray-800" },
  CANCELLED: { label: "취소", color: "bg-red-100 text-red-800" },
};

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

export default function OrdersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("date");
  const [currentPage, setCurrentPage] = useState(1);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const itemsPerPage = 10;

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          promotion_codes:promotion_code_id (code, discount_type, discount_value)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('주문 로드 실패:', error);
        throw error;
      }
      
      console.log('Loaded orders:', data);
      setAllOrders(data || []);
    } catch (error: any) {
      console.error('주문 조회 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter and search
  let filteredOrders = allOrders.filter((order) => {
    const matchesSearch =
      order.id.toLowerCase().includes(search.toLowerCase()) ||
      order.order_number?.toLowerCase().includes(search.toLowerCase()) ||
      (order.tracking_no && order.tracking_no.includes(search)) ||
      (order.customer_name && order.customer_name.toLowerCase().includes(search.toLowerCase())) ||
      (order.item_name && order.item_name.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === "ALL" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Sort
  filteredOrders = [...filteredOrders].sort((a, b) => {
    if (sortBy === "date") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    } else if (sortBy === "amount") {
      return b.total_price - a.total_price;
    }
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">주문 관리</h1>
          <p className="text-muted-foreground">전체 수선 주문을 관리합니다</p>
        </div>
        <Button onClick={loadOrders} variant="outline">
          새로고침
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>전체 주문</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allOrders.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>프로모션 사용</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {allOrders.filter((o) => o.promotion_codes).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>총 할인 금액</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ₩{allOrders.reduce((sum, o) => sum + (o.promotion_discount_amount || 0), 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>총 매출</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ₩{allOrders.reduce((sum, o) => sum + o.total_price, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="주문번호, 송장번호, 고객명으로 검색..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="상태 필터" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(statusMap).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="정렬 기준" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">최신순</SelectItem>
                <SelectItem value="amount">금액순</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>주문 목록</CardTitle>
          <CardDescription>
            총 {filteredOrders.length}개의 주문 (페이지 {currentPage} / {totalPages})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {paginatedOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                주문이 없습니다.
              </div>
            ) : (
              paginatedOrders.map((order) => (
                <Link key={order.id} href={`/dashboard/orders/${order.id}`}>
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {order.item_name || `${order.clothing_type} - ${order.repair_type}`}
                          </p>
                          {order.promotion_codes && (
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              🎟️ {order.promotion_codes.code}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {order.order_number} • {order.customer_name || order.customer_email || '고객'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {order.tracking_no ? `송장: ${order.tracking_no}` : '송장 미발급'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Badge className={statusMap[order.status as keyof typeof statusMap]?.color || statusMap.PENDING.color}>
                        {statusMap[order.status as keyof typeof statusMap]?.label || order.status}
                      </Badge>
                      <div className="text-right min-w-[120px]">
                        {order.promotion_discount_amount && order.promotion_discount_amount > 0 ? (
                          <>
                            <p className="text-xs text-gray-400 line-through">
                              ₩{(order.original_total_price || order.total_price).toLocaleString()}
                            </p>
                            <p className="font-medium text-green-600">
                              ₩{order.total_price.toLocaleString()}
                              <span className="text-xs text-red-500 ml-1">
                                (-{order.promotion_discount_amount.toLocaleString()})
                              </span>
                            </p>
                          </>
                        ) : (
                          <p className="font-medium">₩{order.total_price.toLocaleString()}</p>
                        )}
                        <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>

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
    </div>
  );
}

