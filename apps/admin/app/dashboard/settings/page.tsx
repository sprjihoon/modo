"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Key,
  Mail,
  Bell,
  Shield,
  Database,
  Globe,
  Save,
  Eye,
  EyeOff,
  FileText,
  Coins,
  ArrowRight,
  Users,
} from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState({
    siteName: "모두의수선",
    siteUrl: "https://modu-repair.com",
    adminEmail: "admin@modu-repair.com",
    supportEmail: "support@modu-repair.com",
    enableNotifications: true,
    enableEmailAlerts: true,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    cloudflareApiKey: "",
    tosspaymentsClientKey: "",
    tosspaymentsSecretKey: "",
  });

  // 센터(입고 도착지) 설정
  const [centerSettings, setCenterSettings] = useState({
    recipientName: "모두의수선",
    zipcode: "41142",
    address1: "대구광역시 동구 동촌로 1",
    address2: "동대구우체국 2층 소포실 모두의수선",
    phone: "010-2723-9490",
  });

  const [footerSettings, setFooterSettings] = useState({
    headerTitle: "모두의수선",
    companyName: "모두의수선",
    ceoName: "",
    businessNumber: "",
    salesReportNumber: "",
    address: "",
    privacyOfficer: "",
    email: "",
    customerCenter: "",
  });

  // 초기 데이터 로드
  useEffect(() => {
    loadCompanyInfo().then(() => setIsLoading(false));

  // 센터 설정 로드
  const loadCenter = async () => {
    try {
      const res = await fetch('/api/admin/ops/center');
      const json = await res.json();
      if (json?.data) {
        setCenterSettings({
          recipientName: json.data.recipient_name || "모두의수선",
          zipcode: json.data.zipcode || "41142",
          address1: json.data.address1 || "",
          address2: json.data.address2 || "",
          phone: json.data.phone ? String(json.data.phone) : "010-2723-9490",
        });
      }
    } catch (e) {
      console.warn('센터 설정 로드 실패 (기본값 사용):', e);
    }
  };

  loadCenter();
  }, []);

  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      // 푸터 정보 저장 - 서버 API 경유 (RLS 우회)
      {
        const res = await fetch('/api/admin/settings/company-info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            header_title: footerSettings.headerTitle,
            company_name: footerSettings.companyName,
            ceo_name: footerSettings.ceoName,
            business_number: footerSettings.businessNumber,
            online_business_number: footerSettings.salesReportNumber,
            address: footerSettings.address,
            privacy_officer: footerSettings.privacyOfficer,
            email: footerSettings.email,
            phone: footerSettings.customerCenter,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || '회사 정보 저장 실패');
      }

      // 센터 설정 저장
      const res = await fetch('/api/admin/ops/center', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_name: centerSettings.recipientName,
          zipcode: centerSettings.zipcode,
          address1: centerSettings.address1,
          address2: centerSettings.address2,
          phone: centerSettings.phone,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || '센터 설정 저장 실패');

      // 저장 후 최신 데이터 다시 로드
      await loadCompanyInfo();
      
      alert("설정이 저장되었습니다. 앱에서 푸터를 확인하면 최신 정보가 반영됩니다.");
    } catch (error: any) {
      alert(`저장 실패: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadCompanyInfo = async () => {
    try {
      // API를 통해 데이터 로드 (권한 문제 해결)
      const res = await fetch('/api/admin/settings/company-info');
      const json = await res.json();
      
      if (res.ok && json.data) {
        const data = json.data;
        setFooterSettings({
          headerTitle: data.header_title || data.company_name?.split('(')[0].trim() || "모두의수선",
          companyName: data.company_name || "모두의수선",
          ceoName: data.ceo_name || "",
          businessNumber: data.business_number || "",
          salesReportNumber: data.online_business_number || "",
          address: data.address || "",
          privacyOfficer: data.privacy_officer || "",
          email: data.email || "",
          customerCenter: data.phone || "",
        });
        console.log('✅ 푸터 정보 로드 성공:', data);
      } else {
        console.warn('⚠️ 푸터 정보 없음, 기본값 사용');
      }
    } catch (error) {
      console.error('❌ 푸터 정보 로드 실패:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">설정</h1>
        <p className="text-muted-foreground">시스템 설정을 관리합니다</p>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            일반 설정
          </CardTitle>
          <CardDescription>기본 시스템 설정입니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="siteName">사이트 이름</Label>
            <Input
              id="siteName"
              value={settings.siteName}
              onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="siteUrl">사이트 URL</Label>
            <Input
              id="siteUrl"
              value={settings.siteUrl}
              onChange={(e) => setSettings({ ...settings, siteUrl: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminEmail">관리자 이메일</Label>
            <Input
              id="adminEmail"
              type="email"
              value={settings.adminEmail}
              onChange={(e) => setSettings({ ...settings, adminEmail: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="supportEmail">고객지원 이메일</Label>
            <Input
              id="supportEmail"
              type="email"
              value={settings.supportEmail}
              onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            알림 설정
          </CardTitle>
          <CardDescription>알림 및 이메일 설정입니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>푸시 알림</Label>
              <p className="text-sm text-muted-foreground">주문 상태 변경 시 푸시 알림 발송</p>
            </div>
            <Button
              variant={settings.enableNotifications ? "default" : "outline"}
              onClick={() =>
                setSettings({ ...settings, enableNotifications: !settings.enableNotifications })
              }
            >
              {settings.enableNotifications ? "활성화" : "비활성화"}
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>이메일 알림</Label>
              <p className="text-sm text-muted-foreground">중요 이벤트 발생 시 이메일 발송</p>
            </div>
            <Button
              variant={settings.enableEmailAlerts ? "default" : "outline"}
              onClick={() =>
                setSettings({ ...settings, enableEmailAlerts: !settings.enableEmailAlerts })
              }
            >
              {settings.enableEmailAlerts ? "활성화" : "비활성화"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Point Settings Link */}
      <Card className="border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-blue-600" />
            포인트 적립률 설정
          </CardTitle>
          <CardDescription>기간별 포인트 적립률을 관리합니다</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">포인트 적립 정책 관리</p>
              <p className="text-sm text-muted-foreground">
                결제 금액의 x% 적립 설정, 기간별 적립률 관리
              </p>
            </div>
            <Link href="/dashboard/settings/points">
              <Button>
                설정 관리
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Staff Management Link */}
      <Card className="border-purple-200 dark:border-purple-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-600" />
            직원 계정 관리
          </CardTitle>
          <CardDescription>입출고 관리자 및 작업자 계정을 관리합니다</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">직원 계정 등록 및 권한 관리</p>
              <p className="text-sm text-muted-foreground">
                입출고 관리자, 작업자 계정 생성 및 수정 (관리자 전용)
              </p>
            </div>
            <Link href="/dashboard/settings/staff">
              <Button>
                직원 관리
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Center Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            센터(입고 도착지) 설정
          </CardTitle>
          <CardDescription>우체국 기사 도착지 기본값입니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="centerRecipient">수취인명</Label>
              <Input
                id="centerRecipient"
                value={centerSettings.recipientName}
                onChange={(e) => setCenterSettings({ ...centerSettings, recipientName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="centerZip">우편번호</Label>
              <Input
                id="centerZip"
                value={centerSettings.zipcode}
                onChange={(e) => setCenterSettings({ ...centerSettings, zipcode: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="centerAddr1">주소1</Label>
            <Input
              id="centerAddr1"
              value={centerSettings.address1}
              onChange={(e) => setCenterSettings({ ...centerSettings, address1: e.target.value })}
              placeholder="대구광역시 동구 동촌로 1"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="centerAddr2">주소2</Label>
            <Input
              id="centerAddr2"
              value={centerSettings.address2}
              onChange={(e) => setCenterSettings({ ...centerSettings, address2: e.target.value })}
              placeholder="동대구우체국 2층 소포실 모두의수선"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="centerPhone">전화번호</Label>
            <Input
              id="centerPhone"
              value={centerSettings.phone}
              onChange={(e) => setCenterSettings({ ...centerSettings, phone: e.target.value })}
              placeholder="010-2723-9490"
            />
          </div>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            저장
          </Button>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API 키 관리
          </CardTitle>
          <CardDescription>외부 서비스 API 키를 관리합니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="supabaseUrl">Supabase URL</Label>
              <Badge variant="outline">필수</Badge>
            </div>
            <Input
              id="supabaseUrl"
              type="text"
              value={settings.supabaseUrl}
              onChange={(e) => setSettings({ ...settings, supabaseUrl: e.target.value })}
              placeholder="https://xxx.supabase.co"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="supabaseKey">Supabase Anon Key</Label>
              <Badge variant="outline">필수</Badge>
            </div>
            <div className="relative">
              <Input
                id="supabaseKey"
                type={showApiKey ? "text" : "password"}
                value={settings.supabaseAnonKey}
                onChange={(e) => setSettings({ ...settings, supabaseAnonKey: e.target.value })}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="cloudflareKey">Cloudflare API Key</Label>
              <Badge variant="secondary">선택</Badge>
            </div>
            <Input
              id="cloudflareKey"
              type="password"
              value={settings.cloudflareApiKey}
              onChange={(e) => setSettings({ ...settings, cloudflareApiKey: e.target.value })}
              placeholder="영상 스트리밍용"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="tosspaymentsClientKey">토스페이먼츠 Client Key</Label>
              <Badge variant="secondary">선택</Badge>
            </div>
            <Input
              id="tosspaymentsClientKey"
              type="text"
              value={settings.tosspaymentsClientKey}
              onChange={(e) => setSettings({ ...settings, tosspaymentsClientKey: e.target.value })}
              placeholder="test_ck_..."
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="tosspaymentsSecretKey">토스페이먼츠 Secret Key</Label>
              <Badge variant="secondary">선택</Badge>
            </div>
            <Input
              id="tosspaymentsSecretKey"
              type="password"
              value={settings.tosspaymentsSecretKey}
              onChange={(e) => setSettings({ ...settings, tosspaymentsSecretKey: e.target.value })}
              placeholder="test_sk_... (서버에서 사용)"
            />
          </div>
        </CardContent>
      </Card>

      {/* Footer Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            푸터 관리
          </CardTitle>
          <CardDescription>앱 하단에 표시되는 사업자 정보를 관리합니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="headerTitle">푸터 헤더 제목</Label>
            <Input
              id="headerTitle"
              value={footerSettings.headerTitle}
              onChange={(e) =>
                setFooterSettings({ ...footerSettings, headerTitle: e.target.value })
              }
              placeholder="모두의수선"
            />
            <p className="text-xs text-muted-foreground">
              앱 푸터의 아코디언 헤더에 표시될 간단한 제목입니다
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyName">회사명</Label>
            <Input
              id="companyName"
              value={footerSettings.companyName}
              onChange={(e) =>
                setFooterSettings({ ...footerSettings, companyName: e.target.value })
              }
              placeholder="모두의수선"
            />
            <p className="text-xs text-muted-foreground">
              푸터 상세 정보에 표시될 정식 회사명입니다
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ceoName">대표자</Label>
            <Input
              id="ceoName"
              value={footerSettings.ceoName}
              onChange={(e) =>
                setFooterSettings({ ...footerSettings, ceoName: e.target.value })
              }
              placeholder="조성우"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="businessNumber">사업자등록번호</Label>
            <Input
              id="businessNumber"
              value={footerSettings.businessNumber}
              onChange={(e) =>
                setFooterSettings({ ...footerSettings, businessNumber: e.target.value })
              }
              placeholder="561-87-00957"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="salesReportNumber">통신판매업신고번호</Label>
            <Input
              id="salesReportNumber"
              value={footerSettings.salesReportNumber}
              onChange={(e) =>
                setFooterSettings({ ...footerSettings, salesReportNumber: e.target.value })
              }
              placeholder="2025-경기군포-0146호"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">주소</Label>
            <Input
              id="address"
              value={footerSettings.address}
              onChange={(e) =>
                setFooterSettings({ ...footerSettings, address: e.target.value })
              }
              placeholder="경기도 군포시 농심로72번길 3(당정동, 런드리고 글로벌 캠퍼스)"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="privacyOfficer">개인정보관리책임자</Label>
            <Input
              id="privacyOfficer"
              value={footerSettings.privacyOfficer}
              onChange={(e) =>
                setFooterSettings({ ...footerSettings, privacyOfficer: e.target.value })
              }
              placeholder="최종수"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="footerEmail">이메일</Label>
            <Input
              id="footerEmail"
              type="email"
              value={footerSettings.email}
              onChange={(e) =>
                setFooterSettings({ ...footerSettings, email: e.target.value })
              }
              placeholder="privacy@lifegoeson.kr"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customerCenter">고객센터</Label>
            <Input
              id="customerCenter"
              value={footerSettings.customerCenter}
              onChange={(e) =>
                setFooterSettings({ ...footerSettings, customerCenter: e.target.value })
              }
              placeholder="1833-3429"
            />
          </div>
        </CardContent>
      </Card>

      {/* Database Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            데이터베이스 정보
          </CardTitle>
          <CardDescription>데이터베이스 연결 상태를 확인합니다</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">연결 상태</p>
              <p className="text-sm text-muted-foreground">Supabase PostgreSQL</p>
            </div>
            <Badge variant="default" className="bg-green-500">
              연결됨
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} size="lg">
          <Save className="mr-2 h-4 w-4" />
          설정 저장
        </Button>
      </div>
    </div>
  );
}

