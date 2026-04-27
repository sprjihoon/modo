"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
import {
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Calendar,
  RotateCcw,
  Package,
  CheckCircle2,
  Truck,
  Settings as SettingsIcon,
} from "lucide-react";

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
  RETURN_PENDING: { label: "반송 대기", color: "bg-amber-100 text-amber-800" },
  RETURN_SHIPPING: { label: "반송 배송중", color: "bg-orange-100 text-orange-800" },
  RETURN_DONE: { label: "반송 완료", color: "bg-stone-200 text-stone-800" },
};

// 취소/반송 보기 모드 분류
type CancelView =
  | "OFF"
  | "ALL"
  | "PENDING" // 처리 대기 (PRE_PICKUP_CANCEL 제외, 송장발급/배송중)
  | "PRE_PICKUP_CANCEL"
  | "RETURN_PENDING"
  | "RETURN_SHIPPING"
  | "RETURN_DONE";

const cancelKindLabel: Record<string, { label: string; color: string }> = {
  PRE_PICKUP_CANCEL: { label: "수거 전 취소", color: "bg-red-100 text-red-700" },
  RETURN_REQUESTED: { label: "반송 요청", color: "bg-rose-100 text-rose-700" },
  RETURN_PENDING: { label: "송장 발급 대기", color: "bg-amber-100 text-amber-800" },
  RETURN_SHIPPING: { label: "반송 배송중", color: "bg-orange-100 text-orange-800" },
  RETURN_DONE: { label: "반송 완료", color: "bg-stone-200 text-stone-800" },
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
    returnTrackingNo?: string;
  } | null;
  // 취소/반송 보기 모드에서 표시되는 큐 종류
  queue_kind?: string;
  cancellation_reason?: string | null;
  canceled_at?: string | null;
}

interface CancellationStats {
  total: number;
  preCancel: number;
  returnPending: number;
  returnShipping: number;
  returnDone: number;
  returnRequestedOnly: number;
  pending: number;
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
  const searchParams = useSearchParams();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("date");
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 취소/반송 통합 보기
  const initialCancelView = (searchParams.get("cancelView") || "OFF").toUpperCase() as CancelView;
  const [cancelView, setCancelView] = useState<CancelView>(initialCancelView);
  const [cancelStats, setCancelStats] = useState<CancellationStats | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

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

