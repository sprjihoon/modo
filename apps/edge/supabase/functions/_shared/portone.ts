/**
 * PortOne (아임포트) API 연동
 * https://portone.io/docs
 */

const PORTONE_API_URL = 'https://api.iamport.kr';

/**
 * PortOne Access Token 발급
 */
export async function getPortOneAccessToken(): Promise<string> {
  const apiKey = Deno.env.get('PORTONE_API_KEY');
  const apiSecret = Deno.env.get('PORTONE_API_SECRET');

  if (!apiKey || !apiSecret) {
    throw new Error('PortOne API credentials not configured');
  }

  const response = await fetch(`${PORTONE_API_URL}/users/getToken`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imp_key: apiKey,
      imp_secret: apiSecret,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to get PortOne access token');
  }

  const data = await response.json();
  
  if (data.code !== 0) {
    throw new Error(data.message || 'PortOne authentication failed');
  }

  return data.response.access_token;
}

/**
 * PortOne 결제 검증
 */
export async function verifyPortOnePayment(
  impUid: string,
  merchantUid: string,
  amount: number
): Promise<{
  verified: boolean;
  amount: number;
  status: string;
  paidAt: string;
  method: string;
  cardName?: string;
}> {
  const accessToken = await getPortOneAccessToken();

  // 1. 결제 정보 조회
  const response = await fetch(`${PORTONE_API_URL}/payments/${impUid}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get payment info');
  }

  const data = await response.json();

  if (data.code !== 0) {
    throw new Error(data.message || 'Payment not found');
  }

  const payment = data.response;

  // 2. 검증
  const verified = 
    payment.merchant_uid === merchantUid &&
    payment.amount === amount &&
    payment.status === 'paid';

  if (!verified) {
    return {
      verified: false,
      amount: payment.amount,
      status: payment.status,
      paidAt: payment.paid_at,
      method: payment.pay_method,
    };
  }

  return {
    verified: true,
    amount: payment.amount,
    status: payment.status,
    paidAt: payment.paid_at,
    method: payment.pay_method,
    cardName: payment.card_name,
  };
}

/**
 * PortOne 결제 취소
 */
export async function cancelPortOnePayment(
  impUid: string,
  amount?: number,
  reason?: string
): Promise<void> {
  const accessToken = await getPortOneAccessToken();

  const response = await fetch(`${PORTONE_API_URL}/payments/cancel`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imp_uid: impUid,
      amount,
      reason: reason || '고객 요청',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to cancel payment');
  }

  const data = await response.json();

  if (data.code !== 0) {
    throw new Error(data.message || 'Payment cancellation failed');
  }
}

