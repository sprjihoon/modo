"use client";

import { useCallback, useEffect, useState } from "react";
import { Gift, Copy, Share2, Users, Coins, Ticket } from "lucide-react";
import { getSiteUrl } from "@/lib/utils";
import { normalizeInviteCode } from "@/lib/invite";

export function InviteClient() {
  const [inviteCode, setInviteCode] = useState("");
  const [inviteCount, setInviteCount] = useState(0);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [rewardAmount, setRewardAmount] = useState(1000);
  const [inviteeRewardAmount, setInviteeRewardAmount] = useState(1000);
  const [canApplyInvite, setCanApplyInvite] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const [enterCode, setEnterCode] = useState("");
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyMsg, setApplyMsg] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);

  const loadInviteInfo = useCallback(async () => {
    try {
      const res = await fetch("/api/invite/me");
      if (!res.ok) return;
      const data = await res.json();
      setInviteCode(data.invite_code || "");
      setInviteCount(data.invite_count ?? 0);
      setEarnedPoints(data.invite_points_earned ?? 0);
      setRewardAmount(data.reward_amount ?? 1000);
      setInviteeRewardAmount(data.invitee_reward_amount ?? 1000);
      setCanApplyInvite(!!data.can_apply_invite);
    } catch {
      /* ignore */
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInviteInfo();
  }, [loadInviteInfo]);

  async function copyCode() {
    if (!inviteCode) return;
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareInvite() {
    const link = `${getSiteUrl()}/signup?invite=${encodeURIComponent(inviteCode)}`;
    const text = `모두의수선 초대 코드: ${inviteCode}\n가입하면 서로 포인트 적립! (초대자 ${rewardAmount.toLocaleString("ko-KR")}P / 가입자 ${inviteeRewardAmount.toLocaleString("ko-KR")}P)\n${link}`;
    if (navigator.share) {
      await navigator.share({ title: "모두의수선 초대", text });
    } else {
      await navigator.clipboard.writeText(text);
      alert("초대 메시지가 복사되었습니다");
    }
  }

  async function handleApplyCode() {
    const code = normalizeInviteCode(enterCode);
    if (!code) {
      setApplyError("초대 코드를 입력해주세요.");
      return;
    }
    setApplyLoading(true);
    setApplyError(null);
    setApplyMsg(null);
    try {
      const res = await fetch("/api/invite/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.ok) {
        const got = Number(data?.invitee_amount ?? inviteeRewardAmount);
        setApplyMsg(
          got > 0
            ? `초대 코드가 적용되었습니다. ${got.toLocaleString("ko-KR")}P가 적립됐어요.`
            : "초대 코드가 적용되었습니다."
        );
        setEnterCode("");
        setCanApplyInvite(false);
        await loadInviteInfo();
        return;
      }
      const reason = data?.reason as string | undefined;
      if (reason === "invalid_code") setApplyError("유효하지 않은 초대 코드입니다.");
      else if (reason === "self_invite") setApplyError("본인 초대 코드는 사용할 수 없습니다.");
      else if (reason === "already_applied") {
        setApplyError("이미 초대 코드가 적용된 계정입니다.");
        setCanApplyInvite(false);
      } else setApplyError("초대 코드 적용에 실패했습니다.");
    } catch {
      setApplyError("네트워크 오류가 발생했습니다.");
    } finally {
      setApplyLoading(false);
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="m-4 p-6 rounded-2xl bg-gradient-to-br from-[#00C896] to-[#00A07B] text-white text-center">
        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Gift className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold leading-tight mb-2">
          친구 초대하고
          <br />
          함께 혜택 받기
        </h2>
        <p className="text-sm text-white/80">
          친구가 가입하면 서로 적립! (나 {rewardAmount.toLocaleString("ko-KR")}P · 친구{" "}
          {inviteeRewardAmount.toLocaleString("ko-KR")}P)
        </p>
      </div>

      {/* 가입 후 초대 코드 입력 */}
      {canApplyInvite && (
        <div className="mx-4 mb-4 bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-sm font-bold text-gray-800 mb-1">
            초대 코드 입력
          </p>
          <p className="text-xs text-gray-400 mb-3">
            코드를 입력하면 {inviteeRewardAmount.toLocaleString("ko-KR")}P가 적립됩니다
            (가입 때 넣지 않았다면 여기서 등록)
          </p>
          <div className="relative">
            <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="초대 코드"
              value={enterCode}
              onChange={(e) => {
                setEnterCode(e.target.value.toUpperCase());
                setApplyError(null);
                setApplyMsg(null);
              }}
              className="w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-xl text-sm font-mono tracking-wide outline-none focus:border-[#00C896]"
              autoComplete="off"
            />
          </div>
          {applyError && (
            <p className="mt-2 text-xs text-red-500">{applyError}</p>
          )}
          {applyMsg && (
            <p className="mt-2 text-xs text-[#00C896]">{applyMsg}</p>
          )}
          <button
            type="button"
            onClick={handleApplyCode}
            disabled={applyLoading || !enterCode.trim()}
            className="w-full mt-3 py-3 rounded-xl bg-[#00C896] text-white text-sm font-bold disabled:opacity-40"
          >
            {applyLoading ? "적용 중..." : "코드 적용하기"}
          </button>
        </div>
      )}

      <div className="mx-4 bg-white rounded-2xl border border-gray-100 p-5">
        <p className="text-xs text-gray-500 text-center mb-3">내 초대 코드</p>

        {isLoading ? (
          <div className="h-14 bg-gray-100 rounded-xl animate-pulse" />
        ) : (
          <div className="flex items-center justify-center gap-3 bg-gray-50 border-2 border-[#00C896] rounded-xl px-5 py-4">
            <span className="text-2xl font-bold tracking-widest text-gray-900 font-mono">
              {inviteCode || "---"}
            </span>
            <button
              type="button"
              onClick={copyCode}
              className="text-[#00C896] active:opacity-60"
            >
              <Copy className="w-5 h-5" />
            </button>
          </div>
        )}

        {copied && (
          <p className="text-center text-xs text-[#00C896] mt-2">
            초대 코드가 복사되었습니다!
          </p>
        )}

        <button
          type="button"
          onClick={shareInvite}
          disabled={!inviteCode}
          className="w-full mt-4 flex items-center justify-center gap-2 py-3.5 bg-[#00C896] text-white text-sm font-bold rounded-xl active:brightness-95 disabled:opacity-40"
        >
          <Share2 className="w-4 h-4" />
          친구에게 공유하기
        </button>
      </div>

      <div className="mx-4 mt-4 bg-white rounded-2xl border border-gray-100 p-5">
        <p className="text-sm font-bold text-gray-700 mb-4">초대 현황</p>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<Users className="w-6 h-6 text-[#00C896]" />}
            label="초대한 친구"
            value={`${inviteCount}명`}
          />
          <StatCard
            icon={<Coins className="w-6 h-6 text-[#00C896]" />}
            label="받은 적립금"
            value={`${earnedPoints.toLocaleString("ko-KR")}P`}
          />
        </div>
      </div>

      <div className="mx-4 mt-4 mb-6 p-4 bg-gray-100 rounded-xl">
        <p className="text-xs font-bold text-gray-500 mb-2">이용 안내</p>
        <ul className="space-y-1 text-xs text-gray-400">
          <li>
            • 친구가 내 초대 코드로 가입하면{" "}
            {rewardAmount.toLocaleString("ko-KR")}P가 적립됩니다
          </li>
          <li>• 가입 시 또는 마이페이지 → 친구 초대에서 코드를 입력할 수 있습니다</li>
          <li>• 적립금은 마이페이지 포인트에서 확인할 수 있습니다</li>
          <li>• 부정 이용 시 적립금이 회수될 수 있습니다</li>
        </ul>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-[#00C896]/5 rounded-xl p-4 text-center">
      <div className="flex justify-center mb-2">{icon}</div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-lg font-bold text-gray-900">{value}</p>
    </div>
  );
}
