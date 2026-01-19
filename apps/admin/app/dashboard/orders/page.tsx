"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
import { Search, RefreshCw, ChevronLeft, ChevronRight, Calendar } from "lucide-react";

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
  // 추가 결제 상태
  extra_charge_status: string | null;
  extra_charge_data: {
    managerPrice?: number;
    customerAction?: string;
  } | null;
}

// 추가 결제 상태 맵
const extraChargeStatusMap: Record<string, { label: string; color: string; icon: string }> = {
  PENDING_CUSTOMER: { label: "추가결제 대기", color: "bg-orange-100 text-orange-800 border-orange-300", icon: "💳" },
  COMPLETED: { label: "추가결제 완료", color: "bg-green-100 text-green-800 border-green-300", icon: "✅" },
  SKIPPED: { label: "기존작업만", color: "bg-blue-100 text-blue-800 border-blue-300", icon: "⏭️" },
  RETURN_REQUESTED: { label: "반송요청", color: "bg-red-100 text-red-800 border-red-300", icon: "📦" },
};

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

export default function OrdersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("date");
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // 날짜 필터 (기본값: 최근 30일)
  const [startDate, setStartDate] = useState<string>(getDaysAgo(30));
  const [endDate, setEndDate] = useState<string>(getToday());
  const [datePreset, setDatePreset] = useState<string>("30days");
  
  // 프로모션 필터 추가
  const [promotionFilter, setPromotionFilter] = useState<string>("ALL"); // ALL, USED, NOT_USED
  
  // 페이징
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  useEffect(() => {
    loadOrders();
  }, [statusFilter, startDate, endDate, currentPage, pageSize, promotionFilter]);
  
  // 필터 변경 시 페이지 1로 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, startDate, endDate, search, promotionFilter]);

  // 검색어 변경 시 debounce 적용
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== undefined) {
        loadOrders();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

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

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.append('status', statusFilter);
      if (search) params.append('search', search);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (promotionFilter !== "ALL") params.append('promotionFilter', promotionFilter);
      params.append('page', String(currentPage));
      params.append('pageSize', String(pageSize));

      const response = await fetch(`/api/orders?${params.toString()}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error('주문 로드 실패:', result.error);
        throw new Error(result.error || '주문 조회 실패');
      }
      
      setOrders(result.data || []);
      setStats(result.stats || null);
      setTotalCount(result.totalCount || 0);
      setTotalPages(result.totalPages || 1);
    } catch (error: any) {
      console.error('주문 조회 실패:', error);
      setOrders([]);
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  };

  // 클라이언트 사이드 정렬 (금액순)
  const sortedOrders = sortBy === "amount" 
    ? [...orders].sort((a, b) => b.total_price - a.total_price)
    : orders;

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

  if (isLoading && !stats) {
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
          <RefreshCw className="h-4 w-4 mr-2" />
          새로고침
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-6">
          <Card 
            className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'ALL' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setStatusFilter('ALL')}
          >
            <CardHeader className="pb-2">
              <CardDescription>전체 주문</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all hover:shadow-md hover:border-cyan-300 ${statusFilter === 'BOOKED' ? 'ring-2 ring-cyan-500' : ''}`}
            onClick={() => setStatusFilter('BOOKED')}
          >
            <CardHeader className="pb-2">
              <CardDescription>수거예약</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cyan-600">{stats.booked}</div>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all hover:shadow-md hover:border-purple-300 ${statusFilter === 'PROCESSING' ? 'ring-2 ring-purple-500' : ''}`}
            onClick={() => setStatusFilter('PROCESSING')}
          >
            <CardHeader className="pb-2">
              <CardDescription>수선중</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.processing}</div>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all hover:shadow-md hover:border-green-300 ${promotionFilter === 'USED' ? 'ring-2 ring-green-500' : ''}`}
            onClick={() => setPromotionFilter(promotionFilter === 'USED' ? 'ALL' : 'USED')}
          >
            <CardHeader className="pb-2">
              <CardDescription>프로모션 사용</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.promotionUsed}</div>
              <p className="text-xs text-muted-foreground mt-1">클릭하여 필터링</p>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer transition-all hover:shadow-md"
            onClick={() => {
              setStatusFilter('ALL');
              setPromotionFilter('ALL');
            }}
          >
            <CardHeader className="pb-2">
              <CardDescription>총 할인 금액</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                ₩{stats.totalDiscount.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">전체 보기</p>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer transition-all hover:shadow-md"
            onClick={() => {
              setStatusFilter('ALL');
              setPromotionFilter('ALL');
            }}
          >
            <CardHeader className="pb-2">
              <CardDescription>총 매출</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                ₩{stats.totalRevenue.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">전체 보기</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* 날짜 필터 */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              기간:
            </div>
            <div className="flex gap-1">
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
          
          {/* 검색 및 상태 필터 */}
          <div className="grid gap-4 md:grid-cols-5">
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
            <Select value={promotionFilter} onValueChange={setPromotionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="프로모션 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">전체</SelectItem>
                <SelectItem value="USED">프로모션 사용</SelectItem>
                <SelectItem value="NOT_USED">프로모션 미사용</SelectItem>
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
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger>
                <SelectValue placeholder="페이지 크기" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10개씩</SelectItem>
                <SelectItem value="20">20개씩</SelectItem>
                <SelectItem value="50">50개씩</SelectItem>
                <SelectItem value="100">100개씩</SelectItem>
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
            총 {totalCount}개의 주문 (페이지 {currentPage} / {totalPages})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  주문이 없습니다.
                </div>
              ) : (
                sortedOrders.map((order) => (
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
                        {/* 추가 결제 상태 배지 */}
                        {order.extra_charge_status && extraChargeStatusMap[order.extra_charge_status] && (
                          <Badge 
                            variant="outline" 
                            className={`${extraChargeStatusMap[order.extra_charge_status].color} border`}
                          >
                            {extraChargeStatusMap[order.extra_charge_status].icon} {extraChargeStatusMap[order.extra_charge_status].label}
                          </Badge>
                        )}
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
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalCount)} / {totalCount}개
              </div>
              <div className="flex items-center gap-2">
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

