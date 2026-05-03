// Cron-style watchlist evaluator. Designed to be hit every ~5 minutes by
// an external scheduler (Replit Scheduled Deployments, GitHub Actions, etc.).
//
// Authorization:
//   - If CRON_SECRET is set, requests must include `?secret=<CRON_SECRET>`
//     or `Authorization: Bearer <CRON_SECRET>`.
//   - If unset, the route is open (suitable for local dev only).
//
// For each watched item with a threshold/direction, the route fetches the
// metric value via the internal /api/metric-data/[id] endpoint, checks the
// breach, and dispatches email + Telegram notifications. A per-item cooldown
// (NOTIFY_COOLDOWN_MS) prevents repeat-spamming while a breach persists.

import { NextRequest, NextResponse } from 'next/server'
import { loadAll, saveAll } from '@/lib/watchlistStore'
import { sendEmail, sendTelegram } from '@/lib/notify'
import { getMetric } from '@/lib/metrics'

const NOTIFY_COOLDOWN_MS = 6 * 60 * 60 * 1000 // 6 hours per (token, metric)

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  const url = new URL(req.url)
  const q = url.searchParams.get('secret')
  if (q && q === secret) return true
  const h = req.headers.get('authorization') || ''
  if (h === `Bearer ${secret}`) return true
  return false
}

function internalBase(req: NextRequest): string {
  const env = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_INTERNAL_BASE_URL
  if (env) return env.replace(/\/+$/, '')
  try { return req.nextUrl.origin } catch {}
  return 'http://localhost:5000'
}

async function fetchCurrent(base: string, metricId: string): Promise<{ current: number; title: string; unit: string } | null> {
  try {
    const r = await fetch(`${base}/api/metric-data/${encodeURIComponent(metricId)}`, { cache: 'no-store' })
    const j = await r.json()
    if (!j?.success) return null
    const cur = Number(j.data?.current)
    if (!isFinite(cur)) return null
    return { current: cur, title: j.data?.title || metricId, unit: j.data?.unit || '' }
  } catch { return null }
}

function formatValue(v: number, unit: string): string {
  if (!isFinite(v)) return String(v)
  const abs = Math.abs(v)
  let body: string
  if (abs >= 1e12) body = (v / 1e12).toFixed(2) + 'T'
  else if (abs >= 1e9) body = (v / 1e9).toFixed(2) + 'B'
  else if (abs >= 1e6) body = (v / 1e6).toFixed(2) + 'M'
  else if (abs >= 1) body = v.toFixed(2)
  else body = v.toFixed(4)
  return unit ? `${body} ${unit}` : body
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 })

  const base = internalBase(req)
  const all = loadAll()
  const tokens = Object.keys(all)
  const nowMs = Date.now()
  const nowIso = new Date(nowMs).toISOString()

  // Cache metric lookups across all tokens within a single cron invocation.
  const metricCache = new Map<string, Awaited<ReturnType<typeof fetchCurrent>>>()
  async function getCurrent(id: string) {
    if (metricCache.has(id)) return metricCache.get(id)!
    const v = await fetchCurrent(base, id)
    metricCache.set(id, v)
    return v
  }

  let evaluated = 0
  let breaches = 0
  let emailsSent = 0
  let telegramsSent = 0
  const errors: string[] = []

  for (const token of tokens) {
    const rec = all[token]
    if (!rec || !Array.isArray(rec.items) || rec.items.length === 0) continue
    if (!rec.email && !rec.telegramChatId) continue

    for (const item of rec.items) {
      if (item.threshold == null || !item.direction) continue
      if (!getMetric(item.metricId)) continue
      evaluated++

      const m = await getCurrent(item.metricId)
      if (!m) continue
      const breach =
        item.direction === 'above' ? m.current > item.threshold :
        item.direction === 'below' ? m.current < item.threshold : false

      item.lastValue = m.current

      if (!breach) continue
      breaches++

      const lastMs = item.lastNotifiedAt ? Date.parse(item.lastNotifiedAt) : 0
      if (nowMs - lastMs < NOTIFY_COOLDOWN_MS) continue

      const arrow = item.direction === 'above' ? '>' : '<'
      const subject = `[Bitebi] ${m.title} 임계값 도달`
      const text = `${m.title}\n현재값: ${formatValue(m.current, m.unit)}\n조건: ${arrow} ${formatValue(item.threshold, m.unit)}\n시각: ${nowIso}\n\n자세히 보기: ${base}/money-tracker/${item.metricId}`

      let dispatched = false
      if (rec.email) {
        const r = await sendEmail(rec.email, subject, text)
        if (r.ok) { emailsSent++; dispatched = true }
        else if (!r.skipped && r.error) errors.push(`email[${token.slice(0, 6)}…]: ${r.error}`)
      }
      if (rec.telegramChatId) {
        const tgText = `<b>${m.title}</b>\n현재값: <code>${formatValue(m.current, m.unit)}</code>\n조건: ${arrow} <code>${formatValue(item.threshold, m.unit)}</code>\n${base}/money-tracker/${item.metricId}`
        const r = await sendTelegram(rec.telegramChatId, tgText)
        if (r.ok) { telegramsSent++; dispatched = true }
        else if (!r.skipped && r.error) errors.push(`telegram[${token.slice(0, 6)}…]: ${r.error}`)
      }

      if (dispatched) item.lastNotifiedAt = nowIso
    }

    rec.updatedAt = nowIso
  }

  saveAll(all)

  return NextResponse.json({
    success: true,
    data: {
      tokens: tokens.length,
      evaluated,
      breaches,
      emailsSent,
      telegramsSent,
      errors: errors.slice(0, 20),
      ranAt: nowIso,
    },
  })
}

export const POST = GET
