"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, RefreshCw, AlertTriangle, Package, Truck, MapPin, Calendar } from "lucide-react";
import { getShipments, type ShipmentWithOrder } from "@/lib/api/shipments";

const statusMap = {
  BOOKED: { label: "수거예약", color: "bg-cyan-100 text-cyan-800" },
  PICKED_UP: { label: "수거완료", color: "bg-blue-100 text-blue-800" },
  IN_TRANSIT: { label: "배송중", color: "bg-purple-100 text-purple-800" },
  INBOUND: { label: "입고완료", color: "bg-orange-100 text-orange-800" },
  PROCESSING: { label: "수선중", color: "bg-purple-100 text-purple-800" },
  READY_TO_SHIP: { label: "출고완료", color: "bg-green-100 text-green-800" },
  OUT_FOR_DELIVERY: { label: "배송중", color: "bg-indigo-100 text-indigo-800" },
  DELIVERED: { label: "배송완료", color: "bg-gray-100 text-gray-800" },
  CANCELLED: { label: "취소", color: "bg-red-100 text-red-800" },
};

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

export default function ShipmentsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [shipments, setShipments] = useState<ShipmentWithOrder[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 날짜 필터 (기본값: 최근 30일)
  const [startDate, setStartDate] = useState<string>(getDaysAgo(30));
  const [endDate, setEndDate] = useState<string>(getToday());
  const [datePreset, setDatePreset] = useState<string>("30days");
  
  // 페이징
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalCount, setTotalCount] = useState<number>(0);

  useEffect(() => {
    loadShipments();
  }, [activeTab, statusFilter, startDate, endDate, currentPage, pageSize]);
  
  // 필터 변경 시 페이지 1로 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, statusFilter, startDate, endDate, search]);

  // 검색어 변경 시 debounce 적용
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== undefined) {
        loadShipments();
      }
    }, 500); // 500ms debounce

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

  const loadShipments = async () => {
    setIsLoading(true);
    try {
      const result = await getShipments({
        filter: activeTab === "all" ? undefined : activeTab as any,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        search: search || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page: currentPage,
        pageSize: pageSize,
      });
      
      setShipments(result.data || []);
      setStats(result.stats || {});
      setTotalCount(result.totalCount || result.stats?.total || 0);
      setError(null);
    } catch (error: any) {
      console.error("배송 조회 실패:", error);
      setError(error.message || "배송 데이터를 불러오는데 실패했습니다.");
      // 에러 발생 시 빈 배열로 설정
      setShipments([]);
      setStats({
        total: 0,
        pickupPending: 0,
        pickupCompleted: 0,
        inDelivery: 0,
        delivered: 0,
        delayed: 0,
        pickupDelayed: 0,
        deliveryDelayed: 0,
        island: 0,
        saturdayClosed: 0,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const formatEstimatedDate = (dateString: string | null) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString("ko-KR", {
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      return "-";
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
          <h1 className="text-3xl font-bold">수거/배송 관리</h1>
          <p className="text-muted-foreground">수거 및 배송 상태를 확인하고 관리합니다</p>
        </div>
        <Button onClick={loadShipments} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          새로고침
        </Button>
      </div>

      {/* 통계 카드 - 클릭하면 해당 필터 적용 */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-5">
          {/* 첫 번째 줄: 기본 상태 카드 */}
          <Card 
            className={`cursor-pointer transition-all hover:shadow-md ${activeTab === 'all' && statusFilter === 'ALL' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => { setActiveTab('all'); setStatusFilter('ALL'); }}
          >
            <CardHeader className="pb-2">
              <CardDescription>전체</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all hover:shadow-md hover:border-cyan-300 ${statusFilter === 'BOOKED' ? 'ring-2 ring-cyan-500 border-cyan-300' : ''}`}
            onClick={() => { setActiveTab('all'); setStatusFilter('BOOKED'); }}
          >
            <CardHeader className="pb-2">
              <CardDescription>수거 대기</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cyan-600">{stats.pickupPending}</div>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all hover:shadow-md hover:border-blue-300 ${statusFilter === 'PICKED_UP' ? 'ring-2 ring-blue-500 border-blue-300' : ''}`}
            onClick={() => { setActiveTab('all'); setStatusFilter('PICKED_UP'); }}
          >
            <CardHeader className="pb-2">
              <CardDescription>수거 완료</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.pickupCompleted}</div>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all hover:shadow-md hover:border-indigo-300 ${statusFilter === 'IN_TRANSIT' ? 'ring-2 ring-indigo-500 border-indigo-300' : ''}`}
            onClick={() => { setActiveTab('all'); setStatusFilter('IN_TRANSIT'); }}
          >
            <CardHeader className="pb-2">
              <CardDescription>배송 중</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-600">{stats.inDelivery}</div>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all hover:shadow-md hover:border-gray-400 ${statusFilter === 'DELIVERED' ? 'ring-2 ring-gray-500 border-gray-400' : ''}`}
            onClick={() => { setActiveTab('all'); setStatusFilter('DELIVERED'); }}
          >
            <CardHeader className="pb-2">
              <CardDescription>배송 완료</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{stats.delivered}</div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* 지연/특수 상태 카드 */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* 수거 지연 */}
          <Card 
            className={`cursor-pointer transition-all hover:shadow-md border-amber-200 hover:border-amber-400 ${activeTab === 'pickupDelayed' ? 'ring-2 ring-amber-500 border-amber-400' : ''}`}
            onClick={() => { setActiveTab('pickupDelayed'); setStatusFilter('ALL'); }}
          >
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Package className="h-3 w-3 text-amber-600" />
                <AlertTriangle className="h-3 w-3 text-amber-600" />
                수거 지연
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{stats.pickupDelayed || 0}</div>
              <p className="text-xs text-muted-foreground">예약 후 익일 미수거</p>
            </CardContent>
          </Card>
          
          {/* 배송 지연 */}
          <Card 
            className={`cursor-pointer transition-all hover:shadow-md border-red-200 hover:border-red-400 ${activeTab === 'deliveryDelayed' ? 'ring-2 ring-red-500 border-red-400' : ''}`}
            onClick={() => { setActiveTab('deliveryDelayed'); setStatusFilter('ALL'); }}
          >
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Truck className="h-3 w-3 text-red-600" />
                <AlertTriangle className="h-3 w-3 text-red-600" />
                배송 지연
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.deliveryDelayed || 0}</div>
              <p className="text-xs text-muted-foreground">출고 후 익일 미배송</p>
            </CardContent>
          </Card>
          
          {/* 도서산간 */}
          <Card 
            className={`cursor-pointer transition-all hover:shadow-md border-orange-200 hover:border-orange-400 ${activeTab === 'island' ? 'ring-2 ring-orange-500 border-orange-400' : ''}`}
            onClick={() => { setActiveTab('island'); setStatusFilter('ALL'); }}
          >
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-orange-600" />
                도서산간
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.island}</div>
              <p className="text-xs text-muted-foreground">+1일 추가 소요</p>
            </CardContent>
          </Card>
          
          {/* 전체 지연 (수거+배송) */}
          <Card 
            className={`cursor-pointer transition-all hover:shadow-md border-rose-200 hover:border-rose-400 ${activeTab === 'delayed' ? 'ring-2 ring-rose-500 border-rose-400' : ''}`}
            onClick={() => { setActiveTab('delayed'); setStatusFilter('ALL'); }}
          >
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-rose-600" />
                전체 지연
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-600">{stats.delayed}</div>
              <p className="text-xs text-muted-foreground">수거+배송 지연 합계</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <p>{error}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setError(null);
                  loadShipments();
                }}
                className="ml-auto"
              >
                다시 시도
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 필터 및 검색 */}
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
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="송장번호, 고객명, 주소로 검색..."
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
                <SelectItem value="ALL">전체</SelectItem>
                {Object.entries(statusMap).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
              <SelectTrigger>
                <SelectValue placeholder="표시 개수" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10개씩 보기</SelectItem>
                <SelectItem value="20">20개씩 보기</SelectItem>
                <SelectItem value="50">50개씩 보기</SelectItem>
                <SelectItem value="100">100개씩 보기</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={loadShipments} className="w-full">
              검색
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 탭 및 목록 */}
      <Tabs value={activeTab} onValueChange={(value) => { setActiveTab(value); setStatusFilter('ALL'); }}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">전체 보기</TabsTrigger>
          <TabsTrigger value="pickup">수거 관리</TabsTrigger>
          <TabsTrigger value="delivery">배송 관리</TabsTrigger>
          <TabsTrigger value="delayed" className="text-red-600">배송 지연</TabsTrigger>
          <TabsTrigger value="island" className="text-orange-600">도서산간</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <ShipmentsList shipments={shipments} formatDate={formatDate} formatEstimatedDate={formatEstimatedDate} />
        </TabsContent>

        <TabsContent value="pickup" className="space-y-4">
          <ShipmentsList 
            shipments={shipments.filter(s => ['BOOKED', 'PICKED_UP'].includes(s.status))} 
            formatDate={formatDate} 
            formatEstimatedDate={formatEstimatedDate} 
          />
        </TabsContent>

        <TabsContent value="delivery" className="space-y-4">
          <ShipmentsList 
            shipments={shipments.filter(s => ['OUT_FOR_DELIVERY', 'DELIVERED', 'IN_TRANSIT'].includes(s.status))} 
            formatDate={formatDate} 
            formatEstimatedDate={formatEstimatedDate} 
          />
        </TabsContent>

        <TabsContent value="delayed" className="space-y-4">
          <ShipmentsList 
            shipments={shipments.filter(s => s.isDelayed)} 
            formatDate={formatDate} 
            formatEstimatedDate={formatEstimatedDate} 
          />
        </TabsContent>

        <TabsContent value="island" className="space-y-4">
          <ShipmentsList 
            shipments={shipments.filter(s => s.isIsland)} 
            formatDate={formatDate} 
            formatEstimatedDate={formatEstimatedDate} 
          />
        </TabsContent>
      </Tabs>
      
      {/* 페이지 네비게이션 */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            총 {totalCount.toLocaleString()}건 중 {((currentPage - 1) * pageSize + 1).toLocaleString()} - {Math.min(currentPage * pageSize, totalCount).toLocaleString()}건 표시
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              처음
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              이전
            </Button>
            
            {/* 페이지 번호 */}
            <div className="flex items-center gap-1">
              {(() => {
                const totalPages = Math.ceil(totalCount / pageSize);
                const pages: number[] = [];
                const maxVisible = 5;
                
                let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                let end = Math.min(totalPages, start + maxVisible - 1);
                
                if (end - start + 1 < maxVisible) {
                  start = Math.max(1, end - maxVisible + 1);
                }
                
                for (let i = start; i <= end; i++) {
                  pages.push(i);
                }
                
                return pages.map(page => (
                  <Button
                    key={page}
                    variant={page === currentPage ? "default" : "outline"}
                    size="sm"
                    className="w-9"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                ));
              })()}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalCount / pageSize), prev + 1))}
              disabled={currentPage >= Math.ceil(totalCount / pageSize)}
            >
              다음
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.ceil(totalCount / pageSize))}
              disabled={currentPage >= Math.ceil(totalCount / pageSize)}
            >
              마지막
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ShipmentsList({ 
  shipments, 
  formatDate, 
  formatEstimatedDate 
}: { 
  shipments: ShipmentWithOrder[];
  formatDate: (date: string | null) => string;
  formatEstimatedDate: (date: string | null) => string;
}) {
  if (shipments.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          배송 정보가 없습니다.
        </CardContent>
      </Card>
    );
  }

  // 지연 항목과 일반 항목 분리
  const pickupDelayedShipments = shipments.filter(s => s.isPickupDelayed);
  const deliveryDelayedShipments = shipments.filter(s => s.isDeliveryDelayed && !s.isPickupDelayed);
  const normalShipments = shipments.filter(s => !s.isDelayed);

  return (
    <div className="space-y-4">
      {/* 수거 지연 섹션 */}
      {pickupDelayedShipments.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Package className="h-5 w-5 text-amber-600" />
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h3 className="text-lg font-semibold text-amber-600">
              수거 지연 ({pickupDelayedShipments.length}건)
            </h3>
            <span className="text-sm text-muted-foreground">예약 후 익일 미수거</span>
          </div>
          <div className="space-y-2">
            {pickupDelayedShipments.map((shipment) => (
              <ShipmentCard 
                key={shipment.id} 
                shipment={shipment} 
                formatDate={formatDate}
                formatEstimatedDate={formatEstimatedDate}
                isDelayed={true}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* 배송 지연 섹션 */}
      {deliveryDelayedShipments.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Truck className="h-5 w-5 text-red-600" />
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h3 className="text-lg font-semibold text-red-600">
              배송 지연 ({deliveryDelayedShipments.length}건)
            </h3>
            <span className="text-sm text-muted-foreground">출고 후 익일 미배송</span>
          </div>
          <div className="space-y-2">
            {deliveryDelayedShipments.map((shipment) => (
              <ShipmentCard 
                key={shipment.id} 
                shipment={shipment} 
                formatDate={formatDate}
                formatEstimatedDate={formatEstimatedDate}
                isDelayed={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* 도서산간 섹션 */}
      {normalShipments.filter(s => s.isIsland).length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="h-5 w-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-orange-600">
              도서산간 ({normalShipments.filter(s => s.isIsland).length}건)
            </h3>
          </div>
          <div className="space-y-2">
            {normalShipments.filter(s => s.isIsland).map((shipment) => (
              <ShipmentCard 
                key={shipment.id} 
                shipment={shipment} 
                formatDate={formatDate}
                formatEstimatedDate={formatEstimatedDate}
                isDelayed={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* 일반 항목 섹션 */}
      {normalShipments.filter(s => !s.isIsland).length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Package className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold">
              정상 배송 ({normalShipments.filter(s => !s.isIsland).length}건)
            </h3>
          </div>
          <div className="space-y-2">
            {normalShipments.filter(s => !s.isIsland).map((shipment) => (
              <ShipmentCard 
                key={shipment.id} 
                shipment={shipment} 
                formatDate={formatDate}
                formatEstimatedDate={formatEstimatedDate}
                isDelayed={false}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ShipmentCard({ 
  shipment, 
  formatDate, 
  formatEstimatedDate,
  isDelayed 
}: { 
  shipment: ShipmentWithOrder;
  formatDate: (date: string | null) => string;
  formatEstimatedDate: (date: string | null) => string;
  isDelayed: boolean;
}) {
  const order = shipment.orders;
  const trackingNo = shipment.pickup_tracking_no || shipment.delivery_tracking_no || shipment.tracking_no;

  return (
    <Link href={`/dashboard/orders/${shipment.order_id}`}>
      <Card className={`hover:shadow-md transition-shadow ${isDelayed ? 'border-red-300 bg-red-50' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium">
                  {order?.customer_name || shipment.customer_name || "고객"}
                </p>
                {shipment.isPickupDelayed && (
                  <Badge className="bg-amber-100 text-amber-800 flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    수거지연 {shipment.pickupDelayDays}일
                  </Badge>
                )}
                {shipment.isDeliveryDelayed && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <Truck className="h-3 w-3" />
                    배송지연 {shipment.deliveryDelayDays}일
                  </Badge>
                )}
                {shipment.isIsland && (
                  <Badge className="bg-orange-100 text-orange-800">
                    <MapPin className="h-3 w-3 mr-1" />
                    도서산간
                  </Badge>
                )}
                {shipment.isSaturdayClosed && (
                  <Badge className="bg-yellow-100 text-yellow-800">
                    <Calendar className="h-3 w-3 mr-1" />
                    토요휴무
                  </Badge>
                )}
                <Badge className={statusMap[shipment.status as keyof typeof statusMap]?.color || "bg-gray-100"}>
                  {statusMap[shipment.status as keyof typeof statusMap]?.label || shipment.status}
                </Badge>
              </div>

              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  <span className="font-medium">상품:</span>{" "}
                  {order?.item_name || `${order?.clothing_type || ""} - ${order?.repair_type || ""}`}
                </p>
                <p>
                  <span className="font-medium">송장:</span> {trackingNo}
                </p>
                {shipment.pickup_tracking_no && (
                  <p>
                    <span className="font-medium">수거지:</span> {shipment.pickup_address}
                  </p>
                )}
                {shipment.delivery_tracking_no && (
                  <p>
                    <span className="font-medium">배송지:</span> {shipment.delivery_address}
                  </p>
                )}
                {shipment.pickup_requested_at && shipment.status === 'BOOKED' && (
                  <p>
                    <span className="font-medium">예약일:</span> {formatDate(shipment.pickup_requested_at)}
                  </p>
                )}
                {shipment.expectedPickupDate && shipment.status === 'BOOKED' && (
                  <p className={shipment.isPickupDelayed ? "text-amber-600 font-medium" : ""}>
                    <span className="font-medium">예상수거:</span> {formatEstimatedDate(shipment.expectedPickupDate)}
                    {shipment.isIsland && <span className="text-xs ml-1">(도서산간 +1일)</span>}
                  </p>
                )}
                {shipment.delivery_started_at && (
                  <p>
                    <span className="font-medium">출고일:</span> {formatDate(shipment.delivery_started_at)}
                  </p>
                )}
                {shipment.expectedDeliveryDate && (
                  <p className={shipment.isDeliveryDelayed ? "text-red-600 font-medium" : ""}>
                    <span className="font-medium">예상배송:</span> {formatEstimatedDate(shipment.expectedDeliveryDate)}
                    {shipment.isIsland && <span className="text-xs ml-1">(도서산간 +1일)</span>}
                  </p>
                )}
                {shipment.saturdayClosedMessage && (
                  <p className="text-orange-600 text-xs mt-1 bg-orange-50 px-2 py-1 rounded">
                    <span className="font-medium">📅 토요휴무:</span> {shipment.saturdayClosedMessage}
                  </p>
                )}
                {shipment.notifyMsg && !shipment.saturdayClosedMessage && (
                  <p className="text-yellow-700 text-xs mt-1">
                    <span className="font-medium">알림:</span> {shipment.notifyMsg}
                  </p>
                )}
              </div>
            </div>

            <div className="text-right text-sm text-muted-foreground ml-4">
              <p>{formatDate(shipment.created_at)}</p>
              {order && (
                <p className="mt-1 font-medium text-primary">
                  ₩{order.total_price.toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

