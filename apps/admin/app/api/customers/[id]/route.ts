import { NextResponse } from 'next/server';
import { getCustomerById } from '@/lib/api/customers';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const customer = await getCustomerById(params.id);
    return NextResponse.json(customer);
  } catch (error: any) {
    console.error('고객 상세 조회 실패:', error);
    return NextResponse.json(
      { error: error.message || '고객 정보를 불러올 수 없습니다' },
      { status: 404 }
    );
  }
}

