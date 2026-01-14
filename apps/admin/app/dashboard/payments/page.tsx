"use client";

import { useState, useEffect, useCallback } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Search,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Calendar,
  Eye,
  X,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Ban,
  ExternalLink,
  Receipt,
} from "lucide-react";

// 오늘 날짜 (YYYY-MM-DD 형식)
const getToday = () => {
  const today = new Date();
  return today.toISOString().split("T")[0];
};

// N일 전 날짜
const getDaysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split("T")[0];
};

// 상태 맵
const statusMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  ALL: { label: "전체", color: "bg-gray-100 text-gray-800", icon: null },
  COMPLETED: { label: "결제 완료", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", icon: <CheckCircle className="h-3 w-3" /> },
  PENDING: { label: "결제 대기", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400", icon: <Clock className="h-3 w-3" /> },
  FAILED: { label: "결제 실패", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", icon: <XCircle className="h-3 w-3" /> },
  CANCELED: { label: "전체 취소", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400", icon: <Ban className="h-3 w-3" /> },
  PARTIAL_CANCELED: { label: "부분 취소", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400", icon: <X className="h-3 w-3" /> },
};

// 결제 방법 맵
const methodMap: Record<string, string> = {
  CARD: "신용카드",
  BANK_TRANSFER: "계좌이체",
  VIRTUAL_ACCOUNT: "가상계좌",
  MOBILE: "휴대폰",
  TOSS_PAY: "토스페이",
  KAKAO_PAY: "카카오페이",
  NAVER_PAY: "네이버페이",
};

interface Payment {
  id: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  amount: number;
  method: string;
  status: string;
  paymentKey: string | null;
  orderStatus: string;
  createdAt: string;
  paidAt: string | null;
  canceledAt: string | null;
}

interface PaymentDetail {
  id: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  amount: number;
  method: string;
  status: string;
  paymentKey: string | null;
  itemName: string;
  createdAt: string;
  paidAt: string | null;
  canceledAt: string | null;
  tossPayment: {
    paymentKey: string;
    status: string;
    totalAmount: number;
    balanceAmount: number;
    method: string;
    approvedAt: string;
    card: {
      company: string;
      number: string;
      installmentPlanMonths: number;
      isInterestFree: boolean;
      approveNo: string;
    } | null;
    easyPay: {
      provider: string;
      amount: number;
    } | null;
    cancels: {
      cancelAmount: number;
      cancelReason: string;
      canceledAt: string;
    }[];
    receipt: {
      url: string;
    } | null;
  } | null;
  logs: any[];
}

interface Stats {
  total: number;
  completed: number;
  pending: number;
  failed: number;
  canceled: number;
  totalRevenue: number;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [methodFilter, setMethodFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 20;

  // 날짜 필터 (기본값: 최근 30일)
  const [startDate, setStartDate] = useState<string>(getDaysAgo(30));
  const [endDate, setEndDate] = useState<string>(getToday());
  const [datePreset, setDatePreset] = useState<string>("30days");

  // 상세 조회 다이얼로그
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // 취소 다이얼로그
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelPayment, setCancelPayment] = useState<Payment | null>(null);
  const [cancelType, setCancelType] = useState<"full" | "partial">("full");
  const [cancelAmount, setCancelAmount] = useState<string>("");
  const [cancelReason, setCancelReason] = useState<string>("");
  const [cancelLoading, setCancelLoading] = useState(false);

  // 결제 내역 로드
  const loadPayments = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", currentPage.toString());
      params.append("limit", itemsPerPage.toString());
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (methodFilter !== "ALL") params.append("paymentMethod", methodFilter);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (search) params.append("search", search);

      const response = await fetch(`/api/payments?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setPayments(result.payments);
        setTotalPages(result.pagination.totalPages);
        setTotalCount(result.pagination.total);
        setStats(result.stats);
      } else {
        console.error("결제 내역 로드 실패:", result.error);
      }
    } catch (error) {
      console.error("결제 내역 로드 오류:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, statusFilter, methodFilter, startDate, endDate, search]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

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
    setCurrentPage(1);
  };

  // 상세 조회
  const handleViewDetail = async (payment: Payment) => {
    setDetailLoading(true);
    setDetailOpen(true);
    try {
      const response = await fetch(`/api/payments/${payment.id}`);
      const result = await response.json();
      if (result.success) {
        setSelectedPayment(result.payment);
      } else {
        alert("결제 정보 조회에 실패했습니다.");
        setDetailOpen(false);
      }
    } catch (error) {
      console.error("결제 상세 조회 오류:", error);
      alert("결제 정보 조회 중 오류가 발생했습니다.");
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // 취소 다이얼로그 열기
  const handleOpenCancel = (payment: Payment) => {
    setCancelPayment(payment);
    setCancelType("full");
    setCancelAmount("");
    setCancelReason("");
    setCancelOpen(true);
  };

  // 결제 취소 처리
  const handleCancelPayment = async () => {
    if (!cancelPayment || !cancelPayment.paymentKey) {
      alert("결제 키가 없어 취소할 수 없습니다.");
      return;
    }

    if (!cancelReason.trim()) {
      alert("취소 사유를 입력해주세요.");
      return;
    }

    if (cancelType === "partial") {
      const amount = parseInt(cancelAmount);
      if (!amount || amount <= 0) {
        alert("취소 금액을 올바르게 입력해주세요.");
        return;
      }
      if (amount > cancelPayment.amount) {
        alert("취소 금액이 결제 금액보다 클 수 없습니다.");
        return;
      }
    }

    setCancelLoading(true);
    try {
      const body: any = {
        paymentKey: cancelPayment.paymentKey,
        cancelReason: cancelReason,
      };

      if (cancelType === "partial") {
        body.cancelAmount = parseInt(cancelAmount);
      }

      const response = await fetch("/api/pay/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert(
          cancelType === "full"
            ? "전체 결제가 취소되었습니다."
            : `₩${parseInt(cancelAmount).toLocaleString()} 부분 취소가 완료되었습니다.`
        );
        setCancelOpen(false);
        loadPayments();
      } else {
        alert(`결제 취소 실패: ${result.message || result.error || "알 수 없는 오류"}`);
      }
    } catch (error: any) {
      console.error("결제 취소 오류:", error);
      alert(`결제 취소 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setCancelLoading(false);
    }
  };

  // 검색 핸들러
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadPayments();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">결제 관리</h1>
          <p className="text-muted-foreground">
            토스페이먼츠 결제 내역을 조회하고 관리합니다
          </p>
        </div>
        <Button onClick={loadPayments} variant="outline" disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          새로고침
        </Button>
      </div>

      {/* 통계 카드 */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>전체 결제</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total.toLocaleString()}건</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>결제 완료</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.completed.toLocaleString()}건
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>결제 대기</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.pending.toLocaleString()}건
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>취소/실패</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {(stats.canceled + stats.failed).toLocaleString()}건
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>총 매출</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                ₩{stats.totalRevenue.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 필터 */}
      <Card>
        <CardContent className="pt-6">
          {/* 날짜 필터 */}
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">기간:</span>
            </div>
            <div className="flex items-center gap-2">
              {["today", "7days", "30days", "90days", "all"].map((preset) => (
                <Button
                  key={preset}
                  variant={datePreset === preset ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleDatePreset(preset)}
                >
                  {preset === "today"
                    ? "오늘"
                    : preset === "7days"
                    ? "7일"
                    : preset === "30days"
                    ? "30일"
                    : preset === "90days"
                    ? "90일"
                    : "전체"}
                </Button>
              ))}
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

          {/* 검색 및 필터 */}
          <form onSubmit={handleSearch} className="grid gap-4 md:grid-cols-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="주문ID, 고객명, 연락처, 결제키로 검색..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="결제 상태" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(statusMap).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={methodFilter} onValueChange={(v) => { setMethodFilter(v); setCurrentPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="결제 방법" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">전체</SelectItem>
                {Object.entries(methodMap).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </form>
        </CardContent>
      </Card>

      {/* 결제 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>결제 목록</CardTitle>
          <CardDescription>
            총 {totalCount.toLocaleString()}건의 결제 (페이지 {currentPage} / {totalPages || 1})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              결제 내역이 없습니다.
            </div>
          ) : (
            <div className="space-y-2">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{payment.customerName}</p>
                        <Badge
                          variant="outline"
                          className={statusMap[payment.status]?.color || ""}
                        >
                          <span className="flex items-center gap-1">
                            {statusMap[payment.status]?.icon}
                            {statusMap[payment.status]?.label || payment.status}
                          </span>
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {payment.id.substring(0, 8)}... • {methodMap[payment.method] || payment.method}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(payment.createdAt).toLocaleString("ko-KR")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="font-bold text-lg">₩{payment.amount.toLocaleString()}</p>
                      {payment.paymentKey && (
                        <p className="text-xs text-muted-foreground font-mono">
                          {payment.paymentKey.substring(0, 12)}...
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetail(payment)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        상세
                      </Button>
                      {payment.status === "COMPLETED" && payment.paymentKey && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleOpenCancel(payment)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          취소
                        </Button>
                      )}
                      <Link href={`/dashboard/orders/${payment.orderId}`}>
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 페이지네이션 */}
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
                    (page >= currentPage - 2 && page <= currentPage + 2)
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

      {/* 상세 조회 다이얼로그 */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>결제 상세 정보</DialogTitle>
            <DialogDescription>
              토스페이먼츠 결제 상세 내역입니다
            </DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : selectedPayment ? (
            <div className="space-y-6">
              {/* 기본 정보 */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">주문 ID</span>
                  <span className="font-mono text-sm">{selectedPayment.orderId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">고객명</span>
                  <span className="font-medium">{selectedPayment.customerName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">결제 금액</span>
                  <span className="font-bold text-xl">₩{selectedPayment.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">결제 상태</span>
                  <Badge className={statusMap[selectedPayment.status]?.color}>
                    {statusMap[selectedPayment.status]?.label || selectedPayment.status}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">결제 방법</span>
                  <span>{methodMap[selectedPayment.method] || selectedPayment.method}</span>
                </div>
              </div>

              {/* 토스페이먼츠 정보 */}
              {selectedPayment.tossPayment && (
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    토스페이먼츠 결제 정보
                  </h4>
                  <div className="p-4 border rounded-lg space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">결제 키</span>
                      <span className="font-mono text-xs">{selectedPayment.tossPayment.paymentKey}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">결제 상태</span>
                      <Badge variant="outline">{selectedPayment.tossPayment.status}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">총 결제금액</span>
                      <span className="font-medium">₩{selectedPayment.tossPayment.totalAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">잔여 금액</span>
                      <span className="font-medium text-blue-600">₩{selectedPayment.tossPayment.balanceAmount.toLocaleString()}</span>
                    </div>
                    {selectedPayment.tossPayment.approvedAt && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">승인 일시</span>
                        <span>{new Date(selectedPayment.tossPayment.approvedAt).toLocaleString("ko-KR")}</span>
                      </div>
                    )}

                    {/* 카드 정보 */}
                    {selectedPayment.tossPayment.card && (
                      <div className="border-t pt-3 mt-3">
                        <p className="text-sm font-medium mb-2">카드 정보</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <span className="text-muted-foreground">카드사</span>
                          <span>{selectedPayment.tossPayment.card.company}</span>
                          <span className="text-muted-foreground">카드번호</span>
                          <span className="font-mono">{selectedPayment.tossPayment.card.number}</span>
                          <span className="text-muted-foreground">할부</span>
                          <span>
                            {selectedPayment.tossPayment.card.installmentPlanMonths === 0
                              ? "일시불"
                              : `${selectedPayment.tossPayment.card.installmentPlanMonths}개월`}
                          </span>
                          <span className="text-muted-foreground">승인번호</span>
                          <span className="font-mono">{selectedPayment.tossPayment.card.approveNo}</span>
                        </div>
                      </div>
                    )}

                    {/* 간편결제 정보 */}
                    {selectedPayment.tossPayment.easyPay && (
                      <div className="border-t pt-3 mt-3">
                        <p className="text-sm font-medium mb-2">간편결제 정보</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <span className="text-muted-foreground">결제사</span>
                          <span>{selectedPayment.tossPayment.easyPay.provider}</span>
                          <span className="text-muted-foreground">결제금액</span>
                          <span>₩{selectedPayment.tossPayment.easyPay.amount.toLocaleString()}</span>
                        </div>
                      </div>
                    )}

                    {/* 취소 내역 */}
                    {selectedPayment.tossPayment.cancels && selectedPayment.tossPayment.cancels.length > 0 && (
                      <div className="border-t pt-3 mt-3">
                        <p className="text-sm font-medium mb-2 text-red-600">취소 내역</p>
                        {selectedPayment.tossPayment.cancels.map((cancel, idx) => (
                          <div key={idx} className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg mb-2">
                            <div className="flex justify-between items-center">
                              <span className="text-red-600 font-medium">
                                -₩{cancel.cancelAmount.toLocaleString()}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(cancel.canceledAt).toLocaleString("ko-KR")}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              사유: {cancel.cancelReason}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 영수증 */}
                    {selectedPayment.tossPayment.receipt && (
                      <div className="border-t pt-3 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(selectedPayment.tossPayment!.receipt!.url, "_blank")}
                        >
                          <Receipt className="h-4 w-4 mr-2" />
                          영수증 보기
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!selectedPayment.tossPayment && selectedPayment.paymentKey && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    토스페이먼츠에서 결제 정보를 조회할 수 없습니다.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 결제 취소 다이얼로그 */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>결제 취소</DialogTitle>
            <DialogDescription>결제를 취소하거나 부분 취소합니다</DialogDescription>
          </DialogHeader>
          {cancelPayment && (
            <div className="space-y-6">
              {/* 결제 정보 */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-muted-foreground">고객명</span>
                  <span className="font-medium">{cancelPayment.customerName}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-muted-foreground">결제 금액</span>
                  <span className="font-bold text-lg">₩{cancelPayment.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">결제 방법</span>
                  <span>{methodMap[cancelPayment.method] || cancelPayment.method}</span>
                </div>
              </div>

              {/* 취소 유형 선택 */}
              <div className="space-y-3">
                <Label>취소 유형</Label>
                <RadioGroup value={cancelType} onValueChange={(v) => setCancelType(v as "full" | "partial")}>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="full" id="full" />
                    <Label htmlFor="full" className="flex-1 cursor-pointer">
                      <div>
                        <p className="font-medium">전체 취소</p>
                        <p className="text-xs text-muted-foreground">결제 금액 전액을 취소합니다</p>
                      </div>
                    </Label>
                    <span className="text-red-600 font-medium">
                      -₩{cancelPayment.amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="partial" id="partial" />
                    <Label htmlFor="partial" className="flex-1 cursor-pointer">
                      <div>
                        <p className="font-medium">부분 취소</p>
                        <p className="text-xs text-muted-foreground">일부 금액만 취소합니다</p>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* 부분 취소 금액 */}
              {cancelType === "partial" && (
                <div className="space-y-2">
                  <Label htmlFor="cancelAmount">취소 금액</Label>
                  <Input
                    id="cancelAmount"
                    type="number"
                    placeholder="취소할 금액을 입력하세요"
                    value={cancelAmount}
                    onChange={(e) => setCancelAmount(e.target.value)}
                    max={cancelPayment.amount}
                    min={1}
                  />
                  {cancelAmount && parseInt(cancelAmount) > 0 && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">취소 금액</span>
                        <span className="text-red-600 font-medium">
                          -₩{parseInt(cancelAmount).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-muted-foreground">남은 금액</span>
                        <span className="text-green-600 font-medium">
                          ₩{(cancelPayment.amount - parseInt(cancelAmount)).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 취소 사유 */}
              <div className="space-y-2">
                <Label htmlFor="cancelReason">취소 사유 *</Label>
                <Input
                  id="cancelReason"
                  placeholder="취소 사유를 입력하세요"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </div>

              {/* 경고 */}
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  결제 취소는 되돌릴 수 없습니다. 신중하게 진행해주세요.
                </AlertDescription>
              </Alert>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={cancelLoading}>
              닫기
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelPayment}
              disabled={cancelLoading || !cancelReason.trim()}
            >
              {cancelLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  처리 중...
                </>
              ) : (
                <>
                  <X className="h-4 w-4 mr-2" />
                  결제 취소
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
