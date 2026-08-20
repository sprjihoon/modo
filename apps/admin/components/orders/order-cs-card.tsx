"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CS_COMPENSATION_CAP, compensationAmount, repairFeeOf } from "@/lib/order-cs";
import { PaymentRefundDialog } from "@/components/orders/payment-refund-dialog";

type CsEvent = {
  id: string;
  cycle: number;
  action: string;
  reason: string;
  amount: number | null;
  residual_value: number | null;
  payout_status: string | null;
  actor_name: string | null;
  clothes_location: string | null;
  created_at: string;
};

const ACTION_LABEL: Record<string, string> = {
  REWORK: "재작업",
  REPAIR_REFUND: "수선비 환불",
  PAYMENT_REFUND: "결제 취소/환불",
  COMPENSATION: "전손·분실 보상",
};

export function OrderCsCard({
  order,
  onChanged,
}: {
  order: any;
  onChanged: () => void;
}) {
  const [events, setEvents] = useState<CsEvent[]>([]);
  const [open, setOpen] = useState<null | "REWORK" | "REPAIR_REFUND" | "COMPENSATION">(null);
  const [reason, setReason] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [residualValue, setResidualValue] = useState("");
  const [refundRepairFee, setRefundRepairFee] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState("BANK");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [payPreset, setPayPreset] = useState<{
    type: "partial";
    amount: number;
    reason: string;
    lockAmount: boolean;
  } | null>(null);
  const [expanded, setExpanded] = useState(false);

  const repairFee = repairFeeOf(order ?? {});
  const residual = Number(residualValue) || 0;
  const comp = compensationAmount(residual, repairFee);
  const atHome = order?.status === "DELIVERED";
  const closed = ["REPAIR_REFUNDED", "COMPENSATED"].includes(order?.cs_status ?? "");
  const cycle = Number(order?.cs_cycle ?? 1);

  const load = async () => {
    if (!order?.id) return;
    const res = await fetch(`/api/orders/${order.id}/cs`);
    const data = await res.json();
    if (res.ok && data.events) {
      setEvents(data.events);
      setLoadError(null);
    } else {
      setEvents([]);
      setLoadError(data.error || "CS 이력을 불러오지 못했습니다. DB 마이그레이션을 확인해 주세요.");
    }
  };

  useEffect(() => {
    setEvents([]);
    setLoadError(null);
    setExpanded(false);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id]);

  useEffect(() => {
    if (!order?.id) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.cs_status, order?.payment_status, order?.updated_at]);

  const hasHistory = cycle > 1 || Boolean(order?.cs_status) || events.length > 0;
  const showPanel = expanded || hasHistory;

  const recordCs = async (payload: Record<string, unknown>) => {
    const res = await fetch(`/api/orders/${order.id}/cs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || "처리 실패");
    return data;
  };

  const submit = async () => {
    if (!order?.id || !reason.trim()) {
      alert("사유를 입력해 주세요.");
      return;
    }

    if (open === "REPAIR_REFUND") {
      if (order.payment_id && repairFee > 0) {
        setPayPreset({
          type: "partial",
          amount: repairFee,
          reason: reason.trim(),
          lockAmount: true,
        });
        setOpen(null);
        setPayOpen(true);
        return;
      }
    }

    setLoading(true);
    try {
      const data = await recordCs({
        action: open,
        reason: reason.trim(),
        pickupDate: pickupDate || undefined,
        residualValue: residualValue ? Number(residualValue) : undefined,
        refundRepairFee,
        payoutMethod,
      });
      alert(data.message || "처리되었습니다.");
      const shouldRefundRepairFee = open === "COMPENSATION" && refundRepairFee;
      const savedReason = reason.trim();
      setOpen(null);
      setReason("");
      setPickupDate("");
      setResidualValue("");
      setRefundRepairFee(false);
      await load();
      onChanged();
      if (shouldRefundRepairFee && order.payment_id && repairFee > 0) {
        setPayPreset({
          type: "partial",
          amount: repairFee,
          reason: `CS 전손 처리 수선비 환불: ${savedReason}`,
          lockAmount: true,
        });
        setPayOpen(true);
      }
    } catch (e: any) {
      alert(e?.message || "처리에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (!showPanel) {
    return (
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setExpanded(true)}>
          CS 처리
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>CS 처리</span>
          <div className="flex gap-2">
            {cycle > 1 && <Badge variant="secondary">{cycle}회차</Badge>}
            {order?.cs_status && (
              <Badge>{ACTION_LABEL[order.cs_status === "REWORK" ? "REWORK" : order.cs_status === "REPAIR_REFUNDED" ? "REPAIR_REFUND" : "COMPENSATION"]}</Badge>
            )}
            {!hasHistory && (
              <Button variant="ghost" size="sm" onClick={() => setExpanded(false)}>
                닫기
              </Button>
            )}
          </div>
        </CardTitle>
        <CardDescription>
          재작업·환불·보상 기록은 여기서만 봅니다. 카드 환불은 결제 정보의 취소/환불을 타며, 이력은 이 목록에 남습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={closed} onClick={() => setOpen("REWORK")}>
            재작업
          </Button>
          <Button size="sm" variant="outline" disabled={closed} onClick={() => setOpen("REPAIR_REFUND")}>
            수선비 환불
          </Button>
          <Button size="sm" variant="outline" disabled={closed} onClick={() => setOpen("COMPENSATION")}>
            전손·분실 보상
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">처리 이력</p>
          {loadError ? (
            <p className="text-sm text-red-600">{loadError}</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground">아직 기록이 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {events.map((e) => (
                <li key={e.id} className="text-sm border rounded-md p-3">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">
                      {ACTION_LABEL[e.action] ?? e.action}
                      {e.action === "REWORK" ? ` ${e.cycle}회차` : ""}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(e.created_at).toLocaleString("ko-KR")}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-1">{e.reason}</p>
                  {e.amount != null && (
                    <p className="mt-1">금액 ₩{e.amount.toLocaleString()}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {e.actor_name ?? "관리자"}
                    {e.clothes_location === "HOME" ? " · 고객 집 재수거" : ""}
                    {e.clothes_location === "WORKSHOP" ? " · 공방 재작업" : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>

      <Dialog open={open !== null} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {open === "REWORK" && "재작업"}
              {open === "REPAIR_REFUND" && "수선비 환불"}
              {open === "COMPENSATION" && "전손·분실 보상"}
            </DialogTitle>
            <DialogDescription>
              {open === "REWORK" &&
                (atHome
                  ? "옷이 고객 집에 있습니다. 수거일을 지정하면 기존 수거 로직을 다시 탑니다. 1회차 송장은 이력에 남습니다."
                  : "옷이 공방에 있으면 수거 없이 작업부터 다시 진행합니다.")}
              {open === "REPAIR_REFUND" &&
                `확인하면 결제 정보의 취소/환불이 열리고, 수선비 ₩${repairFee.toLocaleString()}를 부분 취소합니다. 성공한 뒤에만 이 이력이 남습니다.`}
              {open === "COMPENSATION" &&
                "지급액 = min(잔존가치, 수선비×5, 20만 원). 20만 원은 한도입니다. 여기서는 기록만 하고, 실제 송금은 별도로 합니다."}
            </DialogDescription>
          </DialogHeader>

          {open === "REWORK" && atHome && (
            <div className="space-y-2">
              <Label>수거일</Label>
              <Input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} />
            </div>
          )}

          {open === "COMPENSATION" && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>잔존가치 (원)</Label>
                <Input
                  type="number"
                  min={0}
                  value={residualValue}
                  onChange={(e) => setResidualValue(e.target.value)}
                />
              </div>
              <p className="text-sm">
                계산: min({residual.toLocaleString() || 0}, {(repairFee * 5).toLocaleString()},{" "}
                {CS_COMPENSATION_CAP.toLocaleString()}) ={" "}
                <strong>₩{comp.toLocaleString()}</strong>
              </p>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={refundRepairFee}
                  onChange={(e) => setRefundRepairFee(e.target.checked)}
                />
                수선비도 결제 취소/환불로 이어서 처리 (기본 끔)
              </label>
              <div className="space-y-2">
                <Label>지급 방법</Label>
                <select
                  className="w-full border rounded-md h-9 px-2 text-sm"
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value)}
                >
                  <option value="BANK">계좌 이체</option>
                  <option value="POINTS">포인트</option>
                  <option value="OTHER">기타</option>
                </select>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>사유</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(null)} disabled={loading}>
              닫기
            </Button>
            <Button onClick={submit} disabled={loading}>
              {loading ? "처리 중…" : open === "REPAIR_REFUND" ? "결제 취소로 이동" : "확인"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {order?.payment_id && (
        <PaymentRefundDialog
          orderId={order.id}
          paymentId={order.payment_id}
          originalAmount={order.total_price ?? repairFee}
          paymentMethod={order.payment_method || "신용카드"}
          hideTrigger
          open={payOpen}
          onOpenChange={(next) => {
            setPayOpen(next);
            if (!next) setPayPreset(null);
          }}
          preset={payPreset ?? undefined}
          onRefunded={async () => {
            setReason("");
            await load();
            onChanged();
          }}
        />
      )}
    </Card>
  );
}
