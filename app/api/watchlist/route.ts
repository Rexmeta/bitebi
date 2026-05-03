import { NextRequest, NextResponse } from 'next/server'
import { getRecord, upsertRecord, deleteRecord, isValidToken, WatchItem } from '@/lib/watchlistStore'
import { isValidEmail, isValidTelegramChatId } from '@/lib/notify'
import { getMetric } from '@/lib/metrics'

function tokenFrom(req: NextRequest): string | null {
  const h = req.headers.get('x-device-token')
  if (h && isValidToken(h)) return h
  return null
}

export async function GET(req: NextRequest) {
  const token = tokenFrom(req)
  if (!token) return NextResponse.json({ success: false, error: 'missing or invalid x-device-token' }, { status: 400 })
  const rec = getRecord(token)
  return NextResponse.json({ success: true, data: rec || { items: [], email: null, telegramChatId: null } })
}

export async function POST(req: NextRequest) {
  const token = tokenFrom(req)
  if (!token) return NextResponse.json({ success: false, error: 'missing or invalid x-device-token' }, { status: 400 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ success: false, error: 'invalid json' }, { status: 400 }) }

  const updated = upsertRecord(token, (r) => {
    if (typeof body.email === 'string') {
      const e = body.email.trim()
      if (e === '') r.email = undefined
      else if (isValidEmail(e)) r.email = e
    } else if (body.email === null) {
      r.email = undefined
    }

    if (typeof body.telegramChatId === 'string') {
      const t = body.telegramChatId.trim()
      if (t === '') r.telegramChatId = undefined
      else if (isValidTelegramChatId(t)) r.telegramChatId = t
    } else if (body.telegramChatId === null) {
      r.telegramChatId = undefined
    }

    if (Array.isArray(body.items)) {
      const cleaned: WatchItem[] = []
      for (const raw of body.items) {
        if (!raw || typeof raw.metricId !== 'string') continue
        if (!getMetric(raw.metricId)) continue
        const item: WatchItem = { metricId: raw.metricId }
        if (typeof raw.threshold === 'number' && isFinite(raw.threshold)) item.threshold = raw.threshold
        if (raw.direction === 'above' || raw.direction === 'below') item.direction = raw.direction
        // Preserve last notification state from prior record if same metric exists.
        const prev = r.items.find((p) => p.metricId === raw.metricId)
        if (prev?.lastNotifiedAt) item.lastNotifiedAt = prev.lastNotifiedAt
        if (prev?.lastValue != null) item.lastValue = prev.lastValue
        cleaned.push(item)
      }
      r.items = cleaned.slice(0, 50)
    }

    return r
  })

  if (!updated) return NextResponse.json({ success: false, error: 'persist failed' }, { status: 500 })
  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(req: NextRequest) {
  const token = tokenFrom(req)
  if (!token) return NextResponse.json({ success: false, error: 'missing or invalid x-device-token' }, { status: 400 })
  deleteRecord(token)
  return NextResponse.json({ success: true })
}
