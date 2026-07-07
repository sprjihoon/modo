"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertCircle, X, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface PortonePaymentInfo {
  paymentId: string;
  status: string;
  totalAmount: number;
  method: string;
  paidAt: string;
  cancellations: {
    amount: { total: number };
    reason: string;
    cancelledAt: string;
  }[];
}

const methodLabel: Record<string, string> = {
  PaymentMethodCard: "신용카드",
  PaymentMethodTransfer: "계좌이체",
  PaymentMethodVirtualAccount: "가상계좌",
  PaymentMethodMobile: "휴대폰",
  PaymentMethodEasyPay: "간편결제",
  Card: "신용카드",
  Transfer: "계좌이체",
  VirtualAccount: "가상계좌",
  Mobile: "휴대폰",
  EasyPay: "간편결제",
};

interface PaymentRefundDialogProps {
  orderId: string;
  paymentId: string;
  originalAmount: number;
  paymentMethod: string;
  onRefunded?: () => void;
}

export function PaymentRefundDialog({
  orderId,
  paymentId,
  originalAmount,
  paymentMethod,
  onRefunded,
}: PaymentRefundDialogProps) {
  const [open, setOpen] = useState(false);
  const [refundType, setRefundType] = useState<"full" | "partial">("full");
  const [refundAmount, setRefundAmount] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const [portonePayment, setPortonePayment] = useState<PortonePaymentInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);

  useEffect(() => {
    if (open && paymentId) {
      loadPaymentInfo();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, paymentId]);

  const loadPaymentInfo = async () => {
    if (!paymentId) return;
    setLoadingInfo(true);
    try {
      const response = await fetch(`/api/pay/inquiry?paymentId=${encodeURIComponent(paymentId)}`);
      const result = await response.json();
      if (result.success && result.payment) {
        setPortonePayment(result.payment);
      }
    } catch (error) {
      console.error("결제 정보 조회 실패:", error);
    } finally {
      setLoadingInfo(false);
    }
  };

  const computeBalance = () => {
    if (!portonePayment) return originalAmount;
    const cancelled = portonePayment.cancellations?.reduce(
      (sum, c) => sum + (c.amount?.total ?? 0),
      0
    ) ?? 0;
    return portonePayment.totalAmount - cancelled;
  };

  const handleRefund = async () => {
    if (!paymentId) {
      alert("결제 ID가 없어 취소할 수 없습니다.");
      return;
    }
    if (refundType === "partial" && !refundAmount) {
      alert("취소 금액을 입력해주세요.");
      return;
    }
    if (!reason.trim()) {
      alert("취소 사유를 입력해주세요.");
      return;
    }

    const maxRefundAmount = computeBalance();
    const requestedAmount = refundType === "full" ? maxRefundAmount : parseInt(refundAmount);

    if (requestedAmount > maxRefundAmount) {
      alert(`취소 가능 금액(₩${maxRefundAmount.toLocaleString()})을 초과했습니다.`);
      return;
    }

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        paymentId,
        cancelReason: reason,
        cancelAmount: refundType === "full" ? maxRefundAmount : parseInt(refundAmount),
        currentCancellableAmount: maxRefundAmount,
      };

      const response = await fetch("/api/pay/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const message =
          refundType === "full"
            ? "전체 취소가 완료되었습니다."
            : `부분 취소가 완료되었습니다.\n취소금액: ₩${parseInt(refundAmount).toLocaleString()}`;
        alert(message);
        setOpen(false);
        onRefunded?.();
      } else {
        alert(`결제 취소 실패\n\n${result.message || result.error || "결제 취소에 실패했습니다."}`);
      }
    } catch (error: unknown) {
      console.error("결제 취소 오류:", error);
      alert(
        `결제 취소 중 오류가 발생했습니다.\n\n${(error as Error).message || "알 수 없는 오류"}`
      );
    } finally {
      setLoading(false);
    }
  };

  const maxRefundableAmount = computeBalance();
  const partialRefundAmount = refundAmount ? parseInt(refundAmount) : 0;
  const remainingAmount = maxRefundableAmount - partialRefundAmount;
  const alreadyCanceled =
    (portonePayment?.totalAmount ?? originalAmount) - maxRefundableAmount;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <X className="mr-2 h-4 w-4" />
          결제 취소/환불
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>결제 취소 및 환불</DialogTitle>
          <DialogDescription>포트원/KCP 결제를 취소하거나 부분 환불합니다</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {!paymentId && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                결제 ID가 없습니다. 포트원을 통해 결제된 주문만 취소할 수 있습니다.
              </AlertDescription>
            </Alert>
          )}

          {loadingInfo && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          )}

          {!loadingInfo && portonePayment && (
            <>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">원 결제 금액</span>
                  <span className="text-lg font-bold">
                    ₩{(portonePayment.totalAmount ?? originalAmount).toLocaleString()}
                  </span>
                </div>
                {alreadyCanceled > 0 && (
                  <div className="flex justify-between items-center text-red-600">
                    <span className="text-sm">이미 취소된 금액</span>
                    <span className="font-medium">-₩{alreadyCanceled.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="text-sm text-muted-foreground">취소 가능 금액</span>
                  <span className="text-xl font-bold text-blue-600">
                    ₩{maxRefundableAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">결제 수단</span>
                  <span className="text-sm font-medium">
                    {methodLabel[portonePayment.method] || portonePayment.method || paymentMethod}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">결제 상태</span>
                  <Badge variant={portonePayment.status === "PAID" ? "default" : portonePayment.status === "CANCELLED" ? "destructive" : "secondary"}>
                    {({
                      PAID: "결제 완료", CANCELLED: "취소됨",
                      PARTIAL_CANCELLED: "부분 취소", FAILED: "결제 실패",
                      PENDING: "결제 대기", WAITING_FOR_DEPOSIT: "입금 대기",
                    } as Record<string,string>)[portonePayment.status] || portonePayment.status}
                  </Badge>
                </div>
                {portonePayment.paidAt && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">결제 일시</span>
                    <span className="text-sm">
                      {new Date(portonePayment.paidAt).toLocaleString("ko-KR")}
                    </span>
                  </div>
                )}
              </div>

              {portonePayment.cancellations && portonePayment.cancellations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-red-600">이전 취소 내역</h4>
                  {portonePayment.cancellations.map((cancel, idx) => (
                    <div key={idx} className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-red-600 font-medium">
                          -₩{(cancel.amount?.total ?? 0).toLocaleString()}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(cancel.cancelledAt).toLocaleString("ko-KR")}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">사유: {cancel.reason}</p>
                    </div>
                  ))}
                </div>
              )}

              {maxRefundableAmount <= 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    이미 전액 취소된 결제입니다. 추가 취소가 불가능합니다.
                  </AlertDescription>
                </Alert>
              )}

              {maxRefundableAmount > 0 && (
                <>
                  <div className="space-y-3">
                    <Label>취소 유형</Label>
                    <RadioGroup
                      value={refundType}
                      onValueChange={(v) => setRefundType(v as "full" | "partial")}
                    >
                      <div className="flex items-center space-x-2 p-3 border rounded-lg">
                        <RadioGroupItem value="full" id="full" />
                        <Label htmlFor="full" className="flex-1 cursor-pointer">
                          <div>
                            <p className="font-medium">전체 취소</p>
                            <p className="text-xs text-muted-foreground">
                              취소 가능 금액 전액을 취소합니다
                            </p>
                          </div>
                        </Label>
                        <span className="text-sm font-medium text-red-600">
                          -₩{maxRefundableAmount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg">
                        <RadioGroupItem value="partial" id="partial" />
                        <Label htmlFor="partial" className="flex-1 cursor-pointer">
                          <div>
                            <p className="font-medium">부분 취소</p>
                            <p className="text-xs text-muted-foreground">
                              일부 금액만 취소합니다
                            </p>
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {refundType === "partial" && (
                    <div className="space-y-2">
                      <Label htmlFor="refundAmount">취소 금액</Label>
                      <Input
                        id="refundAmount"
                        type="number"
                        placeholder="취소할 금액을 입력하세요"
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
                        max={maxRefundableAmount}
                        min={1}
                      />
                      {partialRefundAmount > 0 && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">취소 금액</span>
                            <span className="font-medium text-red-600">
                              -₩{partialRefundAmount.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm mt-1">
                            <span className="text-muted-foreground">취소 후 남은 금액</span>
                            <span className="font-medium text-green-600">
                              ₩{remainingAmount.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}
                      {partialRefundAmount > maxRefundableAmount && (
                        <p className="text-red-500 text-sm">
                          취소 가능 금액(₩{maxRefundableAmount.toLocaleString()})을 초과했습니다.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="reason">취소 사유 *</Label>
                    <Input
                      id="reason"
                      placeholder="취소 사유를 입력하세요"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {refundType === "full"
                        ? "전체 취소 시 결제가 완전히 취소됩니다. 이 작업은 되돌릴 수 없습니다."
                        : "부분 취소 후 남은 금액은 결제 상태로 유지됩니다."}
                    </AlertDescription>
                  </Alert>
                </>
              )}
            </>
          )}

          {!loadingInfo && !portonePayment && paymentId && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                결제 정보를 조회할 수 없습니다. 결제 ID를 확인해주세요.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            취소
          </Button>
          <Button
            onClick={handleRefund}
            disabled={loading || !paymentId || maxRefundableAmount <= 0 || !reason.trim()}
            variant="destructive"
          >
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                처리 중...
              </>
            ) : (
              <>
                <X className="mr-2 h-4 w-4" />
                결제 취소
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
