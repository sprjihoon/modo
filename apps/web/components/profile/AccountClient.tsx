"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Phone, Mail, Lock, Save, Edit2, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface UserProfile {
  name: string;
  phone: string;
  email: string;
}

export function AccountClient() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile>({ name: "", phone: "", email: "" });
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // 비밀번호 변경
  const [showPwSection, setShowPwSection] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [isSavingPw, setIsSavingPw] = useState(false);
  const [pwError, setPwError] = useState("");

  const loadProfile = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data } = await supabase
        .from("users")
        .select("id, name, phone, email")
        .eq("auth_id", user.id)
        .maybeSingle();

      if (data) {
        setUserId(data.id);
        setProfile({
          name: data.name ?? "",
          phone: data.phone ?? "",
          email: data.email ?? user.email ?? "",
        });
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function handleSave() {
    const name = profile.name.trim();
    const phone = profile.phone.trim();

    if (!name) { alert("이름을 입력해주세요"); return; }
    if (!phone) { alert("전화번호를 입력해주세요"); return; }
    if (!/^01[0-9]{8,9}$/.test(phone.replace(/-/g, ""))) {
      alert("올바른 전화번호 형식이 아닙니다"); return;
    }

    setIsSaving(true);
    try {
      const supabase = createClient();
      await supabase
        .from("users")
        .update({ name, phone })
        .eq("id", userId);
      setIsEditing(false);
      alert("회원정보가 수정되었습니다");
    } catch {
      alert("수정에 실패했습니다. 다시 시도해주세요");
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePasswordChange() {
    setPwError("");
    if (!currentPw || !newPw || !confirmPw) { setPwError("모든 항목을 입력해주세요"); return; }
    if (newPw.length < 6) { setPwError("새 비밀번호는 6자 이상이어야 합니다"); return; }
    if (newPw !== confirmPw) { setPwError("새 비밀번호가 일치하지 않습니다"); return; }

    setIsSavingPw(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) { setPwError(error.message); return; }
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      setShowPwSection(false);
      alert("비밀번호가 변경되었습니다");
    } catch {
      setPwError("비밀번호 변경에 실패했습니다");
    } finally {
      setIsSavingPw(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <div className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen p-4 space-y-4">
      {/* 아바타 */}
      <div className="flex justify-center py-4">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#00C896] to-[#00A07B] flex items-center justify-center">
          <User className="w-10 h-10 text-white" />
        </div>
      </div>

      {/* 회원정보 폼 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-gray-700">기본 정보</p>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 text-xs text-[#00C896] font-medium"
            >
              <Edit2 className="w-3.5 h-3.5" />
              수정
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1 text-xs text-white bg-[#00C896] px-3 py-1.5 rounded-lg font-medium disabled:opacity-60"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? "저장 중..." : "저장"}
            </button>
          )}
        </div>

        <div className="space-y-4">
          <FieldInput
            label="이름"
            icon={<User className="w-4 h-4" />}
            value={profile.name}
            onChange={(v) => setProfile((p) => ({ ...p, name: v }))}
            enabled={isEditing}
            placeholder="이름을 입력하세요"
          />
          <FieldInput
            label="전화번호"
            icon={<Phone className="w-4 h-4" />}
            value={profile.phone}
            onChange={(v) => setProfile((p) => ({ ...p, phone: v }))}
            enabled={isEditing}
            placeholder="전화번호를 입력하세요"
            type="tel"
          />
          <FieldInput
            label="이메일"
            icon={<Mail className="w-4 h-4" />}
            value={profile.email}
            onChange={() => {}}
            enabled={false}
            placeholder=""
            hint="이메일은 변경할 수 없습니다"
          />
        </div>
      </div>

      {/* 비밀번호 변경 */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <button
          onClick={() => { setShowPwSection((v) => !v); setPwError(""); }}
          className="w-full flex items-center gap-3 px-5 py-4 active:bg-gray-50"
        >
          <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
            <Lock className="w-4 h-4 text-orange-400" />
          </div>
          <p className="flex-1 text-left text-sm font-medium text-gray-800">비밀번호 변경</p>
          <span className="text-xs text-gray-400">{showPwSection ? "닫기" : "변경하기"}</span>
        </button>

        {showPwSection && (
          <div className="px-5 pb-5 border-t border-gray-50 pt-4 space-y-3">
            <PasswordInput
              label="현재 비밀번호"
              value={currentPw}
              onChange={setCurrentPw}
              show={showCurrentPw}
              onToggle={() => setShowCurrentPw((v) => !v)}
            />
            <PasswordInput
              label="새 비밀번호 (6자 이상)"
              value={newPw}
              onChange={setNewPw}
              show={showNewPw}
              onToggle={() => setShowNewPw((v) => !v)}
            />
            <PasswordInput
              label="새 비밀번호 확인"
              value={confirmPw}
              onChange={setConfirmPw}
              show={showNewPw}
              onToggle={() => setShowNewPw((v) => !v)}
            />
            {pwError && <p className="text-xs text-red-500">{pwError}</p>}
            <button
              onClick={handlePasswordChange}
              disabled={isSavingPw}
              className="w-full py-3 bg-[#00C896] text-white text-sm font-bold rounded-xl disabled:opacity-60"
            >
              {isSavingPw ? "변경 중..." : "비밀번호 변경"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FieldInput({
  label, icon, value, onChange, enabled, placeholder, type = "text", hint,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  enabled: boolean;
  placeholder: string;
  type?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 mb-1.5 block">{label}</label>
      <div className={`flex items-center gap-2 px-3 py-3 rounded-xl border ${
        enabled ? "border-gray-300 bg-gray-50" : "border-gray-100 bg-gray-50"
      }`}>
        <span className={enabled ? "text-[#00C896]" : "text-gray-300"}>{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={!enabled}
          placeholder={placeholder}
          className="flex-1 text-sm text-gray-800 bg-transparent outline-none disabled:text-gray-500"
        />
      </div>
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function PasswordInput({
  label, value, onChange, show, onToggle,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 mb-1.5 block">{label}</label>
      <div className="flex items-center gap-2 px-3 py-3 rounded-xl border border-gray-300 bg-gray-50">
        <Lock className="w-4 h-4 text-gray-300" />
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 text-sm text-gray-800 bg-transparent outline-none"
        />
        <button type="button" onClick={onToggle} className="text-gray-400">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
