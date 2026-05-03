// Notification dispatchers for watchlist threshold alerts.
// Both providers are optional — when env is missing the function returns
// {ok:false, skipped:true} so cron jobs degrade gracefully.

export interface NotifyResult {
  ok: boolean
  skipped?: boolean
  error?: string
}

export async function sendEmail(to: string, subject: string, text: string): Promise<NotifyResult> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM || 'Bitebi Alerts <alerts@bitebi.app>'
  if (!apiKey) return { ok: false, skipped: true, error: 'RESEND_API_KEY not set' }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from, to, subject,
        text,
      }),
    })
    if (!r.ok) {
      const body = await r.text().catch(() => '')
      return { ok: false, error: `resend ${r.status}: ${body.slice(0, 200)}` }
    }
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'email send failed' }
  }
}

export async function sendTelegram(chatId: string, text: string): Promise<NotifyResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return { ok: false, skipped: true, error: 'TELEGRAM_BOT_TOKEN not set' }
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    })
    if (!r.ok) {
      const body = await r.text().catch(() => '')
      return { ok: false, error: `telegram ${r.status}: ${body.slice(0, 200)}` }
    }
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'telegram send failed' }
  }
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254
}

export function isValidTelegramChatId(id: string): boolean {
  // Telegram chat IDs are signed integers (negative for groups/channels).
  return /^-?\d{3,20}$/.test(id)
}
