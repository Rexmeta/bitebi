import { NextResponse } from 'next/server'

interface FearGreedData {
  value: string
  value_classification: string
  timestamp: string
}

interface CacheEntry {
  data: FearGreedData[]
  timestamp: number
}

let cache: CacheEntry | null = null
const CACHE_TTL = 5 * 60 * 1000

export async function GET() {
  try {
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
      return NextResponse.json({ success: true, data: cache.data })
    }

    const response = await fetch(
      'https://api.alternative.me/fng/?limit=31',
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0'
        },
        next: { revalidate: 300 }
      }
    )

    if (!response.ok) {
      if (cache) {
        return NextResponse.json({ success: true, data: cache.data })
      }
      throw new Error(`Fear & Greed API error: ${response.status}`)
    }

    const json = await response.json()
    const data: FearGreedData[] = json.data.map((item: any) => ({
      value: item.value,
      value_classification: item.value_classification,
      timestamp: item.timestamp,
    }))

    cache = { data, timestamp: Date.now() }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error fetching fear & greed data:', error)
    if (cache) {
      return NextResponse.json({ success: true, data: cache.data })
    }
    return NextResponse.json(
      { success: false, error: 'Failed to fetch fear & greed data' },
      { status: 500 }
    )
  }
}
