"use client";

import { useState, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

interface PointSetting {
  id: string;
  name: string;
  description: string;
  earning_rate: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  is_default: boolean;
  priority: number;
}

interface PointSettingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setting: PointSetting | null;
  onSuccess: () => void;
}

export default function PointSettingDialog({
  open,
  onOpenChange,
  setting,
  onSuccess,
}: PointSettingDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [earningRate, setEarningRate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [priority, setPriority] = useState("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (setting) {
      // 편집 모드
      setName(setting.name);
      setDescription(setting.description || "");
      setEarningRate(setting.earning_rate.toString());
      setStartDate(setting.start_date);
      setEndDate(setting.end_date || "");
      setIsActive(setting.is_active);
      setIsDefault(setting.is_default);
      setPriority(setting.priority.toString());
    } else {
      // 생성 모드
      resetForm();
    }
  }, [setting]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setEarningRate("5");
    setStartDate(new Date().toISOString().split("T")[0]);
    setEndDate("");
    setIsActive(true);
    setIsDefault(false);
    setPriority("0");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // 유효성 검사
    const rate = parseFloat(earningRate);
    if (!name.trim()) {
      setError("설정명을 입력해주세요.");
      return;
    }

    if (isNaN(rate) || rate < 0 || rate > 100) {
      setError("적립률은 0%에서 100% 사이여야 합니다.");
      return;
    }

    if (!startDate) {
      setError("시작일을 입력해주세요.");
      return;
    }

    if (endDate && endDate < startDate) {
      setError("종료일은 시작일 이후여야 합니다.");
      return;
    }

    setLoading(true);

    try {
      const url = setting
        ? `/api/points/settings/${setting.id}`
        : "/api/points/settings";

      const method = setting ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          earningRate: rate,
          startDate,
          endDate: endDate || null,
          isActive,
          isDefault,
          priority: parseInt(priority) || 0,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "포인트 설정 처리 중 오류가 발생했습니다.");
      }

      alert(data.message);
      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {setting ? "포인트 설정 수정" : "포인트 설정 추가"}
          </DialogTitle>
          <DialogDescription>
            {setting
              ? "포인트 적립률 설정을 수정합니다"
              : "새로운 포인트 적립률 설정을 추가합니다"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* 설정명 */}
            <div className="space-y-2">
              <Label htmlFor="name">
                설정명 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="예: 봄 시즌 특별 적립"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* 설명 */}
            <div className="space-y-2">
              <Label htmlFor="description">설명</Label>
              <Textarea
                id="description"
                placeholder="포인트 설정에 대한 설명을 입력해주세요"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            {/* 적립률 */}
            <div className="space-y-2">
              <Label htmlFor="earningRate">
                적립률 (%) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="earningRate"
                type="number"
                placeholder="5"
                value={earningRate}
                onChange={(e) => setEarningRate(e.target.value)}
                min="0"
                max="100"
                step="0.01"
                required
              />
              <p className="text-xs text-muted-foreground">
                결제 금액의 {earningRate || "0"}%가 포인트로 적립됩니다
              </p>
            </div>

            {/* 기간 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">
                  시작일 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">종료일</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  비워두면 무기한으로 설정됩니다
                </p>
              </div>
            </div>

            {/* 우선순위 */}
            <div className="space-y-2">
              <Label htmlFor="priority">우선순위</Label>
              <Input
                id="priority"
                type="number"
                placeholder="0"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                min="0"
              />
              <p className="text-xs text-muted-foreground">
                같은 날짜에 여러 설정이 활성화된 경우 높은 숫자가 우선 적용됩니다
              </p>
            </div>

            {/* 스위치 */}
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="isActive">활성화</Label>
                  <p className="text-xs text-muted-foreground">
                    비활성화 시 적용되지 않습니다
                  </p>
                </div>
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="isDefault">기본 설정</Label>
                  <p className="text-xs text-muted-foreground">
                    기본 설정으로 지정 (하나만 가능)
                  </p>
                </div>
                <Switch
                  id="isDefault"
                  checked={isDefault}
                  onCheckedChange={setIsDefault}
                />
              </div>
            </div>

            {/* 오류 메시지 */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* 미리보기 */}
            {earningRate && !isNaN(parseFloat(earningRate)) && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <p className="text-sm font-semibold mb-2">미리보기</p>
                <p className="text-xs text-muted-foreground">
                  10,000원 결제 시 →{" "}
                  <span className="font-bold text-blue-600">
                    {Math.floor(10000 * parseFloat(earningRate) / 100).toLocaleString()}P
                  </span>{" "}
                  적립
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  50,000원 결제 시 →{" "}
                  <span className="font-bold text-blue-600">
                    {Math.floor(50000 * parseFloat(earningRate) / 100).toLocaleString()}P
                  </span>{" "}
                  적립
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
              {setting ? "수정" : "추가"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

