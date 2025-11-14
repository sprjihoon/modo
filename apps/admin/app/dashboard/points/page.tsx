"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from "lucide-react";

export default function PointsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Mock data
  const allPoints = Array.from({ length: 60 }, (_, i) => ({
    id: `POINT-${(i + 1).toString().padStart(4, "0")}`,
    userId: `USER-${(i % 20) + 1}`,
    userName: `고객${(i % 20) + 1}`,
    type: i % 3 === 0 ? "적립" : i % 3 === 1 ? "사용" : "만료",
    amount: i % 3 === 0 ? (i + 1) * 100 : i % 3 === 1 ? (i + 1) * 50 : (i + 1) * 30,
    description:
      i % 3 === 0
        ? "주문 적립"
        : i % 3 === 1
        ? "결제 사용"
        : "포인트 만료",
    orderId: i % 3 !== 2 ? `ORDER-2024-${(i + 1).toString().padStart(4, "0")}` : null,
    createdAt: `2024.01.${((i % 28) + 1).toString().padStart(2, "0")} ${String(10 + (i % 12)).padStart(2, "0")}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}`,
  }));

  // Filter and search
  let filteredPoints = allPoints.filter((point) => {
    const matchesSearch =
      point.id.toLowerCase().includes(search.toLowerCase()) ||
      point.userName.toLowerCase().includes(search.toLowerCase()) ||
      (point.orderId && point.orderId.toLowerCase().includes(search.toLowerCase()));

    const matchesType = typeFilter === "ALL" || point.type === typeFilter;

    return matchesSearch && matchesType;
  });

  // Pagination
  const totalPages = Math.ceil(filteredPoints.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPoints = filteredPoints.slice(startIndex, startIndex + itemsPerPage);

  const totalIssued = allPoints
    .filter((p) => p.type === "적립")
    .reduce((sum, p) => sum + p.amount, 0);
  const totalUsed = allPoints
    .filter((p) => p.type === "사용")
    .reduce((sum, p) => sum + p.amount, 0);
  const totalExpired = allPoints
    .filter((p) => p.type === "만료")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">포인트 관리</h1>
        <p className="text-muted-foreground">포인트 적립 및 사용 내역을 모니터링합니다</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>총 발급 포인트</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {totalIssued.toLocaleString()}P
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>사용된 포인트</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalUsed.toLocaleString()}P</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>만료된 포인트</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {totalExpired.toLocaleString()}P
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>보유 중인 포인트</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {(totalIssued - totalUsed - totalExpired).toLocaleString()}P
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="포인트 ID, 사용자명, 주문번호로 검색..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="유형 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">전체</SelectItem>
                <SelectItem value="적립">적립</SelectItem>
                <SelectItem value="사용">사용</SelectItem>
                <SelectItem value="만료">만료</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Points Table */}
      <Card>
        <CardHeader>
          <CardTitle>포인트 내역</CardTitle>
          <CardDescription>
            총 {filteredPoints.length}건의 포인트 내역 (페이지 {currentPage} / {totalPages})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {paginatedPoints.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">포인트 내역이 없습니다.</div>
            ) : (
              paginatedPoints.map((point) => (
                <div
                  key={point.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        point.type === "적립"
                          ? "bg-green-100"
                          : point.type === "사용"
                          ? "bg-red-100"
                          : "bg-gray-100"
                      }`}
                    >
                      {point.type === "적립" ? (
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      ) : point.type === "사용" ? (
                        <TrendingDown className="h-5 w-5 text-red-600" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-gray-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{point.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {point.userName} {point.orderId && `• ${point.orderId}`}
                      </p>
                      <p className="text-xs text-muted-foreground">{point.createdAt}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-medium text-lg ${
                        point.type === "적립"
                          ? "text-green-600"
                          : point.type === "사용"
                          ? "text-red-600"
                          : "text-gray-600"
                      }`}
                    >
                      {point.type === "적립" ? "+" : "-"}
                      {point.amount.toLocaleString()}P
                    </p>
                    <Badge
                      variant={
                        point.type === "적립"
                          ? "default"
                          : point.type === "사용"
                          ? "destructive"
                          : "outline"
                      }
                      className="mt-1"
                    >
                      {point.type}
                    </Badge>
                  </div>
                </div>
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

