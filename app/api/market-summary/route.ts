import { NextResponse } from 'next/server'

interface CacheEntry {
  data: any
  timestamp: number
}

let cache: CacheEntry | null = null
const CACHE_TTL = 2 * 60 * 1000

export async function GET() {
  try {
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
      return NextResponse.json({ success: true, data: cache.data })
    }

    const response = await fetch(
      'https://api.coingecko.com/api/v3/global',
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0'
        },
        next: { revalidate: 120 }
      }
    )

    if (!response.ok) {
      if (cache) {
        return NextResponse.json({ success: true, data: cache.data })
      }
      throw new Error(`CoinGecko Global API error: ${response.status}`)
    }

    const json = await response.json()
    const g = json.data

    const data = {
      totalMarketCap: g.total_market_cap?.usd || 0,
      totalVolume24h: g.total_volume?.usd || 0,
      btcDominance: g.market_cap_percentage?.btc || 0,
      ethDominance: g.market_cap_percentage?.eth || 0,
      activeCryptocurrencies: g.active_cryptocurrencies || 0,
      marketCapChangePercentage24h: g.market_cap_change_percentage_24h_usd || 0,
    }

    cache = { data, timestamp: Date.now() }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error fetching market summary:', error)
    if (cache) {
      return NextResponse.json({ success: true, data: cache.data })
    }
    return NextResponse.json(
      { success: false, error: 'Failed to fetch market summary' },
      { status: 500 }
    )
  }
}
