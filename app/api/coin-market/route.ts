import { NextResponse } from 'next/server'

interface CacheEntry {
  data: unknown
  timestamp: number
}

let cache: CacheEntry | null = null
const CACHE_TTL = 60 * 1000

export async function GET() {
  try {
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
      return NextResponse.json(cache.data)
    }

    const response = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1',
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        next: { revalidate: 60 }
      }
    )

    if (!response.ok) {
      if (cache) {
        return NextResponse.json(cache.data)
      }
      throw new Error(`CoinGecko API error: ${response.status}`)
    }

    const data = await response.json()
    cache = { data, timestamp: Date.now() }
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching coin market data:', error)
    if (cache) {
      return NextResponse.json(cache.data)
    }
    return NextResponse.json(
      { error: 'Failed to fetch coin market data' },
      { status: 500 }
    )
  }
}
