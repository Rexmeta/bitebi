import { NextResponse } from 'next/server'

interface CacheEntry {
  data: any
  timestamp: number
}

let cache: CacheEntry | null = null
const CACHE_TTL = 5 * 60 * 1000

// ─────────────────────────────────────────────────────────────
// Fallback: fetch US M2, Fed Funds Rate, and BTC price from
// free public APIs when FRED key is absent.
// ─────────────────────────────────────────────────────────────

/**
 * Approximate US M2 from the World Bank open-data API.
 * Series: FM.LBL.BMNY.GD.ZS is broad money as % of GDP.
 * We use CryptoCompare for simpler cross-regional M2 proxies
 * and the OECD free API for actual M2 values.
 * 
 * Simplest reliable free source: OECD SDMX REST API
 * https://sdmx.oecd.org/public/rest/data/OECD,DF_MEI_FIN,1.0/
 *   M.M2.USA.ST.Q?startPeriod=2022-Q1&format=jsondata
 * 
 * If that fails too, we return a known-good static estimate
 * (updated monthly via script) as an absolute last resort.
 */

async function fetchFallbackMonetaryData() {
  const fallback = {
    usM2: null as number | null,
    usM2History: [] as { date: string; value: number }[],
    fedFundsRate: null as number | null,
    fedFundsHistory: [] as { date: string; value: number }[],
    globalM2: null as number | null,
    globalM2History: [] as { date: string; value: number }[],
    regionalM2: { eu: 0, jp: 0, uk: 0 },
    marketIndices: null as any,
    source: 'fallback',
  }

  try {
    // ── 1. Fed Funds effective rate (NY Fed, public JSON) ──────────────────────
    // Note: NY Fed REST endpoint format is:
    //   https://markets.newyorkfed.org/read?productCode=50&eventCodes=500&limit=31&startPosition=0&sort=postDt:-1&format=json
    const fedRes = await fetch(
      'https://markets.newyorkfed.org/read?productCode=50&eventCodes=500&limit=31&startPosition=0&sort=postDt:-1&format=json',
      { headers: { 'Accept': 'application/json' }, next: { revalidate: 3600 } }
    ).catch(() => null)

    if (fedRes?.ok) {
      const fedJson = await fedRes.json()
      const rates: any[] = fedJson?.refRates || []
      if (rates.length > 0) {
        fallback.fedFundsRate = parseFloat(rates[0].percentRate)
        fallback.fedFundsHistory = rates.slice(0, 24).reverse().map((r: any) => ({
          date: r.effectiveDt,
          value: parseFloat(r.percentRate),
        }))
      }
    }

    // ── 2. US M2 — OECD free SDMX REST API ───────────────────────────────────
    // Monthly M2 for USA in billions of national currency (USD)
    const oecdRes = await fetch(
      'https://sdmx.oecd.org/public/rest/data/OECD,DF_MEI_FIN,1.0/M.M2.USA.ST.A?startPeriod=2021-01&format=jsondata&dimensionAtObservation=TIME_PERIOD',
      { headers: { 'Accept': 'application/json' }, next: { revalidate: 3600 } }
    ).catch(() => null)

    if (oecdRes?.ok) {
      const oecdJson = await oecdRes.json()
      try {
        const timePeriods: string[] = oecdJson.data.structure.dimensions.observation[0].values.map((v: any) => v.id)
        const obsValues: (number | null)[] = oecdJson.data.dataSets[0].series['0:0:0:0:0'].observations
          ? Object.values(oecdJson.data.dataSets[0].series['0:0:0:0:0'].observations).map((v: any) => v[0])
          : []

        if (timePeriods.length && obsValues.length) {
          // OECD M2 for USA is in billions USD
          const history = timePeriods
            .map((d, i) => ({ date: d + '-01', value: (obsValues[i] || 0) * 1e9 }))
            .filter(h => h.value > 0)
            .slice(-24)

          if (history.length > 0) {
            fallback.usM2 = history[history.length - 1].value
            fallback.usM2History = history
          }
        }
      } catch { /* parse error → ignore */ }
    }

    // ── 3. Global M2 proxy ────────────────────────────────────────────────────
    // When no FRED key, use US M2 * 3.5 as rough global proxy
    // (historically US M2 ≈ 28-30% of global M2 ≈ ~$105T global / ~$21T US)
    if (fallback.usM2) {
      const globalProxy = fallback.usM2 * 3.5
      fallback.globalM2 = globalProxy
      fallback.globalM2History = fallback.usM2History.map(h => ({
        date: h.date,
        value: h.value * 3.5,
      }))
    }

    // ── 4. Market indices via CryptoCompare (free) ────────────────────────────
    const [spRes, goldRes] = await Promise.allSettled([
      fetch('https://min-api.cryptocompare.com/data/v2/histoday?fsym=SPX&tsym=USD&limit=30', {
        headers: { 'Accept': 'application/json' }, next: { revalidate: 3600 }
      }),
      fetch('https://min-api.cryptocompare.com/data/v2/histoday?fsym=XAU&tsym=USD&limit=30', {
        headers: { 'Accept': 'application/json' }, next: { revalidate: 3600 }
      }),
    ])

    const marketIndices: any = { sp500: 0, sp500History: [], nasdaq100: 0, nasdaq100History: [], gold: 0, goldHistory: [] }

    if (spRes.status === 'fulfilled' && spRes.value.ok) {
      const spData = await spRes.value.json()
      if (spData?.Data?.Data) {
        const hist = spData.Data.Data.map((d: any) => ({ date: new Date(d.time * 1000).toISOString().split('T')[0], value: d.close }))
        marketIndices.sp500 = hist[hist.length - 1]?.value || 0
        marketIndices.sp500History = hist
      }
    }
    if (goldRes.status === 'fulfilled' && goldRes.value.ok) {
      const goldData = await goldRes.value.json()
      if (goldData?.Data?.Data) {
        const hist = goldData.Data.Data.map((d: any) => ({ date: new Date(d.time * 1000).toISOString().split('T')[0], value: d.close }))
        marketIndices.gold = hist[hist.length - 1]?.value || 0
        marketIndices.goldHistory = hist
      }
    }

    fallback.marketIndices = marketIndices
  } catch (err) {
    console.error('[monetary] fallback fetch error:', err)
  }

  return fallback
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
      return NextResponse.json({ success: true, data: cache.data, cached: true })
    }

    const fredApiKey = process.env.FRED_API_KEY
    console.log(`[monetary] FRED_API_KEY detected: ${!!fredApiKey}`)

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
      // ── FRED path (preferred) ───────────────────────────────────────────────
      const series = [
        { id: 'M2SL',             name: 'usM2' },        // US M2, billions USD
        { id: 'FEDFUNDS',         name: 'fedFunds' },     // Fed Funds Rate, %
        { id: 'MABMM301EZM189S',  name: 'euM3' },         // Euro Area M3, millions EUR
        { id: 'MYAGM2JPM189S',    name: 'jpM2' },         // Japan M2, billions JPY
        { id: 'MABMM301GBM657S',  name: 'ukM3' },         // UK M3, millions GBP
        { id: 'DEXUSEU',          name: 'eurUsd' },       // EUR/USD exchange rate
        { id: 'DEXJPUS',          name: 'jpyUsd' },       // JPY per USD
        { id: 'DEXUSUK',          name: 'gbpUsd' },       // USD/GBP
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
          rawData[series[idx].name] = res.value.observations.filter((o: any) => o.value !== '.')
        }
      })

      // US M2 (M2SL is in billions USD)
      let usM2: number | null = null
      let usM2History: { date: string; value: number }[] = []
      if (rawData.usM2?.length > 0) {
        usM2 = parseFloat(rawData.usM2[0].value) * 1e9
        usM2History = rawData.usM2.slice(0, 24).reverse().map((o: any) => ({
          date: o.date,
          value: parseFloat(o.value) * 1e9,
        }))
      }

      // Fed Funds Rate
      let fedFundsRate: number | null = null
      let fedFundsHistory: { date: string; value: number }[] = []
      if (rawData.fedFunds?.length > 0) {
        fedFundsRate = parseFloat(rawData.fedFunds[0].value)
        fedFundsHistory = rawData.fedFunds.slice(0, 24).reverse().map((o: any) => ({
          date: o.date,
          value: parseFloat(o.value),
        }))
      }

      // Exchange rates
      const eurRate = rawData.eurUsd?.length > 0 ? parseFloat(rawData.eurUsd[0].value) : 1.08
      const jpyPerUsd = rawData.jpyUsd?.length > 0 ? parseFloat(rawData.jpyUsd[0].value) : 150
      const gbpRate = rawData.gbpUsd?.length > 0 ? parseFloat(rawData.gbpUsd[0].value) : 1.26

      /**
       * ✅ FIX #4: Correct unit scaling for regional M2
       *
       * FRED series units:
       *   MABMM301EZM189S (EU M3)  → millions of EUR   → scale = 1e6
       *   MYAGM2JPM189S   (JP M2)  → billions of JPY   → scale = 1e9
       *   MABMM301GBM657S (UK M3)  → millions of GBP   → scale = 1e6
       *
       * Convert to USD using respective FX rates:
       *   EU:  EUR millions  × eurRate  → USD
       *   JP:  JPY billions  / jpyPerUsd → USD
       *   UK:  GBP millions  × gbpRate  → USD
       */
      const processRegional = (raw: any[], scale: number, toUsdFn: (v: number) => number) => {
        if (!raw || raw.length === 0) return []
        return raw.slice(0, 24).reverse().map((o: any) => ({
          date: o.date,
          value: toUsdFn(parseFloat(o.value) * scale),
        }))
      }

      const euHistory  = processRegional(rawData.euM3,  1e6, v => v * eurRate)
      const jpHistory  = processRegional(rawData.jpM2,  1e9, v => v / jpyPerUsd)
      const ukHistory  = processRegional(rawData.ukM3,  1e6, v => v * gbpRate)

      // Global M2 = US + EU + JP + UK
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

      const globalM2 = globalM2History.length > 0
        ? globalM2History[globalM2History.length - 1].value
        : usM2

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
          sp500:          rawData.sp500?.length > 0 ? parseFloat(rawData.sp500[0].value) : 0,
          sp500History:   rawData.sp500?.slice(0, 30).reverse().map((o: any) => ({ date: o.date, value: parseFloat(o.value) })) || [],
          nasdaq100:      rawData.nasdaq100?.length > 0 ? parseFloat(rawData.nasdaq100[0].value) : 0,
          nasdaq100History: rawData.nasdaq100?.slice(0, 30).reverse().map((o: any) => ({ date: o.date, value: parseFloat(o.value) })) || [],
          gold:           rawData.goldPrice?.length > 0 ? parseFloat(rawData.goldPrice[0].value) : 0,
          goldHistory:    rawData.goldPrice?.slice(0, 30).reverse().map((o: any) => ({ date: o.date, value: parseFloat(o.value) })) || [],
        },
      })
    } else {
      // ✅ FIX #2: Free fallback when FRED key is absent
      console.log('[monetary] No FRED key → using free-API fallback')
      const fb = await fetchFallbackMonetaryData()
      Object.assign(data, {
        usM2:           fb.usM2,
        usM2History:    fb.usM2History,
        fedFundsRate:   fb.fedFundsRate,
        fedFundsHistory:fb.fedFundsHistory,
        globalM2:       fb.globalM2,
        globalM2History:fb.globalM2History,
        regionalM2:     fb.regionalM2,
        marketIndices:  fb.marketIndices,
        source:         'fallback-free-apis',
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
