"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addKstDays,
  aggregateTrend,
  exceptionAttention,
  kstToday,
  kstYesterday,
  lastDayOfMonth,
  monthStart,
  parseReportDate,
  toTrendPoints,
  weekStartMonday,
  type OpsDailyMetrics,
  type OpsDailyReportRow,
  type TrendGrain,
} from "@/lib/ops-daily-report";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  RefreshCw,
  Mail,
  Calendar,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function won(n: number) {
  return `${n.toLocaleString("ko-KR")}원`;
}

function trendPointDate(state: unknown): string {
  const payload = (state as { activePayload?: Array<{ payload?: { date?: string } }> } | null)
    ?.activePayload?.[0]?.payload?.date;
  return payload ?? "";
}

function Metric({
  label,
  value,
  hint,
  warn,
}: {
  label: string;
  value: string | number;
  hint?: string;
  warn?: boolean;
}) {
  return (
    <Card className={warn ? "border-amber-400 bg-amber-50/60" : undefined}>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      {hint ? (
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">{hint}</p>
        </CardContent>
      ) : null}
    </Card>
  );
}

function initialReportDate() {
  if (typeof window === "undefined") return kstYesterday();
  return parseReportDate(new URLSearchParams(window.location.search).get("date")) ?? kstYesterday();
}

