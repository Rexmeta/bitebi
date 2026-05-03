import { NextResponse } from 'next/server'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface CacheEntry {
  data: any
  timestamp: number
  completeness: number
}

interface SeriesPoint {
  date: string
  value: number
}

// ─────────────────────────────────────────────────────────────
// Module-scope state
// ─────────────────────────────────────────────────────────────
let cache: CacheEntry | null = null
const CACHE_TTL_FULL = 5 * 60 * 1000      // 5 min when completeness >= 70%
const CACHE_TTL_PARTIAL = 60 * 1000        // 60 s otherwise

// In-flight request dedup (stampede prevention)
let inflight: Promise<any> | null = null

// ─────────────────────────────────────────────────────────────
// Per-request source latency recorder
// ─────────────────────────────────────────────────────────────
interface SourceLatency {
  label: string
  status: number          // HTTP status, 0 = network error / abort
  ok: boolean             // counted as a successful response
  durationMs: number      // duration of the LAST attempt only (not cumulative retry wall-time)
  attempts: number        // total attempts performed (cumulative across retries)
  bytes: number | null    // content-length, null if unknown
  errorName?: string      // error name on network failure
  finishedAt: string      // ISO timestamp of last finish
}
let currentLatencies: SourceLatency[] | null = null
function recordLatency(entry: SourceLatency) {
  if (currentLatencies) currentLatencies.push(entry)
}

// FRED key health cache
let fredKeyInvalid = false
let fredKeyCheckedAt = 0
const FRED_KEY_RECHECK_MS = 10 * 60 * 1000

// ─────────────────────────────────────────────────────────────
// FRED series unit metadata
// ─────────────────────────────────────────────────────────────
// Documented FRED unit per series. `multiplier` converts the
// raw observation to the base unit (USD for money, % for rates).
//
//  M2SL              — Billions of Dollars (NSA seasonally adj)  → ×1e9 USD
//  FEDFUNDS          — Percent                                    → ×1
//  DFF               — Percent (daily)                            → ×1
//  MABMM301EZM189S   — National currency, seasonally adj (millions of EUR) → ×1e6 EUR
//  MYAGM2JPM189S     — 100 Millions of Yen (i.e. raw × 1e8 JPY)   → ×1e8 JPY
//  MABMM301GBM657S   — National currency, seasonally adj (millions of GBP) → ×1e6 GBP
//  DEXUSEU           — USD per 1 EUR  (so usd = raw × eur_amount)
//  DEXJPUS           — JPY per 1 USD  (so usd = jpy_amount / raw)
//  DEXUSUK           — USD per 1 GBP
//  SP500             — Index value
//  NASDAQ100         — Index value
//  GOLDPMGBD228NLBM  — USD per troy ounce (London PM fixing)
const FRED_UNITS = {
  M2SL: { multiplier: 1e9, currency: 'USD' as const },
  MABMM301EZM189S: { multiplier: 1e6, currency: 'EUR' as const },
  MYAGM2JPM189S: { multiplier: 1e8, currency: 'JPY' as const },
  MABMM301GBM657S: { multiplier: 1e6, currency: 'GBP' as const },
}

// ─────────────────────────────────────────────────────────────
// fetchWithTimeout — AbortController + 1 retry + structured log
// ─────────────────────────────────────────────────────────────
async function fetchWithTimeout(
  url: string,
  init: RequestInit & { next?: { revalidate?: number } } = {},
  opts: { timeoutMs?: number; retries?: number; label?: string } = {},
): Promise<Response | null> {
  const { timeoutMs = 8000, retries = 1, label = 'fetch' } = opts

  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    const t0 = Date.now()
    try {
      const res = await fetch(url, { ...init, signal: ctrl.signal })
      clearTimeout(timer)
      const dur = Date.now() - t0
      const lenHeader = res.headers.get('content-length')
      const len = lenHeader || '?'
      console.log(`[monetary][${label}] status=${res.status} len=${len} dur=${dur}ms attempt=${attempt + 1}`)
      if (!res.ok && attempt < retries) continue
      recordLatency({
        label,
        status: res.status,
        ok: res.ok,
        durationMs: dur,
        attempts: attempt + 1,
        bytes: lenHeader ? parseInt(lenHeader, 10) || null : null,
        finishedAt: new Date().toISOString(),
      })
      return res
    } catch (err: any) {
      clearTimeout(timer)
      const dur = Date.now() - t0
      console.log(`[monetary][${label}] error=${err?.name || err?.message} dur=${dur}ms attempt=${attempt + 1}`)
      if (attempt >= retries) {
        recordLatency({
          label,
          status: 0,
          ok: false,
          durationMs: dur,
          attempts: attempt + 1,
          bytes: null,
          errorName: err?.name || err?.message || 'unknown',
          finishedAt: new Date().toISOString(),
        })
        return null
      }
    }
  }
  return null
}

