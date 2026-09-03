"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LabelPrintDialog } from "@/components/orders/label-print-dialog";
import {
  RotateCcw,
  CheckCircle2,
  Truck,
  Package,
  Search,
  RefreshCw,
  ExternalLink,
  Loader2,
} from "lucide-react";

interface QueueRow {
  id: string;
  order_number: string;
  customer_name: string | null;
  customer_email: string | null;
  item_name: string | null;
  clothing_type: string | null;
  repair_type: string | null;
  status: string;
  extra_charge_status: string | null;
  extra_charge_data: { returnTrackingNo?: string } | null;
  tracking_no: string | null;
  delivery_tracking_no: string | null;
  total_price: number;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  queue_kind: string;
}

interface CancelStats {
  total: number;
  preCancel: number;
  returnPending: number;
  returnShipping: number;
  returnDone: number;
  returnRequestedOnly: number;
  pending: number;
}

const tabs = [
  { id: "PENDING", label: "처리 대기", icon: RotateCcw, color: "text-rose-600" },
  { id: "PRE_PICKUP_CANCEL", label: "수거 전 취소", icon: RotateCcw, color: "text-red-500" },
  { id: "RETURN_PENDING", label: "송장 발급 대기", icon: Package, color: "text-amber-600" },
  { id: "RETURN_SHIPPING", label: "반송 배송중", icon: Truck, color: "text-orange-600" },
  { id: "RETURN_DONE", label: "반송 완료", icon: CheckCircle2, color: "text-green-600" },
  { id: "ALL", label: "전체", icon: Package, color: "text-gray-600" },
] as const;

type TabId = (typeof tabs)[number]["id"];

const TAB_IDS = new Set<string>(tabs.map((t) => t.id));

function resolveTab(searchParams: URLSearchParams): TabId {
  const kind = (searchParams.get("kind") || searchParams.get("cancelView") || "")
    .toUpperCase();
  if (TAB_IDS.has(kind)) return kind as TabId;
  return "PENDING";
}

function statForTab(tab: TabId, stats: CancelStats | null): number {
  if (!stats) return 0;
  if (tab === "PENDING") return stats.pending;
  if (tab === "PRE_PICKUP_CANCEL") return stats.preCancel;
  if (tab === "RETURN_PENDING") return stats.returnPending;
  if (tab === "RETURN_SHIPPING") return stats.returnShipping;
  if (tab === "RETURN_DONE") return stats.returnDone;
  return stats.total;
}

export function CancellationQueuePage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TabId>(() => resolveTab(searchParams));
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [stats, setStats] = useState<CancelStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("kind", tab);
      if (search) params.set("search", search);
      params.set("page", "1");
      params.set("pageSize", "50");
      const res = await fetch(`/api/admin/cancellations?${params.toString()}`);
      const data = await res.json();
      if (data?.success) {
        setRows(data.data || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (e) {
      console.error("반송 큐 로드 실패", e);
    } finally {
      setLoading(false);
    }
  }, [tab, search]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => load(), 400);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const completeReturn = async (row: QueueRow) => {
    if (
      !confirm(
        `주문 ${row.order_number} 의 반송을 완료 처리하시겠습니까?\n\n고객과 다른 관리자에게 알림이 자동 발송됩니다.`,
      )
    ) {
      return;
    }
    setCompletingId(row.id);
    try {
      const res = await fetch(`/api/admin/cancellations/${row.id}/complete-return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: "" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "처리 실패");
      alert("반송 완료 처리되었습니다.");
      await load();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "반송 완료 처리에 실패했습니다.";
      alert(message);
    } finally {
      setCompletingId(null);
    }
  };

  const formatDate = (s: string) => {
    try {
      return new Date(s).toLocaleString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return s;
    }
  };

  const kindBadge = (kind: string) => {
    const map: Record<string, { label: string; color: string }> = {
      PRE_PICKUP_CANCEL: { label: "수거 전 취소", color: "bg-red-100 text-red-700" },
      RETURN_REQUESTED: { label: "반송 요청", color: "bg-rose-100 text-rose-700" },
      RETURN_PENDING: { label: "송장 발급 대기", color: "bg-amber-100 text-amber-800" },
      RETURN_SHIPPING: { label: "반송 배송중", color: "bg-orange-100 text-orange-800" },
      RETURN_DONE: { label: "반송 완료", color: "bg-stone-200 text-stone-800" },
    };
    const m = map[kind];
    if (!m) return null;
    return <Badge className={`${m.color} border-0`}>{m.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <RotateCcw className="h-7 w-7 text-rose-600" />
            {title}
          </h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <Button variant="outline" onClick={load}>
          <RefreshCw className="h-4 w-4 mr-2" />
          새로고침
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        {tabs.map((t) => {
          const Icon = t.icon;
          const value = statForTab(t.id, stats);
          const active = tab === t.id;
          return (
            <Card
              key={t.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                active ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => setTab(t.id)}
            >
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${t.color}`} />
                  {t.label}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="주문번호, 송장번호, 고객명으로 검색..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {tabs.find((x) => x.id === tab)?.label} ({rows.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              해당 상태의 주문이 없습니다.
            </div>
          ) : (
            <div className="space-y-2">
              {rows.map((row) => {
                const canComplete =
                  row.queue_kind === "RETURN_PENDING" ||
                  row.queue_kind === "RETURN_SHIPPING" ||
                  row.status === "RETURN_PENDING" ||
                  row.status === "RETURN_SHIPPING";
                const printTrackingNo = row.delivery_tracking_no;

                return (
                  <div
                    key={row.id}
                    className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">
                          {row.item_name ||
                            `${row.clothing_type ?? ""} - ${row.repair_type ?? ""}`}
                        </p>
                        {kindBadge(row.queue_kind)}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {row.order_number} • {row.customer_name || row.customer_email || "고객"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {printTrackingNo
                          ? `출고 송장: ${printTrackingNo}`
                          : "출고 송장 없음"}
                      </p>
                      {row.cancellation_reason && (
                        <p className="text-xs text-rose-600 mt-0.5">
                          사유: {row.cancellation_reason}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
                      <span className="text-xs text-muted-foreground hidden md:block">
                        {formatDate(row.updated_at)}
                      </span>
                      {printTrackingNo && (
                        <LabelPrintDialog
                          trackingNo={printTrackingNo}
                          type="delivery"
                          orderId={row.id}
                          buttonLabel="송장 재출력"
                          buttonSize="sm"
                          buttonVariant="outline"
                        />
                      )}
                      <Link href={`/dashboard/orders/${row.id}`} target="_blank">
                        <Button size="sm" variant="outline">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          상세
                        </Button>
                      </Link>
                      {canComplete && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          disabled={completingId === row.id}
                          onClick={() => completeReturn(row)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          {completingId === row.id ? "처리중..." : "반송 완료"}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
