import { notFound } from "next/navigation";
import CustomerDetailClient from "@/components/customers/CustomerDetailClient";

interface CustomerDetailPageProps {
  params: {
    id: string;
  };
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  let customerData;
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/customers/${params.id}`, {
      cache: 'no-store',
    });
    
    if (!response.ok) {
      notFound();
    }
    
    const result = await response.json();
    console.log('👤 [Customer Page] API 응답:', result);
    
    // API 응답 형식 처리: { success: true, customer: {...} } 또는 직접 객체
    customerData = result.success ? result.customer : result;
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
