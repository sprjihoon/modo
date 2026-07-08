"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ShipmentWithOrder {
  id: string;
  order_id: string;
  tracking_no: string;
  pickup_tracking_no: string;
  delivery_tracking_no: string;
  status: string;
  created_at: string;
  updated_at: string;
  notify_msg?: string;
  isIsland?: boolean;
  isDelayed?: boolean;
  isPickupDelayed?: boolean;
  isDeliveryDelayed?: boolean;
  pickup_address?: string;
  delivery_address?: string;
  orders?: {
    id: string;
    customer_name: string;
    item_name: string;
    status: string;
    delivery_zipcode?: string;
    delivery_address?: string;
  };
}

export default function DeliveryMonitorPage() {
  const [shipments, setShipments] = useState<ShipmentWithOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'delayed' | 'island'>('all');

  useEffect(() => {
    loadShipments();
  }, [filter]);

  const loadShipments = async () => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams({ pageSize: "200" });
      if (filter === 'island') params.set('filter', 'island');
      if (filter === 'delayed') params.set('filter', 'delayed');

      const res = await fetch(`/api/shipments?${params.toString()}`);
      if (!res.ok) throw new Error(`서버 오류 (${res.status})`);
      const result = await res.json();

      if (result.error) throw new Error(result.error);

      setShipments(result.data || []);
    } catch (error: any) {
      console.error('배송 정보 로드 실패:', error);
      alert(`배송 정보 로드 실패: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (shipment: ShipmentWithOrder): string => {
    if (shipment.isDelayed) return 'text-red-600';
    if (shipment.isIsland) return 'text-orange-600';
    if (shipment.notify_msg?.includes('토요배달') || shipment.notify_msg?.includes('토요배송')) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getStatusBadge = (shipment: ShipmentWithOrder): string => {
    if (shipment.isPickupDelayed) return `⚠️ 수거지연 ${(shipment as any).pickupDelayDays || ''}일`;
    if (shipment.isDeliveryDelayed) return `⚠️ 배송지연 ${(shipment as any).deliveryDelayDays || ''}일`;
    if (shipment.isIsland) return '🏝️ 도서산간';
    if (shipment.notify_msg?.includes('토요배달') || shipment.notify_msg?.includes('토요배송')) return '📅 토요휴무';
    return '✅ 정상';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">배송 모니터링</h1>
        <p className="text-muted-foreground">수거/배송 상태를 실시간으로 확인합니다</p>
      </div>

      {/* 필터 버튼 */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          전체
        </Button>
        <Button
          variant={filter === 'delayed' ? 'default' : 'outline'}
          onClick={() => setFilter('delayed')}
        >
          지연된 배송
        </Button>
        <Button
          variant={filter === 'island' ? 'default' : 'outline'}
          onClick={() => setFilter('island')}
        >
          도서산간 지역
        </Button>
      </div>

      {/* 배송 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>배송 목록 ({shipments.length}건)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">로딩 중...</div>
          ) : shipments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              배송 정보가 없습니다
            </div>
          ) : (
            <div className="space-y-3">
              {shipments.map((shipment) => (
                <div
                  key={shipment.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`font-bold ${getStatusColor(shipment)}`}>
                          {getStatusBadge(shipment)}
                        </span>
                        <span className="font-medium">{shipment.orders?.customer_name || shipment.orders?.customer_name || '-'}</span>
                        <span className="text-sm text-gray-500">
                          {shipment.orders?.item_name || '-'}
                        </span>
                      </div>
                      
                      <div className="text-sm space-y-1">
                        <div>
                          <span className="text-gray-500">수거 송장:</span>{' '}
                          <span className="font-mono">{shipment.pickup_tracking_no}</span>
                        </div>
                        {shipment.tracking_no && (
                          <div>
                            <span className="text-gray-500">출고 송장:</span>{' '}
                            <span className="font-mono">{shipment.tracking_no}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-500">주소:</span>{' '}
                          {shipment.delivery_address || shipment.orders?.delivery_address || '-'}
                        </div>
                        
                        {/* 알림 메시지 */}
                        {shipment.notify_msg && (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                            <span className="text-yellow-800 text-sm">
                              ⚠️ {shipment.notify_msg}
                            </span>
                          </div>
                        )}
                        
                        {/* 도서산간 */}
                        {shipment.isIsland && (
                          <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded">
                            <span className="text-orange-800 text-sm">
                              🏝️ 도서산간 지역 (+1일 추가 소요)
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-2 text-xs text-gray-400">
                        생성: {new Date(shipment.created_at).toLocaleString('ko-KR')}
                        {shipment.isDelayed && (
                          <span className="ml-2 text-red-500 font-semibold">
                            ({Math.floor((new Date().getTime() - new Date(shipment.created_at).getTime()) / (1000 * 60 * 60 * 24))}일 경과)
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {shipment.pickup_tracking_no && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=${shipment.pickup_tracking_no}`, '_blank')}
                        >
                          수거 추적
                        </Button>
                      )}
                      {(shipment.delivery_tracking_no || shipment.tracking_no) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=${shipment.delivery_tracking_no || shipment.tracking_no}`, '_blank')}
                        >
                          출고 추적
                        </Button>
                      )}
                    </div>
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
