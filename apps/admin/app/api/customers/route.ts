import { NextRequest, NextResponse } from 'next/server';
import { getCustomers, getCustomerStats } from '@/lib/api/customers';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const dateFilterType = (searchParams.get('dateFilterType') || 'created_at') as 'created_at' | 'last_order';

    const [customers, stats] = await Promise.all([
      getCustomers({ search, startDate, endDate, dateFilterType }),
      getCustomerStats(),
    ]);

    return NextResponse.json({
      customers: customers || [],
      stats: stats || {
        totalCustomers: 0,
        newCustomers: 0,
        activeCustomers: 0,
        deletedCustomers: 0,
        totalSales: 0,
      },
    });
  } catch (error: any) {
    console.error('고객 목록 조회 실패:', error);
    return NextResponse.json(
      { 
        error: '고객 목록을 불러올 수 없습니다',
        customers: [],
        stats: {
          totalCustomers: 0,
          newCustomers: 0,
          activeCustomers: 0,
          deletedCustomers: 0,
          totalSales: 0,
        },
      },
      { status: 500 }
    );
  }
}

