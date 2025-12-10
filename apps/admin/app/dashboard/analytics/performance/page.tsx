'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, RefreshCw, Calendar } from 'lucide-react';
import { SummaryCards } from '@/components/analytics/summary-cards';
import { Leaderboard } from '@/components/analytics/leaderboard';
import { AuditTrail } from '@/components/analytics/audit-trail';
import { ActionLog } from '@/lib/types/action-log';
import { getAllLogs } from '@/lib/api/action-logs';
import {
  getDateRange,
  calculateWorkerKPIs,
  calculateManagerKPIs,
  calculateSummaryStats,
  getPeriodDisplayName,
} from '@/lib/utils/kpi-calculator';

type Period = 'today' | 'week' | 'month';

export default function PerformanceDashboardPage() {
  const [period, setPeriod] = useState<Period>('today');
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 현재 기간에 맞는 로그만 가져오기
      const range = getDateRange(period);
      
      // 최대 1000개까지 가져오기 (기간 필터링은 클라이언트에서)
      const allLogs = await getAllLogs(1000);
      
      // 기간 필터링
      const filteredLogs = allLogs.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate >= range.start && logDate <= range.end;
      });
      
      setLogs(filteredLogs);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [period]);

  // KPI 계산
  const range = getDateRange(period);
  const workerKPIs = calculateWorkerKPIs(logs, range);
  const managerKPIs = calculateManagerKPIs(logs, range);
  const summaryStats = calculateSummaryStats(logs, range);
  
  // 최근 로그 20개
  const recentLogs = [...logs]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">직원 성과 대시보드</h2>
          <p className="text-muted-foreground mt-1">
            작업자와 관리자의 업무 활동 분석
          </p>
        </div>
        <Button
          onClick={loadData}
          disabled={isLoading}
          variant="outline"
          size="sm"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          새로고침
        </Button>
      </div>

      {/* 기간 선택 & 마지막 업데이트 시간 */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium">기간 선택:</span>
          <Select
            value={period}
            onValueChange={(value) => setPeriod(value as Period)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">오늘</SelectItem>
              <SelectItem value="week">이번 주</SelectItem>
              <SelectItem value="month">이번 달</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">
          마지막 업데이트: {lastUpdated.toLocaleTimeString('ko-KR')}
        </div>
      </div>

      {/* 로딩 상태 */}
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                데이터를 불러오는 중...
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 데이터 없음 */}
          {logs.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <p className="text-lg font-medium mb-2">
                    {getPeriodDisplayName(period)} 데이터가 없습니다
                  </p>
                  <p className="text-sm text-muted-foreground">
                    다른 기간을 선택하거나 직원들의 활동을 기다려주세요.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* 요약 카드 */}
              <SummaryCards
                totalWorkComplete={summaryStats.totalWorkComplete}
                totalScanOutbound={summaryStats.totalScanOutbound}
                totalPendingWork={summaryStats.totalPendingWork}
                totalExtraChargeRequests={summaryStats.totalExtraChargeRequests}
              />

              {/* 랭킹 리스트 */}
              <Leaderboard
                workerKPIs={workerKPIs}
                managerKPIs={managerKPIs}
              />

              {/* 활동 로그 이력 */}
              <AuditTrail logs={recentLogs} />

              {/* 통계 정보 */}
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-sm text-muted-foreground">총 로그 수</p>
                      <p className="text-2xl font-bold">{logs.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">활동 작업자</p>
                      <p className="text-2xl font-bold">{workerKPIs.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">활동 관리자</p>
                      <p className="text-2xl font-bold">{managerKPIs.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">기간</p>
                      <p className="text-2xl font-bold">{getPeriodDisplayName(period)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}

