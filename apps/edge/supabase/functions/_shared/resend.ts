/**
 * Resend 이메일 발송
 *
 * Secrets:
 *   RESEND_API_KEY      필수
 *   RESEND_FROM_EMAIL   선택 (기본: 모두의수선 <noreply@modo.mom>)
 *   RESEND_REPLY_TO     선택
 *   APP_URL             선택 (기본: https://modo.io.kr)
 */

const RESEND_API_URL = 'https://api.resend.com/emails';
const DEFAULT_FROM = '모두의수선 <noreply@modo.mom>';
const DEFAULT_APP_URL = 'https://modo.io.kr';

const PLACEHOLDER_EMAIL_SUFFIXES = [
  '@noemail.local',
  '@example.com',
  '@example.net',
];

export interface OrderEmailRequest {
  to: string;
  title: string;
  body: string;
  orderId?: string;
  customerName?: string;
}

export interface ResendResult {
  sent: boolean;
  id?: string;
  error?: string;
  skipped?: boolean;
}

export function isDeliverableEmail(email?: string | null): boolean {
  if (!email) return false;
  const value = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return false;
  return !PLACEHOLDER_EMAIL_SUFFIXES.some((suffix) => value.endsWith(suffix));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildOrderEmailHtml(params: {
  title: string;
  body: string;
  customerName?: string;
  orderUrl?: string;
}): string {
  const greeting = params.customerName
    ? `${escapeHtml(params.customerName)}님,`
    : '안녕하세요,';
  const cta = params.orderUrl
    ? `
      <tr>
        <td style="padding: 28px 0 8px;">
          <a href="${escapeHtml(params.orderUrl)}"
             style="display:inline-block;background:#00C896;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 28px;border-radius:10px;">
            주문 확인하기
          </a>
        </td>
      </tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(params.title)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Noto Sans KR',sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f5f7;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:#00C896;padding:20px 28px;color:#ffffff;font-size:18px;font-weight:800;letter-spacing:-0.3px;">
              모두의수선
            </td>
          </tr>
          <tr>
            <td style="padding:32px 28px 8px;color:#111827;font-size:15px;line-height:1.6;">
              ${greeting}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 0;color:#111827;font-size:20px;font-weight:800;line-height:1.4;">
              ${escapeHtml(params.title)}
            </td>
          </tr>
          <tr>
            <td style="padding:12px 28px 0;color:#4b5563;font-size:15px;line-height:1.7;">
              ${escapeHtml(params.body)}
            </td>
          </tr>
          ${cta}
          <tr>
            <td style="padding:28px 28px 32px;color:#9ca3af;font-size:12px;line-height:1.6;">
              본 메일은 주문 처리 안내를 위해 가입하신 이메일로 발송되었습니다.<br />
              모두의수선 · <a href="${DEFAULT_APP_URL}" style="color:#00C896;text-decoration:none;">modo.io.kr</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function opsAlertRecipients(): string[] {
  const raw = Deno.env.get('OPS_REPORT_EMAIL') || '';
  return raw
    .split(/[,;\s]+/)
    .map((value) => value.trim())
    .filter((value) => isDeliverableEmail(value));
}

export async function sendResendEmail(params: {
  to: string[];
  subject: string;
  html: string;
  text: string;
}): Promise<ResendResult> {
  const to = params.to.map((v) => v.trim()).filter((v) => isDeliverableEmail(v));
  if (to.length === 0) {
    return { sent: false, skipped: true, error: 'deliverable email not found' };
  }

  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) {
    console.warn('RESEND_API_KEY not configured, skipping email');
    return { sent: false, skipped: true, error: 'RESEND_API_KEY not configured' };
  }

  const from = Deno.env.get('RESEND_FROM_EMAIL') || DEFAULT_FROM;
  const replyTo = Deno.env.get('RESEND_REPLY_TO');
  const payload: Record<string, unknown> = {
    from,
    to,
    subject: params.subject,
    html: params.html,
    text: params.text,
  };
  if (replyTo) payload.reply_to = replyTo;

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      const error = typeof result?.message === 'string'
        ? result.message
        : JSON.stringify(result);
      console.error('❌ Resend 발송 실패:', error);
      return { sent: false, error };
    }

    console.log('✅ Resend 발송 성공:', result.id);
    return { sent: true, id: result.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Resend 발송 오류:', message);
    return { sent: false, error: message };
  }
}

export async function sendOrderResultEmail(
  request: OrderEmailRequest
): Promise<ResendResult> {
  const appUrl = (Deno.env.get('APP_URL') || DEFAULT_APP_URL).replace(/\/$/, '');
  const orderUrl = request.orderId ? `${appUrl}/orders/${request.orderId}` : undefined;

  return sendResendEmail({
    to: [request.to],
    subject: `[모두의수선] ${request.title}`,
    html: buildOrderEmailHtml({
      title: request.title,
      body: request.body,
      customerName: request.customerName,
      orderUrl,
    }),
    text: [request.customerName ? `${request.customerName}님,` : null, request.title, request.body, orderUrl]
      .filter(Boolean)
      .join('\n\n'),
  });
}

export async function sendOpsAlertEmail(params: {
  title: string;
  lines: string[];
  href?: string;
}): Promise<ResendResult> {
  const to = opsAlertRecipients();
  const href = params.href || 'https://admin.modo.mom/dashboard/reports';
  const body = params.lines.join('<br />');
  return sendResendEmail({
    to,
    subject: `[모두의수선] ${params.title}`,
    html: `<p style="font-family:-apple-system,sans-serif;font-size:15px;line-height:1.7;color:#111827;">${body}</p><p><a href="${href}" style="color:#00C896;">어드민에서 보기</a></p>`,
    text: `${params.title}\n\n${params.lines.join('\n')}\n\n${href}`,
  });
}
