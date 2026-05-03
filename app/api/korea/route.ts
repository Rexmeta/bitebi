import { NextResponse } from 'next/server'

interface KoreaPulseData {
  kimchiPremium: { value: number; upbitKrw: number; coinbaseUsd: number; usdKrw: number }
  upbit: { volume24hKrw: number; topGainers: { market: string; changeRate: number }[] }
  bithumb: { volume24hKrw: number }
  marketShare: { upbit: number; bithumb: number }
  source: string
  lastUpdated: string
}

interface CacheEntry { data: KoreaPulseData; timestamp: number }
let cache: CacheEntry | null = null
const CACHE_TTL = 2 * 60 * 1000

async function safeJson(url: string, init?: RequestInit): Promise<any | null> {
  try {
    const r = await fetch(url, { ...init, next: { revalidate: 120 } })
    if (!r.ok) return null
    return await r.json()
  } catch { return null }
}

async function fetchUsdKrw(): Promise<number | null> {
  const j = await safeJson('https://api.exchangerate.host/latest?base=USD&symbols=KRW')
  const v = j?.rates?.KRW
  if (typeof v === 'number') return v
  // fallback: open.er-api.com
  const j2 = await safeJson('https://open.er-api.com/v6/latest/USD')
  return j2?.rates?.KRW ?? null
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
      return NextResponse.json({ success: true, data: cache.data, cached: true })
    }

    const [upbitTicker, coinbaseSpot, usdKrw, upbitMarkets] = await Promise.all([
      safeJson('https://api.upbit.com/v1/ticker?markets=KRW-BTC'),
      safeJson('https://api.coinbase.com/v2/prices/BTC-USD/spot'),
      fetchUsdKrw(),
      safeJson('https://api.upbit.com/v1/market/all?isDetails=false'),
    ])

    const upbitBtc = Array.isArray(upbitTicker) ? upbitTicker[0] : null
    const upbitKrw = upbitBtc?.trade_price || 0
    const coinbaseUsd = parseFloat(coinbaseSpot?.data?.amount || '0')
    const usdKrwRate = usdKrw || 0

    let kimchi = 0
    if (upbitKrw > 0 && coinbaseUsd > 0 && usdKrwRate > 0) {
      const fairKrw = coinbaseUsd * usdKrwRate
      kimchi = ((upbitKrw - fairKrw) / fairKrw) * 100
    }

    // Pull KRW market top tickers for gainers + volume aggregation
    const krwMarkets: string[] = (upbitMarkets || [])
      .filter((m: any) => typeof m?.market === 'string' && m.market.startsWith('KRW-'))
      .map((m: any) => m.market)

    let upbitVol = 0
    let topGainers: { market: string; changeRate: number }[] = []
    if (krwMarkets.length) {
      const chunks: string[][] = []
      for (let i = 0; i < krwMarkets.length; i += 100) chunks.push(krwMarkets.slice(i, i + 100))
      const tickers = (await Promise.all(
        chunks.map((c) => safeJson(`https://api.upbit.com/v1/ticker?markets=${c.join(',')}`))
      )).flat().filter(Boolean) as any[]
      upbitVol = tickers.reduce((s, t) => s + (t?.acc_trade_price_24h || 0), 0)
      topGainers = tickers
        .map((t) => ({ market: t.market, changeRate: (t.signed_change_rate || 0) * 100 }))
        .sort((a, b) => b.changeRate - a.changeRate)
        .slice(0, 10)
    }

    // Bithumb 24h volume (KRW) — use ALL ticker
    const bithumbAll = await safeJson('https://api.bithumb.com/public/ticker/ALL_KRW')
    let bithumbVol = 0
    if (bithumbAll?.data) {
      for (const k of Object.keys(bithumbAll.data)) {
        if (k === 'date') continue
        const v = parseFloat(bithumbAll.data[k]?.acc_trade_value_24H || '0')
        if (isFinite(v)) bithumbVol += v
      }
    }

    const totalVol = upbitVol + bithumbVol
    const data: KoreaPulseData = {
      kimchiPremium: { value: kimchi, upbitKrw, coinbaseUsd, usdKrw: usdKrwRate },
      upbit: { volume24hKrw: upbitVol, topGainers },
      bithumb: { volume24hKrw: bithumbVol },
      marketShare: {
        upbit: totalVol > 0 ? (upbitVol / totalVol) * 100 : 0,
        bithumb: totalVol > 0 ? (bithumbVol / totalVol) * 100 : 0,
      },
      source: 'upbit+bithumb+coinbase+exchangerate',
      lastUpdated: new Date().toISOString(),
    }

    cache = { data, timestamp: Date.now() }
    return NextResponse.json({ success: true, data })
  } catch (e: any) {
    if (cache) return NextResponse.json({ success: true, data: cache.data, stale: true })
    return NextResponse.json({ success: false, error: e?.message || 'korea fetch failed' }, { status: 502 })
  }
}
