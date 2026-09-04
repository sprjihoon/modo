"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { defaultCouponValidUntilDate } from "@/lib/exclusive-coupon";

interface CouponIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
  onSuccess: (code: string) => void;
}

export default function CouponIssueDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
  onSuccess,
}: CouponIssueDialogProps) {
  const [discountType, setDiscountType] = useState<"FIXED" | "PERCENTAGE">("FIXED");
  const [discountValue, setDiscountValue] = useState("5000");
  const [validDays, setValidDays] = useState("30");
  const [validUntil, setValidUntil] = useState(defaultCouponValidUntilDate());
  const [minOrderAmount, setMinOrderAmount] = useState("0");
  const [issuedNote, setIssuedNote] = useState("");
  const [includesFreeShipping, setIncludesFreeShipping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setDiscountType("FIXED");
    setDiscountValue("5000");
    setValidDays("30");
    setValidUntil(defaultCouponValidUntilDate());
    setMinOrderAmount("0");
    setIssuedNote("");
    setIncludesFreeShipping(false);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/customers/${customerId}/coupons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discount_type: discountType,
          discount_value: Number(discountValue),
          valid_days: Number(validDays),
          valid_until: validUntil || null,
          min_order_amount: Number(minOrderAmount),
          issued_note: issuedNote.trim() || null,
          includes_free_shipping: includesFreeShipping,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "쿠폰 발급에 실패했습니다.");
      }
      const code = data.data?.code as string;
      alert(`${customerName}님에게 전용 쿠폰 ${code} 를 발급했습니다.`);
      reset();
      onOpenChange(false);
      onSuccess(code);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "쿠폰 발급에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!loading) {
          if (!next) reset();
          onOpenChange(next);
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>전용 쿠폰 발급</DialogTitle>
          <DialogDescription>
            {customerName}님만 사용할 수 있는 코드를 만듭니다. 수거신청 화면에서 입력하면 됩니다.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>할인 유형</Label>
              <select
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as "FIXED" | "PERCENTAGE")}
              >
                <option value="FIXED">정액 (원)</option>
                <option value="PERCENTAGE">퍼센트 (%)</option>
              </select>
            </div>
            <div>
              <Label>할인 값</Label>
              <Input
                className="mt-1"
                type="number"
                min={1}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
              />
            </div>
          </div>
          <label className="flex items-start gap-3 rounded-md border border-teal-200 bg-teal-50 p-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1"
              checked={includesFreeShipping}
              onChange={(e) => setIncludesFreeShipping(e.target.checked)}
            />
            <div>
              <div className="text-sm font-medium text-teal-900">왕복 배송비 무료 포함</div>
              <p className="text-xs text-teal-800/80 mt-0.5">
                수선 할인과 별도로 왕복 기본 배송비를 0원으로 합니다. 도서산간 추가비는 그대로입니다.
              </p>
            </div>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>사용기한</Label>
              <Input
                className="mt-1"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
            <div>
              <Label>또는 발급 후 일수</Label>
              <Input
                className="mt-1"
                type="number"
                min={0}
                value={validDays}
                onChange={(e) => setValidDays(e.target.value)}
              />
            </div>
            <div>
              <Label>최소 주문 금액</Label>
              <Input
                className="mt-1"
                type="number"
                min={0}
                value={minOrderAmount}
                onChange={(e) => setMinOrderAmount(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>CS 사유</Label>
            <Textarea
              className="mt-1"
              value={issuedNote}
              onChange={(e) => setIssuedNote(e.target.value)}
              placeholder="예: 배송 지연 보상"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={loading} onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              발급
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
