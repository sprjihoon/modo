"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User, MapPin, Receipt, Gift, Megaphone,
  HeadphonesIcon, Settings, LogOut, ChevronRight,
  Coins,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/utils";

interface UserProfile {
  id: string;
  name?: string;
  email?: string;
  point_balance?: number;
}

interface MenuItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  href?: string;
  onClick?: () => void;
  badge?: React.ReactNode;
  danger?: boolean;
}

function MenuItem({ icon, title, subtitle, href, onClick, badge, danger }: MenuItemProps) {
  const content = (
    <div className={`flex items-center gap-3 px-5 py-4 bg-white active:bg-gray-50 ${danger ? "text-red-500" : ""}`}>
      <div className={`${danger ? "text-red-400" : "text-gray-400"}`}>{icon}</div>
      <div className="flex-1">
        <p className={`text-sm font-medium ${danger ? "text-red-500" : "text-gray-800"}`}>
          {title}
        </p>
        {subtitle && (
          <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
        )}
      </div>
      {badge}
      <ChevronRight className={`w-4 h-4 ${danger ? "text-red-300" : "text-gray-300"}`} />
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return <button onClick={onClick} className="w-full text-left">{content}</button>;
}

function MenuSection({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-2">
      {title && (
        <p className="text-xs font-bold text-gray-400 px-5 py-2 bg-gray-50">
          {title}
        </p>
      )}
      <div className="divide-y divide-gray-50">{children}</div>
    </div>
  );
}

export function ProfilePageClient() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsLoading(false);
        return;
      }
      setIsLoggedIn(true);

      const { data } = await supabase
        .from("users")
        .select("id, name, email, point_balance")
        .eq("auth_id", user.id)
        .maybeSingle();

      setProfile(data);
    } catch {
      // 에러 무시
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogout() {
    if (!confirm("로그아웃 하시겠습니까?")) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (!isLoggedIn && !isLoading) {
    return (
      <div className="py-16 text-center px-5">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-500 text-sm mb-4">
          로그인 후 이용할 수 있습니다
        </p>
        <Link href="/login" className="btn-brand inline-block px-8 py-3">
          로그인
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* 사용자 정보 헤더 */}
      <div className="bg-white px-5 py-5 mb-2">
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-5 bg-gray-100 rounded w-24 animate-pulse" />
            <div className="h-4 bg-gray-100 rounded w-40 animate-pulse" />
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-gray-900">
                {profile?.name || "고객"}님
              </p>
              <p className="text-sm text-gray-400 mt-0.5">{profile?.email}</p>
            </div>
            {/* 포인트 */}
            <Link
              href="/profile/points"
              className="flex items-center gap-1.5 bg-[#00C896]/10 px-3 py-2 rounded-xl active:opacity-80"
            >
              <Coins className="w-4 h-4 text-[#00C896]" />
              <span className="text-sm font-bold text-[#00C896]">
                {formatPrice(profile?.point_balance ?? 0)}
              </span>
            </Link>
          </div>
        )}
      </div>

      {/* 회원 관리 */}
      <MenuSection title="회원 관리">
        <MenuItem
          icon={<User className="w-5 h-5" />}
          title="회원정보"
          href="/profile/account"
        />
        <MenuItem
          icon={<MapPin className="w-5 h-5" />}
          title="배송지 설정"
          href="/profile/addresses"
        />
        <MenuItem
          icon={<Receipt className="w-5 h-5" />}
          title="결제내역"
          href="/profile/payment-history"
        />
        <MenuItem
          icon={<Coins className="w-5 h-5" />}
          title="포인트 내역"
          href="/profile/points"
        />
      </MenuSection>

      {/* 서비스 */}
      <MenuSection title="서비스">
        <MenuItem
          icon={<Gift className="w-5 h-5" />}
          title="친구 초대"
          subtitle="친구와 함께 혜택 받기"
          href="/profile/invite"
          badge={
            <span className="text-[10px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded text-center">
              HOT
            </span>
          }
        />
        <MenuItem
          icon={<Megaphone className="w-5 h-5" />}
          title="공지사항"
          href="/announcements"
        />
        <MenuItem
          icon={<HeadphonesIcon className="w-5 h-5" />}
          title="고객센터"
          href="/profile/support"
        />
        <MenuItem
          icon={<Settings className="w-5 h-5" />}
          title="설정"
          href="/profile/settings"
        />
      </MenuSection>

      {/* 로그아웃 */}
      <MenuSection>
        <MenuItem
          icon={<LogOut className="w-5 h-5" />}
          title="로그아웃"
          onClick={handleLogout}
          danger
        />
      </MenuSection>

      <div className="px-5 py-4 text-center">
        <p className="text-xs text-gray-300">모두의수선 | 수선의 모든 것</p>
      </div>
    </div>
  );
}
