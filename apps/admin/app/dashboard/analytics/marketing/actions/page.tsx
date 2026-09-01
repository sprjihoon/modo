"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, RefreshCw, Copy, Users, ShoppingCart, Ticket } from "lucide-react";
import type { ActionCustomer, CouponStat, MarketingActionsData } from "@/lib/marketing-actions";
import type { CreativeStat } from "@/lib/marketing-creatives";
import { formatLastSeenAt } from "@/lib/customer-device-os";

function won(n: number) {
  return `₩${n.toLocaleString()}`;
}

function CustomerTable({
  rows,
  extra,
}: {
  rows: ActionCustomer[];
  extra?: "intent" | "paid";
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">해당하는 고객이 없습니다</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 pr-3 font-medium">고객</th>
            <th className="py-2 pr-3 font-medium">연락처</th>
            <th className="py-2 pr-3 font-medium">마지막 접속</th>
            <th className="py-2 pr-3 font-medium">{extra === "intent" ? "이탈 시각" : "마지막 결제"}</th>
            <th className="py-2 pr-3 font-medium">결제</th>
            <th className="py-2 pr-3 font-medium">조용한 기간</th>
            <th className="py-2 font-medium">이유</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b last:border-0">
              <td className="py-2 pr-3">
                <Link href={`/dashboard/customers/${row.id}`} className="font-medium text-teal-700 hover:underline">
                  {row.name || "이름 없음"}
                </Link>
              </td>
              <td className="py-2 pr-3 text-muted-foreground">{row.phone || row.email || "-"}</td>
              <td className="py-2 pr-3">{formatLastSeenAt(row.last_seen_at) || "-"}</td>
              <td className="py-2 pr-3">
                {formatLastSeenAt(extra === "intent" ? row.last_intent_at : row.last_paid_at) || "-"}
              </td>
              <td className="py-2 pr-3">
                {row.paid_orders.toLocaleString()}건 · {won(row.paid_amount)}
              </td>
              <td className="py-2 pr-3">{row.days_quiet}일</td>
              <td className="py-2 text-muted-foreground">{row.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function copyPhones(rows: ActionCustomer[]) {
  const text = rows.map((row) => row.phone).filter(Boolean).join("\n");
  if (!text) {
    alert("복사할 전화번호가 없습니다.");
    return;
  }
  navigator.clipboard.writeText(text);
  alert(`전화번호 ${text.split("\n").length}개를 복사했습니다.`);
}

export default function MarketingActionsPage() {
  const [data, setData] = useState<(MarketingActionsData & { creatives: CreativeStat[] }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("quiet30");

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analytics/marketing-actions");
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
  }, []);

  const currentRows =
    tab === "quiet60" ? data?.quiet60 :
    tab === "oneShot" ? data?.oneShot :
    tab === "abandon" ? data?.abandon :
    tab === "appOnly" ? data?.appOnly :
    data?.quiet30;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">마케팅 실행</h1>
          <p className="text-muted-foreground">
            휴면·장바구니 이탈 고객과 쿠폰 성적을 보고 누구에게 쿠폰을 줄지 정합니다
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/analytics/marketing">
            <Button variant="outline" size="sm">전후 비교·인사이트</Button>
          </Link>
          <Button onClick={load} variant="outline" size="sm" disabled={isLoading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
        </div>
      </div>

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
                <CardTitle className="text-sm text-muted-foreground">30일 휴면</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data.counts.quiet30.toLocaleString()}명</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">60일 휴면</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data.counts.quiet60.toLocaleString()}명</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">1회 구매 후 조용</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data.counts.oneShot.toLocaleString()}명</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">장바구니 이탈</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data.counts.abandon.toLocaleString()}명</p>
                <p className="text-xs text-muted-foreground mt-1">최근 30일</p>
              </CardContent>
            </Card>
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <TabsList>
                <TabsTrigger value="quiet30"><Users className="h-4 w-4 mr-1" />30일 휴면</TabsTrigger>
                <TabsTrigger value="quiet60">60일 휴면</TabsTrigger>
                <TabsTrigger value="oneShot">1회 구매</TabsTrigger>
                <TabsTrigger value="abandon"><ShoppingCart className="h-4 w-4 mr-1" />장바구니 이탈</TabsTrigger>
                <TabsTrigger value="appOnly">앱만</TabsTrigger>
                <TabsTrigger value="coupons"><Ticket className="h-4 w-4 mr-1" />쿠폰 성적</TabsTrigger>
                <TabsTrigger value="creatives">배너·팝업</TabsTrigger>
              </TabsList>
              {tab !== "coupons" && tab !== "creatives" && currentRows && (
                <Button variant="outline" size="sm" onClick={() => copyPhones(currentRows)}>
                  <Copy className="h-4 w-4 mr-2" />
                  전화번호 복사
                </Button>
              )}
            </div>

            <TabsContent value="quiet30">
              <Card>
                <CardHeader>
                  <CardTitle>30일 이상 접속·결제가 없는 고객</CardTitle>
                  <CardDescription>최근 활동(접속 또는 결제) 기준. 목록은 최대 200명</CardDescription>
                </CardHeader>
                <CardContent>
                  <CustomerTable rows={data.quiet30} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="quiet60">
              <Card>
                <CardHeader>
                  <CardTitle>60일 이상 접속·결제가 없는 고객</CardTitle>
                  <CardDescription>재방문 쿠폰을 먼저 보낼 대상</CardDescription>
                </CardHeader>
                <CardContent>
                  <CustomerTable rows={data.quiet60} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="oneShot">
              <Card>
                <CardHeader>
                  <CardTitle>한 번만 결제하고 30일 이상 지난 고객</CardTitle>
                  <CardDescription>두 번째 주문을 유도할 대상</CardDescription>
                </CardHeader>
                <CardContent>
                  <CustomerTable rows={data.oneShot} extra="paid" />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="abandon">
              <Card>
                <CardHeader>
                  <CardTitle>장바구니·결제 시작 후 결제하지 않은 고객</CardTitle>
                  <CardDescription>최근 30일 이벤트 기준. 그 이후 결제가 있으면 제외</CardDescription>
                </CardHeader>
                <CardContent>
                  <CustomerTable rows={data.abandon} extra="intent" />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="appOnly">
              <Card>
                <CardHeader>
                  <CardTitle>최근 접속이 앱인 고객</CardTitle>
                  <CardDescription>공지 대상을 「앱만 쓰는 고객」으로 보내면 이 목록에 푸시됩니다</CardDescription>
                </CardHeader>
                <CardContent>
                  <CustomerTable rows={data.appOnly} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="coupons">
              <Card>
                <CardHeader>
                  <CardTitle>쿠폰 성적표</CardTitle>
                  <CardDescription>사용 건수·결제 금액·신규/재구매. 할인만 많고 매출이 없는 코드를 가립니다</CardDescription>
                </CardHeader>
                <CardContent>
                  <CouponTable rows={data.coupons} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="creatives">
              <Card>
                <CardHeader>
                  <CardTitle>배너·팝업 반응</CardTitle>
                  <CardDescription>최근 90일 클릭. 클릭 후 7일 안 결제를 연결합니다. 웹 팝업 열람은 배포 이후부터 쌓입니다</CardDescription>
                </CardHeader>
                <CardContent>
                  <CreativeTable rows={data.creatives} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function CreativeTable({ rows }: { rows: CreativeStat[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">배너·팝업이 없습니다</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 pr-3 font-medium">유형</th>
            <th className="py-2 pr-3 font-medium">제목</th>
            <th className="py-2 pr-3 font-medium">클릭</th>
            <th className="py-2 pr-3 font-medium">고객</th>
            <th className="py-2 pr-3 font-medium">이후 결제</th>
            <th className="py-2 font-medium">매출</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.kind}-${row.id}`} className="border-b last:border-0">
              <td className="py-2 pr-3">{row.kind === "popup" ? "팝업" : "배너"}</td>
              <td className="py-2 pr-3">
                {row.title}
                {!row.is_active && <span className="text-xs text-muted-foreground ml-2">중지</span>}
              </td>
              <td className="py-2 pr-3">{row.clicks.toLocaleString()}</td>
              <td className="py-2 pr-3">{row.users.toLocaleString()}</td>
              <td className="py-2 pr-3">{row.payments.toLocaleString()}</td>
              <td className="py-2">{won(row.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CouponTable({ rows }: { rows: CouponStat[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">프로모션 코드가 없습니다</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 pr-3 font-medium">코드</th>
            <th className="py-2 pr-3 font-medium">사용</th>
            <th className="py-2 pr-3 font-medium">고객</th>
            <th className="py-2 pr-3 font-medium">매출</th>
            <th className="py-2 pr-3 font-medium">할인</th>
            <th className="py-2 pr-3 font-medium">객단가</th>
            <th className="py-2 pr-3 font-medium">신규</th>
            <th className="py-2 font-medium">재구매</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b last:border-0">
              <td className="py-2 pr-3">
                <p className="font-mono font-semibold">{row.code}</p>
                <p className="text-xs text-muted-foreground">
                  {row.description || (row.is_active ? "활성" : "중지")}
                </p>
              </td>
              <td className="py-2 pr-3">{row.uses.toLocaleString()}건</td>
              <td className="py-2 pr-3">{row.users.toLocaleString()}명</td>
              <td className="py-2 pr-3">{won(row.revenue)}</td>
              <td className="py-2 pr-3">{won(row.discount)}</td>
              <td className="py-2 pr-3">{won(row.aov)}</td>
              <td className="py-2 pr-3">{row.new_customers.toLocaleString()}</td>
              <td className="py-2">{row.repeat_customers.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
