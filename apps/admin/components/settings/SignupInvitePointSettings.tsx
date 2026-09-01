"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignupInvitePointSettings() {
  const [inviteReward, setInviteReward] = useState(1000);
  const [inviteeReward, setInviteeReward] = useState(1000);
  const [inviteActive, setInviteActive] = useState(true);
  const [inviteSaving, setInviteSaving] = useState(false);
  const [signupReward, setSignupReward] = useState(1000);
  const [signupActive, setSignupActive] = useState(true);
  const [signupSaving, setSignupSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/invite/settings");
        const data = await res.json();
        setInviteReward(data.invite_reward_amount ?? 1000);
        setInviteeReward(data.invitee_reward_amount ?? 1000);
        setInviteActive(data.is_active ?? true);
        setSignupReward(data.signup_reward_amount ?? 1000);
        setSignupActive(data.signup_reward_active ?? true);
      } catch (error) {
        console.error("초대/가입 설정 조회 실패:", error);
      }
    };
    load();
  }, []);

  const saveInviteSettings = async () => {
    if (!Number.isInteger(inviteReward) || inviteReward < 0) {
      alert("초대자 적립 금액은 0 이상의 정수여야 합니다.");
      return;
    }
    if (!Number.isInteger(inviteeReward) || inviteeReward < 0) {
      alert("피초대자 적립 금액은 0 이상의 정수여야 합니다.");
      return;
    }
    setInviteSaving(true);
    try {
      const res = await fetch("/api/invite/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invite_reward_amount: inviteReward,
          invitee_reward_amount: inviteeReward,
          is_active: inviteActive,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "저장 실패");
      }
      alert("친구 초대 적립 설정이 저장되었습니다.");
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setInviteSaving(false);
    }
  };

  const saveSignupSettings = async () => {
    if (!Number.isInteger(signupReward) || signupReward < 0) {
      alert("적립 금액은 0 이상의 정수여야 합니다.");
      return;
    }
    setSignupSaving(true);
    try {
      const res = await fetch("/api/invite/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signup_reward_amount: signupReward,
          signup_reward_active: signupActive,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "저장 실패");
      }
      alert("회원가입 적립 설정이 저장되었습니다.");
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setSignupSaving(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>회원가입 적립</CardTitle>
          <CardDescription>
            신규 고객이 가입하면 자동으로 지급되는 포인트입니다 (웹·앱 공통)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm text-muted-foreground">적립 금액 (P)</label>
              <Input
                type="number"
                min={0}
                step={1}
                value={signupReward}
                onChange={(e) => setSignupReward(Number(e.target.value))}
                className="mt-1"
              />
            </div>
            <div className="flex items-end gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={signupActive}
                  onChange={(e) => setSignupActive(e.target.checked)}
                  className="accent-blue-600"
                />
                가입 적립 활성
              </label>
            </div>
          </div>
          <Button onClick={saveSignupSettings} disabled={signupSaving}>
            {signupSaving ? "저장 중..." : "가입 적립 저장"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>친구 초대 적립</CardTitle>
          <CardDescription>
            초대 코드로 가입·적용하면 초대자(친구)와 피초대자(코드 입력) 모두 포인트가 지급됩니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm text-muted-foreground">초대자 적립 (P)</label>
              <Input
                type="number"
                min={0}
                step={1}
                value={inviteReward}
                onChange={(e) => setInviteReward(Number(e.target.value))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">피초대자 적립 (P)</label>
              <Input
                type="number"
                min={0}
                step={1}
                value={inviteeReward}
                onChange={(e) => setInviteeReward(Number(e.target.value))}
                className="mt-1"
              />
            </div>
            <div className="flex items-end gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={inviteActive}
                  onChange={(e) => setInviteActive(e.target.checked)}
                  className="accent-blue-600"
                />
                초대 적립 활성
              </label>
            </div>
          </div>
          <Button onClick={saveInviteSettings} disabled={inviteSaving}>
            {inviteSaving ? "저장 중..." : "초대 적립 저장"}
          </Button>
        </CardContent>
      </Card>

      <InviteCouponMilestoneSettings />
    </>
  );
}

type Milestone = {
  id: string;
  threshold: number;
  min_paid_orders?: number;
  min_photo_reviews?: number;
  discount_type: "PERCENTAGE" | "FIXED";
  discount_value: number;
  valid_days: number;
  valid_until?: string | null;
  min_order_amount: number;
  description: string | null;
  is_active: boolean;
};

function formatMissionExpiry(row: Milestone) {
  return `발급 후 ${row.valid_days}일`;
}

function InviteCouponMilestoneSettings() {
  const [rows, setRows] = useState<Milestone[]>([]);
  const [threshold, setThreshold] = useState(10);
  const [minPaidOrders, setMinPaidOrders] = useState(1);
  const [minPhotoReviews, setMinPhotoReviews] = useState(1);
  const [discountType, setDiscountType] = useState<"FIXED" | "PERCENTAGE">("FIXED");
  const [discountValue, setDiscountValue] = useState(5000);
  const [validDays, setValidDays] = useState(30);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await fetch("/api/admin/invite/milestones");
      const json = await res.json();
      if (res.ok && json.success) setRows(json.data || []);
    } catch (error) {
      console.error("초대 쿠폰 조건 조회 실패:", error);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addRow = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/invite/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threshold,
          min_paid_orders: minPaidOrders,
          min_photo_reviews: minPhotoReviews,
          discount_type: discountType,
          discount_value: discountValue,
          valid_days: validDays,
          is_active: true,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "저장 실패");
      setThreshold(10);
      setMinPaidOrders(1);
      setMinPhotoReviews(1);
      setDiscountValue(5000);
      setValidDays(30);
      await load();
    } catch (error) {
      alert(error instanceof Error ? error.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (row: Milestone) => {
    const res = await fetch(`/api/admin/invite/milestones/${row.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...row, is_active: !row.is_active }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      alert(json.error || "상태 변경 실패");
      return;
    }
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm("이 조건을 삭제할까요?")) return;
    const res = await fetch(`/api/admin/invite/milestones/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok || !json.success) {
      alert(json.error || "삭제 실패");
      return;
    }
    await load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>조합 미션 → 전용 쿠폰</CardTitle>
        <CardDescription>
          여러 개를 동시에 둘 수 있습니다. 초대한 수·결제된 수선·포토리뷰를 AND로 묶고, 0이면 그 조건은 보지 않습니다. 예: 초대 10 · 수선 1 · 포토리뷰 1. 조건을 처음 모두 채운 날 1장을 주고, 그날부터 설정한 일수 동안만 쓸 수 있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="text-sm text-muted-foreground">초대 인원</label>
            <Input
              type="number"
              min={0}
              className="mt-1"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">수선(결제)</label>
            <Input
              type="number"
              min={0}
              className="mt-1"
              value={minPaidOrders}
              onChange={(e) => setMinPaidOrders(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">포토리뷰</label>
            <Input
              type="number"
              min={0}
              className="mt-1"
              value={minPhotoReviews}
              onChange={(e) => setMinPhotoReviews(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">유형</label>
            <select
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as "FIXED" | "PERCENTAGE")}
            >
              <option value="FIXED">정액</option>
              <option value="PERCENTAGE">퍼센트</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">할인 값</label>
            <Input
              type="number"
              min={1}
              className="mt-1"
              value={discountValue}
              onChange={(e) => setDiscountValue(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">발급 후 사용 일수</label>
            <Input
              type="number"
              min={1}
              className="mt-1"
              value={validDays}
              onChange={(e) => setValidDays(Number(e.target.value))}
            />
          </div>
          <div className="flex items-end md:col-span-2">
            <Button onClick={addRow} disabled={saving} className="w-full">
              {saving ? "추가 중..." : "미션 추가"}
            </Button>
          </div>
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">등록된 미션이 없습니다. 예: 초대 10 · 수선 1 · 포토리뷰 1 → 5,000원 · 발급 후 30일</p>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => (
              <div key={row.id} className="flex items-center justify-between border rounded-lg px-3 py-2">
                <div className="text-sm">
                  <span className="font-medium">
                    {[
                      (row.threshold || 0) > 0 ? `초대 ${row.threshold}명` : null,
                      (row.min_paid_orders || 0) > 0 ? `수선 ${row.min_paid_orders}회` : null,
                      (row.min_photo_reviews || 0) > 0 ? `포토리뷰 ${row.min_photo_reviews}회` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "조건 없음"}
                  </span>
                  {" → "}
                  {row.discount_type === "PERCENTAGE"
                    ? `${row.discount_value}%`
                    : `${row.discount_value.toLocaleString()}원`}
                  <span className="text-muted-foreground"> · {formatMissionExpiry(row)}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => toggle(row)}>
                    {row.is_active ? "활성" : "꺼짐"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(row.id)}>
                    삭제
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
