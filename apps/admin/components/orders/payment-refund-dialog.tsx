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
import { AlertCircle, X, RefreshCw, CreditCard, Receipt, ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface TossPaymentInfo {
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
}

interface PaymentRefundDialogProps {
  orderId: string;
  paymentId: string;  // payment_key
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
  
  // 토스페이먼츠 결제 정보
  const [tossPayment, setTossPayment] = useState<TossPaymentInfo | null>(null);
  const [loadingToss, setLoadingToss] = useState(false);

  // 다이얼로그 열릴 때 토스페이먼츠 정보 조회
  useEffect(() => {
    if (open && paymentId) {
      loadTossPaymentInfo();
    }
  }, [open, paymentId]);

  const loadTossPaymentInfo = async () => {
    if (!paymentId) return;
    
    setLoadingToss(true);
    try {
      const response = await fetch(`/api/pay/inquiry?paymentKey=${paymentId}`);
      const result = await response.json();
      
      if (result.success && result.payment) {
        setTossPayment({
          paymentKey: result.payment.paymentKey,
          status: result.payment.status,
          totalAmount: result.payment.totalAmount,
          balanceAmount: result.payment.balanceAmount,
          method: result.payment.method,
          approvedAt: result.payment.approvedAt,
          card: result.payment.card,
          easyPay: result.payment.easyPay,
          cancels: result.payment.cancels || [],
          receipt: result.payment.receipt,
        });
      }
    } catch (error) {
      console.error("토스페이먼츠 정보 조회 실패:", error);
    } finally {
      setLoadingToss(false);
    }
  };

  const handleRefund = async () => {
    if (!paymentId) {
      alert("결제 키가 없어 취소할 수 없습니다. 결제 키를 확인해주세요.");
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

    // 잔여 금액 확인
    const maxRefundAmount = tossPayment?.balanceAmount || originalAmount;
    const requestedAmount = refundType === "full" ? maxRefundAmount : parseInt(refundAmount);

    if (requestedAmount > maxRefundAmount) {
      alert(`취소 가능 금액(₩${maxRefundAmount.toLocaleString()})을 초과했습니다.`);
      return;
    }

    setLoading(true);

    try {
      const body: any = {
        paymentKey: paymentId,
        cancelReason: reason,
      };

      // 부분 취소인 경우 금액 추가
      if (refundType === "partial") {
        body.cancelAmount = parseInt(refundAmount);
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
        const message = refundType === "full"
          ? `전체 취소가 완료되었습니다.\n취소금액: ₩${result.canceledAmount?.toLocaleString() || maxRefundAmount.toLocaleString()}`
          : `부분 취소가 완료되었습니다.\n취소금액: ₩${parseInt(refundAmount).toLocaleString()}\n남은금액: ₩${result.balanceAmount?.toLocaleString() || (maxRefundAmount - parseInt(refundAmount)).toLocaleString()}`;
        
        alert(message);
        setOpen(false);
        onRefunded?.();
      } else {
        // 토스페이먼츠 에러 메시지 표시
        const errorMessage = result.message || result.error || "결제 취소에 실패했습니다.";
        alert(`결제 취소 실패\n\n${errorMessage}`);
      }
    } catch (error: any) {
      console.error("결제 취소 오류:", error);
      alert(`결제 취소 중 오류가 발생했습니다.\n\n${error.message || "알 수 없는 오류"}`);
    } finally {
      setLoading(false);
    }
  };

  // 취소 가능 금액 계산
  const maxRefundableAmount = tossPayment?.balanceAmount || originalAmount;
  const partialRefundAmount = refundAmount ? parseInt(refundAmount) : 0;
  const remainingAmount = maxRefundableAmount - partialRefundAmount;
  const alreadyCanceled = originalAmount - maxRefundableAmount;

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
          <DialogDescription>
            토스페이먼츠 결제를 취소하거나 부분 환불합니다
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 결제 키 확인 */}
          {!paymentId && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                결제 키(payment_key)가 없습니다. 토스페이먼츠를 통해 결제된 주문만 취소할 수 있습니다.
              </AlertDescription>
            </Alert>
          )}

          {/* 로딩 */}
          {loadingToss && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}

          {/* 토스페이먼츠 결제 정보 */}
          {!loadingToss && tossPayment && (
            <>
              {/* 결제 정보 카드 */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">원 결제 금액</span>
                  <span className="text-lg font-bold">₩{originalAmount.toLocaleString()}</span>
                </div>
                {alreadyCanceled > 0 && (
                  <div className="flex justify-between items-center text-red-600">
                    <span className="text-sm">이미 취소된 금액</span>
                    <span className="font-medium">-₩{alreadyCanceled.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="text-sm text-muted-foreground">취소 가능 금액</span>
                  <span className="text-xl font-bold text-blue-600">₩{maxRefundableAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">결제 방법</span>
                  <span className="text-sm font-medium">{tossPayment.method}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">결제 상태</span>
                  <Badge variant={tossPayment.status === "DONE" ? "default" : "secondary"}>
                    {tossPayment.status}
                  </Badge>
                </div>

                {/* 카드 정보 */}
                {tossPayment.card && (
                  <div className="border-t pt-3 mt-3 space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">카드:</span>
                      <span>{tossPayment.card.company} {tossPayment.card.number}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground ml-6">승인번호:</span>
                      <span className="font-mono">{tossPayment.card.approveNo}</span>
                    </div>
                  </div>
                )}

                {/* 간편결제 정보 */}
                {tossPayment.easyPay && (
                  <div className="border-t pt-3 mt-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">간편결제:</span>
                      <span>{tossPayment.easyPay.provider}</span>
                    </div>
                  </div>
                )}

                {/* 영수증 링크 */}
                {tossPayment.receipt && (
                  <div className="border-t pt-3 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(tossPayment.receipt!.url, "_blank")}
                    >
                      <Receipt className="h-4 w-4 mr-2" />
                      영수증 보기
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </Button>
                  </div>
                )}
              </div>

              {/* 이전 취소 내역 */}
              {tossPayment.cancels.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-red-600">이전 취소 내역</h4>
                  {tossPayment.cancels.map((cancel, idx) => (
                    <div key={idx} className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
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

              {/* 취소 불가 상태 */}
              {maxRefundableAmount <= 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    이미 전액 취소된 결제입니다. 추가 취소가 불가능합니다.
                  </AlertDescription>
                </Alert>
              )}

              {/* 취소 유형 선택 */}
              {maxRefundableAmount > 0 && (
                <>
                  <div className="space-y-3">
                    <Label>취소 유형</Label>
                    <RadioGroup value={refundType} onValueChange={(v) => setRefundType(v as any)}>
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

                  {/* 부분 취소 금액 입력 */}
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

                  {/* 취소 사유 */}
                  <div className="space-y-2">
                    <Label htmlFor="reason">취소 사유 *</Label>
                    <Input
                      id="reason"
                      placeholder="취소 사유를 입력하세요 (고객에게 노출됨)"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </div>

                  {/* 경고 메시지 */}
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

          {/* 토스 정보 없을 때 기본 폼 */}
          {!loadingToss && !tossPayment && paymentId && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                토스페이먼츠에서 결제 정보를 조회할 수 없습니다.
                결제 키가 올바른지 확인해주세요.
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
