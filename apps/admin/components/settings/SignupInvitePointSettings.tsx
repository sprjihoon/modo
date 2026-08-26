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
    </>
  );
}
