/**
 * 우체국 API 테스트 스크립트
 * 
 * 실행: node apps/admin/test-epost-api.js
 */

async function testEPostAPI() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rzrwediccbamxluegnex.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';
  
  console.log('🧪 우체국 API 테스트 시작...\n');
  
  // 테스트용 출고 송장 생성 요청
  const testOrderId = '3602dd88-c8c6-43fb-a78f-adff83a1e651';
  
  try {
    console.log('📮 출고 송장 생성 요청...');
    console.log('Order ID:', testOrderId);
    
    const response = await fetch(`${supabaseUrl}/functions/v1/shipments-create-outbound`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ orderId: testOrderId }),
    });
    
    console.log('\n📡 응답 상태:', response.status, response.statusText);
    
    const result = await response.json();
    console.log('\n📦 응답 내용:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n✅ 성공!');
      console.log('출고 송장번호:', result.data?.trackingNo);
      console.log('요청번호:', result.data?.reqNo);
      console.log('예약번호:', result.data?.resNo);
    } else {
      console.log('\n❌ 실패!');
      console.log('에러:', result.error);
    }
  } catch (error) {
    console.error('\n❌ 호출 실패:', error.message);
  }
}

testEPostAPI();

