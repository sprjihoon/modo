"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, CreditCard, Loader2, Megaphone, RefreshCw, Users } from "lucide-react";
import type { Bucket, MarketingInsightsData } from "@/lib/marketing-insights";
import { WEEKDAY_LABELS } from "@/lib/marketing-insights";
import { getOrderSourceLabel } from "@/lib/order-source";

const getToday = () => new Date().toISOString().split("T")[0];
const getDaysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split("T")[0];
};

function won(n: number) {
  return `₩${n.toLocaleString()}`;
}

function WeekdayBars({
  buckets,
  valueKey = "count",
  unit = "건",
}: {
  buckets: Bucket[];
  valueKey?: "count" | "users" | "amount";
  unit?: string;
}) {
  const max = Math.max(...buckets.map((b) => b[valueKey] || 0), 1);
  return (
    <div className="grid grid-cols-7 gap-2">
      {WEEKDAY_LABELS.map((label, i) => {
        const bucket = buckets.find((b) => b.key === i) ?? buckets[i];
        const value = bucket?.[valueKey] || 0;
        const height = Math.max(8, Math.round((value / max) * 96));
        const isPeak = value > 0 && value === max;
        return (
          <div key={label} className="text-center">
            <div className="h-24 flex items-end justify-center">
              <div
                className={`w-full max-w-12 rounded-t ${isPeak ? "bg-teal-600" : "bg-teal-400"}`}
                style={{ height }}
                title={`${label}요일 ${value.toLocaleString()}${unit}`}
              />
            </div>
            <p className={`text-sm mt-2 font-medium ${i === 0 ? "text-red-500" : ""}`}>{label}</p>
            <p className="text-sm font-semibold">
              {valueKey === "amount" ? won(value) : `${value.toLocaleString()}${unit}`}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export default function MarketingInsightsPage() {
  const [startDate, setStartDate] = useState(getDaysAgo(30));
  const [endDate, setEndDate] = useState(getToday());
  const [datePreset, setDatePreset] = useState("30days");
  const [data, setData] = useState<MarketingInsightsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyPreset = (preset: string) => {
    setDatePreset(preset);
    if (preset === "today") {
      setStartDate(getToday());
      setEndDate(getToday());
    } else if (preset === "7days") {
      setStartDate(getDaysAgo(7));
      setEndDate(getToday());
    } else if (preset === "30days") {
      setStartDate(getDaysAgo(30));
      setEndDate(getToday());
    } else if (preset === "90days") {
      setStartDate(getDaysAgo(90));
      setEndDate(getToday());
    }
  };

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ startDate, endDate });
      const res = await fetch(`/api/analytics/marketing?${params}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "불러오지 못했습니다.");
      setData(json.data);
    } catch (e: any) {
      setError(e.message || "불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [startDate, endDate]);

  const maxHeat = Math.max(...(data?.heatmap.map((c) => c.count) || [0]), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">마케팅 인사이트</h1>
          <p className="text-muted-foreground">결제·가입·접속이 몰리는 요일과 시간을 보고 푸시·프로모션 타이밍을 정합니다</p>
        </div>
        <Button onClick={load} variant="outline" size="sm" disabled={isLoading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          새로고침
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">기간</span>
            </div>
            {[
              ["today", "오늘"],
              ["7days", "7일"],
              ["30days", "30일"],
              ["90days", "90일"],
            ].map(([key, label]) => (
              <Button
                key={key}
                variant={datePreset === key ? "default" : "outline"}
                size="sm"
                onClick={() => applyPreset(key)}
              >
                {label}
              </Button>
            ))}
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
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="py-8 text-center text-red-600">{error}</CardContent>
        </Card>
      )}

      {!isLoading && data && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">결제 건수</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data.totals.paidOrders.toLocaleString()}건</p>
                <p className="text-xs text-muted-foreground mt-1">{won(data.totals.paidAmount)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">객단가</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{won(data.totals.aov)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">신규 가입</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data.totals.signups.toLocaleString()}명</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">접속 고객</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data.totals.visitors.toLocaleString()}명</p>
                <p className="text-xs text-muted-foreground mt-1">이벤트 {data.totals.events.toLocaleString()}건</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5" />
                이번에 할 일
              </CardTitle>
              <CardDescription>선택한 기간 데이터로 정리한 마케팅 포인트</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.insights.map((item) => (
                <div key={item.title} className="rounded-lg border p-4">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">{item.body}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  요일별 결제
                </CardTitle>
                <CardDescription>결제 완료 건수 (KST)</CardDescription>
              </CardHeader>
              <CardContent>
                <WeekdayBars buckets={data.paymentsByWeekday} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  요일별 접속
                </CardTitle>
                <CardDescription>고유 접속 고객 (KST)</CardDescription>
              </CardHeader>
              <CardContent>
                <WeekdayBars buckets={data.visitsByWeekday} valueKey="users" unit="명" />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>시간대별 결제</CardTitle>
              <CardDescription>결제 완료 시각 (KST)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-12 gap-1">
                {data.paymentsByHour.map((hour) => {
                  const max = Math.max(...data.paymentsByHour.map((h) => h.count), 1);
                  const intensity = hour.count / max;
                  return (
                    <div key={hour.key} className="text-center">
                      <div
                        className="h-16 rounded"
                        style={{ backgroundColor: `rgba(13, 148, 136, ${Math.max(intensity, hour.count ? 0.12 : 0.04)})` }}
                        title={`${hour.label}: ${hour.count}건 · ${won(hour.amount)}`}
                      />
                      <span className="text-xs text-muted-foreground">{hour.key}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>결제 히트맵</CardTitle>
              <CardDescription>요일 × 시간. 진할수록 결제가 많습니다</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <div className="min-w-[720px]">
                <div className="grid grid-cols-[40px_repeat(24,minmax(0,1fr))] gap-1 mb-1">
                  <div />
                  {Array.from({ length: 24 }, (_, h) => (
                    <div key={h} className="text-center text-[10px] text-muted-foreground">
                      {h}
                    </div>
                  ))}
                </div>
                {WEEKDAY_LABELS.map((label, weekday) => (
                  <div key={label} className="grid grid-cols-[40px_repeat(24,minmax(0,1fr))] gap-1 mb-1">
                    <div className={`text-xs leading-6 ${weekday === 0 ? "text-red-500" : "text-muted-foreground"}`}>
                      {label}
                    </div>
                    {Array.from({ length: 24 }, (_, hour) => {
                      const cell = data.heatmap.find((c) => c.weekday === weekday && c.hour === hour);
                      const count = cell?.count || 0;
                      return (
                        <div
                          key={hour}
                          className="h-6 rounded"
                          style={{
                            backgroundColor: `rgba(13, 148, 136, ${count ? Math.max(0.15, count / maxHeat) : 0.04})`,
                          }}
                          title={`${label} ${hour}시: ${count}건`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>유입 채널</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.sources.length === 0 && <p className="text-sm text-muted-foreground">결제 데이터 없음</p>}
                {data.sources.map((item) => (
                  <div key={item.name} className="flex justify-between text-sm">
                    <span>{getOrderSourceLabel(item.name === "미기록" ? null : item.name)}</span>
                    <span className="font-medium">{item.count}건</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>인기 의류</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.clothing.length === 0 && <p className="text-sm text-muted-foreground">결제 데이터 없음</p>}
                {data.clothing.map((item) => (
                  <div key={item.name} className="flex justify-between text-sm">
                    <span>{item.name}</span>
                    <span className="font-medium">{item.count}건</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>인기 수선</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.repairs.length === 0 && <p className="text-sm text-muted-foreground">결제 데이터 없음</p>}
                {data.repairs.map((item) => (
                  <div key={item.name} className="flex justify-between text-sm">
                    <span>{item.name}</span>
                    <span className="font-medium">{item.count}건</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>요일별 신규 가입</CardTitle>
            </CardHeader>
            <CardContent>
              <WeekdayBars buckets={data.signupsByWeekday} unit="명" />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
