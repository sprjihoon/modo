import { NextResponse } from 'next/server';
import { getCustomerById } from '@/lib/api/customers';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const customerId = resolvedParams.id;
    const customer = await getCustomerById(customerId);
    return NextResponse.json({
      success: true,
      customer: customer
    });
  } catch (error: any) {
    console.error('고객 상세 조회 실패:', error);
    return NextResponse.json(
      { success: false, error: error.message || '고객 정보를 불러올 수 없습니다' },
      { status: 404 }
    );
  }
}

