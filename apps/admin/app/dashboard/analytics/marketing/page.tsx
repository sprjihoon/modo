"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, CreditCard, Loader2, Megaphone, RefreshCw, Users } from "lucide-react";
import type { AccessPathStat, Bucket, DailyStat, MarketingInsightsData } from "@/lib/marketing-insights";
import { WEEKDAY_LABELS, addDaysYmd } from "@/lib/marketing-insights";
import { getOrderSourceLabel } from "@/lib/order-source";

const getToday = () => addDaysYmd(new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10), 0);
const getDaysAgo = (days: number) => addDaysYmd(getToday(), -days);

function won(n: number) {
  return `₩${n.toLocaleString()}`;
}

function monthLabel(ymd: string) {
  const [year, month] = ymd.split("-");
  return `${year}년 ${Number(month)}월`;
}

function DailyCalendar({
  days,
  selected,
  onSelect,
}: {
  days: DailyStat[];
  selected: string | null;
  onSelect: (date: string) => void;
}) {
  const months = new Map<string, DailyStat[]>();
  for (const day of days) {
    const key = day.date.slice(0, 7);
    const list = months.get(key) ?? [];
    list.push(day);
    months.set(key, list);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span><span className="inline-block w-2 h-2 rounded-full bg-sky-500 mr-1" />가입</span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-teal-600 mr-1" />결제자</span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-violet-500 mr-1" />접속</span>
      </div>
      {[...months.entries()].map(([month, monthDays]) => {
        const firstInRange = monthDays[0]?.date ?? `${month}-01`;
        const weekdayOfFirst = new Date(`${firstInRange}T00:00:00+09:00`).getDay();
        const blanks = Array.from({ length: weekdayOfFirst }, (_, i) => i);
        return (
          <div key={month}>
            <p className="font-medium mb-2">{monthLabel(`${month}-01`)}</p>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-1">
              {WEEKDAY_LABELS.map((label, i) => (
                <div key={label} className={i === 0 ? "text-red-500" : ""}>{label}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {blanks.map((i) => <div key={`blank-${i}`} />)}
              {monthDays.map((day) => {
                const isSelected = selected === day.date;
                const hasAny = day.signups + day.payers + day.visitors > 0;
                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => onSelect(day.date)}
                    className={`min-h-[88px] rounded-lg border p-1.5 text-left transition ${
                      isSelected ? "border-teal-600 ring-2 ring-teal-200" : "border-gray-200 hover:border-teal-300"
                    } ${hasAny ? "bg-white" : "bg-gray-50"}`}
                  >
                    <p className={`text-sm font-semibold ${new Date(`${day.date}T00:00:00+09:00`).getDay() === 0 ? "text-red-500" : ""}`}>
                      {Number(day.date.slice(8))}
                    </p>
                    <p className="text-[11px] text-sky-700">가입 {day.signups}</p>
                    <p className="text-[11px] text-teal-700">결제 {day.payers}</p>
                    <p className="text-[11px] text-violet-700">접속 {day.visitors}</p>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AccessPathBars({ paths }: { paths: AccessPathStat[] }) {
  const total = paths.reduce((sum, item) => sum + item.sessions, 0) || 1;
  const max = Math.max(...paths.map((item) => item.sessions), 1);
  if (paths.length === 0) {
    return <p className="text-sm text-muted-foreground">접속 경로 기록이 아직 없습니다</p>;
  }
  return (
    <div className="space-y-3">
      {paths.slice(0, 8).map((item) => {
        const pct = Math.round((item.sessions / total) * 100);
        return (
          <div key={item.name}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium">{item.name}</span>
              <span className="text-muted-foreground">
                {item.sessions.toLocaleString()}회 · {pct}% · {item.users.toLocaleString()}명
              </span>
            </div>
            <div className="h-2 rounded bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded bg-teal-600"
                style={{ width: `${Math.max(4, Math.round((item.sessions / max) * 100))}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
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
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
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
        <div className="flex gap-2">
          <Link href="/dashboard/analytics/marketing/actions">
            <Button variant="outline" size="sm">휴면·이탈·쿠폰</Button>
          </Link>
          <Button onClick={load} variant="outline" size="sm" disabled={isLoading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
        </div>
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
              <CardTitle>일자별 달력</CardTitle>
              <CardDescription>날짜를 누르면 그날 가입·결제자·접속 고객 수를 볼 수 있습니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <DailyCalendar
                days={data.daily}
                selected={selectedDay}
                onSelect={(date) => setSelectedDay((cur) => (cur === date ? null : date))}
              />
              {selectedDay && (() => {
                const day = data.daily.find((d) => d.date === selectedDay);
                if (!day) return null;
                return (
                  <div className="rounded-lg border bg-slate-50 p-4 grid gap-3 sm:grid-cols-4 text-sm">
                    <p className="sm:col-span-4 font-medium">{day.date}</p>
                    <p>가입 <span className="font-semibold">{day.signups.toLocaleString()}명</span></p>
                    <p>결제자 <span className="font-semibold">{day.payers.toLocaleString()}명</span></p>
                    <p>결제 <span className="font-semibold">{day.payments.toLocaleString()}건 · {won(day.amount)}</span></p>
                    <p>접속 <span className="font-semibold">{day.visitors.toLocaleString()}명</span></p>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>접속 경로</CardTitle>
                <CardDescription>세션 첫 진입 기준. 광고 링크에 utm_source=naver 처럼 붙이면 더 정확합니다</CardDescription>
              </CardHeader>
              <CardContent>
                <AccessPathBars paths={data.accessPaths} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>주문 채널</CardTitle>
                <CardDescription>결제를 완료한 곳 (웹 / 앱)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.sources.length === 0 && <p className="text-sm text-muted-foreground">결제 데이터 없음</p>}
                {data.sources.map((item) => (
                  <div key={item.name} className="flex justify-between text-sm">
                    <span>{getOrderSourceLabel(item.name === "미기록" ? null : item.name)}</span>
                    <span className="font-medium">{item.count}건 · {won(item.amount)}</span>
                  </div>
                ))}
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

          <div className="grid gap-4 lg:grid-cols-2">
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