export default function OpsReportsPage() {
  const today = kstToday();
  const [date, setDate] = useState(initialReportDate);
  const [trendFrom, setTrendFrom] = useState(() => addKstDays(kstToday(), -29));
  const [trendTo, setTrendTo] = useState(kstToday);
  const [grain, setGrain] = useState<TrendGrain>("day");
  const [preset, setPreset] = useState("30days");
  const [report, setReport] = useState<OpsDailyReportRow | null>(null);
  const [reports, setReports] = useState<OpsDailyReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [trendLoading, setTrendLoading] = useState(false);
  const [working, setWorking] = useState<"generate" | "email" | "fill" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadDay = useCallback(async (targetDate: string) => {
    setLoading(true);
    setError(null);
    try {
      const oneRes = await fetch(`/api/admin/ops-reports?date=${targetDate}`);
      const one = await oneRes.json();
      if (!oneRes.ok || !one.success) throw new Error(one.error || "리포트 조회 실패");
      if (one.report) {
        setReport(one.report);
        return;
      }
      const genRes = await fetch("/api/admin/ops-reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: targetDate, sendEmail: false }),
      });
      const gen = await genRes.json();
      if (!genRes.ok || !gen.success) throw new Error(gen.error || "집계 실패");
      setReport(gen.report ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTrend = useCallback(async (from: string, to: string) => {
    setTrendLoading(true);
    try {
      const listRes = await fetch(`/api/admin/ops-reports?from=${from}&to=${to}`);
      const list = await listRes.json();
      if (!listRes.ok || !list.success) throw new Error(list.error || "추이 조회 실패");
      setReports(list.reports ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setTrendLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDay(date);
    const url = new URL(window.location.href);
    url.searchParams.set("date", date);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }, [date, loadDay]);

  useEffect(() => {
    loadTrend(trendFrom, trendTo);
  }, [trendFrom, trendTo, loadTrend]);

  const metrics: OpsDailyMetrics | null = report?.metrics ?? null;
  const trend = useMemo(
    () => aggregateTrend(toTrendPoints(reports), grain),
    [reports, grain]
  );
  const prev = reports.find((r) => r.report_date === addKstDays(date, -1))?.metrics.pulse;

  function applyPreset(next: string) {
    setPreset(next);
    if (next === "7days") {
      setTrendFrom(addKstDays(today, -6));
      setTrendTo(today);
    } else if (next === "30days") {
      setTrendFrom(addKstDays(today, -29));
      setTrendTo(today);
    } else if (next === "week") {
      setTrendFrom(weekStartMonday(today));
      setTrendTo(today);
      setGrain("day");
    } else if (next === "month") {
      setTrendFrom(monthStart(today));
      setTrendTo(today);
    } else if (next === "12weeks") {
      setTrendFrom(addKstDays(today, -83));
      setTrendTo(today);
      setGrain("week");
    }
  }

  async function regenerate(sendEmail: boolean) {
    setWorking(sendEmail ? "email" : "generate");
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/ops-reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, sendEmail }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "실패");
      setReport(json.report ?? null);
      setNotice(sendEmail ? json.report?.email_error || "메일을 보냈습니다" : "다시 집계했습니다");
      await loadTrend(trendFrom, trendTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setWorking(null);
    }
  }

  function openTrendPoint(key: string) {
    if (!key) return;
    if (grain === "day") {
      setDate(key);
      document.getElementById("report-day")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (grain === "week") {
      setTrendFrom(key);
      setTrendTo(addKstDays(key, 6) > today ? today : addKstDays(key, 6));
      setGrain("day");
      setPreset("custom");
      return;
    }
    setTrendFrom(key);
    const monthEnd = lastDayOfMonth(key);
    setTrendTo(monthEnd > today ? today : monthEnd);
    setGrain("day");
    setPreset("custom");
  }

  async function fillTrendRange() {
    setWorking("fill");
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/ops-reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, from: trendFrom, to: trendTo, sendEmail: false }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "기간 집계 실패");
      setNotice(`${json.created?.length ?? 0}일분을 채웠습니다`);
      await Promise.all([loadDay(date), loadTrend(trendFrom, trendTo)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setWorking(null);
    }
  }

  const pulse = metrics?.pulse;
  const pipe = metrics?.pipeline;
  const ex = metrics?.exceptions;
  const attn = ex ? exceptionAttention(ex) : 0;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">운영 리포트</h2>
          <p className="text-muted-foreground mt-1">
            아침 메일로 하루를 보고, 추이에서 칸을 누르면 그날 리포트로 내려갑니다. 주문·가입은 생길 때 바로 메일이 갑니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setDate(kstYesterday())}>
            어제
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDate(kstToday())}>
            오늘
          </Button>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              className="w-40 h-9"
              max={kstToday()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={working !== null}
            onClick={() => regenerate(false)}
          >
            {working === "generate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">다시 집계</span>
          </Button>
          <Button size="sm" disabled={working !== null} onClick={() => regenerate(true)}>
            {working === "email" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            <span className="ml-2">메일 보내기</span>
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-300 bg-red-50/70">
          <CardContent className="pt-6 text-sm text-red-800">{error}</CardContent>
        </Card>
      )}
      {notice && !error && (
        <p className="text-sm text-muted-foreground">{notice}</p>
      )}

      <div id="report-day" />
      {loading && !metrics ? (
        <div className="flex items-center gap-2 text-muted-foreground py-16 justify-center">
          <Loader2 className="h-5 w-5 animate-spin" />
          리포트를 불러오는 중
        </div>
      ) : !metrics ? (
        <p className="text-muted-foreground">이 날짜 리포트가 없습니다. 다시 집계를 눌러 주세요.</p>
      ) : (
        <>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">{date}</Badge>
            {report?.generated_at && (
              <span>집계 {new Date(report.generated_at).toLocaleString("ko-KR")}</span>
            )}
            {report?.email_sent_at && <span>메일 {new Date(report.email_sent_at).toLocaleString("ko-KR")}</span>}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="신규 가입"
              value={pulse!.signups}
              hint={prev ? `전일 ${prev.signups}` : undefined}
            />
            <Metric
              label="결제 주문"
              value={pulse!.paidOrders}
              hint={prev ? `전일 ${prev.paidOrders}` : undefined}
            />
            <Metric
              label="매출"
              value={won(pulse!.revenue)}
              hint={pulse!.aov ? `객단가 ${won(pulse!.aov)}` : undefined}
            />
            <Metric
              label="살펴볼 일"
              value={attn}
              warn={attn > 0}
              hint="취소큐·CS·웹훅·미발송 합"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Metric label="결제 실패" value={pulse!.paymentFailed} warn={pulse!.paymentFailed > 0} />
            <Metric
              label="쿠폰"
              value={`${pulse!.promoUsed}건`}
              hint={won(pulse!.promoDiscount)}
            />
            <Metric
              label="채널"
              value={`web ${pulse!.sources.web}`}
              hint={`app ${pulse!.sources.app + pulse!.sources.ios + pulse!.sources.android} · 기타 ${pulse!.sources.other}`}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>파이프라인 (집계 시점)</CardTitle>
              <CardDescription>
                그날 발생한 건수가 아니라 당시 남은 일. 오래된 날짜를 백필하면 없을 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pipe ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                  <p>수거 대기 <b>{pipe.booked}</b></p>
                  <p>입고 <b>{pipe.inbound}</b></p>
                  <p>작업 중 <b>{pipe.processing}</b> · 홀드 <b>{pipe.hold}</b></p>
                  <p>출고 대기 <b>{pipe.readyToShip}</b></p>
                  <p>배송 중 <b>{pipe.outForDelivery}</b></p>
                  <p>배송 완료 <b>{pipe.delivered}</b></p>
                  <p className={pipe.missingPickup ? "text-amber-700" : undefined}>
                    미수거 <b>{pipe.missingPickup}</b>
                  </p>
                  <p>3일 이상 정체 <b>{pipe.stuckOver3Days}</b></p>
                  <p>오늘 수거 {pipe.pickupsToday} · 내일 {pipe.pickupsTomorrow}</p>
                  <p>대기열 {pipe.waitlist}</p>
                  <p>
                    한도 {pipe.todayOrderCount ?? "-"} / {pipe.orderLimit ?? "없음"}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">당시 스냅샷이 없습니다. 오늘·어제만 파이프라인을 저장합니다.</p>
              )}
            </CardContent>
          </Card>

          <Card className={attn > 0 ? "border-amber-400" : undefined}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                예외
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
              <p>취소·반송 큐 <b>{ex!.cancelQueue}</b></p>
              <p>CS 이벤트 <b>{ex!.csEvents}</b></p>
              <p>추가금 대기 <b>{ex!.extraChargePending}</b></p>
              <p>보상 미지급 <b>{ex!.compensationPending}</b></p>
              <p>웹훅 오류 <b>{ex!.webhookErrors}</b></p>
              <p>웹훅 서명 실패 <b>{ex!.webhookBadSig}</b></p>
              <p>알림 미발송 <b>{ex!.notificationsUnsent}</b></p>
              <p>재시도 3회+ <b>{ex!.notificationsRetry3}</b></p>
            </CardContent>
          </Card>

          {metrics.center && (
            <p className="text-sm text-muted-foreground">
              센터: 입고 {metrics.center.inboundScans} · 작업완료 {metrics.center.workComplete} · 출고 {metrics.center.outboundScans}
              {metrics.moneyOut.paymentRefund + metrics.moneyOut.repairRefund + metrics.moneyOut.compensation > 0
                ? ` · 환불/보상 ${won(metrics.moneyOut.paymentRefund + metrics.moneyOut.repairRefund + metrics.moneyOut.compensation)}`
                : ""}
            </p>
          )}
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            추이
          </CardTitle>
          <CardDescription>
            그래프나 날짜를 누르면 그날 리포트를 엽니다. 주·월 칸은 먼저 그 구간 일별로 펼칩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {[
                ["7days", "최근 7일"],
                ["30days", "최근 30일"],
                ["week", "이번 주"],
                ["month", "이번 달"],
                ["12weeks", "12주"],
              ].map(([id, label]) => (
                <Button
                  key={id}
                  size="sm"
                  variant={preset === id ? "default" : "outline"}
                  onClick={() => applyPreset(id)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="date"
                className="w-40 h-9"
                max={trendTo}
                value={trendFrom}
                onChange={(e) => {
                  setPreset("custom");
                  setTrendFrom(e.target.value);
                }}
              />
              <span className="text-muted-foreground">~</span>
              <Input
                type="date"
                className="w-40 h-9"
                min={trendFrom}
                max={today}
                value={trendTo}
                onChange={(e) => {
                  setPreset("custom");
                  setTrendTo(e.target.value);
                }}
              />
              <Button
                size="sm"
                variant={grain === "day" ? "default" : "outline"}
                onClick={() => setGrain("day")}
              >
                일
              </Button>
              <Button
                size="sm"
                variant={grain === "week" ? "default" : "outline"}
                onClick={() => setGrain("week")}
              >
                주
              </Button>
              <Button
                size="sm"
                variant={grain === "month" ? "default" : "outline"}
                onClick={() => setGrain("month")}
              >
                월
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={working !== null}
                onClick={fillTrendRange}
              >
                {working === "fill" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                <span className="ml-2">이 기간 채우기</span>
              </Button>
              {trendLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
          </div>
          {trend.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              이 기간 스냅샷이 없습니다. 「이 기간 채우기」로 일자별 집계를 만들 수 있습니다.
            </p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {reports.length}일 스냅샷 · {grain === "day" ? "일별" : grain === "week" ? "주별 합" : "월별 합"} {trend.length}칸 · 칸을 누르면 상세
              </p>
              <div className="flex flex-wrap gap-1">
                {trend.map((point) => (
                  <Button
                    key={point.date}
                    size="sm"
                    variant={grain === "day" && point.date === date ? "default" : "outline"}
                    className="h-7 px-2 text-xs"
                    onClick={() => openTrendPoint(point.date)}
                  >
                    {point.label}
                  </Button>
                ))}
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend} onClick={(state) => openTrendPoint(trendPointDate(state))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="signups" name="가입" stroke="#6b7280" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="paidOrders" name="결제" stroke="#00C896" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="paymentFailed" name="결제실패" stroke="#d97706" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="attention" name="살펴볼 일" stroke="#dc2626" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend} onClick={(state) => openTrendPoint(trendPointDate(state))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => won(Number(value ?? 0))} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" name="매출" stroke="#111827" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
