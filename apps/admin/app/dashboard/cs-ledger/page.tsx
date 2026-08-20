"use client";

import { useCallback, useEffect, useState } from "react";
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
import { Download, RefreshCw, Wallet } from "lucide-react";

const getToday = () => new Date().toISOString().split("T")[0];
const getMonthStart = () => {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), 1).toISOString().split("T")[0];
};

const ACTION_LABEL: Record<string, string> = {
  PAYMENT_REFUND: "결제 취소/환불",
  REPAIR_REFUND: "수선비 환불",
  COMPENSATION: "전손·분실 보상",
  ORDER_CANCEL: "주문 취소",
};

type LedgerItem = {
  id: string;
  source: "CS" | "ORDER";
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  action: string;
  reason: string;
  amount: number;
  residualValue: number | null;
  payoutMethod: string | null;
  payoutStatus: string | null;
  actorName: string | null;
  createdAt: string;
};

type Totals = {
  paymentRefund: number;
  repairRefund: number;
  compensation: number;
  compensationPending: number;
  orderCancel: number;
  all: number;
};

export default function CsLedgerPage() {
  const [items, setItems] = useState<LedgerItem[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("ALL");
  const [payoutStatus, setPayoutStatus] = useState("ALL");
  const [startDate, setStartDate] = useState(getMonthStart());
  const [endDate, setEndDate] = useState(getToday());
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "30",
        action,
        payoutStatus,
        startDate,
        endDate,
      });
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/cs-ledger?${params}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.items);
        setTotals(data.totals);
        setTotalPages(data.pagination.totalPages);
        setTotalCount(data.pagination.total);
      }
    } finally {
      setLoading(false);
    }
  }, [page, action, payoutStatus, startDate, endDate, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const markPaid = async (id: string, next: "PAID" | "PENDING") => {
    setSavingId(id);
    try {
      const res = await fetch("/api/cs-ledger", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, payoutStatus: next }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "변경 실패");
      await load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSavingId(null);
    }
  };

  const downloadCsv = () => {
    const header = ["일시", "구분", "주문번호", "고객", "금액", "지급상태", "사유", "처리자"];
    const lines = items.map((r) =>
      [
        r.createdAt ? new Date(r.createdAt).toLocaleString("ko-KR") : "",
        ACTION_LABEL[r.action] ?? r.action,
        r.orderNumber,
        r.customerName,
        r.amount,
        r.payoutStatus === "PENDING" ? "지급대기" : r.payoutStatus === "PAID" ? "완료" : "",
        r.reason.replaceAll('"', "'"),
        r.actorName ?? "",
      ].join(",")
    );
    const blob = new Blob(["\uFEFF" + [header.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `환불보상_${startDate}_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wallet className="h-6 w-6" />
          환불·보상 관리
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          주문별 취소·환불·보상 금액을 모아서 봅니다. 카드 환불은 결제 취소 기록이고, 전손 보상은 여기서 지급 여부를 표시합니다.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>기간 합계</CardDescription>
            <CardTitle className="text-2xl">₩{(totals?.all ?? 0).toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>결제 취소·수선비 환불</CardDescription>
            <CardTitle className="text-2xl">
              ₩{((totals?.paymentRefund ?? 0) + (totals?.repairRefund ?? 0) + (totals?.orderCancel ?? 0)).toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>전손·분실 보상</CardDescription>
            <CardTitle className="text-2xl">₩{(totals?.compensation ?? 0).toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>보상 지급 대기</CardDescription>
            <CardTitle className="text-2xl text-amber-600">
              ₩{(totals?.compensationPending ?? 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>내역</CardTitle>
            <CardDescription>{totalCount}건</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={downloadCsv} disabled={items.length === 0}>
              <Download className="h-4 w-4 mr-1" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="h-4 w-4 mr-1" />
              새로고침
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="주문번호·고객·사유"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-56"
            />
            <Select
              value={action}
              onValueChange={(v) => {
                setAction(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="구분" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">전체</SelectItem>
                <SelectItem value="PAYMENT_REFUND">결제 취소/환불</SelectItem>
                <SelectItem value="REPAIR_REFUND">수선비 환불</SelectItem>
                <SelectItem value="COMPENSATION">전손·분실 보상</SelectItem>
                <SelectItem value="ORDER_CANCEL">주문 취소</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={payoutStatus}
              onValueChange={(v) => {
                setPayoutStatus(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="지급" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">지급 전체</SelectItem>
                <SelectItem value="PENDING">지급 대기</SelectItem>
                <SelectItem value="PAID">완료</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">불러오는 중…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">해당 기간에 환불·보상 기록이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">일시</th>
                    <th className="py-2 pr-3 font-medium">구분</th>
                    <th className="py-2 pr-3 font-medium">주문</th>
                    <th className="py-2 pr-3 font-medium">고객</th>
                    <th className="py-2 pr-3 font-medium text-right">금액</th>
                    <th className="py-2 pr-3 font-medium">지급</th>
                    <th className="py-2 pr-3 font-medium">사유</th>
                    <th className="py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 whitespace-nowrap text-xs text-muted-foreground">
                        {r.createdAt ? new Date(r.createdAt).toLocaleString("ko-KR") : "-"}
                      </td>
                      <td className="py-2 pr-3">
                        <Badge variant="secondary">{ACTION_LABEL[r.action] ?? r.action}</Badge>
                      </td>
                      <td className="py-2 pr-3">
                        <Link href={`/dashboard/orders/${r.orderId}`} className="text-primary hover:underline">
                          {r.orderNumber}
                        </Link>
                      </td>
                      <td className="py-2 pr-3">
                        <div>{r.customerName || "-"}</div>
                        <div className="text-xs text-muted-foreground">{r.customerPhone}</div>
                      </td>
                      <td className="py-2 pr-3 text-right font-medium">₩{r.amount.toLocaleString()}</td>
                      <td className="py-2 pr-3">
                        {r.action === "COMPENSATION" ? (
                          <div className="flex items-center gap-2">
                            <Badge variant={r.payoutStatus === "PAID" ? "default" : "outline"}>
                              {r.payoutStatus === "PAID" ? "지급완료" : "지급대기"}
                            </Badge>
                            {r.source === "CS" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={savingId === r.id}
                                onClick={() => markPaid(r.id, r.payoutStatus === "PAID" ? "PENDING" : "PAID")}
                              >
                                {r.payoutStatus === "PAID" ? "대기로" : "지급완료"}
                              </Button>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">카드/주문 반영</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 max-w-xs truncate" title={r.reason}>
                        {r.reason}
                      </td>
                      <td className="py-2 text-xs text-muted-foreground">{r.actorName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                이전
              </Button>
              <span className="text-sm py-1">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
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
