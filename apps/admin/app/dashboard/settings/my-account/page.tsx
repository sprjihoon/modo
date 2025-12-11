"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Phone, Shield, Key, Save, Loader2 } from "lucide-react";

type StaffProfile = {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: string;
  created_at: string;
};

// 역할 정보
const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "최고관리자",
  ADMIN: "관리자",
  MANAGER: "입출고관리자",
  WORKER: "작업자",
};

export default function MyAccountPage() {
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 프로필 폼
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // 비밀번호 폼
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // 프로필 로드
  const loadProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/my-account");
      const result = await response.json();

      console.log("프로필 조회 응답:", result);

      if (result.success && result.data) {
        setProfile(result.data);
        setName(result.data.name || "");
        setPhone(result.data.phone || "");
        setError(null);
      } else {
        const errorMsg = result.error || "프로필을 불러올 수 없습니다.";
        console.error("프로필 로드 실패:", errorMsg);
        setError(errorMsg);
        setProfile(null);
      }
    } catch (error: any) {
      const errorMsg = error.message || "프로필을 불러오는 중 오류가 발생했습니다.";
      console.error("프로필 로드 실패:", error);
      setError(errorMsg);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  // 프로필 저장
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert("이름을 입력해주세요.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/my-account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });

      const result = await response.json();

      if (result.success) {
        alert("✅ 프로필이 저장되었습니다.");
        loadProfile();
      } else {
        alert(`❌ 오류: ${result.error || "프로필 저장에 실패했습니다."}`);
      }
    } catch (error) {
      console.error("프로필 저장 실패:", error);
      alert("❌ 프로필 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  // 비밀번호 변경
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      alert("새 비밀번호를 입력해주세요.");
      return;
    }

    if (newPassword.length < 6) {
      alert("비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("새 비밀번호와 확인 비밀번호가 일치하지 않습니다.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch("/api/admin/my-account/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const result = await response.json();

      if (result.success) {
        alert("✅ 비밀번호가 변경되었습니다.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        alert(`❌ 오류: ${result.error || "비밀번호 변경에 실패했습니다."}`);
      }
    } catch (error) {
      console.error("비밀번호 변경 실패:", error);
      alert("❌ 비밀번호 변경에 실패했습니다.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // 전화번호 포맷팅
  const handlePhoneChange = (value: string) => {
    const numbers = value.replace(/[^\d]/g, "");
    if (numbers.length > 11) return;

    let formatted = numbers;
    if (numbers.length > 7) {
      formatted = `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
    } else if (numbers.length > 3) {
      formatted = `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    }

    setPhone(formatted);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <User className="h-8 w-8" />
          마이페이지
        </h1>
        <p className="text-muted-foreground mt-1">
          내 계정 정보를 관리합니다
        </p>
      </div>

      {/* 계정 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            계정 정보
          </CardTitle>
          <CardDescription>
            현재 로그인된 계정 정보입니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">이메일 (ID)</p>
              <p className="font-medium">{profile?.email || "-"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">권한</p>
              <Badge variant="secondary">
                {roleLabels[profile?.role || ""] || profile?.role || "-"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 프로필 수정 */}
      <Card>
        <CardHeader>
          <CardTitle>프로필 수정</CardTitle>
          <CardDescription>
            이름과 전화번호를 수정할 수 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력하세요"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">전화번호</Label>
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="010-1234-5678"
                />
              </div>
            </div>

            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  프로필 저장
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 비밀번호 변경 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            비밀번호 변경
          </CardTitle>
          <CardDescription>
            보안을 위해 주기적으로 비밀번호를 변경해주세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">현재 비밀번호</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="현재 비밀번호를 입력하세요"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">새 비밀번호</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="새 비밀번호 (최소 6자)"
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="새 비밀번호를 다시 입력하세요"
                minLength={6}
              />
            </div>

            <Button type="submit" variant="outline" disabled={isChangingPassword}>
              {isChangingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  변경 중...
                </>
              ) : (
                <>
                  <Key className="h-4 w-4 mr-2" />
                  비밀번호 변경
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

