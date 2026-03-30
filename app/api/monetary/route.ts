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

    const fredApiKey = process.env.FRED_API_KEY
    let usM2: number | null = null
    let usM2History: { date: string; value: number }[] = []
    let fedFundsRate: number | null = null
    let fedFundsHistory: { date: string; value: number }[] = []

    if (fredApiKey) {
      const [m2Res, rateRes] = await Promise.allSettled([
        fetch(
          `https://api.stlouisfed.org/fred/series/observations?series_id=M2SL&api_key=${fredApiKey}&file_type=json&sort_order=desc&limit=60`,
          { next: { revalidate: 300 } }
        ),
        fetch(
          `https://api.stlouisfed.org/fred/series/observations?series_id=FEDFUNDS&api_key=${fredApiKey}&file_type=json&sort_order=desc&limit=60`,
          { next: { revalidate: 300 } }
        ),
      ])

      if (m2Res.status === 'fulfilled' && m2Res.value.ok) {
        const m2Json = await m2Res.value.json()
        const observations = m2Json.observations || []
        const validObs = observations.filter((o: any) => o.value !== '.')
        if (validObs.length > 0) {
          usM2 = parseFloat(validObs[0].value) * 1e9
          usM2History = validObs
            .slice(0, 24)
            .reverse()
            .map((o: any) => ({ date: o.date, value: parseFloat(o.value) * 1e9 }))
        }
      }

      if (rateRes.status === 'fulfilled' && rateRes.value.ok) {
        const rateJson = await rateRes.value.json()
        const observations = rateJson.observations || []
        const validObs = observations.filter((o: any) => o.value !== '.')
        if (validObs.length > 0) {
          fedFundsRate = parseFloat(validObs[0].value)
          fedFundsHistory = validObs
            .slice(0, 24)
            .reverse()
            .map((o: any) => ({ date: o.date, value: parseFloat(o.value) }))
        }
      }
    }

    const data = {
      usM2,
      usM2History,
      fedFundsRate,
      fedFundsHistory,
      lastUpdated: new Date().toISOString(),
      hasFredKey: !!fredApiKey,
    }

    cache = { data, timestamp: Date.now() }
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error fetching monetary data:', error)
    if (cache) {
      return NextResponse.json({ success: true, data: cache.data, cached: true })
    }
    return NextResponse.json(
      { success: false, error: 'Failed to fetch monetary data' },
      { status: 500 }
    )
  }
}