// ─────────────────────────────────────────────────────────────
// Yahoo Finance chart API helper for indices/gold
// ─────────────────────────────────────────────────────────────
async function fetchYahooDaily(symbol: string, label: string): Promise<SeriesPoint[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=3mo`
  const res = await fetchWithTimeout(
    url,
    { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MoneyTracker/1.0)', Accept: 'application/json' }, next: { revalidate: 3600 } },
    { label: `yahoo:${label}` },
  )
  if (!res || !res.ok) return []
  let json: any
  try { json = await res.json() } catch { return [] }
  const result = json?.chart?.result?.[0]
  if (!result) return []
  const ts: number[] = result.timestamp || []
  const closes: (number | null)[] = result.indicators?.quote?.[0]?.close || []
  const out: SeriesPoint[] = []
  for (let i = 0; i < ts.length; i++) {
    const v = closes[i]
    if (Number.isFinite(v as number)) {
      out.push({ date: new Date((ts[i] as number) * 1000).toISOString().split('T')[0], value: v as number })
    }
  }
  return out.slice(-60)
}

// ─────────────────────────────────────────────────────────────
// Free monthly broad-money sources (no FRED key required)
// ─────────────────────────────────────────────────────────────

// Frankfurter (ECB-backed) — latest USD-base FX
async function fetchFrankfurterFx(): Promise<{ eurUsd: number; jpyUsd: number; gbpUsd: number } | null> {
  const res = await fetchWithTimeout(
    'https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR,JPY,GBP',
    { next: { revalidate: 21600 } },
    { label: 'frankfurter:fx' },
  )
  if (!res || !res.ok) return null
  try {
    const j = await res.json()
    const r = j?.rates || {}
    if (!Number.isFinite(r.EUR) || !Number.isFinite(r.JPY) || !Number.isFinite(r.GBP)) return null
    // base=USD, rates.EUR = EUR per 1 USD → eurUsd (USD per EUR) = 1/r.EUR
    return { eurUsd: 1 / r.EUR, jpyUsd: r.JPY, gbpUsd: 1 / r.GBP }
  } catch {
    return null
  }
}

// FRED public graphdata CSV (no API key required)
async function fetchFredCsvNoKey(seriesId: string, label: string): Promise<SeriesPoint[]> {
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${seriesId}`
  const res = await fetchWithTimeout(
    url,
    { headers: { Accept: 'text/csv' }, next: { revalidate: 21600 } },
    { label: `fredcsv:${label}` },
  )
  if (!res || !res.ok) return []
  try {
    const text = await res.text()
    const lines = text.trim().split('\n')
    if (lines.length < 2) return []
    const out: SeriesPoint[] = []
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',')
      if (parts.length < 2) continue
      const d = parts[0].trim()
      const v = parseFloat(parts[1])
      if (/^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isFinite(v)) {
        out.push({ date: d, value: v })
      }
    }
    return out.slice(-36)
  } catch {
    return []
  }
}

// ECB Statistical Data Warehouse — Euro-area M3 outstanding (millions EUR, monthly)
async function fetchEcbM3Monthly(): Promise<SeriesPoint[]> {
  const url =
    'https://data-api.ecb.europa.eu/service/data/BSI/M.U2.Y.V.M30.X.1.U2.2300.Z01.E?format=jsondata&lastNObservations=36'
  const res = await fetchWithTimeout(
    url,
    { headers: { Accept: 'application/json' }, next: { revalidate: 21600 } },
    { label: 'ecb:m3' },
  )
  if (!res || !res.ok) return []
  try {
    const j = await res.json()
    const seriesObj = j?.dataSets?.[0]?.series
    if (!seriesObj) return []
    const seriesKey = Object.keys(seriesObj)[0]
    const obs = seriesKey != null ? seriesObj[seriesKey]?.observations : null
    const periods: any[] = j?.structure?.dimensions?.observation?.[0]?.values || []
    if (!obs || periods.length === 0) return []
    const out: SeriesPoint[] = []
    for (const k of Object.keys(obs)) {
      const idx = parseInt(k, 10)
      const period: string | undefined = periods[idx]?.id
      const v = obs[k]?.[0]
      if (period && Number.isFinite(v) && /^\d{4}-\d{2}$/.test(period)) {
        // value is in millions of EUR → convert to EUR
        out.push({ date: `${period}-01`, value: (v as number) * 1e6 })
      }
    }
    return out.sort((a, b) => a.date.localeCompare(b.date)).slice(-36)
  } catch {
    return []
  }
}

