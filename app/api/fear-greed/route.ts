import { NextResponse } from 'next/server'
import { swrCache } from '@/lib/persistentCache'

interface FearGreedData {
  value: string
  value_classification: string
  timestamp: string
}

const CACHE_TTL = 5 * 60 * 1000

async function buildFearGreedData(): Promise<FearGreedData[]> {
  const response = await fetch(
    'https://api.alternative.me/fng/?limit=31',
    {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
      next: { revalidate: 300 },
    }
  )

  if (!response.ok) {
    throw new Error(`Fear & Greed API error: ${response.status}`)
  }

  const json = await response.json()
  const data: FearGreedData[] = (json.data || []).map((item: any) => ({
    value: item.value,
    value_classification: item.value_classification,
    timestamp: item.timestamp,
  }))
  return data
}

export async function GET() {
  try {
    const result = await swrCache<FearGreedData[]>({
      key: 'fear-greed-v1',
      freshTtlMs: CACHE_TTL,
      fetcher: buildFearGreedData,
      shouldStore: (d) => Array.isArray(d) && d.length > 0,
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
    console.error('Error fetching fear & greed data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch fear & greed data' },
      { status: 500 }
    )
  }
}
