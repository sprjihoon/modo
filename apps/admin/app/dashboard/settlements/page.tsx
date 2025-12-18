"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, RefreshCw, Download, CreditCard, Banknote, Smartphone, Receipt } from "lucide-react";

// 오늘 날짜 (YYYY-MM-DD 형식)
const getToday = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

// N일 전 날짜
const getDaysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
};

// 이번 달 시작일
const getMonthStart = () => {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
};

// 결제 방식 이름 매핑
const paymentMethodNames: Record<string, string> = {
  CARD: '신용/체크카드',
  BANK_TRANSFER: '계좌이체',
  VIRTUAL_ACCOUNT: '가상계좌',
  MOBILE: '휴대폰 결제',
  KAKAO_PAY: '카카오페이',
  NAVER_PAY: '네이버페이',
  TOSS_PAY: '토스페이',
};

interface SettlementStats {
  totalOrders: number;
  totalRevenue: number;
  promotionUsedCount: number;
  totalPromotionDiscount: number;
  supplyAmount: number;
  vatAmount: number;
  paymentMethodStats: Record<string, { count: number; amount: number; orders: any[] }>;
  paymentMethodRatio: Record<string, number>;
}

export default function SettlementsPage() {
  const [stats, setStats] = useState<SettlementStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // 날짜 필터 (기본값: 이번 달)
  const [startDate, setStartDate] = useState<string>(getMonthStart());
  const [endDate, setEndDate] = useState<string>(getToday());
  const [datePreset, setDatePreset] = useState<string>("thisMonth");
  
  // 결제 방식 필터
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("ALL");

  useEffect(() => {
    loadSettlementData();
  }, [startDate, endDate, paymentMethodFilter]);

  // 날짜 프리셋 변경
  const handleDatePreset = (preset: string) => {
    setDatePreset(preset);
    const today = getToday();
    
    switch (preset) {
      case "today":
        setStartDate(today);
        setEndDate(today);
        break;
      case "7days":
        setStartDate(getDaysAgo(7));
        setEndDate(today);
        break;
      case "thisMonth":
        setStartDate(getMonthStart());
        setEndDate(today);
        break;
      case "30days":
        setStartDate(getDaysAgo(30));
        setEndDate(today);
        break;
      case "90days":
        setStartDate(getDaysAgo(90));
        setEndDate(today);
        break;
      case "all":
        setStartDate("");
        setEndDate("");
        break;
      default:
        break;
    }
  };

  const loadSettlementData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (paymentMethodFilter !== "ALL") params.append('paymentMethod', paymentMethodFilter);

      const response = await fetch(`/api/settlements?${params.toString()}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error('정산 데이터 로드 실패:', result.error);
        throw new Error(result.error || '정산 데이터 조회 실패');
      }
      
      setStats(result.stats);
    } catch (error: any) {
      console.error('정산 데이터 조회 실패:', error);
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  };

  // CSV 다운로드
  const downloadCSV = () => {
    if (!stats) return;

    const rows = [
      ['정산 보고서'],
      ['기간', `${startDate} ~ ${endDate}`],
      ['생성일', new Date().toLocaleDateString('ko-KR')],
      [],
      ['1. 전체 통계'],
      ['항목', '금액 (원)'],
      ['총 매출', stats.totalRevenue.toLocaleString()],
      ['프로모션 할인', `(${stats.totalPromotionDiscount.toLocaleString()})`],
      [],
      ['2. 부가세 신고용 데이터'],
      ['항목', '금액 (원)'],
      ['공급가액 (과세표준)', stats.supplyAmount.toLocaleString()],
      ['부가세 (10%)', stats.vatAmount.toLocaleString()],
      ['합계', stats.totalRevenue.toLocaleString()],
      [],
      ['3. 결제 방식별 상세'],
      ['결제 방식', '건수', '금액 (원)', '비율 (%)'],
      ...Object.entries(stats.paymentMethodStats).map(([method, data]) => [
        paymentMethodNames[method] || method,
        data.count.toString(),
        data.amount.toLocaleString(),
        stats.paymentMethodRatio[method].toString() + '%',
      ]),
    ];

    const csv = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `정산보고서_${startDate}_${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading && !stats) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">정산 관리</h1>
          <p className="text-muted-foreground">부가세 신고 및 결제 방식별 정산 데이터</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={downloadCSV} variant="outline" disabled={!stats}>
            <Download className="h-4 w-4 mr-2" />
            CSV 다운로드
          </Button>
          <Button onClick={loadSettlementData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
        </div>
      </div>

      {/* 날짜 필터 */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              기간:
            </div>
            <div className="flex gap-1">
              <Button
                variant={datePreset === "today" ? "default" : "outline"}
                size="sm"
                onClick={() => handleDatePreset("today")}
              >
                오늘
              </Button>
              <Button
                variant={datePreset === "7days" ? "default" : "outline"}
                size="sm"
                onClick={() => handleDatePreset("7days")}
              >
                7일
              </Button>
              <Button
                variant={datePreset === "thisMonth" ? "default" : "outline"}
                size="sm"
                onClick={() => handleDatePreset("thisMonth")}
              >
                이번 달
              </Button>
              <Button
                variant={datePreset === "30days" ? "default" : "outline"}
                size="sm"
                onClick={() => handleDatePreset("30days")}
              >
                30일
              </Button>
              <Button
                variant={datePreset === "90days" ? "default" : "outline"}
                size="sm"
                onClick={() => handleDatePreset("90days")}
              >
                90일
              </Button>
              <Button
                variant={datePreset === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => handleDatePreset("all")}
              >
                전체
              </Button>
            </div>
            <div className="flex items-center gap-2 ml-2">
              <Input
                type="date"
                className="w-36 h-9"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset("custom");
                }}
              />
              <span className="text-muted-foreground">~</span>
              <Input
                type="date"
                className="w-36 h-9"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset("custom");
                }}
              />
            </div>
          </div>
          
          {/* 결제 방식 필터 */}
          <div>
            <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="결제 방식 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">전체</SelectItem>
                {Object.entries(paymentMethodNames).map(([key, name]) => (
                  <SelectItem key={key} value={key}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 부가세 신고용 데이터 */}
      {stats && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-blue-50 dark:bg-blue-950">
              <CardHeader className="pb-2">
                <CardDescription>공급가액 (과세표준)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  ₩{stats.supplyAmount.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  부가세 제외 금액
                </p>
              </CardContent>
            </Card>
            <Card className="bg-purple-50 dark:bg-purple-950">
              <CardHeader className="pb-2">
                <CardDescription>부가세 (10%)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  ₩{stats.vatAmount.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  납부할 부가세
                </p>
              </CardContent>
            </Card>
            <Card className="bg-green-50 dark:bg-green-950">
              <CardHeader className="pb-2">
                <CardDescription>총 매출 (부가세 포함)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  ₩{stats.totalRevenue.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  실제 결제 금액
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 전체 통계 */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>결제 완료 주문</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalOrders}건</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>프로모션 사용</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {stats.promotionUsedCount}건
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>프로모션 할인 금액</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  ₩{stats.totalPromotionDiscount.toLocaleString()}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>평균 주문 금액</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₩{stats.totalOrders > 0 ? Math.round(stats.totalRevenue / stats.totalOrders).toLocaleString() : 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 결제 방식별 상세 */}
          <Card>
            <CardHeader>
              <CardTitle>결제 방식별 상세</CardTitle>
              <CardDescription>
                각 결제 수단별 거래 건수 및 금액
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(stats.paymentMethodStats)
                  .filter(([_, data]) => data.count > 0)
                  .sort((a, b) => b[1].amount - a[1].amount)
                  .map(([method, data]) => (
                    <div key={method} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                          {method === 'CARD' && <CreditCard className="h-6 w-6 text-primary" />}
                          {method === 'BANK_TRANSFER' && <Banknote className="h-6 w-6 text-primary" />}
                          {method === 'VIRTUAL_ACCOUNT' && <Receipt className="h-6 w-6 text-primary" />}
                          {['MOBILE', 'KAKAO_PAY', 'NAVER_PAY', 'TOSS_PAY'].includes(method) && (
                            <Smartphone className="h-6 w-6 text-primary" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-lg">
                              {paymentMethodNames[method] || method}
                            </p>
                            <Badge variant="outline">{data.count}건</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            전체의 {stats.paymentMethodRatio[method]}%
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">₩{data.amount.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                
                {Object.values(stats.paymentMethodStats).every(data => data.count === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    해당 기간에 결제 내역이 없습니다.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 부가세 신고 안내 */}
          <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
            <CardHeader>
              <CardTitle className="text-blue-900 dark:text-blue-100">💡 부가세 신고 안내</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <p>• <strong>공급가액</strong>: 부가세를 제외한 재화나 용역의 가액 (과세표준)</p>
              <p>• <strong>부가세</strong>: 공급가액의 10%로 계산됩니다</p>
              <p>• <strong>총 매출</strong>: 공급가액 + 부가세 = 실제 고객이 지불한 금액</p>
              <p>• CSV 다운로드를 통해 세무사에게 전달하거나 홈택스에 신고할 수 있습니다</p>
              <p>• 프로모션 할인 금액은 공급가액 계산 전에 이미 차감된 금액입니다</p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

