import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isIslandArea } from '@/lib/island-area';

export const dynamic = 'force-dynamic';

/**
 * 관리자용 배송/수거 조회 API
 * 배송 지연, 도서산간 등 필터링 지원
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filter = searchParams.get('filter'); // 'all' | 'pickup' | 'delivery' | 'delayed' | 'island'
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    let query = supabaseAdmin
      .from('shipments')
      .select(`
        id,
        order_id,
        tracking_no,
        pickup_tracking_no,
        delivery_tracking_no,
        carrier,
        status,
        pickup_address,
        pickup_address_detail,
        pickup_zipcode,
        pickup_phone,
        pickup_requested_at,
        pickup_completed_at,
        delivery_address,
        delivery_address_detail,
        delivery_zipcode,
        delivery_phone,
        delivery_started_at,
        delivery_completed_at,
        customer_name,
        tracking_events,
        delivery_info,
        created_at,
        updated_at,
        orders (
          id,
          order_number,
          customer_name,
          customer_email,
          customer_phone,
          item_name,
          clothing_type,
          repair_type,
          status,
          total_price
        )
      `)
      .order('created_at', { ascending: false });

    // 필터 적용
    if (status) {
      query = query.eq('status', status);
    }

    // 날짜 필터 적용
    if (startDate) {
      query = query.gte('created_at', `${startDate}T00:00:00`);
    }
    if (endDate) {
      query = query.lte('created_at', `${endDate}T23:59:59`);
    }

    // 검색어 적용
    if (search) {
      query = query.or(`
        tracking_no.ilike.%${search}%,
        pickup_tracking_no.ilike.%${search}%,
        delivery_tracking_no.ilike.%${search}%,
        customer_name.ilike.%${search}%,
        pickup_address.ilike.%${search}%,
        delivery_address.ilike.%${search}%
      `);
    }

    const { data: shipments, error } = await query;

    if (error) {
      console.error('배송 조회 실패:', error);
      console.error('에러 상세:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return NextResponse.json(
        { 
          error: '배송 조회 실패', 
          details: error.message,
          code: error.code,
        },
        { status: 500 }
      );
    }

    console.log(`✅ 배송 데이터 조회 성공: ${shipments?.length || 0}건`);

    // 배송 지연 및 도서산간 계산
    const processedShipments = (shipments || []).map((shipment: any) => {
      const deliveryInfo = shipment.delivery_info || {};
      
      // 도서산간 판단 로직 (231개 우편번호 데이터 기반)
      // 수거지 또는 배송지 중 하나라도 도서산간이면 도서산간으로 표시
      let isIsland = isIslandArea(shipment.pickup_zipcode) || isIslandArea(shipment.delivery_zipcode);
      
      // 우편번호가 없는 경우 주소 텍스트로 도서산간 판단 (fallback)
      // 주의: 확실한 섬 지역만 포함 (군/시 전체가 아닌 특정 지역만)
      if (!isIsland) {
        const pickupAddr = (shipment.pickup_address || '');
        const deliveryAddr = (shipment.delivery_address || '');
        const allAddress = pickupAddr + ' ' + deliveryAddr;
        
        // 확실한 도서산간 키워드 (전체가 섬인 지역 또는 특정 섬 이름)
        const islandKeywords = [
          // 전체가 섬인 광역 지역
          '제주특별자치도', '제주시', '서귀포시',
          '울릉군', '울릉도',
          // 특정 섬 이름
          '독도', '우도', '마라도', '비양도', '추자도', '가파도',
          '백령도', '대청도', '소청도', '연평도', '덕적도', '영흥도',
          '흑산도', '홍도', '청산도', '보길도', '노화도', '금오도',
          '거문도', '사량도', '욕지도', '한산도', '매물도',
        ];
        
        if (islandKeywords.some(keyword => allAddress.includes(keyword))) {
          isIsland = true;
        }
      }
      
      const notifyMsg = deliveryInfo.notifyMsg || '';
      const isSaturdayClosed = deliveryInfo.isSaturdayClosed || 
        notifyMsg.includes('토요배달') || notifyMsg.includes('토요배송');
      const saturdayClosedMessage = deliveryInfo.saturdayClosedMessage || '';

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // 도서산간 지역은 +1일 추가
      const extraDays = isIsland ? 1 : 0;
      
      // ==========================================
      // 수거 지연 계산 (익일 수거 기준)
      // ==========================================
      let isPickupDelayed = false;
      let pickupDelayDays = 0;
      let expectedPickupDate: Date | null = null;
      
      // 수거 예약 상태(BOOKED)이고 아직 수거 완료되지 않은 경우
      if (shipment.status === 'BOOKED' && 
          shipment.pickup_requested_at && 
          !shipment.pickup_completed_at) {
        const pickupRequestedAt = new Date(shipment.pickup_requested_at);
        
        // 예상 수거일: 예약일 + 1일 (도서산간 +1일 추가)
        expectedPickupDate = new Date(pickupRequestedAt);
        expectedPickupDate.setDate(expectedPickupDate.getDate() + 1 + extraDays);
        expectedPickupDate.setHours(23, 59, 59, 999); // 해당 날짜 끝까지 여유
        
        // 일요일 제외 (일요일이면 월요일로)
        if (expectedPickupDate.getDay() === 0) {
          expectedPickupDate.setDate(expectedPickupDate.getDate() + 1);
        }
        
        if (today > expectedPickupDate) {
          isPickupDelayed = true;
          const expectedDate = new Date(expectedPickupDate);
          expectedDate.setHours(0, 0, 0, 0);
          pickupDelayDays = Math.floor((today.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24));
        }
      }
      
      // ==========================================
      // 배송 지연 계산 (익일 배송 기준)
      // ==========================================
      let isDeliveryDelayed = false;
      let deliveryDelayDays = 0;
      let expectedDeliveryDate: Date | null = null;

      // 배송 관련 상태일 때만 지연 계산 (출고 후 익일 도착 기준)
      if ((shipment.status === 'READY_TO_SHIP' || 
          shipment.status === 'OUT_FOR_DELIVERY' || 
          shipment.status === 'IN_TRANSIT') &&
          !shipment.delivery_completed_at) {
        
        // 배송 시작일 기준
        const deliveryStartDate = shipment.delivery_started_at 
          ? new Date(shipment.delivery_started_at)
          : shipment.updated_at
          ? new Date(shipment.updated_at)
          : null;

        if (deliveryStartDate) {
          // 예상 배송 완료일: 출고일 + 1일 (도서산간 +1일 추가)
          expectedDeliveryDate = new Date(deliveryStartDate);
          expectedDeliveryDate.setDate(expectedDeliveryDate.getDate() + 1 + extraDays);
          expectedDeliveryDate.setHours(23, 59, 59, 999); // 해당 날짜 끝까지 여유
          
          // 일요일 제외 (일요일이면 월요일로)
          if (expectedDeliveryDate.getDay() === 0) {
            expectedDeliveryDate.setDate(expectedDeliveryDate.getDate() + 1);
          }

          if (today > expectedDeliveryDate) {
            isDeliveryDelayed = true;
            const expectedDate = new Date(expectedDeliveryDate);
            expectedDate.setHours(0, 0, 0, 0);
            deliveryDelayDays = Math.floor((today.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24));
          }
        }
      }
      
      // 통합 지연 여부 (수거 지연 OR 배송 지연)
      const isDelayed = isPickupDelayed || isDeliveryDelayed;
      const delayDays = Math.max(pickupDelayDays, deliveryDelayDays);

      return {
        ...shipment,
        isDelayed,
        delayDays,
        // 수거 지연 정보
        isPickupDelayed,
        pickupDelayDays,
        expectedPickupDate: expectedPickupDate?.toISOString() || null,
        // 배송 지연 정보
        isDeliveryDelayed,
        deliveryDelayDays,
        expectedDeliveryDate: expectedDeliveryDate?.toISOString() || null,
        // 기타 정보
        isIsland,
        isSaturdayClosed,
        notifyMsg,
        saturdayClosedMessage,
      };
    });

    // 필터별 정렬 및 필터링
    let filteredShipments = processedShipments;

    if (filter === 'delayed') {
      // 전체 지연 (수거 지연 + 배송 지연)
      filteredShipments = processedShipments.filter((s: any) => s.isDelayed);
    } else if (filter === 'pickupDelayed') {
      // 수거 지연만
      filteredShipments = processedShipments.filter((s: any) => s.isPickupDelayed);
    } else if (filter === 'deliveryDelayed') {
      // 배송 지연만
      filteredShipments = processedShipments.filter((s: any) => s.isDeliveryDelayed);
    } else if (filter === 'island') {
      filteredShipments = processedShipments.filter((s: any) => s.isIsland);
    } else if (filter === 'pickup') {
      // 수거 관련: BOOKED, PICKED_UP
      filteredShipments = processedShipments.filter((s: any) => 
        ['BOOKED', 'PICKED_UP'].includes(s.status)
      );
    } else if (filter === 'delivery') {
      // 배송 관련: OUT_FOR_DELIVERY, DELIVERED
      filteredShipments = processedShipments.filter((s: any) => 
        ['OUT_FOR_DELIVERY', 'DELIVERED'].includes(s.status)
      );
    }

    // 정렬: 수거지연 > 배송지연 > 도서산간 > 일반 (지연일수 내림차순)
    filteredShipments.sort((a: any, b: any) => {
      // 수거 지연 우선
      if (a.isPickupDelayed && !b.isPickupDelayed) return -1;
      if (!a.isPickupDelayed && b.isPickupDelayed) return 1;
      
      // 수거 지연일수로 정렬 (많은 순)
      if (a.isPickupDelayed && b.isPickupDelayed) {
        return b.pickupDelayDays - a.pickupDelayDays;
      }
      
      // 배송 지연 우선
      if (a.isDeliveryDelayed && !b.isDeliveryDelayed) return -1;
      if (!a.isDeliveryDelayed && b.isDeliveryDelayed) return 1;
      
      // 배송 지연일수로 정렬 (많은 순)
      if (a.isDeliveryDelayed && b.isDeliveryDelayed) {
        return b.deliveryDelayDays - a.deliveryDelayDays;
      }

      // 도서산간 우선
      if (a.isIsland && !b.isIsland) return -1;
      if (!a.isIsland && b.isIsland) return 1;

      // 최신순
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // 통계 계산 (필터링 전 전체 데이터 기준)
    const stats = {
      total: processedShipments.length,
      pickupPending: processedShipments.filter((s: any) => s.status === 'BOOKED').length,
      pickupCompleted: processedShipments.filter((s: any) => s.status === 'PICKED_UP').length,
      inDelivery: processedShipments.filter((s: any) => 
        ['OUT_FOR_DELIVERY', 'IN_TRANSIT'].includes(s.status)
      ).length,
      delivered: processedShipments.filter((s: any) => s.status === 'DELIVERED').length,
      delayed: processedShipments.filter((s: any) => s.isDelayed).length,
      pickupDelayed: processedShipments.filter((s: any) => s.isPickupDelayed).length,
      deliveryDelayed: processedShipments.filter((s: any) => s.isDeliveryDelayed).length,
      island: processedShipments.filter((s: any) => s.isIsland).length,
      saturdayClosed: processedShipments.filter((s: any) => s.isSaturdayClosed).length,
    };

    // 페이징 처리
    const totalCount = filteredShipments.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pagedShipments = filteredShipments.slice(startIndex, endIndex);

    return NextResponse.json({ 
      data: pagedShipments, 
      stats,
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
      success: true 
    });
  } catch (error: any) {
    console.error('API 에러:', error);
    return NextResponse.json(
      { error: '서버 오류', details: error.message },
      { status: 500 }
    );
  }
}

