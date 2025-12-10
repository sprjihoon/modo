'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  UserCircle, 
  Package, 
  CheckCircle, 
  PlayCircle, 
  DollarSign,
  ThumbsUp,
  ThumbsDown,
  Truck,
  RotateCcw,
  UserCog,
  UserX,
  LogIn,
  LogOut,
} from 'lucide-react';
import { ActionLog, ActionType, ACTION_TYPE_DISPLAY_NAME } from '@/lib/types/action-log';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import Link from 'next/link';

export interface AuditTrailProps {
  logs: ActionLog[];
}

export function AuditTrail({ logs }: AuditTrailProps) {
  const getActionIcon = (actionType: ActionType) => {
    switch (actionType) {
      case ActionType.LOGIN:
        return <LogIn className="h-4 w-4" />;
      case ActionType.LOGOUT:
        return <LogOut className="h-4 w-4" />;
      case ActionType.SCAN_INBOUND:
        return <Package className="h-4 w-4" />;
      case ActionType.WORK_START:
        return <PlayCircle className="h-4 w-4" />;
      case ActionType.WORK_COMPLETE:
        return <CheckCircle className="h-4 w-4" />;
      case ActionType.REQ_EXTRA_CHARGE:
        return <DollarSign className="h-4 w-4" />;
      case ActionType.APPROVE_EXTRA:
        return <ThumbsUp className="h-4 w-4" />;
      case ActionType.REJECT_EXTRA:
        return <ThumbsDown className="h-4 w-4" />;
      case ActionType.SCAN_OUTBOUND:
        return <Truck className="h-4 w-4" />;
      case ActionType.RETURN_PROCESS:
        return <RotateCcw className="h-4 w-4" />;
      case ActionType.UPDATE_USER:
        return <UserCog className="h-4 w-4" />;
      case ActionType.DELETE_USER:
        return <UserX className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getActionColor = (actionType: ActionType) => {
    switch (actionType) {
      case ActionType.LOGIN:
      case ActionType.WORK_START:
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case ActionType.WORK_COMPLETE:
      case ActionType.APPROVE_EXTRA:
        return 'bg-green-100 text-green-700 border-green-200';
      case ActionType.SCAN_INBOUND:
      case ActionType.SCAN_OUTBOUND:
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case ActionType.REQ_EXTRA_CHARGE:
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case ActionType.REJECT_EXTRA:
      case ActionType.RETURN_PROCESS:
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case ActionType.DELETE_USER:
      case ActionType.LOGOUT:
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-700';
      case 'MANAGER':
        return 'bg-blue-100 text-blue-700';
      case 'WORKER':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatLogMessage = (log: ActionLog): string => {
    const action = ACTION_TYPE_DISPLAY_NAME[log.action_type];
    const target = log.target_id ? ` (${log.target_id.substring(0, 8)}...)` : '';
    
    return `${log.actor_name}님이 ${action}${target}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          최근 활동 로그
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          최근 20개의 액션 이력
        </p>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            활동 로그가 없습니다
          </div>
        ) : (
          <div className="h-[500px] overflow-y-auto pr-4">
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.log_id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
                >
                  {/* 아이콘 */}
                  <div className={`flex-shrink-0 p-2 rounded-lg border ${getActionColor(log.action_type)}`}>
                    {getActionIcon(log.action_type)}
                  </div>

                  {/* 내용 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">
                        {formatLogMessage(log)}
                      </p>
                      <Badge
                        variant="outline"
                        className={`text-xs ${getRoleBadgeColor(log.actor_role)}`}
                      >
                        {log.actor_role}
                      </Badge>
                    </div>

                    {/* 메타데이터 */}
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {Object.entries(log.metadata).map(([key, value]) => (
                          <span key={key} className="mr-3">
                            {key}: {String(value)}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* 시간 */}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(log.timestamp), {
                        addSuffix: true,
                        locale: ko,
                      })}
                    </p>
                  </div>

                  {/* 주문 링크 */}
                  {log.target_id && log.target_id.startsWith('O-') && (
                    <Link
                      href={`/dashboard/orders/${log.target_id}`}
                      className="flex-shrink-0 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      상세보기 →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

