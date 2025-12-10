"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Mail, Phone, Calendar, Loader2 } from "lucide-react";
import { getCustomers, getCustomerStats, type Customer } from "@/lib/api/customers";

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
  
  // 날짜 필터 (기본값: 최근 30일)
  const [startDate, setStartDate] = useState<string>(getDaysAgo(30));
  const [endDate, setEndDate] = useState<string>(getToday());
  const [datePreset, setDatePreset] = useState<string>("30days");

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

  // 고객 목록 및 통계 조회
  const { data, isLoading: isLoadingCustomers, error } = useQuery({
    queryKey: ["customers", search],
    queryFn: async () => {
      const response = await fetch(`/api/customers?${search ? `search=${encodeURIComponent(search)}` : ''}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '고객 목록을 불러올 수 없습니다');
      }
      return response.json();
    },
    retry: 1,
  });

  const customers = data?.customers || [];
  const stats = data?.stats;
  const isLoadingStats = isLoadingCustomers;

  // 검색 필터링
  const filteredCustomers = customers.filter(
    (customer: Customer) =>
      customer.name?.toLowerCase().includes(search.toLowerCase()) ||
      customer.email?.toLowerCase().includes(search.toLowerCase()) ||
      customer.phone?.includes(search)
  );

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
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">기간 선택:</span>
            </div>
            <div className="flex items-center gap-2">
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
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="고객명, 이메일, 전화번호로 검색..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
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
            {isLoadingCustomers ? "로딩 중..." : `총 ${filteredCustomers.length}명의 고객`}
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
              {filteredCustomers.map((customer: Customer) => {
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
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-6 text-right">
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
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <p className="font-medium text-sm">
                              {customer.lastOrderDate 
                                ? new Date(customer.lastOrderDate).toLocaleDateString('ko-KR', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                  }).replace(/\./g, '.').replace(/\s/g, '')
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
        </CardContent>
      </Card>
    </div>
  );
}

