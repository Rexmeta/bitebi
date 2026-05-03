import { NextResponse } from 'next/server'

// Honest exchange-netflow endpoint:
//   - `stable` is derived from DefiLlama's stablecoincharts (real, public).
//   - `btc` and `eth` netflow require labelled-wallet attribution data
//     (CryptoQuant / Glassnode equivalent). We do NOT have that yet, so
//     instead of fabricating plausible time series we explicitly mark them
//     unavailable. The `seriesStatus` map tells the client which series are
//     real vs unavailable, and `estimated` is true whenever any series is
//     not real.

interface FlowPoint { date: string; netflow: number }
interface SeriesView {
  netflow7d: number | null
  netflow30d: number | null
  history: FlowPoint[]
  status: 'real' | 'unavailable'
  reason?: string
}
interface ExchangeFlowsData {
  btc: SeriesView
  eth: SeriesView
  stable: SeriesView
  seriesStatus: Record<'btc' | 'eth' | 'stable', 'real' | 'unavailable'>
  source: string
  lastUpdated: string
}

interface CacheEntry { data: ExchangeFlowsData; timestamp: number }
let cache: CacheEntry | null = null
const CACHE_TTL = 10 * 60 * 1000

async function safeJson(url: string): Promise<any | null> {
  try {
    const r = await fetch(url, { next: { revalidate: 600 } })
    if (!r.ok) return null
    return await r.json()
  } catch { return null }
}

async function fetchStableHistory(): Promise<FlowPoint[]> {
  const j = await safeJson('https://stablecoins.llama.fi/stablecoincharts/all')
  if (!Array.isArray(j)) return []
  const recent = j.slice(-31)
  const out: FlowPoint[] = []
  for (let i = 1; i < recent.length; i++) {
    const cur = recent[i]?.totalCirculatingUSD?.peggedUSD || 0
    const prev = recent[i - 1]?.totalCirculatingUSD?.peggedUSD || 0
    out.push({
      date: new Date(recent[i].date * 1000).toISOString().slice(0, 10),
      netflow: cur - prev,
    })
  }
  return out
}

function sumLast(h: FlowPoint[], n: number) {
  return h.slice(-n).reduce((s, p) => s + p.netflow, 0)
}

function unavailable(reason: string): SeriesView {
  return { netflow7d: null, netflow30d: null, history: [], status: 'unavailable', reason }
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
      return NextResponse.json({ success: true, data: cache.data, cached: true, estimated: hasUnavailable(cache.data) })
    }

    const stableHist = await fetchStableHistory()
    const stable: SeriesView = stableHist.length
      ? { netflow7d: sumLast(stableHist, 7), netflow30d: sumLast(stableHist, 30), history: stableHist, status: 'real' }
      : unavailable('DefiLlama stablecoincharts unreachable')

    // BTC/ETH per-exchange netflow needs labelled-wallet data we don't have a
    // free source for. Return explicit unavailable instead of synthetic noise.
    const btc = unavailable('BTC exchange netflow requires labelled-wallet data (pending integration)')
    const eth = unavailable('ETH exchange netflow requires labelled-wallet data (pending integration)')

    const data: ExchangeFlowsData = {
      btc, eth, stable,
      seriesStatus: { btc: btc.status, eth: eth.status, stable: stable.status },
      source: 'defillama (stable only)',
      lastUpdated: new Date().toISOString(),
    }

    cache = { data, timestamp: Date.now() }
    return NextResponse.json({ success: true, data, estimated: hasUnavailable(data) })
  } catch (e: any) {
    if (cache) return NextResponse.json({ success: true, data: cache.data, stale: true, estimated: hasUnavailable(cache.data) })
    return NextResponse.json({ success: false, error: e?.message || 'exchange-flows fetch failed' }, { status: 502 })
  }
}

function hasUnavailable(d: ExchangeFlowsData): boolean {
  return d.btc.status !== 'real' || d.eth.status !== 'real' || d.stable.status !== 'real'
}
