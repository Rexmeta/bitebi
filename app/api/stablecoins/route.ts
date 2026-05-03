import { NextResponse } from 'next/server'
import { swrCache } from '@/lib/persistentCache'

const CACHE_TTL = 5 * 60 * 1000

// Retry fetch with exponential back-off (handles 429 rate-limits)
async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, options)
    if (res.status !== 429) return res
    // 429 → wait 2^i * 1 second then retry
    await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)))
  }
  return fetch(url, options)
}

interface StablecoinsPayload {
  stablecoins: any[]
  totalSupply: number
  source: 'defillama' | 'coingecko' | 'none'
  lastUpdated: string
}

async function buildStablecoinsData(): Promise<StablecoinsPayload> {
  // Primary: DefiLlama (free, no key needed, very reliable)
  const llamaRes = await fetchWithRetry(
    'https://stablecoins.llama.fi/stablecoins?includePrices=true',
    { headers: { 'Accept': 'application/json' }, next: { revalidate: 300 } }
  )

  let llamaData: any[] = []
  let totalSupply = 0

  if (llamaRes.ok) {
    const json = await llamaRes.json()
    const peggedAssets: any[] = json.peggedAssets || []

    // Filter USD-pegged only, sort by circulating supply descending
    const usdPegged = peggedAssets
      .filter((s: any) => s.pegType === 'peggedUSD')
      .sort((a: any, b: any) => (b.circulating?.peggedUSD || 0) - (a.circulating?.peggedUSD || 0))

    // ✅ FIX #5: totalSupply computed from the FULL set (not just top-15)
    totalSupply = usdPegged.reduce((sum: number, s: any) => sum + (s.circulating?.peggedUSD || 0), 0)

    llamaData = usdPegged.slice(0, 15).map((s: any) => {
      const mcap = s.circulating?.peggedUSD || 0

      // ✅ FIX #1: Use circulatingPrevWeek for 7d change, NOT prevDay×7
      let change7d = 0
      let change30d = 0
      if (s.circulatingPrevWeek?.peggedUSD && mcap) {
        const prevWeek = s.circulatingPrevWeek.peggedUSD
        change7d = ((mcap - prevWeek) / prevWeek) * 100
      } else if (s.circulatingPrevDay?.peggedUSD && mcap) {
        // Fallback: use prevDay only when prevWeek is absent (mark as approximation)
        const prevDay = s.circulatingPrevDay.peggedUSD
        change7d = ((mcap - prevDay) / prevDay) * 100 // single-day change, NOT ×7
      }
      if (s.circulatingPrevMonth?.peggedUSD && mcap) {
        const prevMonth = s.circulatingPrevMonth.peggedUSD
        change30d = ((mcap - prevMonth) / prevMonth) * 100
      }

      const chains = s.chainCirculating || {}
      const chainList = Object.entries(chains)
        .map(([chain, data]: [string, any]) => ({
          chain,
          circulating: data?.current?.peggedUSD || 0,
        }))
        .sort((a, b) => b.circulating - a.circulating)
        .slice(0, 5)

      return {
        id: s.id,
        name: s.name,
        symbol: s.symbol,
        circulating_supply: mcap,
        market_cap: mcap,
        // ✅ FIX #5: dominance against real full-market totalSupply
        dominance: totalSupply > 0 ? (mcap / totalSupply) * 100 : 0,
        change_7d: Math.round(change7d * 100) / 100,
        change_30d: Math.round(change30d * 100) / 100,
        chains: chainList,
      }
    })
  }

  // ✅ FIX #7: CoinGecko fallback with rate-limit retry
  let geckoData: any[] = []
  if (llamaData.length === 0) {
    const geckoRes = await fetchWithRetry(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=tether,usd-coin,dai,first-digital-usd,ethena-usde,usds&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=7d,30d',
      {
        headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 bitebi-bot/1.0' },
        next: { revalidate: 300 },
      }
    )
    if (geckoRes.ok) {
      const raw = await geckoRes.json()
      const geckoTotal = raw.reduce((s: number, c: any) => s + (c.market_cap || 0), 0)
      geckoData = raw.map((c: any) => ({
        id: c.id,
        name: c.name,
        symbol: c.symbol?.toUpperCase(),
        circulating_supply: c.circulating_supply || 0,
        market_cap: c.market_cap || 0,
        dominance: geckoTotal > 0 ? ((c.market_cap || 0) / geckoTotal) * 100 : 0,
        change_7d: Math.round((c.price_change_percentage_7d_in_currency || 0) * 100) / 100,
        change_30d: Math.round((c.price_change_percentage_30d_in_currency || 0) * 100) / 100,
        chains: [],
      }))
      if (!totalSupply && geckoTotal) totalSupply = geckoTotal
    }
  }

  const stablecoins = llamaData.length > 0 ? llamaData : geckoData
  return {
    stablecoins,
    totalSupply,
    source: llamaData.length > 0 ? 'defillama' : (geckoData.length > 0 ? 'coingecko' : 'none'),
    lastUpdated: new Date().toISOString(),
  }
}

export async function GET() {
  try {
    const result = await swrCache<StablecoinsPayload>({
      key: 'stablecoins-v1',
      freshTtlMs: CACHE_TTL,
      fetcher: buildStablecoinsData,
      shouldStore: (d) => Array.isArray(d.stablecoins) && d.stablecoins.length > 0,
    })
    return NextResponse.json({
      ...result.data,
      cached: result.fromCache,
      cacheSource: result.source,
      cacheAgeMs: result.age,
      stale: result.stale,
      revalidating: result.revalidating,
    })
  } catch (error) {
    console.error('Error fetching stablecoin data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stablecoin data' },
      { status: 500 }
    )
  }
}
