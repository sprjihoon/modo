import { NextRequest, NextResponse } from 'next/server';
import { getCustomers, getCustomerStats } from '@/lib/api/customers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || undefined;
    
    const [customers, stats] = await Promise.all([
      getCustomers({ search }),
      getCustomerStats(),
    ]);

    return NextResponse.json({
      customers: customers || [],
      stats: stats || {
        totalCustomers: 0,
        newCustomers: 0,
        activeCustomers: 0,
        totalSales: 0,
      },
    });
  } catch (error: any) {
    console.error('고객 목록 조회 실패:', error);
    console.error('에러 상세:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return NextResponse.json(
      { 
        error: error.message || '고객 목록을 불러올 수 없습니다',
        details: error.details || error.hint || '',
        customers: [],
        stats: {
          totalCustomers: 0,
          newCustomers: 0,
          activeCustomers: 0,
          totalSales: 0,
        },
      },
      { status: 500 }
    );
  }
}

