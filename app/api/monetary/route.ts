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
    
    const data: any = {
      usM2: null,
      usM2History: [],
      fedFundsRate: null,
      fedFundsHistory: [],
      globalM2: null,
      globalM2History: [],
      regionalM2: { eu: 0, jp: 0, uk: 0 },
      lastUpdated: new Date().toISOString(),
      hasFredKey: !!fredApiKey,
    }

    if (fredApiKey) {
      const series = [
        { id: 'M2SL',             name: 'usM2' },
        { id: 'FEDFUNDS',         name: 'fedFunds' },
        { id: 'MABMM301EZM189S',  name: 'euM3' },
        { id: 'MYAGM2JPM189S',    name: 'jpM2' },
        { id: 'MABMM301GBM657S',  name: 'ukM3' },
        { id: 'DEXUSEU',          name: 'eurUsd' },
        { id: 'DEXJPUS',          name: 'jpyUsd' },
        { id: 'DEXUSUK',          name: 'gbpUsd' },
        { id: 'SP500',            name: 'sp500' },
        { id: 'NASDAQ100',        name: 'nasdaq100' },
        { id: 'GOLDPMGBD228NLBM', name: 'goldPrice' },
      ]

      const results = await Promise.allSettled(
        series.map(s => 
          fetch(
            `https://api.stlouisfed.org/fred/series/observations?series_id=${s.id}&api_key=${fredApiKey}&file_type=json&sort_order=desc&limit=60`,
            { next: { revalidate: 3600 } }
          ).then(r => r.json())
        )
      )

      const rawData: any = {}
      results.forEach((res, idx) => {
        if (res.status === 'fulfilled' && res.value.observations) {
          rawData[series[idx].name] = (res.value as any).observations.filter((o: any) => o.value !== '.')
        }
      })

      // US Data (M2SL is in Billions)
      if (rawData.usM2?.length > 0) {
        usM2 = parseFloat(rawData.usM2[0].value) * 1e9
        usM2History = rawData.usM2.slice(0, 24).reverse().map((o: any) => ({ date: o.date, value: parseFloat(o.value) * 1e9 }))
      }

      // Fed Funds
      if (rawData.fedFunds?.length > 0) {
        fedFundsRate = parseFloat(rawData.fedFunds[0].value)
        fedFundsHistory = rawData.fedFunds.slice(0, 24).reverse().map((o: any) => ({ date: o.date, value: parseFloat(o.value) }))
      }

      // Exchange Rates (latest)
      const eurRate = rawData.eurUsd?.length > 0 ? parseFloat(rawData.eurUsd[0].value) : 1.08
      const jpyRate = rawData.jpyUsd?.length > 0 ? 1 / parseFloat(rawData.jpyUsd[0].value) : 1 / 150
      const gbpRate = rawData.gbpUsd?.length > 0 ? parseFloat(rawData.gbpUsd[0].value) : 1.26

      const processGlobal = (raw: any[], rate: number, scale = 1e9) => {
        if (!raw || raw.length === 0) return []
        return raw.slice(0, 24).reverse().map((o: any) => ({
          date: o.date,
          value: parseFloat(o.value) * scale * rate
        }))
      }

      const euHistory = processGlobal(rawData.euM3, eurRate)
      const jpHistory = processGlobal(rawData.jpM2, jpyRate)
      const ukHistory = processGlobal(rawData.ukM3, gbpRate)

      // Calculate Global M2 History (Sum of US, EU, JP, UK)
      const globalHistoryMap: Record<string, number> = {}
      const allHistories = [usM2History, euHistory, jpHistory, ukHistory]
      
      allHistories.forEach(hist => {
        hist.forEach((h: any) => {
          const month = h.date.substring(0, 7) // YYYY-MM
          globalHistoryMap[month] = (globalHistoryMap[month] || 0) + h.value
        })
      })

      const globalM2History = Object.entries(globalHistoryMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, value]) => ({ date: `${date}-01`, value }))

      const globalM2 = globalM2History.length > 0 ? globalM2History[globalM2History.length - 1].value : usM2

      Object.assign(data, {
        usM2,
        usM2History,
        fedFundsRate,
        fedFundsHistory,
        globalM2,
        globalM2History,
        regionalM2: {
          eu: euHistory.length > 0 ? euHistory[euHistory.length - 1].value : 0,
          jp: jpHistory.length > 0 ? jpHistory[jpHistory.length - 1].value : 0,
          uk: ukHistory.length > 0 ? ukHistory[ukHistory.length - 1].value : 0,
        },
        marketIndices: {
          sp500: rawData.sp500?.length > 0 ? parseFloat(rawData.sp500[0].value) : 0,
          sp500History: rawData.sp500?.slice(0, 30).reverse().map((o: any) => ({ date: o.date, value: parseFloat(o.value) })),
          nasdaq100: rawData.nasdaq100?.length > 0 ? parseFloat(rawData.nasdaq100[0].value) : 0,
          nasdaq100History: rawData.nasdaq100?.slice(0, 30).reverse().map((o: any) => ({ date: o.date, value: parseFloat(o.value) })),
          gold: rawData.goldPrice?.length > 0 ? parseFloat(rawData.goldPrice[0].value) : 0,
          goldHistory: rawData.goldPrice?.slice(0, 30).reverse().map((o: any) => ({ date: o.date, value: parseFloat(o.value) })),
        }
      })
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
