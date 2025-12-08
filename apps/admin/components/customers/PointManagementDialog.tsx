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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

interface PointManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
  currentBalance: number;
  onSuccess: () => void;
}

export default function PointManagementDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
  currentBalance,
  onSuccess,
}: PointManagementDialogProps) {
  const [type, setType] = useState<"ADMIN_ADD" | "ADMIN_SUB">("ADMIN_ADD");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // 사용자 ID 확인
    if (!customerId) {
      setError("사용자 ID가 없습니다. 주문에 사용자 정보가 누락되었을 수 있습니다.");
      return;
    }

    // 유효성 검사
    const pointAmount = parseInt(amount);
    if (!amount || isNaN(pointAmount) || pointAmount <= 0) {
      setError("올바른 포인트 금액을 입력해주세요.");
      return;
    }

    if (!description.trim()) {
      setError("사유를 입력해주세요.");
      return;
    }

    if (type === "ADMIN_SUB" && pointAmount > currentBalance) {
      setError(`포인트 잔액이 부족합니다. (현재 잔액: ${currentBalance.toLocaleString()}P)`);
      return;
    }

    setLoading(true);

    try {
      console.log('💰 [Points] API 요청:', {
        customerId,
        amount: pointAmount,
        type,
        description: description.trim(),
      });

      const response = await fetch(`/api/customers/${customerId}/points`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: pointAmount,
          type,
          description: description.trim(),
        }),
      });

      const data = await response.json();
      console.log('💰 [Points] API 응답:', data);

      if (!response.ok) {
        const errorMsg = data.error || "포인트 처리 중 오류가 발생했습니다.";
        const detailMsg = data.details ? `\n\n상세정보: ${data.details}` : '';
        const dbErrorMsg = data.dbError ? `\nDB 오류: ${data.dbError}` : '';
        throw new Error(errorMsg + detailMsg + dbErrorMsg);
      }

      // 성공
      alert(data.message);
      setAmount("");
      setDescription("");
      setType("ADMIN_ADD");
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      console.error('❌ [Points] 에러:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setAmount("");
      setDescription("");
      setType("ADMIN_ADD");
      setError("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>포인트 지급/차감</DialogTitle>
          <DialogDescription>
            {customerName}님의 포인트를 관리합니다
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* 현재 잔액 */}
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">현재 포인트 잔액</p>
              <p className="text-2xl font-bold">{currentBalance.toLocaleString()}P</p>
            </div>

            {/* 유형 선택 */}
            <div className="space-y-2">
              <Label htmlFor="type">유형</Label>
              <Select value={type} onValueChange={(value: any) => setType(value)}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN_ADD">포인트 지급</SelectItem>
                  <SelectItem value="ADMIN_SUB">포인트 차감</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 금액 입력 */}
            <div className="space-y-2">
              <Label htmlFor="amount">
                포인트 {type === "ADMIN_ADD" ? "지급" : "차감"} 금액
              </Label>
              <Input
                id="amount"
                type="number"
                placeholder="1000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
                required
              />
            </div>

            {/* 사유 입력 */}
            <div className="space-y-2">
              <Label htmlFor="description">사유</Label>
              <Textarea
                id="description"
                placeholder="포인트 지급/차감 사유를 입력해주세요"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                required
              />
            </div>

            {/* 오류 메시지 */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* 예상 결과 */}
            {amount && !isNaN(parseInt(amount)) && parseInt(amount) > 0 && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <p className="text-sm text-muted-foreground">예상 잔액</p>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {type === "ADMIN_ADD"
                    ? (currentBalance + parseInt(amount)).toLocaleString()
                    : (currentBalance - parseInt(amount)).toLocaleString()}
                  P
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {type === "ADMIN_ADD" ? "포인트 지급" : "포인트 차감"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

