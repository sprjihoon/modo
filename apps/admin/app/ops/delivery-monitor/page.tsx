"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

interface ShipmentWithOrder {
  id: string;
  order_id: string;
  tracking_no: string;
  pickup_tracking_no: string;
  status: string;
  created_at: string;
  updated_at: string;
  delivery_status?: string;
  notify_msg?: string;
  island_add_fee?: string;
  order: {
    id: string;
    customer_name: string;
    item_name: string;
    status: string;
    delivery_zipcode: string;
    delivery_address: string;
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
      
      let query = supabase
        .from('shipments')
        .select(`
          *,
          order:orders!inner(
            id,
            customer_name,
            item_name,
            status,
            delivery_zipcode,
            delivery_address
          )
        `)
        .order('created_at', { ascending: false });

      // 필터 적용
      if (filter === 'island') {
        // 도서산간 지역 (island_add_fee가 있는 경우)
        query = query.not('island_add_fee', 'is', null);
      }

      const { data, error } = await query;

      if (error) throw error;

      // 배송 지연 필터 (생성 후 3일 이상 경과, DELIVERED 아닌 경우)
      let filtered = data || [];
      if (filter === 'delayed') {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        
        filtered = filtered.filter((s: any) => {
          const createdAt = new Date(s.created_at);
          return createdAt < threeDaysAgo && s.order.status !== 'DELIVERED';
        });
      }

      // 배송 지연된 것을 상단에 배치
      filtered.sort((a: any, b: any) => {
        const aDelayed = isDelayed(a);
        const bDelayed = isDelayed(b);
        
        if (aDelayed && !bDelayed) return -1;
        if (!aDelayed && bDelayed) return 1;
        
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setShipments(filtered as ShipmentWithOrder[]);
    } catch (error: any) {
      console.error('배송 정보 로드 실패:', error);
      alert(`배송 정보 로드 실패: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const isDelayed = (shipment: any): boolean => {
    const createdAt = new Date(shipment.created_at);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    // 도서산간은 4일로 여유
    if (shipment.island_add_fee) {
      const fourDaysAgo = new Date();
      fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
      return createdAt < fourDaysAgo && shipment.order.status !== 'DELIVERED';
    }
    
    return createdAt < threeDaysAgo && shipment.order.status !== 'DELIVERED';
  };

  const getStatusColor = (shipment: ShipmentWithOrder): string => {
    if (isDelayed(shipment)) return 'text-red-600';
    if (shipment.island_add_fee) return 'text-orange-600';
    if (shipment.notify_msg?.includes('토요배달')) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getStatusBadge = (shipment: ShipmentWithOrder): string => {
    if (isDelayed(shipment)) return '⚠️ 지연';
    if (shipment.island_add_fee) return '🏝️ 도서산간';
    if (shipment.notify_msg?.includes('토요배달')) return '📅 토요휴무';
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
                        <span className="font-medium">{shipment.order.customer_name}</span>
                        <span className="text-sm text-gray-500">
                          {shipment.order.item_name}
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
                          {shipment.order.delivery_address} ({shipment.order.delivery_zipcode})
                        </div>
                        
                        {/* 알림 메시지 */}
                        {shipment.notify_msg && (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                            <span className="text-yellow-800 text-sm">
                              ⚠️ {shipment.notify_msg}
                            </span>
                          </div>
                        )}
                        
                        {/* 도서산간 부가요금 */}
                        {shipment.island_add_fee && (
                          <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded">
                            <span className="text-orange-800 text-sm">
                              🏝️ 도서산간 부가요금: {shipment.island_add_fee}원
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-2 text-xs text-gray-400">
                        생성: {new Date(shipment.created_at).toLocaleString('ko-KR')}
                        {isDelayed(shipment) && (
                          <span className="ml-2 text-red-500 font-semibold">
                            ({Math.floor((new Date().getTime() - new Date(shipment.created_at).getTime()) / (1000 * 60 * 60 * 24))}일 경과)
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(`https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=${shipment.pickup_tracking_no}`, '_blank')}
                      >
                        수거 추적
                      </Button>
                      {shipment.tracking_no && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=${shipment.tracking_no}`, '_blank')}
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
