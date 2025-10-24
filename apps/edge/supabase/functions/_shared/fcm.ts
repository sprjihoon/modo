/**
 * Firebase Cloud Messaging (FCM) 푸시 알림
 */

const FCM_URL = 'https://fcm.googleapis.com/fcm/send';

interface FCMNotification {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * FCM 푸시 알림 전송
 */
export async function sendFCMNotification(
  fcmToken: string,
  notification: FCMNotification
): Promise<void> {
  const serverKey = Deno.env.get('FCM_SERVER_KEY') || Deno.env.get('FIREBASE_SERVER_KEY');

  if (!serverKey) {
    console.warn('FCM_SERVER_KEY not configured, skipping push notification');
    return;
  }

  const response = await fetch(FCM_URL, {
    method: 'POST',
    headers: {
      'Authorization': `key=${serverKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: fcmToken,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data || {},
      priority: 'high',
    }),
  });

  if (!response.ok) {
    throw new Error(`FCM send failed: ${response.status}`);
  }

  const data = await response.json();

  if (data.failure > 0) {
    throw new Error('FCM send failed');
  }
}

/**
 * 여러 사용자에게 푸시 전송
 */
export async function sendFCMToMultiple(
  fcmTokens: string[],
  notification: FCMNotification
): Promise<void> {
  const serverKey = Deno.env.get('FCM_SERVER_KEY') || Deno.env.get('FIREBASE_SERVER_KEY');

  if (!serverKey) {
    console.warn('FCM_SERVER_KEY not configured, skipping push notifications');
    return;
  }

  const response = await fetch(FCM_URL, {
    method: 'POST',
    headers: {
      'Authorization': `key=${serverKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      registration_ids: fcmTokens,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data || {},
      priority: 'high',
    }),
  });

  if (!response.ok) {
    throw new Error(`FCM batch send failed: ${response.status}`);
  }
}