  // 취소/반송 보기 모드일 때 카운트만 따로 가져옴 (탭 카운트 표시)
  const loadCancelStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/cancellations?countOnly=true");
      const data = await res.json();
      if (data?.success && data.stats) setCancelStats(data.stats);
    } catch (e) {
      console.warn("취소/반송 카운트 로드 실패", e);
    }
  }, []);

  useEffect(() => {
    loadCancelStats();
  }, [loadCancelStats]);

  useEffect(() => {
    loadOrders();
  }, [statusFilter, startDate, endDate, currentPage, pageSize, promotionFilter, cancelView]);

  // 필터 변경 시 페이지 1로 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, startDate, endDate, search, promotionFilter, cancelView]);

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
      // === 취소/반송 보기 모드 ===
      if (cancelView !== "OFF") {
        const params = new URLSearchParams();
        params.append("kind", cancelView); // ALL | PENDING | PRE_PICKUP_CANCEL | RETURN_PENDING | RETURN_SHIPPING | RETURN_DONE
        if (search) params.append("search", search);
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);
        params.append("page", String(currentPage));
        params.append("pageSize", String(pageSize));

        const res = await fetch(`/api/admin/cancellations?${params.toString()}`);
        const result = await res.json();
        if (!res.ok || !result.success) throw new Error(result.error || "조회 실패");

        setOrders(result.data || []);
        setTotalCount(result.totalCount || 0);
        setTotalPages(result.totalPages || 1);
        if (result.stats) setCancelStats(result.stats);
        // 취소/반송 모드는 별도 통계 카드 사용 — 주문 stats 는 유지하지 않음
        return;
      }

      // === 일반 주문 보기 ===
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

  // 반송 완료 처리 (목록에서 바로)
  const handleCompleteReturn = async (orderId: string, orderNumber: string) => {
    if (!confirm(`주문 ${orderNumber} 의 반송을 완료 처리하시겠습니까?\n고객과 다른 관리자들에게 알림이 발송됩니다.`)) {
      return;
    }
    setCompletingId(orderId);
    try {
      const res = await fetch(`/api/admin/cancellations/${orderId}/complete-return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: "" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "처리 실패");
      alert("반송 완료 처리되었습니다.");
      await Promise.all([loadOrders(), loadCancelStats()]);
    } catch (e: any) {
      alert(e?.message || "반송 완료 처리에 실패했습니다.");
    } finally {
      setCompletingId(null);
    }
  };

  // 취소/반송 보기 토글
  const handleCancelViewChange = (next: CancelView) => {
    setCancelView(next);
    const url = new URL(window.location.href);
    if (next === "OFF") url.searchParams.delete("cancelView");
    else url.searchParams.set("cancelView", next);
    router.replace(`${url.pathname}?${url.searchParams.toString()}`);
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">주문 관리</h1>
          <p className="text-muted-foreground">
            {cancelView !== "OFF"
              ? "취소·반송 요청을 확인하고 반송 완료까지 한 화면에서 처리합니다"
              : "전체 수선 주문을 관리합니다"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={cancelView === "OFF" ? "outline" : "default"}
            onClick={() => handleCancelViewChange(cancelView === "OFF" ? "PENDING" : "OFF")}
            className={cancelView !== "OFF" ? "bg-rose-600 hover:bg-rose-700" : ""}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {cancelView === "OFF" ? "취소·반송 보기" : "일반 보기로 돌아가기"}
            {cancelView === "OFF" && (cancelStats?.pending ?? 0) > 0 && (
              <Badge className="ml-2 bg-red-600 text-white border-0">
                {cancelStats?.pending}
              </Badge>
            )}
          </Button>
          <Button onClick={loadOrders} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
        </div>
      </div>

      {/* === 취소/반송 보기 — 전용 탭 카드 === */}
      {cancelView !== "OFF" && cancelStats && (
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          {([
            { id: "ALL", label: "전체", value: cancelStats.total, icon: Package, color: "text-gray-700" },
            { id: "PENDING", label: "처리 대기", value: cancelStats.pending, icon: RotateCcw, color: "text-red-600" },
            { id: "PRE_PICKUP_CANCEL", label: "수거 전 취소", value: cancelStats.preCancel, icon: RotateCcw, color: "text-red-500" },
            { id: "RETURN_PENDING", label: "송장 발급 대기", value: cancelStats.returnPending, icon: SettingsIcon, color: "text-amber-600" },
            { id: "RETURN_SHIPPING", label: "반송 배송중", value: cancelStats.returnShipping, icon: Truck, color: "text-orange-600" },
            { id: "RETURN_DONE", label: "반송 완료", value: cancelStats.returnDone, icon: CheckCircle2, color: "text-green-600" },
          ] as const).map((t) => {
            const Icon = t.icon;
            const active = cancelView === t.id;
            return (
              <Card
                key={t.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  active ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => handleCancelViewChange(t.id as CancelView)}
              >
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${t.color}`} />
                    {t.label}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{t.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Stats — 일반 보기에서만 노출 */}
      {cancelView === "OFF" && stats && (
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
            {cancelView === "OFF" && (
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
            )}
            {cancelView === "OFF" && (
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
            )}
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
                sortedOrders.map((order) => {
                  const canCompleteReturn =
                    cancelView !== "OFF" &&
                    (order.queue_kind === "RETURN_PENDING" ||
                      order.queue_kind === "RETURN_SHIPPING" ||
                      order.status === "RETURN_PENDING" ||
                      order.status === "RETURN_SHIPPING");
                  return (
                    <Link key={order.id} href={`/dashboard/orders/${order.id}`}>
                      <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium">
                                {order.item_name || `${order.clothing_type} - ${order.repair_type}`}
                              </p>
                              {order.promotion_codes && (
                                <Badge className="bg-green-100 text-green-800 text-xs">
                                  🎟️ {order.promotion_codes.code}
                                </Badge>
                              )}
                              {/* 취소/반송 보기 — 큐 종류 배지 */}
                              {cancelView !== "OFF" && order.queue_kind && cancelKindLabel[order.queue_kind] && (
                                <Badge className={`${cancelKindLabel[order.queue_kind].color} border-0 text-xs`}>
                                  {cancelKindLabel[order.queue_kind].label}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {order.order_number} • {order.customer_name || order.customer_email || '고객'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {order.tracking_no ? `송장: ${order.tracking_no}` : '송장 미발급'}
                              {cancelView !== "OFF" && order.cancellation_reason ? (
                                <span className="ml-2 text-rose-600">사유: {order.cancellation_reason}</span>
                              ) : null}
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
                          {canCompleteReturn && (
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-green-600 hover:bg-green-700"
                              disabled={completingId === order.id}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleCompleteReturn(order.id, order.order_number);
                              }}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              {completingId === order.id ? "처리중..." : "반송 완료"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })
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

