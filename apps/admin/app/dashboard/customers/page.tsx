"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Search, Mail, Phone, Calendar, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { type Customer } from "@/lib/api/customers";
import { DeviceOsBadge } from "@/components/customers/DeviceOsBadge";
import { deviceOsInfo, formatLastSeenAt } from "@/lib/customer-device-os";
import {
  applyCustomerListView,
  type CustomerSortBy,
  type CustomerSortDir,
} from "@/lib/customer-list";

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

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  
  // 날짜 필터 (기본값: 전체)
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [datePreset, setDatePreset] = useState<string>("all");
  // 날짜 필터 기준: created_at(가입일) | last_order(최근 주문일)
  const [dateFilterType, setDateFilterType] = useState<"created_at" | "last_order">("created_at");
  const [sortBy, setSortBy] = useState<CustomerSortBy>("created_at");
  const [sortDir, setSortDir] = useState<CustomerSortDir>("desc");
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  const resetPage = () => setCurrentPage(1);

  // 날짜 프리셋 변경
  const handleDatePreset = (preset: string) => {
    setDatePreset(preset);
    resetPage();
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

  // 고객 목록 및 통계 조회
  const { data, isLoading: isLoadingCustomers, error } = useQuery({
    queryKey: ["customers", search, startDate, endDate, dateFilterType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (startDate || endDate) params.set("dateFilterType", dateFilterType);
      const response = await fetch(`/api/customers?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '고객 목록을 불러올 수 없습니다');
      }
      return response.json();
    },
    retry: 1,
  });

  const customers: Customer[] = Array.isArray(data?.customers) ? data.customers : [];
  const stats = data?.stats;
  const isLoadingStats = isLoadingCustomers;

  const listView = useMemo(
    () => applyCustomerListView(customers, { sortBy, sortDir, page: currentPage, pageSize }),
    [customers, sortBy, sortDir, currentPage, pageSize]
  );
  const filteredCustomers = listView.items;
  const totalCount = listView.pagination.total;
  const totalPages = listView.pagination.totalPages;
  const safePage = listView.pagination.page;

  // 고객 상태 계산 (최근 30일 내 주문 = 활성, 이번 달 가입 = 신규, 그 외 = 일반)
  const getCustomerStatus = (customer: Customer) => {
    const createdAt = new Date(customer.created_at);
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    if (createdAt >= thisMonth) {
      return "신규";
    }
    
    if (customer.lastOrderDate) {
      const lastOrder = new Date(customer.lastOrderDate);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      if (lastOrder >= thirtyDaysAgo) {
        return "활성";
      }
    }
    
    return "일반";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">고객 관리</h1>
          <p className="text-muted-foreground">전체 고객 정보를 관리합니다</p>
        </div>
      </div>

      {/* 날짜 필터 */}
      <Card>
        <CardContent className="pt-6">
          {/* 필터 기준 토글 */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-muted-foreground">기준:</span>
            <div className="flex rounded-md border overflow-hidden text-xs">
              <button
                onClick={() => { setDateFilterType("created_at"); resetPage(); }}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  dateFilterType === "created_at"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted"
                }`}
              >
                가입일
              </button>
              <button
                onClick={() => { setDateFilterType("last_order"); resetPage(); }}
                className={`px-3 py-1.5 font-medium transition-colors border-l ${
                  dateFilterType === "last_order"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted"
                }`}
              >
                최근 주문일
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">기간:</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant={datePreset === "today" ? "default" : "outline"} size="sm" onClick={() => handleDatePreset("today")}>오늘</Button>
              <Button variant={datePreset === "7days" ? "default" : "outline"} size="sm" onClick={() => handleDatePreset("7days")}>7일</Button>
              <Button variant={datePreset === "30days" ? "default" : "outline"} size="sm" onClick={() => handleDatePreset("30days")}>30일</Button>
              <Button variant={datePreset === "90days" ? "default" : "outline"} size="sm" onClick={() => handleDatePreset("90days")}>90일</Button>
              <Button variant={datePreset === "all" ? "default" : "outline"} size="sm" onClick={() => handleDatePreset("all")}>전체</Button>
            </div>
            <div className="flex items-center gap-2 ml-2">
              <Input
                type="date"
                className="w-36 h-9"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setDatePreset("custom"); resetPage(); }}
              />
              <span className="text-muted-foreground">~</span>
              <Input
                type="date"
                className="w-36 h-9"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setDatePreset("custom"); resetPage(); }}
              />
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="고객명, 이메일, 전화번호로 검색..."
              className="pl-10"
              value={search}
              onChange={(e) => { setSearch(e.target.value); resetPage(); }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <Select
              value={sortBy}
              onValueChange={(value) => {
                setSortBy(value as CustomerSortBy);
                setSortDir("desc");
                resetPage();
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="정렬 기준" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">가입일</SelectItem>
                <SelectItem value="last_seen_at">마지막 접속</SelectItem>
                <SelectItem value="last_device_os">OS</SelectItem>
                <SelectItem value="totalOrders">주문 수</SelectItem>
                <SelectItem value="totalSpent">총 구매액</SelectItem>
                <SelectItem value="lastOrderDate">최근 주문</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={sortDir}
              onValueChange={(value) => {
                setSortDir(value as CustomerSortDir);
                resetPage();
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="정렬 순서" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">
                  {sortBy === "last_device_os"
                    ? "웹 우선"
                    : sortBy === "totalOrders" || sortBy === "totalSpent"
                    ? "많은순"
                    : "최신순"}
                </SelectItem>
                <SelectItem value="asc">
                  {sortBy === "last_device_os"
                    ? "iOS 우선"
                    : sortBy === "totalOrders" || sortBy === "totalSpent"
                    ? "적은순"
                    : "오래된순"}
                </SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(Number(value));
                resetPage();
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="페이지 크기" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10명씩</SelectItem>
                <SelectItem value="20">20명씩</SelectItem>
                <SelectItem value="50">50명씩</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>전체 고객</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold">{stats?.totalCustomers || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>신규 고객 (이번 달)</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold text-green-600">{stats?.newCustomers || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>활성 고객</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold text-blue-600">{stats?.activeCustomers || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>탈퇴 회원</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold text-gray-600">{stats?.deletedCustomers || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>총 매출</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold">
                ₩{(stats?.totalSales || 0).toLocaleString()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>고객 목록</CardTitle>
          <CardDescription>
            {isLoadingCustomers
              ? "로딩 중..."
              : totalCount === 0
              ? "총 0명의 고객"
              : `총 ${totalCount.toLocaleString()}명 중 ${((safePage - 1) * pageSize + 1).toLocaleString()} - ${Math.min(safePage * pageSize, totalCount).toLocaleString()}명`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-12">
              <div className="text-red-500 mb-2">⚠️ 데이터를 불러올 수 없습니다</div>
              <div className="text-sm text-muted-foreground mb-4">
                {error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다'}
              </div>
              <div className="text-xs text-muted-foreground">
                <p>확인 사항:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>apps/admin/.env.local 파일에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있는지 확인</li>
                  <li>브라우저 콘솔(F12)에서 에러 메시지 확인</li>
                  <li>Supabase Dashboard에서 users 테이블에 데이터가 있는지 확인</li>
                </ul>
              </div>
            </div>
          ) : isLoadingCustomers ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {search ? "검색 결과가 없습니다" : "고객이 없습니다"}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCustomers.map((customer) => {
                const status = getCustomerStatus(customer);
                return (
                  <Link key={customer.id} href={`/dashboard/customers/${customer.id}`}>
                    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-primary font-medium">
                            {customer.name?.charAt(0) || "?"}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{customer.name || "이름 없음"}</p>
                            <Badge
                              variant={
                                status === "활성"
                                  ? "default"
                                  : status === "신규"
                                  ? "secondary"
                                  : "outline"
                              }
                              className="text-xs"
                            >
                              {status}
                            </Badge>
                            {customer.login_provider && customer.login_provider !== "email" && (
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                customer.login_provider === "kakao"
                                  ? "bg-[#FEE500] text-gray-800"
                                  : customer.login_provider === "naver"
                                  ? "bg-[#03C75A] text-white"
                                  : customer.login_provider === "google"
                                  ? "bg-white text-gray-700 border border-gray-300"
                                  : customer.login_provider === "apple"
                                  ? "bg-black text-white"
                                  : "bg-gray-100 text-gray-600"
                              }`}>
                                {customer.login_provider === "kakao" ? "카카오"
                                  : customer.login_provider === "naver" ? "네이버"
                                  : customer.login_provider === "google" ? "구글"
                                  : customer.login_provider === "apple" ? "애플"
                                  : customer.login_provider}
                              </span>
                            )}
                            <DeviceOsBadge deviceOs={customer.last_device_os} />
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              <span>{customer.email || "이메일 없음"}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              <span>{customer.phone || "전화번호 없음"}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>
                                가입일{" "}
                                {customer.created_at
                                  ? new Date(customer.created_at).toLocaleDateString("ko-KR", {
                                      year: "numeric",
                                      month: "2-digit",
                                      day: "2-digit",
                                    }).replace(/\s/g, "")
                                  : "-"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-6 text-right">
                        <div>
                          <p className="text-sm text-muted-foreground">마지막 접속</p>
                          <p className="font-medium text-sm">
                            {formatLastSeenAt(customer.last_seen_at) || "기록 없음"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">OS</p>
                          <p className="font-medium text-sm">
                            {deviceOsInfo(customer.last_device_os)?.detail || "기록 없음"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">주문 수</p>
                          <p className="font-medium">{customer.totalOrders || 0}건</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">총 구매액</p>
                          <p className="font-medium">
                            ₩{(customer.totalSpent || 0).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">최근 주문</p>
                          <div className="flex items-center gap-1 justify-end">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <p className="font-medium text-sm">
                              {customer.lastOrderDate 
                                ? new Date(customer.lastOrderDate).toLocaleDateString('ko-KR', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                  }).replace(/\s/g, '')
                                : "주문 없음"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                {(safePage - 1) * pageSize + 1} - {Math.min(safePage * pageSize, totalCount)} / {totalCount}명
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, Math.min(p, totalPages) - 1))}
                  disabled={safePage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (page) =>
                      page === 1 ||
                      page === totalPages ||
                      (page >= safePage - 1 && page <= safePage + 1)
                  )
                  .map((page, idx, arr) => (
                    <div key={page} className="flex items-center gap-2">
                      {idx > 0 && arr[idx - 1] !== page - 1 && (
                        <span className="px-2">...</span>
                      )}
                      <Button
                        variant={page === safePage ? "default" : "outline"}
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
                  disabled={safePage >= totalPages}
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

