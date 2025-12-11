"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, AlertCircle, Search, Calendar } from "lucide-react";
import Link from "next/link";

interface WorkItem {
  id: string;
  order_id: string;
  item_index: number;
  item_name: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  worker_id?: string;
  worker_name?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  orders: {
    id: string;
    tracking_no?: string;
    customer_name?: string;
    item_name?: string;
    status: string;
  } | null;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export default function WorkHistoryPage() {
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0,
  });

  // 필터 상태
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [workerNameFilter, setWorkerNameFilter] = useState<string>("");
  const [orderIdFilter, setOrderIdFilter] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  useEffect(() => {
    loadWorkHistory();
  }, [pagination.page, statusFilter, workerNameFilter, orderIdFilter, startDate, endDate]);

  const loadWorkHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
      });

      if (statusFilter) params.append("status", statusFilter);
      if (workerNameFilter) params.append("workerName", workerNameFilter);
      if (orderIdFilter) params.append("orderId", orderIdFilter);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await fetch(`/api/admin/work-history?${params.toString()}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("API 응답 오류:", response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("작업 내역 API 응답:", result);

      if (result.success) {
        // 데이터 정규화
        const normalizedData = (result.data || []).map((item: any) => {
          // orders가 배열인 경우 첫 번째 요소 사용
          if (Array.isArray(item.orders)) {
            item.orders = item.orders[0] || null;
          }
          // orders가 null이거나 undefined인 경우 빈 객체로 처리하지 않고 그대로 유지
          return item;
        });
        setWorkItems(normalizedData);
        setPagination(result.pagination || pagination);
      } else {
        const errorMsg = result.error || "작업 내역을 불러올 수 없습니다.";
        console.error("API 오류:", errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      console.error("작업 내역 로드 실패:", error);
      setError(error.message || "작업 내역을 불러오는데 실패했습니다.");
      setWorkItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            완료
          </Badge>
        );
      case "IN_PROGRESS":
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <Clock className="h-3 w-3 mr-1" />
            작업 중
          </Badge>
        );
      case "PENDING":
        return (
          <Badge className="bg-gray-100 text-gray-800">
            <AlertCircle className="h-3 w-3 mr-1" />
            대기
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "-";
    }
  };

  const handleResetFilters = () => {
    setStatusFilter("");
    setWorkerNameFilter("");
    setOrderIdFilter("");
    setStartDate("");
    setEndDate("");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">작업 내역</h1>
        <p className="text-muted-foreground">수선 작업 진행 내역을 확인하세요</p>
      </div>

      {/* 필터 */}
      <Card>
        <CardHeader>
          <CardTitle>필터</CardTitle>
          <CardDescription>작업 내역을 검색하고 필터링하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">주문 ID</label>
              <Input
                placeholder="주문 ID 검색"
                value={orderIdFilter}
                onChange={(e) => {
                  setOrderIdFilter(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">작업 상태</label>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">전체</SelectItem>
                  <SelectItem value="PENDING">대기</SelectItem>
                  <SelectItem value="IN_PROGRESS">작업 중</SelectItem>
                  <SelectItem value="COMPLETED">완료</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">작업자명</label>
              <Input
                placeholder="작업자명 검색"
                value={workerNameFilter}
                onChange={(e) => {
                  setWorkerNameFilter(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">시작일</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">종료일</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleResetFilters} variant="outline" className="w-full">
                필터 초기화
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 작업 내역 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>작업 내역 목록</CardTitle>
          <CardDescription>
            총 {pagination.total}건 (페이지 {pagination.page}/{pagination.totalPages})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-red-800 font-semibold mb-2">오류 발생</h3>
              <p className="text-red-600">{error}</p>
              <Button onClick={loadWorkHistory} className="mt-4">
                다시 시도
              </Button>
            </div>
          ) : workItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              작업 내역이 없습니다.
            </div>
          ) : (
            <div className="space-y-4">
              {workItems.map((item) => (
                <div
                  key={item.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusBadge(item.status)}
                        <Link
                          href={`/dashboard/orders/${item.order_id}`}
                          className="font-semibold text-blue-600 hover:underline"
                        >
                          {item.orders?.tracking_no || item.order_id.slice(0, 8)}
                        </Link>
                        <span className="text-sm text-gray-600">
                          {item.orders?.customer_name || "고객명 없음"}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700 mb-2">
                        <strong>작업 아이템:</strong> {item.item_name}
                      </div>
                      {item.worker_name && (
                        <div className="text-sm text-gray-600 mb-1">
                          <strong>작업자:</strong> {item.worker_name}
                        </div>
                      )}
                      <div className="flex gap-4 text-xs text-gray-500">
                        {item.started_at && (
                          <span>
                            <strong>시작:</strong> {formatDate(item.started_at)}
                          </span>
                        )}
                        {item.completed_at && (
                          <span>
                            <strong>완료:</strong> {formatDate(item.completed_at)}
                          </span>
                        )}
                        {!item.started_at && !item.completed_at && (
                          <span>
                            <strong>생성:</strong> {formatDate(item.created_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 페이지네이션 */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
              >
                이전
              </Button>
              <span className="text-sm text-gray-600">
                페이지 {pagination.page} / {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= pagination.totalPages}
              >
                다음
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

