import { NextResponse } from 'next/server'

interface CacheEntry {
  data: any
  timestamp: number
}

let cache: CacheEntry | null = null
const CACHE_TTL = 5 * 60 * 1000

export async function GET() {
  try {
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
      return NextResponse.json({ success: true, data: cache.data, cached: true })
    }

    const [stablecoinsRes, chainsRes, tvlRes, btcRes] = await Promise.allSettled([
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
      fetch('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=365&interval=daily', {
        headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 300 },
      }),
    ])

    let stablecoins: any[] = []
    let totalStablecoinSupply = 0
    let stablecoinMarketShares: { name: string; symbol: string; marketCap: number; change7d: number; change30d: number }[] = []
    let stablecoinHistory: { date: number; totalCirculating: number }[] = []

    if (stablecoinsRes.status === 'fulfilled' && stablecoinsRes.value.ok) {
      const json = await stablecoinsRes.value.json()
      const peggedAssets = json.peggedAssets || []

      stablecoins = peggedAssets
        .filter((s: any) => s.pegType === 'peggedUSD')
        .sort((a: any, b: any) => {
          const aMcap = a.circulating?.peggedUSD || 0
          const bMcap = b.circulating?.peggedUSD || 0
          return bMcap - aMcap
        })

      totalStablecoinSupply = stablecoins.reduce(
        (sum: number, s: any) => sum + (s.circulating?.peggedUSD || 0),
        0
      )

      stablecoinMarketShares = stablecoins.slice(0, 10).map((s: any) => {
        const mcap = s.circulating?.peggedUSD || 0
        const chains = s.chainCirculating || {}
        let change7d = 0
        let change30d = 0

        if (s.circulatingPrevDay?.peggedUSD && mcap) {
          const prev = s.circulatingPrevDay.peggedUSD
          change7d = ((mcap - prev) / prev) * 100 * 7
        }
        if (s.circulatingPrevMonth?.peggedUSD && mcap) {
          const prev = s.circulatingPrevMonth.peggedUSD
          change30d = ((mcap - prev) / prev) * 100
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

    let btcPriceHistory: { date: number; price: number }[] = []
    if (btcRes.status === 'fulfilled' && btcRes.value.ok) {
      const btcData = await btcRes.value.json()
      btcPriceHistory = (btcData.prices || []).map((p: any) => ({
        date: p[0],
        price: p[1],
      }))
    }

    const data = {
      stablecoins: stablecoinMarketShares,
      totalStablecoinSupply,
      chainDistribution,
      tvlHistory,
      currentTvl,
      btcPriceHistory,
      lastUpdated: new Date().toISOString(),
    }

    cache = { data, timestamp: Date.now() }
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error fetching defi stats:', error)
    if (cache) {
      return NextResponse.json({ success: true, data: cache.data, cached: true })
    }
    return NextResponse.json(
      { success: false, error: 'Failed to fetch defi stats' },
      { status: 500 }
    )
  }
}
