"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Loader2, Megaphone, RefreshCw, Trash2 } from "lucide-react";
import { AD_SPEND_SOURCES, type AdPerformanceData, type AdPerformanceRow, type AdSpendRow } from "@/lib/ad-performance";
import { addDaysYmd } from "@/lib/marketing-insights";

const getToday = () => addDaysYmd(new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10), 0);
const getDaysAgo = (days: number) => addDaysYmd(getToday(), -days);

function won(n: number | null) {
  if (n == null) return "-";
  return `₩${n.toLocaleString()}`;
}

function verdictClass(key: AdPerformanceRow["verdictKey"]) {
  if (key === "keep") return "text-teal-700";
  if (key === "cut" || key === "review") return "text-red-600";
  if (key === "repeat_only") return "text-amber-700";
  return "text-muted-foreground";
}

function MetricTable({ rows, showCampaign }: { rows: AdPerformanceRow[]; showCampaign?: boolean }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">해당 기간 데이터가 없습니다</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 pr-3 font-medium">채널</th>
            {showCampaign && <th className="py-2 pr-3 font-medium">캠페인</th>}
            <th className="py-2 pr-3 font-medium text-right">광고비</th>
            <th className="py-2 pr-3 font-medium text-right">가입</th>
            <th className="py-2 pr-3 font-medium text-right">가입 CPA</th>
            <th className="py-2 pr-3 font-medium text-right">결제</th>
            <th className="py-2 pr-3 font-medium text-right">주문 CPA</th>
            <th className="py-2 pr-3 font-medium text-right">신규결제</th>
            <th className="py-2 pr-3 font-medium text-right">CAC</th>
            <th className="py-2 pr-3 font-medium text-right">가입→결제</th>
            <th className="py-2 pr-3 font-medium text-right">매출</th>
            <th className="py-2 font-medium">판단</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.sourceKey}-${row.campaign}`} className="border-b last:border-0">
              <td className="py-2 pr-3 font-medium">{row.source}</td>
              {showCampaign && <td className="py-2 pr-3">{row.campaign || "(캠페인 없음)"}</td>}
              <td className="py-2 pr-3 text-right">{won(row.spend)}</td>
              <td className="py-2 pr-3 text-right">{row.signups.toLocaleString()}</td>
              <td className="py-2 pr-3 text-right">{won(row.signupCpa)}</td>
              <td className="py-2 pr-3 text-right">{row.orders.toLocaleString()}</td>
              <td className="py-2 pr-3 text-right">{won(row.orderCpa)}</td>
              <td className="py-2 pr-3 text-right">{row.newPayers.toLocaleString()}</td>
              <td className="py-2 pr-3 text-right font-semibold">{won(row.cac)}</td>
              <td className="py-2 pr-3 text-right">{row.signupToPayRate == null ? "-" : `${row.signupToPayRate}%`}</td>
              <td className="py-2 pr-3 text-right">{won(row.revenue)}</td>
              <td className={`py-2 ${verdictClass(row.verdictKey)}`}>{row.verdict}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdPerformancePage() {
  const [startDate, setStartDate] = useState(getDaysAgo(30));
  const [endDate, setEndDate] = useState(getToday());
  const [datePreset, setDatePreset] = useState("30days");
  const [data, setData] = useState<AdPerformanceData | null>(null);
  const [spendError, setSpendError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    source: "naver",
    campaign: "",
    start_date: getDaysAgo(30),
    end_date: getToday(),
    amount: "",
    note: "",
  });

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
      const res = await fetch(`/api/analytics/ads?startDate=${startDate}&endDate=${endDate}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "불러오지 못했습니다.");
      setData(json.data);
      setSpendError(json.spendError || null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [startDate, endDate]);

  const saveSpend = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/analytics/ad-spend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "저장하지 못했습니다.");
      setForm((cur) => ({ ...cur, amount: "", note: "" }));
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const removeSpend = async (row: AdSpendRow) => {
    if (!row.id || !confirm("이 광고비를 삭제할까요?")) return;
    const res = await fetch(`/api/analytics/ad-spend?id=${row.id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok || !json.success) {
      alert(json.error || "삭제하지 못했습니다.");
      return;
    }
    await load();
  };

  const totals = data?.totals;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">광고 성과</h1>
          <p className="text-muted-foreground">
            가입 CPA · 주문 CPA · CAC로 네이버·인스타·구글·유튜브 광고를 유지할지 정리할지 봅니다
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/analytics/marketing">
            <Button variant="outline" size="sm">마케팅 인사이트</Button>
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
            ].map(([id, label]) => (
              <Button
                key={id}
                size="sm"
                variant={datePreset === id ? "default" : "outline"}
                onClick={() => applyPreset(id)}
              >
                {label}
              </Button>
            ))}
            <Input type="date" value={startDate} onChange={(e) => { setDatePreset("custom"); setStartDate(e.target.value); }} className="w-40" />
            <span className="text-muted-foreground">~</span>
            <Input type="date" value={endDate} onChange={(e) => { setDatePreset("custom"); setEndDate(e.target.value); }} className="w-40" />
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card>
          <CardContent className="pt-6 text-sm text-red-600">{error}</CardContent>
        </Card>
      )}

      {isLoading && !data && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {totals && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">광고비</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{won(totals.spend)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">가입 CPA</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{won(totals.signupCpa)}</p>
                <p className="text-xs text-muted-foreground mt-1">가입 {totals.signups.toLocaleString()}명</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">주문 CPA</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{won(totals.orderCpa)}</p>
                <p className="text-xs text-muted-foreground mt-1">결제 {totals.orders.toLocaleString()}건 · {won(totals.revenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">CAC</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{won(totals.cac)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  신규 결제 {totals.newPayers.toLocaleString()}명 · 가입→결제 {totals.signupToPayRate == null ? "-" : `${totals.signupToPayRate}%`}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5" />채널별</CardTitle>
              <CardDescription>가입은 첫 유입, 주문은 결제 직전 유입, CAC는 첫 결제 고객의 첫 유입</CardDescription>
            </CardHeader>
            <CardContent>
              <MetricTable rows={data.channels} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>캠페인별</CardTitle>
              <CardDescription>광고 URL의 utm_campaign. 채널 광고비만 있으면 캠페인 CPA는 비어 있습니다</CardDescription>
            </CardHeader>
            <CardContent>
              <MetricTable rows={data.campaigns} showCampaign />
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle>광고비 입력</CardTitle>
          <CardDescription>
            검색광고센터·메타·구글 광고 관리자에서 본 금액을 채널·캠페인·기간으로 넣습니다. 겹치는 날짜만큼 나눕니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {spendError && <p className="text-sm text-red-600">{spendError}</p>}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <select
              className="h-10 rounded-md border px-3 text-sm"
              value={form.source}
              onChange={(e) => setForm((cur) => ({ ...cur, source: e.target.value }))}
            >
              {AD_SPEND_SOURCES.map((row) => (
                <option key={row.key} value={row.key}>{row.label}</option>
              ))}
            </select>
            <Input placeholder="캠페인 (선택)" value={form.campaign} onChange={(e) => setForm((cur) => ({ ...cur, campaign: e.target.value }))} />
            <Input type="date" value={form.start_date} onChange={(e) => setForm((cur) => ({ ...cur, start_date: e.target.value }))} />
            <Input type="date" value={form.end_date} onChange={(e) => setForm((cur) => ({ ...cur, end_date: e.target.value }))} />
            <Input type="number" min={0} placeholder="금액(원)" value={form.amount} onChange={(e) => setForm((cur) => ({ ...cur, amount: e.target.value }))} />
            <Button onClick={saveSpend} disabled={saving || !form.amount}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "저장"}
            </Button>
          </div>
          <Input placeholder="메모 (선택)" value={form.note} onChange={(e) => setForm((cur) => ({ ...cur, note: e.target.value }))} />
          <div className="space-y-2">
            {(data?.spends || []).length === 0 && <p className="text-sm text-muted-foreground">이 기간과 겹치는 광고비가 없습니다</p>}
            {(data?.spends || []).map((row) => (
              <div key={row.id || `${row.source}-${row.start_date}`} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                <p>
                  {AD_SPEND_SOURCES.find((item) => item.key === row.source)?.label || row.source}
                  {row.campaign ? ` · ${row.campaign}` : " · 채널 전체"}
                  <span className="text-muted-foreground"> · {row.start_date} ~ {row.end_date}</span>
                </p>
                <div className="flex items-center gap-3">
                  <span className="font-medium">{won(row.amount)}</span>
                  {row.id && (
                    <button type="button" onClick={() => removeSpend(row)} className="text-muted-foreground hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>광고 링크에 붙일 UTM</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p><code className="text-foreground">https://modo.io.kr/?utm_source=naver&utm_medium=search&utm_campaign=수선_검색&utm_term=키워드</code></p>
          <p>인스타는 <code className="text-foreground">utm_source=instagram&utm_medium=paid_social&utm_campaign=캠페인&utm_content=소재명</code></p>
          <p>구글/유튜브는 source만 google / youtube 로 나누면 이 화면에서 같은 표로 비교됩니다</p>
        </CardContent>
      </Card>
    </div>
  );
}
