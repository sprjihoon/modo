import { notFound } from "next/navigation";
import CustomerDetailClient from "@/components/customers/CustomerDetailClient";
import { getCustomerById } from "@/lib/api/customers";

interface CustomerDetailPageProps {
  params: Promise<{
    id: string;
  }> | {
    id: string;
  };
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  // Next.js 15+ params는 Promise일 수 있음
  const resolvedParams = await Promise.resolve(params);
  const customerId = resolvedParams.id;
  
  let customerData;
  try {
    // 직접 데이터베이스 조회 (Server Component에서 API 호출 대신)
    customerData = await getCustomerById(customerId);
    console.log('👤 [Customer Page] 고객 조회 성공:', customerData?.id);
  } catch (error) {
    console.error('고객 정보 조회 실패:', error);
    notFound();
  }

  if (!customerData) {
    notFound();
  }

  // 고객 상태 계산
  const getCustomerStatus = () => {
    const createdAt = new Date(customerData.created_at);
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    if (createdAt >= thisMonth) {
      return "신규";
    }
    
    if (customerData.orders && customerData.orders.length > 0) {
      const lastOrder = new Date(customerData.orders[0].created_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      if (lastOrder >= thirtyDaysAgo) {
        return "활성";
      }
    }
    
    return "일반";
  };

  const status = getCustomerStatus();

  return (
    <CustomerDetailClient 
      customer={customerData}
      status={status}
    />
  );
}