// Bank of England IADB — UK M4 monthly outstanding (sterling millions, SA)
async function fetchBoeM4Monthly(): Promise<SeriesPoint[]> {
  const today = new Date()
  const dd = String(today.getDate()).padStart(2, '0')
  const mmm = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][today.getMonth()]
  const yyyy = today.getFullYear()
  const dateTo = `${dd}/${mmm}/${yyyy}`
  const fromYear = yyyy - 3
  const url =
    `https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp?csv.x=yes` +
    `&Datefrom=01/Jan/${fromYear}&Dateto=${encodeURIComponent(dateTo)}` +
    `&SeriesCodes=LPMAUYN&CSVF=TT&UsingCodes=Y&VPD=Y&VFD=N`
  const res = await fetchWithTimeout(
    url,
    { headers: { Accept: 'text/csv' }, next: { revalidate: 21600 } },
    { label: 'boe:m4' },
  )
  if (!res || !res.ok) return []
  try {
    const text = await res.text()
    const lines = text.trim().split('\n')
    // Header rows precede a "DATE,LPMAUYN" line; skip until then.
    let dataStart = -1
    for (let i = 0; i < lines.length; i++) {
      if (/^DATE\s*,/i.test(lines[i])) { dataStart = i + 1; break }
    }
    if (dataStart < 0) return []
    const monthMap: Record<string, string> = {
      Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
      Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
    }
    const out: SeriesPoint[] = []
    for (let i = dataStart; i < lines.length; i++) {
      const [d, vRaw] = lines[i].split(',')
      if (!d || vRaw == null) continue
      const m = d.trim().match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/)
      if (!m) continue
      const mm = monthMap[m[2]]
      if (!mm) continue
      const v = parseFloat(vRaw)
      if (!Number.isFinite(v)) continue
      // GBP millions → GBP
      out.push({ date: `${m[3]}-${mm}-01`, value: v * 1e6 })
    }
    return out.sort((a, b) => a.date.localeCompare(b.date)).slice(-36)
  } catch {
    return []
  }
}

