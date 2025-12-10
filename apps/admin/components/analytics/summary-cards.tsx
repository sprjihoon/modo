import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Package, Clock, AlertCircle } from 'lucide-react';

export interface SummaryCardsProps {
  totalWorkComplete: number;
  totalScanOutbound: number;
  totalPendingWork: number;
  totalExtraChargeRequests: number;
}

export function SummaryCards({
  totalWorkComplete,
  totalScanOutbound,
  totalPendingWork,
  totalExtraChargeRequests,
}: SummaryCardsProps) {
  const cards = [
    {
      title: '전체 작업 건수',
      value: totalWorkComplete,
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: '출고 건수',
      value: totalScanOutbound,
      icon: Package,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: '대기 중인 작업',
      value: totalPendingWork,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      title: '추가과금 요청',
      value: totalExtraChargeRequests,
      icon: AlertCircle,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {card.title}
            </CardTitle>
            <div className={`${card.bgColor} p-2 rounded-lg`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {card.value > 0 ? '활발한 활동 중' : '활동 없음'}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

