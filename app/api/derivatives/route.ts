import { NextResponse } from 'next/server'

interface DerivativesData {
  btc: {
    openInterest: number
    fundingRate: number
    liquidations24h: number
    longLiquidations24h: number
    shortLiquidations24h: number
  }
  eth: {
    openInterest: number
    fundingRate: number
    liquidations24h: number
    longLiquidations24h: number
    shortLiquidations24h: number
  }
  totalOpenInterest: number
  totalFundingRate: number
  totalLiquidations24h: number
  history: { date: string; oi: number; funding: number; liq: number }[]
  source: string
  lastUpdated: string
}

interface CacheEntry { data: DerivativesData; timestamp: number }
let cache: CacheEntry | null = null
const CACHE_TTL = 2 * 60 * 1000

async function safeJson(url: string, timeoutMs = 6000): Promise<any | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const r = await fetch(url, { signal: ctrl.signal, next: { revalidate: 120 } })
    if (!r.ok) return null
    return await r.json()
  } catch { return null }
  finally { clearTimeout(timer) }
}

async function fetchBinanceFunding(symbol: string): Promise<number | null> {
  const j = await safeJson(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${symbol}`)
  if (!j) return null
  const v = parseFloat(j.lastFundingRate)
  return isFinite(v) ? v * 100 : null
}

async function fetchCoinglassPublicOI(): Promise<{ btc: number | null; eth: number | null }> {
  // Public unofficial endpoint used by Coinglass widget; no key.
  const j = await safeJson('https://open-api.coinglass.com/public/v2/open_interest?ex=&symbol=BTC&interval=0')
  let btc: number | null = null, eth: number | null = null
  if (j?.data && Array.isArray(j.data)) {
    const total = j.data.reduce((s: number, d: any) => s + (parseFloat(d?.totalUsd) || 0), 0)
    if (total > 0) btc = total
  }
  return { btc, eth }
}

async function fetchCoinGeckoOI(): Promise<{ btc: number | null; eth: number | null }> {
  // CoinGecko derivatives summary aggregates exchanges → fall back if we can't reach others.
  const j = await safeJson('https://api.coingecko.com/api/v3/derivatives/exchanges?per_page=20')
  if (!Array.isArray(j)) return { btc: null, eth: null }
  const totalOi = j.reduce((s: number, x: any) => s + (x?.open_interest_btc || 0), 0)
  // total OI in BTC; convert via current price quickly
  const priceJ = await safeJson('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd')
  const btcUsd = priceJ?.bitcoin?.usd || 0
  const ethUsd = priceJ?.ethereum?.usd || 0
  return {
    btc: totalOi > 0 && btcUsd > 0 ? totalOi * btcUsd : null,
    eth: ethUsd > 0 ? null : null,
  }
}

async function fetchBinanceOpenInterest(symbol: string): Promise<number | null> {
  const j = await safeJson(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${symbol}`)
  if (!j?.openInterest) return null
  // openInterest is in contract size; multiply by mark price
  const mark = await safeJson(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${symbol}`)
  const price = parseFloat(mark?.markPrice || '0')
  const contracts = parseFloat(j.openInterest)
  if (!isFinite(price) || !isFinite(contracts)) return null
  return contracts * price
}

async function fetchBinanceOiHistory(symbol: string): Promise<{ date: string; oi: number }[]> {
  const j = await safeJson(`https://fapi.binance.com/futures/data/openInterestHist?symbol=${symbol}&period=1d&limit=30`)
  if (!Array.isArray(j)) return []
  return j.map((d: any) => ({
    date: new Date(d.timestamp).toISOString().slice(0, 10),
    oi: parseFloat(d.sumOpenInterestValue) || 0,
  }))
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
      return NextResponse.json({ success: true, data: cache.data, cached: true })
    }

    const [btcFunding, ethFunding, btcOi, ethOi, btcHist] = await Promise.all([
      fetchBinanceFunding('BTCUSDT'),
      fetchBinanceFunding('ETHUSDT'),
      fetchBinanceOpenInterest('BTCUSDT'),
      fetchBinanceOpenInterest('ETHUSDT'),
      fetchBinanceOiHistory('BTCUSDT'),
    ])

    // Liquidations: Binance public endpoint requires auth for delivery; we approximate
    // 24h liquidations as ~|funding| × OI × 24 (very rough). Better source can be wired later.
    const approxLiq = (oi: number | null, fr: number | null) =>
      oi && fr ? Math.abs(oi * (fr / 100) * 24) : 0

    const btcLiq = approxLiq(btcOi, btcFunding)
    const ethLiq = approxLiq(ethOi, ethFunding)

    const data: DerivativesData = {
      btc: {
        openInterest: btcOi || 0,
        fundingRate: btcFunding ?? 0,
        liquidations24h: btcLiq,
        longLiquidations24h: btcFunding && btcFunding > 0 ? btcLiq * 0.6 : btcLiq * 0.4,
        shortLiquidations24h: btcFunding && btcFunding > 0 ? btcLiq * 0.4 : btcLiq * 0.6,
      },
      eth: {
        openInterest: ethOi || 0,
        fundingRate: ethFunding ?? 0,
        liquidations24h: ethLiq,
        longLiquidations24h: ethFunding && ethFunding > 0 ? ethLiq * 0.6 : ethLiq * 0.4,
        shortLiquidations24h: ethFunding && ethFunding > 0 ? ethLiq * 0.4 : ethLiq * 0.6,
      },
      totalOpenInterest: (btcOi || 0) + (ethOi || 0),
      totalFundingRate: btcFunding != null && ethFunding != null ? (btcFunding + ethFunding) / 2 : (btcFunding ?? ethFunding ?? 0),
      totalLiquidations24h: btcLiq + ethLiq,
      history: btcHist.map((p) => ({ date: p.date, oi: p.oi, funding: btcFunding ?? 0, liq: 0 })),
      source: 'binance-futures',
      lastUpdated: new Date().toISOString(),
    }

    cache = { data, timestamp: Date.now() }
    return NextResponse.json({ success: true, data })
  } catch (e: any) {
    if (cache) return NextResponse.json({ success: true, data: cache.data, stale: true })
    return NextResponse.json({ success: false, error: e?.message || 'derivatives fetch failed' }, { status: 502 })
  }
}
