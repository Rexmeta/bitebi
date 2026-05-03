import { NextRequest, NextResponse } from 'next/server'
import { loadSignalHistory, recordSignals, backtestSignals } from '@/lib/signalHistory'

export async function GET() {
  try {
    const [history, backtest] = await Promise.all([
      Promise.resolve(loadSignalHistory()),
      backtestSignals(),
    ])
    return NextResponse.json({ success: true, history, backtest })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'failed' }, { status: 500 })
  }
}

// Server-only ingestion. Public POSTs would let any caller poison the
// shared file-backed history/backtest. We require a bearer token configured
// via SIGNALS_WRITE_TOKEN — if it is unset, all POSTs are rejected. The
// browser SignalHistoryPanel intentionally does not include this token; the
// recording path is meant for trusted server-side cron / internal callers.
function authorized(req: NextRequest): boolean {
  const token = process.env.SIGNALS_WRITE_TOKEN
  if (!token) return false
  const header = req.headers.get('authorization') || ''
  const provided = header.startsWith('Bearer ') ? header.slice(7) : req.headers.get('x-signals-token') || ''
  return provided === token
}

interface IncomingSignal {
  type: 'positive' | 'warning' | 'danger'
  title: string
  description: string
  value?: string
}

function validate(arr: any[]): IncomingSignal[] | null {
  const out: IncomingSignal[] = []
  for (const s of arr) {
    if (!s || typeof s !== 'object') return null
    if (s.type !== 'positive' && s.type !== 'warning' && s.type !== 'danger') return null
    if (typeof s.title !== 'string' || !s.title || s.title.length > 200) return null
    if (typeof s.description !== 'string' || s.description.length > 1000) return null
    if (s.value !== undefined && (typeof s.value !== 'string' || s.value.length > 200)) return null
    out.push({ type: s.type, title: s.title, description: s.description, value: s.value })
  }
  return out
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 })
  }
  try {
    const body = await req.json()
    if (!Array.isArray(body?.signals) || body.signals.length === 0 || body.signals.length > 50) {
      return NextResponse.json({ success: false, error: 'signals[] (1-50) required' }, { status: 400 })
    }
    const clean = validate(body.signals)
    if (!clean) {
      return NextResponse.json({ success: false, error: 'invalid signal schema' }, { status: 400 })
    }
    recordSignals(clean)
    return NextResponse.json({ success: true, recorded: clean.length })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'failed' }, { status: 500 })
  }
}
