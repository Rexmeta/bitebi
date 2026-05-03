import { NextResponse } from 'next/server'

// Honest ETF-flows endpoint: when the upstream public source is unavailable
// we surface explicit `unavailable` status instead of fabricating numbers.

interface EtfFlowPoint { date: string; netInflow: number; cumulativeAum?: number }
interface SeriesView {
  latestNetInflow: number | null
  cumulative: number | null
  history: EtfFlowPoint[]
  status: 'real' | 'unavailable'
  reason?: string
}
interface EtfFlowsData {
  btc: SeriesView
  eth: SeriesView
  source: string
  lastUpdated: string
}

interface CacheEntry { data: EtfFlowsData; timestamp: number }
let cache: CacheEntry | null = null
const CACHE_TTL = 30 * 60 * 1000

async function safeJson(url: string): Promise<any | null> {
  try {
    const r = await fetch(url, { next: { revalidate: 1800 } })
    if (!r.ok) return null
    return await r.json()
  } catch { return null }
}

async function fetchSoSo(symbol: 'BTC' | 'ETH'): Promise<EtfFlowPoint[]> {
  const j = await safeJson(`https://api.sosovalue.com/openapi/v1/etf/historicalInflowChart?symbol=${symbol}`)
  if (!j?.data) return []
  return (j.data as any[]).map((d) => ({
    date: typeof d.date === 'string' ? d.date.slice(0, 10) : new Date(d.date).toISOString().slice(0, 10),
    netInflow: Number(d.totalNetInflow ?? d.netInflow ?? 0),
    cumulativeAum: Number(d.cumNetInflow ?? d.cumulativeAum ?? 0),
  })).filter((d) => !!d.date)
}

function unavailable(reason: string): SeriesView {
  return { latestNetInflow: null, cumulative: null, history: [], status: 'unavailable', reason }
}

function toSeries(h: EtfFlowPoint[]): SeriesView {
  return {
    latestNetInflow: h[h.length - 1]?.netInflow ?? 0,
    cumulative: h.reduce((s, p) => s + (p.netInflow || 0), 0),
    history: h,
    status: 'real',
  }
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
      return NextResponse.json({ success: true, data: cache.data, cached: true, estimated: estimated(cache.data) })
    }

    const [btcHist, ethHist] = await Promise.all([fetchSoSo('BTC'), fetchSoSo('ETH')])
    const btc = btcHist.length ? toSeries(btcHist) : unavailable('SoSoValue ETF API unreachable')
    const eth = ethHist.length ? toSeries(ethHist) : unavailable('SoSoValue ETF API unreachable')

    const data: EtfFlowsData = {
      btc, eth,
      source: btc.status === 'real' || eth.status === 'real' ? 'sosovalue' : 'unavailable',
      lastUpdated: new Date().toISOString(),
    }
    cache = { data, timestamp: Date.now() }
    return NextResponse.json({ success: true, data, estimated: estimated(data) })
  } catch (e: any) {
    if (cache) return NextResponse.json({ success: true, data: cache.data, stale: true, estimated: estimated(cache.data) })
    return NextResponse.json({ success: false, error: e?.message || 'etf-flows fetch failed' }, { status: 502 })
  }
}

function estimated(d: EtfFlowsData): boolean {
  return d.btc.status !== 'real' || d.eth.status !== 'real'
}