// ─────────────────────────────────────────────────────────────
// World Bank Broad Money fallback (annual, current LCU → USD)
// ─────────────────────────────────────────────────────────────
async function fetchWorldBankBroadMoneyUSD(country: string, label: string): Promise<SeriesPoint[]> {
  // FM.LBL.BMNY.CN — Broad money (current LCU)
  const bmUrl = `https://api.worldbank.org/v2/country/${country}/indicator/FM.LBL.BMNY.CN?format=json&per_page=10`
  // PA.NUS.FCRF — Official exchange rate (LCU per US$, period average)
  const fxUrl = `https://api.worldbank.org/v2/country/${country}/indicator/PA.NUS.FCRF?format=json&per_page=10`

  const [bmRes, fxRes] = await Promise.all([
    fetchWithTimeout(bmUrl, { next: { revalidate: 21600 } }, { label: `wb-bm:${label}` }),
    country === 'USA'
      ? Promise.resolve(null)
      : fetchWithTimeout(fxUrl, { next: { revalidate: 21600 } }, { label: `wb-fx:${label}` }),
  ])

  if (!bmRes || !bmRes.ok) return []
  let bmJson: any
  try { bmJson = await bmRes.json() } catch { return [] }
  const bmRows: any[] = Array.isArray(bmJson?.[1]) ? bmJson[1] : []

  const fxMap: Record<string, number> = {}
  if (fxRes && fxRes.ok) {
    try {
      const fxJson = await fxRes.json()
      const fxRows: any[] = Array.isArray(fxJson?.[1]) ? fxJson[1] : []
      for (const r of fxRows) {
        if (r?.date && Number.isFinite(r?.value)) fxMap[r.date] = r.value
      }
    } catch { /* ignore */ }
  }

  const out: SeriesPoint[] = []
  for (const r of bmRows) {
    if (!r?.date || !Number.isFinite(r?.value)) continue
    const lcu = r.value as number
    const usd = country === 'USA'
      ? lcu
      : (fxMap[r.date] && fxMap[r.date] > 0 ? lcu / fxMap[r.date] : null)
    if (usd != null && Number.isFinite(usd) && usd > 0) {
      out.push({ date: `${r.date}-12-31`, value: usd })
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

// ─────────────────────────────────────────────────────────────
// NY Fed effective Fed Funds rate (with response-shape guards)
// ─────────────────────────────────────────────────────────────
async function fetchFedFundsNYFed(): Promise<{ rate: number | null; history: SeriesPoint[] }> {
  const res = await fetchWithTimeout(
    'https://markets.newyorkfed.org/read?productCode=50&eventCodes=500&limit=31&startPosition=0&sort=postDt:-1&format=json',
    { headers: { Accept: 'application/json' }, next: { revalidate: 3600 } },
    { label: 'nyfed:fedfunds' },
  )
  if (!res || !res.ok) return { rate: null, history: [] }

  let json: any
  try { json = await res.json() } catch { return { rate: null, history: [] } }

  // NY Fed responses have varied historically. Guard for any of:
  //   { refRates: [{ percentRate, effectiveDt }] }
  //   { rates:    [{ rate, date }] }
  const candidates: any[] = []
  if (Array.isArray(json?.refRates)) candidates.push(...json.refRates)
  if (Array.isArray(json?.rates))    candidates.push(...json.rates)

  const history: SeriesPoint[] = []
  for (const r of candidates) {
    const rate = parseFloat(r?.percentRate ?? r?.rate ?? '')
    const date = r?.effectiveDate || r?.effectiveDt || r?.date
    if (date && Number.isFinite(rate)) history.push({ date, value: rate })
  }
  if (history.length === 0) return { rate: null, history: [] }
  // Newest first → reverse for chart-friendly order
  const sorted = history.slice().sort((a, b) => a.date.localeCompare(b.date)).slice(-30)
  return { rate: sorted[sorted.length - 1].value, history: sorted }
}

// ─────────────────────────────────────────────────────────────
// World Bank policy interest rate fallback (lending rate proxy)
// ─────────────────────────────────────────────────────────────
async function fetchWorldBankPolicyRate(): Promise<number | null> {
  // FR.INR.RINR — Real interest rate; FR.INR.LEND — Lending interest rate
  const res = await fetchWithTimeout(
    'https://api.worldbank.org/v2/country/USA/indicator/FR.INR.LEND?format=json&per_page=5',
    { next: { revalidate: 86400 } },
    { label: 'wb:policyrate' },
  )
  if (!res || !res.ok) return null
  try {
    const j = await res.json()
    const rows: any[] = Array.isArray(j?.[1]) ? j[1] : []
    for (const r of rows) {
      if (Number.isFinite(r?.value)) return r.value
    }
  } catch { /* ignore */ }
  return null
}

// ─────────────────────────────────────────────────────────────
// Free-API fallback aggregator (no FRED required)
// ─────────────────────────────────────────────────────────────
async function fetchFallbackMonetaryData() {
  const fallback = {
    usM2: null as number | null,
    usM2History: [] as SeriesPoint[],
    fedFundsRate: null as number | null,
    fedFundsHistory: [] as SeriesPoint[],
    globalM2: null as number | null,
    globalM2History: [] as SeriesPoint[],
    regionalM2: { eu: 0, jp: 0, uk: 0 } as { eu: number; jp: number; uk: number },
    marketIndices: {
      sp500: 0, sp500History: [] as SeriesPoint[],
      nasdaq100: 0, nasdaq100History: [] as SeriesPoint[],
      gold: 0, goldHistory: [] as SeriesPoint[],
    },
  }

  // ── Run all fetches concurrently ──────────────────────────
  const [
    fed,
    fx,
    usCsv, ecbEu, jpCsv, ukBoe,
    usWb, euWb, jpWb, ukWb,
    spx, ndx, xau,
  ] = await Promise.all([
    fetchFedFundsNYFed(),
    fetchFrankfurterFx(),
    // Monthly preferred sources (no FRED key required)
    fetchFredCsvNoKey('M2SL', 'us-m2'),                 // billions of USD
    fetchEcbM3Monthly(),                                 // EUR
    fetchFredCsvNoKey('MABMM301JPM189S', 'jp-m2'),      // JPY (national currency level)
    fetchBoeM4Monthly(),                                 // GBP
    // Annual World Bank fallbacks (already in USD)
    fetchWorldBankBroadMoneyUSD('USA', 'us'),
    fetchWorldBankBroadMoneyUSD('EMU', 'eu'),
    fetchWorldBankBroadMoneyUSD('JPN', 'jp'),
    fetchWorldBankBroadMoneyUSD('GBR', 'uk'),
    fetchYahooDaily('^GSPC', 'spx'),
    fetchYahooDaily('^NDX', 'ndx'),
    fetchYahooDaily('GC=F', 'xau'),
  ])

  fallback.fedFundsRate = fed.rate
  fallback.fedFundsHistory = fed.history

  // 2nd-tier fallback for fed funds rate
  if (fallback.fedFundsRate == null) {
    const wbRate = await fetchWorldBankPolicyRate()
    if (wbRate != null) fallback.fedFundsRate = wbRate
  }

  // Sensible FX defaults if Frankfurter is unavailable
  const eurUsd = fx?.eurUsd ?? 1.08
  const jpyUsd = fx?.jpyUsd ?? 150
  const gbpUsd = fx?.gbpUsd ?? 1.26

  // ── Per-region series in USD: prefer monthly, fall back to annual WB ──
  // US M2 (M2SL is billions of USD)
  let usSeries: SeriesPoint[] = []
  if (usCsv.length > 0) {
    usSeries = usCsv.slice(-24).map(p => ({ date: p.date, value: p.value * 1e9 }))
  } else if (usWb.length > 0) {
    usSeries = usWb
  }
  if (usSeries.length > 0) {
    fallback.usM2 = usSeries[usSeries.length - 1].value
    fallback.usM2History = usSeries
  }

  // EU M3 (ECB returns EUR; convert via eurUsd)
  let euSeries: SeriesPoint[] = []
  if (ecbEu.length > 0) {
    euSeries = ecbEu.slice(-24).map(p => ({ date: p.date, value: p.value * eurUsd }))
  } else if (euWb.length > 0) {
    euSeries = euWb
  }

  // JP M2 (FRED CSV gives JPY level; convert via jpyUsd)
  let jpSeries: SeriesPoint[] = []
  if (jpCsv.length > 0) {
    jpSeries = jpCsv.slice(-24).map(p => ({ date: p.date, value: p.value / jpyUsd }))
  } else if (jpWb.length > 0) {
    jpSeries = jpWb
  }

  // UK M4 (BoE returns GBP; convert via gbpUsd)
  let ukSeries: SeriesPoint[] = []
  if (ukBoe.length > 0) {
    ukSeries = ukBoe.slice(-24).map(p => ({ date: p.date, value: p.value * gbpUsd }))
  } else if (ukWb.length > 0) {
    ukSeries = ukWb
  }

  fallback.regionalM2 = {
    eu: euSeries.length ? euSeries[euSeries.length - 1].value : 0,
    jp: jpSeries.length ? jpSeries[jpSeries.length - 1].value : 0,
    uk: ukSeries.length ? ukSeries[ukSeries.length - 1].value : 0,
  }

  // Global M2: aggregate by month-key (YYYY-MM); annual points slot into Dec.
  // Forward-fill the most recent value per region so months where only some
  // regions report (typical) still produce a sum.
  const monthMap: Record<string, { us?: number; eu?: number; jp?: number; uk?: number }> = {}
  const addMonth = (rows: SeriesPoint[], k: 'us' | 'eu' | 'jp' | 'uk') => {
    for (const p of rows) {
      const m = p.date.substring(0, 7) // "YYYY-MM"
      monthMap[m] = monthMap[m] || {}
      monthMap[m][k] = p.value
    }
  }
  addMonth(usSeries, 'us')
  addMonth(euSeries, 'eu')
  addMonth(jpSeries, 'jp')
  addMonth(ukSeries, 'uk')

  const sortedMonths = Object.keys(monthMap).sort()
  const carry: { us?: number; eu?: number; jp?: number; uk?: number } = {}
  const globalHist: SeriesPoint[] = []
  for (const m of sortedMonths) {
    const cur = monthMap[m]
    if (cur.us != null) carry.us = cur.us
    if (cur.eu != null) carry.eu = cur.eu
    if (cur.jp != null) carry.jp = cur.jp
    if (cur.uk != null) carry.uk = cur.uk
    if (carry.us != null && carry.eu != null && carry.jp != null && carry.uk != null) {
      globalHist.push({ date: `${m}-01`, value: carry.us + carry.eu + carry.jp + carry.uk })
    }
  }
  if (globalHist.length > 0) {
    fallback.globalM2 = globalHist[globalHist.length - 1].value
    fallback.globalM2History = globalHist
  } else if (fallback.usM2) {
    // Last-resort global proxy
    fallback.globalM2 = fallback.usM2 * 3.5
    fallback.globalM2History = fallback.usM2History.map(p => ({ date: p.date, value: p.value * 3.5 }))
  }

  if (spx.length > 0) { fallback.marketIndices.sp500 = spx[spx.length - 1].value; fallback.marketIndices.sp500History = spx }
  if (ndx.length > 0) { fallback.marketIndices.nasdaq100 = ndx[ndx.length - 1].value; fallback.marketIndices.nasdaq100History = ndx }
  if (xau.length > 0) { fallback.marketIndices.gold = xau[xau.length - 1].value; fallback.marketIndices.goldHistory = xau }

  return fallback
}

// ─────────────────────────────────────────────────────────────
// FRED single-series fetch with key-health tracking
// ─────────────────────────────────────────────────────────────
async function fredFetchSeries(seriesId: string, apiKey: string): Promise<{ rows: any[]; status: number }> {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=60`
  const res = await fetchWithTimeout(url, { next: { revalidate: 3600 } }, { label: `fred:${seriesId}` })
  if (!res) return { rows: [], status: 0 }
  if (res.status === 400 || res.status === 401 || res.status === 403) {
    fredKeyInvalid = true
    fredKeyCheckedAt = Date.now()
    return { rows: [], status: res.status }
  }
  if (!res.ok) return { rows: [], status: res.status }
  try {
    const j = await res.json()
    const obs: any[] = Array.isArray(j?.observations) ? j.observations.filter((o: any) => o.value !== '.') : []
    return { rows: obs, status: res.status }
  } catch {
    return { rows: [], status: res.status }
  }
}

// ─────────────────────────────────────────────────────────────
// Main monetary aggregator (called via the in-flight cache)
// ─────────────────────────────────────────────────────────────
async function buildMonetaryData() {
  currentLatencies = []
  const buildStartedAt = Date.now()
  const rawKey = process.env.FRED_API_KEY
  // If we previously detected the key as invalid recently, treat as absent
  if (fredKeyInvalid && (Date.now() - fredKeyCheckedAt) < FRED_KEY_RECHECK_MS) {
    console.log('[monetary] FRED key flagged invalid → using fallback path')
  }
  const useKey = rawKey && !(fredKeyInvalid && (Date.now() - fredKeyCheckedAt) < FRED_KEY_RECHECK_MS)
    ? rawKey : null

  console.log(`[monetary] FRED_API_KEY present=${!!rawKey} usable=${!!useKey}`)

  const data: any = {
    usM2: null,
    usM2History: [],
    fedFundsRate: null,
    fedFundsHistory: [],
    globalM2: null,
    globalM2History: [],
    regionalM2: { eu: 0, jp: 0, uk: 0 },
    marketIndices: { sp500: 0, sp500History: [], nasdaq100: 0, nasdaq100History: [], gold: 0, goldHistory: [] },
    lastUpdated: new Date().toISOString(),
    hasFredKey: !!useKey,
    fredKeyInvalid: !!rawKey && fredKeyInvalid,
    diagnostics: null,
  }

  let fallbackUsed = false

  if (useKey) {
    // ── FRED preferred path ──────────────────────────────
    const series = [
      { id: 'M2SL',             name: 'usM2' },
      { id: 'FEDFUNDS',         name: 'fedFunds' },
      { id: 'MABMM301EZM189S',  name: 'euM3' },
      { id: 'MYAGM2JPM189S',    name: 'jpM2' },
      { id: 'MABMM301GBM657S',  name: 'ukM3' },
      { id: 'DEXUSEU',          name: 'eurUsd' },   // USD per 1 EUR
      { id: 'DEXJPUS',          name: 'jpyUsd' },   // JPY per 1 USD
      { id: 'DEXUSUK',          name: 'gbpUsd' },   // USD per 1 GBP
      { id: 'SP500',            name: 'sp500' },
      { id: 'NASDAQ100',        name: 'nasdaq100' },
      { id: 'GOLDPMGBD228NLBM', name: 'goldPrice' },
    ]

    const results = await Promise.all(series.map(s => fredFetchSeries(s.id, useKey)))
    // Re-evaluate key health: if every series failed with auth-style status, key is bad
    const authBad = results.every(r => r.status === 400 || r.status === 401 || r.status === 403)
    if (authBad) {
      fredKeyInvalid = true
      fredKeyCheckedAt = Date.now()
      data.hasFredKey = false
      data.fredKeyInvalid = true
      console.warn('[monetary] FRED key appears invalid (all series returned auth error)')
    }

    const raw: Record<string, any[]> = {}
    results.forEach((r, idx) => { raw[series[idx].name] = r.rows })

    // Unit-aware US M2
    if (raw.usM2?.length) {
      data.usM2 = parseFloat(raw.usM2[0].value) * FRED_UNITS.M2SL.multiplier
      data.usM2History = raw.usM2.slice(0, 24).reverse()
        .map((o: any) => ({ date: o.date, value: parseFloat(o.value) * FRED_UNITS.M2SL.multiplier }))
    }

    if (raw.fedFunds?.length) {
      data.fedFundsRate = parseFloat(raw.fedFunds[0].value)
      data.fedFundsHistory = raw.fedFunds.slice(0, 24).reverse()
        .map((o: any) => ({ date: o.date, value: parseFloat(o.value) }))
    }

    // FX defaults: documented direction guarded by asserts.
    //  DEXUSEU = USD per 1 EUR  → USD = EUR_amount × eurUsd
    //  DEXJPUS = JPY per 1 USD  → USD = JPY_amount / jpyUsd
    //  DEXUSUK = USD per 1 GBP  → USD = GBP_amount × gbpUsd
    const eurUsd = raw.eurUsd?.length ? parseFloat(raw.eurUsd[0].value) : 1.08
    const jpyUsd = raw.jpyUsd?.length ? parseFloat(raw.jpyUsd[0].value) : 150
    const gbpUsd = raw.gbpUsd?.length ? parseFloat(raw.gbpUsd[0].value) : 1.26
    if (!(eurUsd > 0.5 && eurUsd < 2)) console.warn(`[monetary] eurUsd out of range: ${eurUsd}`)
    if (!(jpyUsd > 50 && jpyUsd < 500)) console.warn(`[monetary] jpyUsd out of range: ${jpyUsd}`)
    if (!(gbpUsd > 0.7 && gbpUsd < 2.5)) console.warn(`[monetary] gbpUsd out of range: ${gbpUsd}`)

    const processRegional = (rows: any[], multiplier: number, toUsd: (v: number) => number): SeriesPoint[] => {
      if (!rows?.length) return []
      return rows.slice(0, 24).reverse().map((o: any) => ({
        date: o.date,
        value: toUsd(parseFloat(o.value) * multiplier),
      }))
    }

    const euHistory = processRegional(raw.euM3, FRED_UNITS.MABMM301EZM189S.multiplier, v => v * eurUsd)
    const jpHistory = processRegional(raw.jpM2, FRED_UNITS.MYAGM2JPM189S.multiplier, v => v / jpyUsd)
    const ukHistory = processRegional(raw.ukM3, FRED_UNITS.MABMM301GBM657S.multiplier, v => v * gbpUsd)

    // Global M2 — only months where all 4 regions are present, forward-fill missing
    const monthMap: Record<string, { us?: number; eu?: number; jp?: number; uk?: number }> = {}
    const addMonth = (rows: SeriesPoint[], k: 'us' | 'eu' | 'jp' | 'uk') => {
      for (const r of rows) {
        const m = r.date.substring(0, 7)
        monthMap[m] = monthMap[m] || {}
        monthMap[m][k] = r.value
      }
    }
    addMonth(data.usM2History as SeriesPoint[], 'us')
    addMonth(euHistory, 'eu')
    addMonth(jpHistory, 'jp')
    addMonth(ukHistory, 'uk')

    const sortedMonths = Object.keys(monthMap).sort()
    const carry: { us?: number; eu?: number; jp?: number; uk?: number } = {}
    const globalHist: SeriesPoint[] = []
    for (const m of sortedMonths) {
      const cur = monthMap[m]
      if (cur.us != null) carry.us = cur.us
      if (cur.eu != null) carry.eu = cur.eu
      if (cur.jp != null) carry.jp = cur.jp
      if (cur.uk != null) carry.uk = cur.uk
      if (carry.us != null && carry.eu != null && carry.jp != null && carry.uk != null) {
        globalHist.push({ date: `${m}-01`, value: carry.us + carry.eu + carry.jp + carry.uk })
      }
    }

    data.globalM2History = globalHist
    data.globalM2 = globalHist.length > 0 ? globalHist[globalHist.length - 1].value : data.usM2

    data.regionalM2 = {
      eu: euHistory.length ? euHistory[euHistory.length - 1].value : 0,
      jp: jpHistory.length ? jpHistory[jpHistory.length - 1].value : 0,
      uk: ukHistory.length ? ukHistory[ukHistory.length - 1].value : 0,
    }

    data.marketIndices = {
      sp500:           raw.sp500?.length ? parseFloat(raw.sp500[0].value) : 0,
      sp500History:    raw.sp500?.slice(0, 30).reverse().map((o: any) => ({ date: o.date, value: parseFloat(o.value) })) || [],
      nasdaq100:       raw.nasdaq100?.length ? parseFloat(raw.nasdaq100[0].value) : 0,
      nasdaq100History: raw.nasdaq100?.slice(0, 30).reverse().map((o: any) => ({ date: o.date, value: parseFloat(o.value) })) || [],
      gold:            raw.goldPrice?.length ? parseFloat(raw.goldPrice[0].value) : 0,
      goldHistory:     raw.goldPrice?.slice(0, 30).reverse().map((o: any) => ({ date: o.date, value: parseFloat(o.value) })) || [],
    }

    // Backfill any missing fields with free APIs
    const needsBackfill =
      !data.usM2 || !data.usM2History?.length ||
      !data.fedFundsHistory?.length ||
      !data.globalM2History?.length ||
      !data.marketIndices.sp500History?.length ||
      !data.marketIndices.nasdaq100History?.length ||
      !data.marketIndices.goldHistory?.length

    if (needsBackfill) {
      console.log('[monetary] Partial FRED data → backfilling with free APIs')
      fallbackUsed = true
      const fb = await fetchFallbackMonetaryData()

      if (!data.usM2 && fb.usM2) data.usM2 = fb.usM2
      if (!data.usM2History?.length && fb.usM2History.length) data.usM2History = fb.usM2History

      if ((data.fedFundsRate == null) && fb.fedFundsRate != null) data.fedFundsRate = fb.fedFundsRate
      if (!data.fedFundsHistory?.length && fb.fedFundsHistory.length) data.fedFundsHistory = fb.fedFundsHistory

      if (!data.globalM2 && fb.globalM2) data.globalM2 = fb.globalM2
      if (!data.globalM2History?.length && fb.globalM2History.length) data.globalM2History = fb.globalM2History

      const regMissing = ((data.regionalM2.eu || 0) + (data.regionalM2.jp || 0) + (data.regionalM2.uk || 0)) <= 0
      if (regMissing) data.regionalM2 = fb.regionalM2

      if (!data.marketIndices.sp500History.length && fb.marketIndices.sp500History.length) {
        data.marketIndices.sp500 = fb.marketIndices.sp500
        data.marketIndices.sp500History = fb.marketIndices.sp500History
      }
      if (!data.marketIndices.nasdaq100History.length && fb.marketIndices.nasdaq100History.length) {
        data.marketIndices.nasdaq100 = fb.marketIndices.nasdaq100
        data.marketIndices.nasdaq100History = fb.marketIndices.nasdaq100History
      }
      if (!data.marketIndices.goldHistory.length && fb.marketIndices.goldHistory.length) {
        data.marketIndices.gold = fb.marketIndices.gold
        data.marketIndices.goldHistory = fb.marketIndices.goldHistory
      }
    }
  } else {
    console.log('[monetary] No usable FRED key → free-API fallback')
    fallbackUsed = true
    const fb = await fetchFallbackMonetaryData()
    Object.assign(data, {
      usM2: fb.usM2,
      usM2History: fb.usM2History,
      fedFundsRate: fb.fedFundsRate,
      fedFundsHistory: fb.fedFundsHistory,
      globalM2: fb.globalM2,
      globalM2History: fb.globalM2History,
      regionalM2: fb.regionalM2,
      marketIndices: fb.marketIndices,
    })
  }

  // ── Diagnostics with per-field reason map ──────────────────
  const checks: Record<string, { ok: boolean; reason?: string }> = {
    usM2: {
      ok: !!data.usM2 && data.usM2 > 0 && (data.usM2History?.length || 0) > 0,
      reason: !data.usM2 ? 'M2SL 시리즈 비어 있음' : undefined,
    },
    fedFunds: {
      ok: data.fedFundsRate != null && (data.fedFundsHistory?.length || 0) > 0,
      reason: data.fedFundsRate == null ? 'NY Fed/FRED 모두 응답 없음' : undefined,
    },
    globalM2: {
      ok: !!data.globalM2 && data.globalM2 > 0 && (data.globalM2History?.length || 0) > 0,
      reason: !data.globalM2 ? '4개 지역 데이터 부족' : undefined,
    },
    regionalM2: {
      ok: ((data.regionalM2.eu || 0) + (data.regionalM2.jp || 0) + (data.regionalM2.uk || 0)) > 0,
      reason: '지역별 시리즈 비어 있음',
    },
    sp500: {
      ok: !!data.marketIndices?.sp500 && (data.marketIndices?.sp500History?.length || 0) > 0,
      reason: 'Yahoo/FRED SP500 응답 없음',
    },
    nasdaq100: {
      ok: !!data.marketIndices?.nasdaq100 && (data.marketIndices?.nasdaq100History?.length || 0) > 0,
      reason: 'Yahoo/FRED NDX 응답 없음',
    },
    gold: {
      ok: !!data.marketIndices?.gold && (data.marketIndices?.goldHistory?.length || 0) > 0,
      reason: 'Yahoo/FRED Gold 응답 없음',
    },
  }
  const available = Object.values(checks).filter(c => c.ok).length
  const total = Object.keys(checks).length
  const missing = Object.entries(checks).filter(([, c]) => !c.ok).map(([name]) => name)
  const reasons: Record<string, string> = {}
  for (const [name, c] of Object.entries(checks)) {
    if (!c.ok && c.reason) reasons[name] = c.reason
  }

  let source: 'fred' | 'hybrid' | 'fallback'
  if (!useKey) source = 'fallback'
  else if (fallbackUsed) source = 'hybrid'
  else source = 'fred'

  // Snapshot recorded latencies and reset for next request
  const sourceLatencies = currentLatencies ? currentLatencies.slice() : []
  currentLatencies = null

  // Mark sources as degraded if slower than this (ms)
  const SLOW_THRESHOLD_MS = 3000

  data.diagnostics = {
    source,
    isEstimated: source !== 'fred',
    completeness: Math.round((available / total) * 100),
    available,
    total,
    missing,
    missingReasons: reasons,
    fredKeyInvalid: data.fredKeyInvalid,
    fallbackUsed,
    buildDurationMs: Date.now() - buildStartedAt,
    sourceLatencies: sourceLatencies.map(s => ({
      ...s,
      slow: s.ok && s.durationMs >= SLOW_THRESHOLD_MS,
    })),
  }

  return data
}

// ─────────────────────────────────────────────────────────────
// HTTP entry
// ─────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const force = url.searchParams.get('force') === '1' || url.searchParams.get('force') === 'true'

    // Cache check (with completeness-aware TTL)
    if (!force && cache) {
      const age = Date.now() - cache.timestamp
      const ttl = cache.completeness >= 70 ? CACHE_TTL_FULL : CACHE_TTL_PARTIAL
      if (age < ttl) {
        return NextResponse.json({ success: true, data: cache.data, cached: true })
      }
    }

    // Stampede prevention: reuse in-flight promise
    if (!inflight) {
      inflight = (async () => {
        try {
          const data = await buildMonetaryData()
          cache = {
            data,
            timestamp: Date.now(),
            completeness: data?.diagnostics?.completeness ?? 0,
          }
          return data
        } finally {
          inflight = null
        }
      })()
    }

    const data = await inflight
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[monetary] fatal error:', error)
    if (cache) {
      return NextResponse.json({ success: true, data: cache.data, cached: true, stale: true })
    }
    return NextResponse.json(
      { success: false, error: 'Failed to fetch monetary data' },
      { status: 500 },
    )
  }
}
