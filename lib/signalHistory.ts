// File-backed signal history with event-level granularity + simple BTC backtest.
//
// Two storage views are persisted:
//   - summary[]: one row per (type,title) for fast UI listing (count, first/last seen)
//   - events[]:  every individual trigger timestamp, used for honest backtesting
//
// Files: data/signal-history.json (summary) and data/signal-events.json (events).
// On read-only filesystems writes silently no-op.

import fs from 'fs'
import path from 'path'

export interface SignalSummary {
  id: string
  type: 'positive' | 'warning' | 'danger'
  title: string
  description: string
  evidence?: Record<string, number | string | null>
  firstSeen: string
  lastSeen: string
  count: number
}

export interface SignalEvent {
  id: string
  ts: string             // ISO timestamp of the trigger
  type: SignalSummary['type']
  title: string
  value?: string
}

const DATA_DIR = path.join(process.cwd(), 'data')
const SUMMARY_FILE = path.join(DATA_DIR, 'signal-history.json')
const EVENTS_FILE = path.join(DATA_DIR, 'signal-events.json')

// Throttle: don't append a new event for the same signal id within this window.
const EVENT_THROTTLE_MS = 6 * 60 * 60 * 1000  // 6 hours

function safeReadJson<T>(file: string, fallback: T): T {
  try {
    if (!fs.existsSync(file)) return fallback
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as T
  } catch { return fallback }
}

function safeWriteJson(file: string, data: any) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8')
  } catch { /* read-only fs */ }
}

export function loadSignalHistory(): SignalSummary[] {
  return safeReadJson<SignalSummary[]>(SUMMARY_FILE, [])
}

export function loadSignalEvents(): SignalEvent[] {
  return safeReadJson<SignalEvent[]>(EVENTS_FILE, [])
}

export function recordSignals(currentSignals: { type: SignalSummary['type']; title: string; description: string; value?: string }[]) {
  const now = new Date().toISOString()
  const summary = loadSignalHistory()
  const events = loadSignalEvents()
  const summaryById = new Map(summary.map((s) => [s.id, s]))
  const lastEventByIdMs = new Map<string, number>()
  for (const ev of events) {
    const t = Date.parse(ev.ts)
    const cur = lastEventByIdMs.get(ev.id) || 0
    if (t > cur) lastEventByIdMs.set(ev.id, t)
  }

  for (const s of currentSignals) {
    const id = `${s.type}:${s.title}`
    const prev = summaryById.get(id)
    if (prev) {
      prev.lastSeen = now
      prev.count += 1
    } else {
      summaryById.set(id, {
        id, type: s.type, title: s.title, description: s.description,
        evidence: s.value ? { value: s.value } : undefined,
        firstSeen: now, lastSeen: now, count: 1,
      })
    }
    // Append a *real* event row only when not throttled — avoids one event per refresh.
    const lastMs = lastEventByIdMs.get(id) || 0
    if (Date.now() - lastMs >= EVENT_THROTTLE_MS) {
      events.push({ id, ts: now, type: s.type, title: s.title, value: s.value })
    }
  }

  safeWriteJson(SUMMARY_FILE, Array.from(summaryById.values()).slice(-1000))
  safeWriteJson(EVENTS_FILE, events.slice(-5000))
}

export interface BacktestResult {
  signalId: string
  occurrences: number       // distinct trigger events used
  avgReturn30d: number | null
  medianReturn30d: number | null
  avgReturn90d: number | null
  medianReturn90d: number | null
  hitRate30d: number | null // fraction of events with positive 30d return
}

function median(xs: number[]): number | null {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export async function backtestSignals(btcPrices?: { date: string; price: number }[]): Promise<BacktestResult[]> {
  const events = loadSignalEvents()
  let prices = btcPrices
  if (!prices) {
    try {
      const r = await fetch('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=365&interval=daily', { next: { revalidate: 86400 } })
      if (r.ok) {
        const j = await r.json()
        prices = (j?.prices || []).map((p: [number, number]) => ({
          date: new Date(p[0]).toISOString().slice(0, 10),
          price: p[1],
        }))
      }
    } catch { /* ignore */ }
  }
  const priceMap = new Map<string, number>()
  for (const p of prices || []) priceMap.set(p.date, p.price)

  const grouped = new Map<string, SignalEvent[]>()
  for (const e of events) {
    const arr = grouped.get(e.id) || []
    arr.push(e)
    grouped.set(e.id, arr)
  }

  const results: BacktestResult[] = []
  for (const [signalId, evs] of grouped) {
    const r30: number[] = []
    const r90: number[] = []
    for (const e of evs) {
      const baseDate = e.ts.slice(0, 10)
      const basePrice = priceMap.get(baseDate)
      if (!basePrice) continue
      const after = (days: number) => {
        const d = new Date(baseDate); d.setDate(d.getDate() + days)
        return priceMap.get(d.toISOString().slice(0, 10))
      }
      const p30 = after(30), p90 = after(90)
      if (p30) r30.push((p30 - basePrice) / basePrice * 100)
      if (p90) r90.push((p90 - basePrice) / basePrice * 100)
    }
    const positives30 = r30.filter((v) => v > 0).length
    results.push({
      signalId,
      occurrences: evs.length,
      avgReturn30d: r30.length ? r30.reduce((s, v) => s + v, 0) / r30.length : null,
      medianReturn30d: median(r30),
      avgReturn90d: r90.length ? r90.reduce((s, v) => s + v, 0) / r90.length : null,
      medianReturn90d: median(r90),
      hitRate30d: r30.length ? positives30 / r30.length : null,
    })
  }
  return results
}
