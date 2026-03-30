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
      return NextResponse.json(cache.data)
    }

    const [llamaRes, geckoRes] = await Promise.allSettled([
      fetch('https://stablecoins.llama.fi/stablecoins?includePrices=true', {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 300 },
      }),
      fetch(
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=tether,usd-coin,dai,first-digital-usd,ethena-usde,usds&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h,7d,30d',
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0',
          },
          next: { revalidate: 300 },
        }
      ),
    ])

    let llamaData: any[] = []
    let totalSupply = 0

    if (llamaRes.status === 'fulfilled' && llamaRes.value.ok) {
      const json = await llamaRes.value.json()
      const peggedAssets = json.peggedAssets || []
      const usdPegged = peggedAssets
        .filter((s: any) => s.pegType === 'peggedUSD')
        .sort((a: any, b: any) => (b.circulating?.peggedUSD || 0) - (a.circulating?.peggedUSD || 0))

      totalSupply = usdPegged.reduce((sum: number, s: any) => sum + (s.circulating?.peggedUSD || 0), 0)

      llamaData = usdPegged.slice(0, 15).map((s: any) => {
        const mcap = s.circulating?.peggedUSD || 0
        const chains = s.chainCirculating || {}
        const chainList = Object.entries(chains)
          .map(([chain, data]: [string, any]) => ({
            chain,
            circulating: data?.current?.peggedUSD || 0,
          }))
          .sort((a, b) => b.circulating - a.circulating)
          .slice(0, 5)

        let change7d = 0
        let change30d = 0
        if (s.circulatingPrevDay?.peggedUSD && mcap) {
          change7d = ((mcap - s.circulatingPrevDay.peggedUSD) / s.circulatingPrevDay.peggedUSD) * 100 * 7
        }
        if (s.circulatingPrevMonth?.peggedUSD && mcap) {
          change30d = ((mcap - s.circulatingPrevMonth.peggedUSD) / s.circulatingPrevMonth.peggedUSD) * 100
        }

        return {
          id: s.id,
          name: s.name,
          symbol: s.symbol,
          circulating_supply: mcap,
          market_cap: mcap,
          dominance: totalSupply > 0 ? (mcap / totalSupply) * 100 : 0,
          change_7d: Math.round(change7d * 100) / 100,
          change_30d: Math.round(change30d * 100) / 100,
          chains: chainList,
        }
      })
    }

    let geckoData: any[] = []
    if (geckoRes.status === 'fulfilled' && geckoRes.value.ok) {
      geckoData = await geckoRes.value.json()
    }

    const data = {
      stablecoins: llamaData.length > 0 ? llamaData : geckoData,
      totalSupply,
      source: llamaData.length > 0 ? 'defillama' : 'coingecko',
      lastUpdated: new Date().toISOString(),
    }

    cache = { data, timestamp: Date.now() }
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching stablecoin data:', error)
    if (cache) {
      return NextResponse.json(cache.data)
    }
    return NextResponse.json(
      { error: 'Failed to fetch stablecoin data' },
      { status: 500 }
    )
  }
}
