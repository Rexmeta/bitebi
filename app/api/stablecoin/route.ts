import { NextResponse } from 'next/server'

/**
 * /api/stablecoin — Individual stablecoin detail endpoint.
 *
 * ✅ FIX #6: Replaced undocumented stablecoinstats.com with DefiLlama
 * which is a well-maintained, free, open-data API.
 *
 * Returns a map of { [SYMBOL]: StablecoinDetail } for the top stablecoins
 * to maintain backwards compatibility with existing consumers.
 */

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

    // Primary: DefiLlama stablecoins endpoint
    const llamaRes = await fetch('https://stablecoins.llama.fi/stablecoins?includePrices=true', {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 300 },
    })

    if (!llamaRes.ok) {
      throw new Error(`DefiLlama API error: ${llamaRes.status}`)
    }

    const json = await llamaRes.json()
    const peggedAssets: any[] = json.peggedAssets || []

    // Filter USD-pegged, sort by market cap, build a symbol-keyed map
    const usdPegged = peggedAssets
      .filter((s: any) => s.pegType === 'peggedUSD')
      .sort((a: any, b: any) => (b.circulating?.peggedUSD || 0) - (a.circulating?.peggedUSD || 0))

    const totalSupply = usdPegged.reduce((sum: number, s: any) => sum + (s.circulating?.peggedUSD || 0), 0)

    // Build map keyed by uppercase symbol (matches old stablecoinstats.com shape)
    const result: Record<string, any> = {}

    for (const s of usdPegged.slice(0, 20)) {
      const mcap = s.circulating?.peggedUSD || 0
      const prevDay = s.circulatingPrevDay?.peggedUSD || mcap
      const prevWeek = s.circulatingPrevWeek?.peggedUSD || mcap
      const prevMonth = s.circulatingPrevMonth?.peggedUSD || mcap

      const symbol = (s.symbol || '').toUpperCase()
      if (!symbol) continue

      result[symbol] = {
        id: s.id,
        name: s.name,
        symbol,
        price: s.price || 1,
        market_cap: mcap,
        circulating_supply: mcap,
        dominance: totalSupply > 0 ? (mcap / totalSupply) * 100 : 0,
        // ✅ FIX: correct change calculations using prevWeek
        circulation_change_24h: mcap - prevDay,
        circulation_percent_change_24h: prevDay > 0 ? ((mcap - prevDay) / prevDay) * 100 : 0,
        circulation_percent_change_7d: prevWeek > 0 ? ((mcap - prevWeek) / prevWeek) * 100 : 0,
        circulation_percent_change_30d: prevMonth > 0 ? ((mcap - prevMonth) / prevMonth) * 100 : 0,
        // Chain breakdown
        chains: Object.entries(s.chainCirculating || {})
          .map(([chain, data]: [string, any]) => ({
            chain,
            circulating: data?.current?.peggedUSD || 0,
          }))
          .sort((a, b) => b.circulating - a.circulating)
          .slice(0, 5),
        source: 'defillama',
        last_updated: new Date().toISOString(),
      }
    }

    const response = {
      data: result,
      totalSupply,
      count: Object.keys(result).length,
      source: 'defillama',
      lastUpdated: new Date().toISOString(),
    }

    cache = { data: response, timestamp: Date.now() }
    return NextResponse.json(response)
  } catch (error) {
    console.error('Stablecoin API error:', error)
    if (cache) {
      return NextResponse.json(cache.data)
    }
    return NextResponse.json(
      { error: 'Failed to fetch stablecoin data', data: {}, totalSupply: 0 },
      { status: 500 }
    )
  }
}
