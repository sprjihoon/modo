"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Activity, 
  Search, 
  Filter, 
  Download,
  RefreshCw,
  Calendar,
  User,
  Shield,
  AlertCircle,
} from "lucide-react";
import { ActionLog, ActionType, ACTION_TYPE_DISPLAY_NAME, ACTION_TYPE_CATEGORY } from "@/lib/types/action-log";

export default function ActionLogsPage() {
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ActionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedActionType, setSelectedActionType] = useState<string>("all");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [logs, searchTerm, selectedActionType, selectedRole, startDate, endDate]);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({ limit: '500' });
      
      const response = await fetch(`/api/admin/action-logs?${params}`);
      const data = await response.json();

      if (data.success) {
        setLogs(data.data || []);
      } else {
        console.error('로그 조회 실패:', data.error);
        alert('로그를 불러오는데 실패했습니다: ' + data.error);
      }
    } catch (error) {
      console.error('로그 조회 중 오류:', error);
      alert('로그를 불러오는데 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...logs];

    // 검색어 필터 (이름, 액션 타입으로 검색)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(log => 
        log.actor_name.toLowerCase().includes(term) ||
        ACTION_TYPE_DISPLAY_NAME[log.action_type].includes(term)
      );
    }

    // 액션 타입 필터
    if (selectedActionType !== "all") {
      filtered = filtered.filter(log => log.action_type === selectedActionType);
    }

    // 역할 필터
    if (selectedRole !== "all") {
      filtered = filtered.filter(log => log.actor_role === selectedRole);
    }

    // 날짜 범위 필터
    if (startDate) {
      filtered = filtered.filter(log => new Date(log.timestamp) >= new Date(startDate));
    }
    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      filtered = filtered.filter(log => new Date(log.timestamp) <= endDateTime);
    }

    setFilteredLogs(filtered);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedActionType("all");
    setSelectedRole("all");
    setStartDate("");
    setEndDate("");
  };

  const exportToCSV = () => {
    const headers = ["시간", "직원명", "역할", "액션", "대상 ID", "메타데이터"];
    const rows = filteredLogs.map(log => [
      new Date(log.timestamp).toLocaleString('ko-KR'),
      log.actor_name,
      log.actor_role,
      ACTION_TYPE_DISPLAY_NAME[log.action_type],
      log.target_id || '-',
      JSON.stringify(log.metadata || {}),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `action-logs-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getActionTypeBadgeColor = (actionType: ActionType) => {
    const category = ACTION_TYPE_CATEGORY[actionType];
    switch (category) {
      case 'COMMON':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
      case 'WORKER':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'MANAGER':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'ADMIN':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'MANAGER':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'WORKER':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            직원 행동 분석
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            직원들의 업무 활동 로그를 확인하고 분석할 수 있습니다 (관리자 전용)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            disabled={filteredLogs.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            CSV 내보내기
          </Button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 로그</CardTitle>
            <Activity className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.length.toLocaleString()}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              총 {filteredLogs.length.toLocaleString()}개 필터링됨
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">고유 직원</CardTitle>
            <User className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(logs.map(log => log.actor_id)).size}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              활동한 직원 수
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">오늘 활동</CardTitle>
            <Calendar className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logs.filter(log => {
                const logDate = new Date(log.timestamp).toDateString();
                const today = new Date().toDateString();
                return logDate === today;
              }).length}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              오늘 기록된 로그
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">최근 활동</CardTitle>
            <AlertCircle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logs.length > 0 ? new Date(logs[0].timestamp).toLocaleTimeString('ko-KR', { 
                hour: '2-digit', 
                minute: '2-digit' 
              }) : '-'}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              마지막 로그 시간
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 필터 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            필터
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* 검색 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">검색</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="직원명, 액션 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* 액션 타입 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">액션 타입</label>
              <select
                value={selectedActionType}
                onChange={(e) => setSelectedActionType(e.target.value)}
                className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
              >
                <option value="all">전체</option>
                {Object.values(ActionType).map((type) => (
                  <option key={type} value={type}>
                    {ACTION_TYPE_DISPLAY_NAME[type]}
                  </option>
                ))}
              </select>
            </div>

            {/* 역할 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">역할</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
              >
                <option value="all">전체</option>
                <option value="ADMIN">관리자</option>
                <option value="MANAGER">매니저</option>
                <option value="WORKER">작업자</option>
              </select>
            </div>

            {/* 시작 날짜 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">시작 날짜</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            {/* 종료 날짜 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">종료 날짜</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* 필터 초기화 버튼 */}
          {(searchTerm || selectedActionType !== "all" || selectedRole !== "all" || startDate || endDate) && (
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
              >
                필터 초기화
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 로그 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            로그 목록
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({filteredLogs.length}개)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>시간</TableHead>
                  <TableHead>직원명</TableHead>
                  <TableHead>역할</TableHead>
                  <TableHead>액션</TableHead>
                  <TableHead>대상 ID</TableHead>
                  <TableHead>메타데이터</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                      로그가 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.log_id}>
                      <TableCell className="font-mono text-sm whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('ko-KR')}
                      </TableCell>
                      <TableCell className="font-medium">
                        {log.actor_name}
                      </TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(log.actor_role)}>
                          {log.actor_role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getActionTypeBadgeColor(log.action_type)}>
                          {ACTION_TYPE_DISPLAY_NAME[log.action_type]}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-gray-600 dark:text-gray-400">
                        {log.target_id ? (
                          <span className="truncate max-w-[150px] inline-block" title={log.target_id}>
                            {log.target_id}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.metadata && Object.keys(log.metadata).length > 0 ? (
                          <details className="cursor-pointer">
                            <summary className="text-sm text-blue-600 dark:text-blue-400">
                              {Object.keys(log.metadata).length}개 항목
                            </summary>
                            <pre className="mt-2 text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded overflow-auto max-w-md">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

