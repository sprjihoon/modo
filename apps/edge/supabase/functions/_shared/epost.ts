/**
 * 우체국 택배 API 연동
 * https://www.epost.go.kr
 */

const EPOST_API_URL = Deno.env.get('EPOST_BASE_URL') || 'https://service.epost.go.kr/api';

interface EPostAddress {
  postcode: string;
  road_address: string;
  detail_address?: string;
  phone: string;
  name: string;
}

interface EPostBookingResponse {
  tracking_no: string;
  label_url: string;
  pickup_date: string;
  pickup_time_slot: string;
}

/**
 * 우체국 수거예약
 */
export async function bookEPostPickup(
  pickup: EPostAddress,
  delivery: EPostAddress,
  itemDescription: string = '의류'
): Promise<EPostBookingResponse> {
  const apiKey = Deno.env.get('EPOST_API_KEY');
  const customerId = Deno.env.get('EPOST_CUSTOMER_ID');

  if (!apiKey || !customerId) {
    throw new Error('EPost API credentials not configured');
  }

  // TODO: 실제 우체국 API 엔드포인트에 맞게 수정
  const response = await fetch(`${EPOST_API_URL}/collect/book`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customer_id: customerId,
      pickup: {
        postcode: pickup.postcode,
        address: pickup.road_address,
        detail_address: pickup.detail_address || '',
        phone: pickup.phone,
        name: pickup.name,
      },
      delivery: {
        postcode: delivery.postcode,
        address: delivery.road_address,
        detail_address: delivery.detail_address || '',
        phone: delivery.phone,
        name: delivery.name,
      },
      item: {
        description: itemDescription,
        weight: 1.5, // kg
        box_count: 1,
      },
      pickup_date: new Date().toISOString().split('T')[0],
      time_slot: 'PM', // AM or PM
    }),
  });

  if (!response.ok) {
    throw new Error(`EPost API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || 'EPost booking failed');
  }

  return {
    tracking_no: data.tracking_no,
    label_url: data.label_url,
    pickup_date: data.pickup_date,
    pickup_time_slot: data.time_slot,
  };
}

/**
 * 배송 추적 조회
 */
export async function trackEPostShipment(trackingNo: string) {
  const apiKey = Deno.env.get('EPOST_API_KEY');

  if (!apiKey) {
    throw new Error('EPost API key not configured');
  }

  const response = await fetch(`${EPOST_API_URL}/tracking/${trackingNo}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error('Tracking info not found');
  }

  const data = await response.json();

  return {
    tracking_no: data.tracking_no,
    status: data.status,
    current_location: data.current_location,
    events: data.events || [],
  };
}

/**
 * Mock 우체국 API (개발용)
 */
export async function mockEPostBooking(
  pickup: EPostAddress,
  delivery: EPostAddress,
  trackingNo: string
): Promise<EPostBookingResponse> {
  // Mock 데이터 반환
  return {
    tracking_no: trackingNo,
    label_url: `https://mock.epost.go.kr/label/${trackingNo}.pdf`,
    pickup_date: new Date().toISOString().split('T')[0],
    pickup_time_slot: 'PM',
  };
}

