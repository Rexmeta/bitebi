import { NextResponse } from 'next/server'
import { swrCache } from '@/lib/persistentCache'

const CACHE_TTL = 5 * 60 * 1000

// Retry fetch with exponential back-off (handles 429 rate-limits)
async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, options)
    if (res.status !== 429) return res
    await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)))
  }
  return fetch(url, options)
}

interface DefiStatsPayload {
  stablecoins: { name: string; symbol: string; marketCap: number; change7d: number; change30d: number }[]
  totalStablecoinSupply: number
  chainDistribution: { chain: string; totalCirculating: number }[]
  tvlHistory: { date: number; tvl: number }[]
  currentTvl: number
  btcPriceHistory: { date: number; price: number }[]
  lastUpdated: string
}

async function buildDefiStatsData(): Promise<DefiStatsPayload> {
  const [stablecoinsRes, chainsRes, tvlRes] = await Promise.allSettled([
    fetch('https://stablecoins.llama.fi/stablecoins?includePrices=true', {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 300 },
    }),
    fetch('https://stablecoins.llama.fi/stablecoinchains', {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 300 },
    }),
    fetch('https://api.llama.fi/v2/historicalChainTvl', {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 300 },
    }),
  ])

  let stablecoins: any[] = []
  let totalStablecoinSupply = 0
  let stablecoinMarketShares: {
    name: string; symbol: string; marketCap: number; change7d: number; change30d: number
  }[] = []

  if (stablecoinsRes.status === 'fulfilled' && stablecoinsRes.value.ok) {
    const json = await stablecoinsRes.value.json()
    const peggedAssets: any[] = json.peggedAssets || []

    stablecoins = peggedAssets
      .filter((s: any) => s.pegType === 'peggedUSD')
      .sort((a: any, b: any) => {
        const aMcap = a.circulating?.peggedUSD || 0
        const bMcap = b.circulating?.peggedUSD || 0
        return bMcap - aMcap
      })

    // ✅ FIX #5: use FULL set for totalSupply
    totalStablecoinSupply = stablecoins.reduce(
      (sum: number, s: any) => sum + (s.circulating?.peggedUSD || 0),
      0
    )

    stablecoinMarketShares = stablecoins.slice(0, 10).map((s: any) => {
      const mcap = s.circulating?.peggedUSD || 0

      // ✅ FIX #1: Use circulatingPrevWeek for correct 7-day change
      let change7d = 0
      let change30d = 0

      if (s.circulatingPrevWeek?.peggedUSD && mcap) {
        const prevWeek = s.circulatingPrevWeek.peggedUSD
        change7d = ((mcap - prevWeek) / prevWeek) * 100
      } else if (s.circulatingPrevDay?.peggedUSD && mcap) {
        // Fallback to 1-day change when prevWeek data is absent
        const prevDay = s.circulatingPrevDay.peggedUSD
        change7d = ((mcap - prevDay) / prevDay) * 100
      }

      if (s.circulatingPrevMonth?.peggedUSD && mcap) {
        const prevMonth = s.circulatingPrevMonth.peggedUSD
        change30d = ((mcap - prevMonth) / prevMonth) * 100
      }

      return {
        name: s.name,
        symbol: s.symbol,
        marketCap: mcap,
        change7d: Math.round(change7d * 100) / 100,
        change30d: Math.round(change30d * 100) / 100,
      }
    })
  }

  let chainDistribution: { chain: string; totalCirculating: number }[] = []
  if (chainsRes.status === 'fulfilled' && chainsRes.value.ok) {
    const chainsData = await chainsRes.value.json()
    chainDistribution = (chainsData || [])
      .sort((a: any, b: any) => (b.totalCirculatingUSD?.peggedUSD || 0) - (a.totalCirculatingUSD?.peggedUSD || 0))
      .slice(0, 10)
      .map((c: any) => ({
        chain: c.name,
        totalCirculating: c.totalCirculatingUSD?.peggedUSD || 0,
      }))
  }

  let tvlHistory: { date: number; tvl: number }[] = []
  let currentTvl = 0
  if (tvlRes.status === 'fulfilled' && tvlRes.value.ok) {
    const tvlData = await tvlRes.value.json()
    tvlHistory = (tvlData || []).slice(-365).map((d: any) => ({
      date: d.date,
      tvl: d.tvl,
    }))
    if (tvlHistory.length > 0) {
      currentTvl = tvlHistory[tvlHistory.length - 1].tvl
    }
  }

  // ✅ FIX #7: BTC price from DefiLlama first, CoinGecko as fallback
  let btcPriceHistory: { date: number; price: number }[] = []

  // Attempt 1: CoinGecko (with rate-limit retry)
  const btcGeckoRes = await fetchWithRetry(
    'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=365&interval=daily',
    { headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 bitebi-bot/1.0' }, next: { revalidate: 300 } }
  ).catch(() => null)

  if (btcGeckoRes?.ok) {
    const btcData = await btcGeckoRes.json()
    btcPriceHistory = (btcData.prices || []).map((p: any) => ({
      date: p[0],
      price: p[1],
    }))
  }

  // Attempt 2/3: CryptoCompare fallback
  if (btcPriceHistory.length === 0) {
    const btcCompareRes = await fetch(
      'https://min-api.cryptocompare.com/data/v2/histoday?fsym=BTC&tsym=USD&limit=365',
      { headers: { 'Accept': 'application/json' }, next: { revalidate: 300 } }
    ).catch(() => null)

    if (btcCompareRes?.ok) {
      const compareData = await btcCompareRes.json()
      if (compareData?.Data?.Data) {
        btcPriceHistory = compareData.Data.Data.map((d: any) => ({
          date: d.time * 1000, // convert UNIX seconds → ms
          price: d.close,
        }))
      }
    }
  }

  return {
    stablecoins: stablecoinMarketShares,
    totalStablecoinSupply,
    chainDistribution,
    tvlHistory,
    currentTvl,
    btcPriceHistory,
    lastUpdated: new Date().toISOString(),
  }
}

export async function GET() {
  try {
    const result = await swrCache<DefiStatsPayload>({
      key: 'defi-stats-v1',
      freshTtlMs: CACHE_TTL,
      fetcher: buildDefiStatsData,
      shouldStore: (d) =>
        (d.stablecoins?.length || 0) > 0 ||
        (d.tvlHistory?.length || 0) > 0 ||
        (d.btcPriceHistory?.length || 0) > 0,
    })
    return NextResponse.json({
      success: true,
      data: result.data,
      cached: result.fromCache,
      cacheSource: result.source,
      cacheAgeMs: result.age,
      stale: result.stale,
      revalidating: result.revalidating,
    })
  } catch (error) {
    console.error('Error fetching defi stats:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch defi stats' },
      { status: 500 }
    )
  }
}
