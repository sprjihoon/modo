"use client";

import { useCallback, useEffect, useState } from "react";
import { Gift, Copy, Share2, Users, Coins } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function InviteClient() {
  const [inviteCode, setInviteCode] = useState("");
  const [inviteCount, setInviteCount] = useState(0);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const loadInviteInfo = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("users")
        .select("id, invite_code, invite_count, invite_points_earned")
        .eq("auth_id", user.id)
        .maybeSingle();

      if (data) {
        setInviteCode(data.invite_code ?? generateCode(user.id));
        setInviteCount(data.invite_count ?? 0);
        setEarnedPoints(data.invite_points_earned ?? 0);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInviteInfo();
  }, [loadInviteInfo]);

  function generateCode(uid: string) {
    return "MODO" + uid.slice(0, 6).toUpperCase();
  }

  async function copyCode() {
    if (!inviteCode) return;
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareInvite() {
    const text = `모두의수선 초대 코드: ${inviteCode}\n친구와 함께 수선 혜택을 받아보세요!\nhttps://modo.mom`;
    if (navigator.share) {
      await navigator.share({ title: "모두의수선 초대", text });
    } else {
      await navigator.clipboard.writeText(text);
      alert("초대 메시지가 복사되었습니다");
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* 혜택 배너 */}
      <div className="m-4 p-6 rounded-2xl bg-gradient-to-br from-[#00C896] to-[#00A07B] text-white text-center">
        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Gift className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold leading-tight mb-2">
          친구 초대하고<br />함께 혜택 받기
        </h2>
        <p className="text-sm text-white/80">친구가 가입하면 5,000원 적립금 지급!</p>
      </div>

      {/* 초대 코드 */}
      <div className="mx-4 bg-white rounded-2xl border border-gray-100 p-5">
        <p className="text-xs text-gray-500 text-center mb-3">내 초대 코드</p>

        {isLoading ? (
          <div className="h-14 bg-gray-100 rounded-xl animate-pulse" />
        ) : (
          <div className="flex items-center justify-center gap-3 bg-gray-50 border-2 border-[#00C896] rounded-xl px-5 py-4">
            <span className="text-2xl font-bold tracking-widest text-gray-900 font-mono">
              {inviteCode || "---"}
            </span>
            <button onClick={copyCode} className="text-[#00C896] active:opacity-60">
              <Copy className="w-5 h-5" />
            </button>
          </div>
        )}

        {copied && (
          <p className="text-center text-xs text-[#00C896] mt-2">초대 코드가 복사되었습니다!</p>
        )}

        <button
          onClick={shareInvite}
          className="w-full mt-4 flex items-center justify-center gap-2 py-3.5 bg-[#00C896] text-white text-sm font-bold rounded-xl active:brightness-95"
        >
          <Share2 className="w-4 h-4" />
          친구에게 공유하기
        </button>
      </div>

      {/* 초대 현황 */}
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
            value={`₩${earnedPoints.toLocaleString("ko-KR")}`}
          />
        </div>
      </div>

      {/* 안내 */}
      <div className="mx-4 mt-4 mb-6 p-4 bg-gray-100 rounded-xl">
        <p className="text-xs font-bold text-gray-500 mb-2">이용 안내</p>
        <ul className="space-y-1 text-xs text-gray-400">
          <li>• 친구가 초대 코드로 가입 후 첫 주문 완료 시 적립금이 지급됩니다</li>
          <li>• 적립금은 주문 금액에서 사용할 수 있습니다</li>
          <li>• 부정 이용 시 적립금이 회수될 수 있습니다</li>
        </ul>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-[#00C896]/5 rounded-xl p-4 text-center">
      <div className="flex justify-center mb-2">{icon}</div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-lg font-bold text-gray-900">{value}</p>
    </div>
  );
}
