"use client";

import { useState } from "react";
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
import { Search, CreditCard, ChevronLeft, ChevronRight, Download } from "lucide-react";

const statusMap = {
  ALL: { label: "전체", color: "bg-gray-100 text-gray-800" },
  COMPLETED: { label: "결제 완료", color: "bg-green-100 text-green-800" },
  PENDING: { label: "결제 대기", color: "bg-yellow-100 text-yellow-800" },
  FAILED: { label: "결제 실패", color: "bg-red-100 text-red-800" },
  REFUNDED: { label: "환불 완료", color: "bg-gray-100 text-gray-800" },
};

export default function PaymentsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Mock data
  const allPayments = Array.from({ length: 45 }, (_, i) => ({
    id: `PAY-${(i + 1).toString().padStart(4, "0")}`,
    orderId: `ORDER-2024-${(i + 1).toString().padStart(4, "0")}`,
    customerName: `고객${i + 1}`,
    amount: (i + 1) * 15000,
    method: i % 3 === 0 ? "신용카드" : i % 3 === 1 ? "계좌이체" : "포인트",
    status: Object.keys(statusMap).filter((k) => k !== "ALL")[
      i % 4
    ] as keyof typeof statusMap,
    createdAt: `2024.01.${((i % 28) + 1).toString().padStart(2, "0")} ${String(10 + (i % 12)).padStart(2, "0")}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}`,
  }));

  // Filter and search
  let filteredPayments = allPayments.filter((payment) => {
    const matchesSearch =
      payment.id.toLowerCase().includes(search.toLowerCase()) ||
      payment.orderId.toLowerCase().includes(search.toLowerCase()) ||
      payment.customerName.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || payment.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPayments = filteredPayments.slice(startIndex, startIndex + itemsPerPage);

  const totalAmount = filteredPayments
    .filter((p) => p.status === "COMPLETED")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">결제 내역</h1>
          <p className="text-muted-foreground">전체 결제 내역을 모니터링합니다</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>전체 결제</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allPayments.length}건</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>결제 완료</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {allPayments.filter((p) => p.status === "COMPLETED").length}건
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>총 매출</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₩{totalAmount.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>평균 결제 금액</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₩
              {Math.floor(
                totalAmount / allPayments.filter((p) => p.status === "COMPLETED").length || 0
              ).toLocaleString()}
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
                placeholder="결제번호, 주문번호, 고객명으로 검색..."
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
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>결제 목록</CardTitle>
          <CardDescription>
            총 {filteredPayments.length}건의 결제 (페이지 {currentPage} / {totalPages})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {paginatedPayments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">결제 내역이 없습니다.</div>
            ) : (
              paginatedPayments.map((payment) => (
                <Link key={payment.id} href={`/dashboard/orders/${payment.orderId}`}>
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{payment.id}</p>
                        <p className="text-sm text-muted-foreground">
                          {payment.orderId} • {payment.customerName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {payment.method} • {payment.createdAt}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Badge className={statusMap[payment.status].color}>
                        {statusMap[payment.status].label}
                      </Badge>
                      <div className="text-right">
                        <p className="font-medium">₩{payment.amount.toLocaleString()}</p>
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

