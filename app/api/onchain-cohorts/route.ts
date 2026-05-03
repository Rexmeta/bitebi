import { NextResponse } from 'next/server'

// Free-tier proxies for Glassnode/Checkonchain cohort metrics.
// Uses CoinGecko market data + simple derivations until a richer feed is wired.

interface OnchainCohortsData {
  mvrv: { current: number; signal: 'undervalued' | 'fair' | 'overvalued'; history: { date: string; value: number }[] }
  realizedPrice: { current: number; history: { date: string; value: number }[] }
  lthSupplyShare: { current: number; history: { date: string; value: number }[] }  // % of supply held > 155 days
  sopr: { current: number; signal: 'profit' | 'loss'; history: { date: string; value: number }[] }
  source: string
  lastUpdated: string
}

interface CacheEntry { data: OnchainCohortsData; timestamp: number }
let cache: CacheEntry | null = null
const CACHE_TTL = 60 * 60 * 1000  // hourly

async function safeJson(url: string): Promise<any | null> {
  try {
    const r = await fetch(url, { next: { revalidate: 3600 } })
    if (!r.ok) return null
    return await r.json()
  } catch { return null }
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
      return NextResponse.json({ success: true, data: cache.data, cached: true })
    }

    // Pull 180-day BTC price as base for a derived "realized price" proxy.
    const j = await safeJson('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=180&interval=daily')
    const prices: [number, number][] = j?.prices || []

    // Realized price proxy = trailing 90-day average price (simplification of realized cap / supply).
    const window = 90
    const rp: { date: string; value: number }[] = []
    for (let i = window; i < prices.length; i++) {
      const slice = prices.slice(i - window, i)
      const avg = slice.reduce((s, [, p]) => s + p, 0) / slice.length
      rp.push({ date: new Date(prices[i][0]).toISOString().slice(0, 10), value: avg })
    }

    // MVRV proxy = current price / realized price.
    const mvrvHist = rp.map((r, i) => {
      const idx = window + i
      const price = prices[idx]?.[1] || r.value
      return { date: r.date, value: price / r.value }
    })
    const currentMvrv = mvrvHist[mvrvHist.length - 1]?.value || 1
    const mvrvSignal: 'undervalued' | 'fair' | 'overvalued' =
      currentMvrv < 1 ? 'undervalued' : currentMvrv < 2.4 ? 'fair' : 'overvalued'

    // LTH supply share proxy: monotonic ramp 60% → 75% (placeholder until on-chain feed)
    const lthHist = mvrvHist.map((r, i) => ({
      date: r.date,
      value: 60 + (i / Math.max(1, mvrvHist.length - 1)) * 15,
    }))

    // SOPR proxy: 1 + recent 7-day return (clamped)
    const soprHist = mvrvHist.map((r, i) => {
      const idx = window + i
      const price = prices[idx]?.[1] || 0
      const prev = prices[Math.max(0, idx - 7)]?.[1] || price
      const ret = prev > 0 ? price / prev : 1
      return { date: r.date, value: Math.max(0.85, Math.min(1.15, ret)) }
    })
    const currentSopr = soprHist[soprHist.length - 1]?.value || 1

    const data: OnchainCohortsData = {
      mvrv: {
        current: currentMvrv,
        signal: mvrvSignal,
        history: mvrvHist.slice(-90),
      },
      realizedPrice: {
        current: rp[rp.length - 1]?.value || 0,
        history: rp.slice(-90),
      },
      lthSupplyShare: {
        current: lthHist[lthHist.length - 1]?.value || 0,
        history: lthHist.slice(-90),
      },
      sopr: {
        current: currentSopr,
        signal: currentSopr >= 1 ? 'profit' : 'loss',
        history: soprHist.slice(-90),
      },
      source: prices.length ? 'coingecko-derived' : 'unavailable',
      lastUpdated: new Date().toISOString(),
    }

    cache = { data, timestamp: Date.now() }
    return NextResponse.json({ success: true, data, estimated: true })
  } catch (e: any) {
    if (cache) return NextResponse.json({ success: true, data: cache.data, stale: true })
    return NextResponse.json({ success: false, error: e?.message || 'onchain-cohorts fetch failed' }, { status: 502 })
  }
}
