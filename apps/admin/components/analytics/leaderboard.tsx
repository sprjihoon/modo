import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award } from 'lucide-react';
import { WorkerKPI, ManagerKPI, formatDuration } from '@/lib/utils/kpi-calculator';

export interface LeaderboardProps {
  workerKPIs: WorkerKPI[];
  managerKPIs: ManagerKPI[];
}

export function Leaderboard({ workerKPIs, managerKPIs }: LeaderboardProps) {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return (
          <div className="h-5 w-5 flex items-center justify-center text-sm font-semibold text-gray-500">
            {rank}
          </div>
        );
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 2:
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 3:
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* 작업자 랭킹 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            작업자 랭킹
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            작업 완료 건수 기준
          </p>
        </CardHeader>
        <CardContent>
          {workerKPIs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              작업자 데이터가 없습니다
            </div>
          ) : (
            <div className="space-y-3">
              {workerKPIs.map((worker, index) => (
                <div
                  key={worker.actorId}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    index < 3 ? 'bg-gradient-to-r from-white to-gray-50' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex-shrink-0">
                      {getRankIcon(index + 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm truncate">
                          {worker.actorName}
                        </p>
                        {index < 3 && (
                          <Badge
                            variant="outline"
                            className={`text-xs ${getRankBadgeColor(index + 1)}`}
                          >
                            {index + 1}위
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>완료: {worker.workCompleteCount}건</span>
                        {worker.avgWorkDuration && (
                          <span>평균: {formatDuration(worker.avgWorkDuration)}</span>
                        )}
                        {worker.extraChargeRequestCount > 0 && (
                          <span>추가과금: {worker.extraChargeRequestCount}건</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    <Badge variant="secondary" className="font-bold">
                      {worker.workCompleteCount}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 관리자 랭킹 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-blue-500" />
            관리자 랭킹
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            입출고 + CS 처리 건수 기준
          </p>
        </CardHeader>
        <CardContent>
          {managerKPIs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              관리자 데이터가 없습니다
            </div>
          ) : (
            <div className="space-y-3">
              {managerKPIs.map((manager, index) => (
                <div
                  key={manager.actorId}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    index < 3 ? 'bg-gradient-to-r from-white to-blue-50' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex-shrink-0">
                      {getRankIcon(index + 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm truncate">
                          {manager.actorName}
                        </p>
                        {index < 3 && (
                          <Badge
                            variant="outline"
                            className={`text-xs ${getRankBadgeColor(index + 1)}`}
                          >
                            {index + 1}위
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>입출고: {manager.scanCount}건</span>
                        <span>CS: {manager.csCount}건</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    <Badge variant="secondary" className="font-bold">
                      {manager.scanCount + manager.csCount}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

