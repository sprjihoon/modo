"use client";

import { useState } from "react";
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
  const [refundType, setRefundType] = useState<"full" | "partial" | "cancel-and-reapprove">("full");
  const [refundAmount, setRefundAmount] = useState<string>("");
  const [reapproveAmount, setReapproveAmount] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleRefund = async () => {
    if (refundType === "partial" && !refundAmount) {
      alert("환불 금액을 입력해주세요.");
      return;
    }
    if (refundType === "cancel-and-reapprove" && !reapproveAmount) {
      alert("재승인 금액을 입력해주세요.");
      return;
    }
    if (!reason.trim()) {
      alert("환불 사유를 입력해주세요.");
      return;
    }

    setLoading(true);

    try {
      // TODO: 실제 API 호출
      // await refundPayment(paymentId, {
      //   type: refundType,
      //   amount: refundType === "full" ? originalAmount : parseInt(refundAmount),
      //   reapproveAmount: refundType === "cancel-and-reapprove" ? parseInt(reapproveAmount) : undefined,
      //   reason,
      // });

      // Mock 처리
      await new Promise((resolve) => setTimeout(resolve, 1000));

      alert(
        refundType === "full"
          ? "전체 환불이 완료되었습니다."
          : refundType === "partial"
          ? `₩${parseInt(refundAmount).toLocaleString()} 부분 환불이 완료되었습니다.`
          : `전체 취소 후 ₩${parseInt(reapproveAmount).toLocaleString()} 재승인이 완료되었습니다.`
      );

      setOpen(false);
      onRefunded?.();
    } catch (error) {
      console.error("Refund error:", error);
      alert("환불 처리 실패: " + error);
    } finally {
      setLoading(false);
    }
  };

  const partialRefundAmount = refundAmount ? parseInt(refundAmount) : 0;
  const remainingAmount = originalAmount - partialRefundAmount;
  const reapproveAmountNum = reapproveAmount ? parseInt(reapproveAmount) : 0;
  const cancelAndReapproveRemaining = originalAmount - reapproveAmountNum;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <X className="mr-2 h-4 w-4" />
          결제 취소/환불
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>결제 취소 및 환불</DialogTitle>
          <DialogDescription>
            결제 취소 또는 환불 처리를 진행합니다
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 결제 정보 */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">결제 금액</span>
              <span className="text-lg font-bold">₩{originalAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">결제 방법</span>
              <span className="text-sm font-medium">{paymentMethod}</span>
            </div>
          </div>

          {/* 환불 유형 선택 */}
          <div className="space-y-3">
            <Label>환불 유형</Label>
            <RadioGroup value={refundType} onValueChange={(v) => setRefundType(v as any)}>
              <div className="flex items-center space-x-2 p-3 border rounded-lg">
                <RadioGroupItem value="full" id="full" />
                <Label htmlFor="full" className="flex-1 cursor-pointer">
                  <div>
                    <p className="font-medium">전체 환불</p>
                    <p className="text-xs text-muted-foreground">
                      결제 금액 전액을 환불합니다
                    </p>
                  </div>
                </Label>
                <span className="text-sm font-medium text-red-600">
                  -₩{originalAmount.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg">
                <RadioGroupItem value="partial" id="partial" />
                <Label htmlFor="partial" className="flex-1 cursor-pointer">
                  <div>
                    <p className="font-medium">부분 환불</p>
                    <p className="text-xs text-muted-foreground">
                      일부 금액만 환불합니다
                    </p>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg">
                <RadioGroupItem value="cancel-and-reapprove" id="cancel-and-reapprove" />
                <Label htmlFor="cancel-and-reapprove" className="flex-1 cursor-pointer">
                  <div>
                    <p className="font-medium">전체 취소 후 일부 재승인</p>
                    <p className="text-xs text-muted-foreground">
                      전체 취소 후 일부 금액만 재승인 받습니다
                    </p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* 부분 환불 금액 입력 */}
          {refundType === "partial" && (
            <div className="space-y-2">
              <Label htmlFor="refundAmount">환불 금액</Label>
              <Input
                id="refundAmount"
                type="number"
                placeholder="환불할 금액을 입력하세요"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                max={originalAmount}
                min={1}
              />
              {partialRefundAmount > 0 && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">환불 금액</span>
                    <span className="font-medium text-red-600">
                      -₩{partialRefundAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-muted-foreground">남은 금액</span>
                    <span className="font-medium text-green-600">
                      ₩{remainingAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 전체 취소 후 재승인 금액 입력 */}
          {refundType === "cancel-and-reapprove" && (
            <div className="space-y-2">
              <Label htmlFor="reapproveAmount">재승인 금액</Label>
              <Input
                id="reapproveAmount"
                type="number"
                placeholder="재승인 받을 금액을 입력하세요"
                value={reapproveAmount}
                onChange={(e) => setReapproveAmount(e.target.value)}
                max={originalAmount}
                min={1}
              />
              {reapproveAmountNum > 0 && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">재승인 금액</span>
                    <span className="font-medium text-green-600">
                      +₩{reapproveAmountNum.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-muted-foreground">환불 금액</span>
                    <span className="font-medium text-red-600">
                      -₩{cancelAndReapproveRemaining.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 환불 사유 */}
          <div className="space-y-2">
            <Label htmlFor="reason">환불 사유 *</Label>
            <Input
              id="reason"
              placeholder="환불 사유를 입력하세요"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {/* 경고 메시지 */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {refundType === "full"
                ? "전체 환불 시 주문이 취소됩니다."
                : refundType === "partial"
                ? "부분 환불 후 남은 금액은 주문에 적용됩니다."
                : "전체 취소 후 재승인 금액만 결제됩니다. 나머지 금액은 환불됩니다."}
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            취소
          </Button>
          <Button onClick={handleRefund} disabled={loading} variant="destructive">
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                처리 중...
              </>
            ) : (
              <>
                <X className="mr-2 h-4 w-4" />
                환불 처리
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

