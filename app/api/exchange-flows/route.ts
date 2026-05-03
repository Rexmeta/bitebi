import { NextResponse } from 'next/server'
import walletsRaw from '@/data/exchange-wallets.json'

// Exchange-netflow endpoint with three asset series (`btc`, `eth`, `stable`)
// plus a `total` aggregate used by the SEO KPI / chart.
//
//   - `stable` — DefiLlama stablecoincharts (USD circulating delta)
//   - `eth`    — sum of ETH balance deltas across labelled exchange wallets
//                via Alchemy archive `eth_getBalance` at historical block heights
//   - `btc`    — sum of BTC balance deltas across labelled exchange wallets
//                reconstructed from blockstream.info esplora tx history
//   - `total`  — date-aligned sum of available series; status reflects whether
//                every component series is real.
//
// `seriesStatus` reports per-series state. When a real source fails, the
// series falls back to a synthetic (deterministic) history so the chart
// stays continuous, marked with `status:'synthetic'` and reflected in the
// top-level `estimated:true`.

interface FlowPoint { date: string; netflow: number }
type SeriesStatus = 'real' | 'synthetic' | 'unavailable'
interface SeriesView {
  netflow7d: number | null
  netflow30d: number | null
  history: FlowPoint[]
  status: SeriesStatus
  reason?: string
  walletCount?: number
}
interface ExchangeFlowsData {
  btc: SeriesView
  eth: SeriesView
  stable: SeriesView
  total: SeriesView
  seriesStatus: Record<'btc' | 'eth' | 'stable' | 'total', SeriesStatus>
  source: string
  lastUpdated: string
}

interface ExchangeWalletSeed {
  address: string
  exchange: string
}
interface ExchangeWalletsFile {
  eth: ExchangeWalletSeed[]
  btc: ExchangeWalletSeed[]
}
const wallets = walletsRaw as unknown as ExchangeWalletsFile

interface CacheEntry { data: ExchangeFlowsData; timestamp: number }
let cache: CacheEntry | null = null
const CACHE_TTL = 10 * 60 * 1000
const HISTORY_DAYS = 30
const BLOCKS_PER_DAY = 7200 // ETH ~12s blocks

interface JsonRpcCall { method: string; params: unknown[] }
interface JsonRpcResponse { id: number; result?: unknown; error?: { message: string } }

async function safeJson<T = unknown>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const r = await fetch(url, { next: { revalidate: 600 }, ...init })
    if (!r.ok) return null
    return (await r.json()) as T
  } catch { return null }
}

// ─── Stablecoin (real) ─────────────────────────────────────────────────────
interface StablecoinChartPoint {
  date: number
  totalCirculatingUSD?: { peggedUSD?: number }
}
async function fetchStableHistory(): Promise<FlowPoint[]> {
  const j = await safeJson<StablecoinChartPoint[]>('https://stablecoins.llama.fi/stablecoincharts/all')
  if (!Array.isArray(j)) return []
  const recent = j.slice(-(HISTORY_DAYS + 1))
  const out: FlowPoint[] = []
  for (let i = 1; i < recent.length; i++) {
    const cur = recent[i]?.totalCirculatingUSD?.peggedUSD || 0
    const prev = recent[i - 1]?.totalCirculatingUSD?.peggedUSD || 0
    out.push({
      date: new Date(recent[i].date * 1000).toISOString().slice(0, 10),
      netflow: cur - prev,
    })
  }
  return out
}

// ─── Spot prices for USD conversion ────────────────────────────────────────
interface CoinGeckoSimplePrice { bitcoin?: { usd?: number }; ethereum?: { usd?: number } }
async function fetchPrices(): Promise<{ btc: number; eth: number } | null> {
  const j = await safeJson<CoinGeckoSimplePrice>(
    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd',
  )
  const btc = Number(j?.bitcoin?.usd)
  const eth = Number(j?.ethereum?.usd)
  if (!btc || !eth) return null
  return { btc, eth }
}

// ─── ETH netflow via Alchemy historical balances ───────────────────────────
async function alchemyBatch(apiKey: string, calls: JsonRpcCall[]): Promise<unknown[]> {
  const body = calls.map((c, i) => ({ jsonrpc: '2.0', id: i, method: c.method, params: c.params }))
  const res = await fetch(`https://eth-mainnet.g.alchemy.com/v2/${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    next: { revalidate: 600 },
  })
  if (!res.ok) throw new Error(`Alchemy batch RPC ${res.status}`)
  const arr = (await res.json()) as JsonRpcResponse[]
  if (!Array.isArray(arr)) throw new Error('non-array RPC response')
  arr.sort((a, b) => a.id - b.id)
  return arr.map((r) => {
    if (r.error) throw new Error(r.error.message)
    return r.result
  })
}

async function alchemyCall(apiKey: string, method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(`https://eth-mainnet.g.alchemy.com/v2/${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    next: { revalidate: 600 },
  })
  if (!res.ok) throw new Error(`Alchemy RPC ${res.status}`)
  const j = (await res.json()) as JsonRpcResponse
  if (j.error) throw new Error(j.error.message)
  return j.result
}

async function fetchEthNetflow(ethPrice: number): Promise<{ history: FlowPoint[]; addressesUsed: number } | null> {
  const apiKey = process.env.ALCHEMY_API_KEY
  if (!apiKey) return null
  const addresses = wallets.eth.map((w) => w.address)
  if (!addresses.length) return null

  const latestRaw = await alchemyCall(apiKey, 'eth_blockNumber', [])
  const latest = parseInt(String(latestRaw), 16)
  if (!Number.isFinite(latest) || latest <= 0) return null

  const totals: { date: string; totalEth: number }[] = []
  for (let d = HISTORY_DAYS; d >= 0; d--) {
    const block = latest - d * BLOCKS_PER_DAY
    const blockHex = '0x' + Math.max(block, 0).toString(16)
    const calls: JsonRpcCall[] = addresses.map((a) => ({ method: 'eth_getBalance', params: [a, blockHex] }))
    const results = await alchemyBatch(apiKey, calls)
    let totalEth = 0
    for (const hex of results) {
      try {
        // wei → ETH per-address, then sum (avoids BigInt math; target < ES2020)
        const wei = BigInt(String(hex))
        totalEth += Number(wei / BigInt(1e9)) / 1e9
      } catch { /* skip malformed entry */ }
    }
    const date = new Date(Date.now() - d * 86400000).toISOString().slice(0, 10)
    totals.push({ date, totalEth })
  }

  const history: FlowPoint[] = []
  for (let i = 1; i < totals.length; i++) {
    const delta = totals[i].totalEth - totals[i - 1].totalEth
    history.push({ date: totals[i].date, netflow: delta * ethPrice })
  }
  return { history, addressesUsed: addresses.length }
}

// ─── BTC netflow via blockstream.info esplora tx history ───────────────────
const BTC_MAX_PAGES_PER_ADDR = 30 // 25 txs/page → up to 750 txs per address

interface EsploraVin { prevout?: { scriptpubkey_address?: string; value?: number } }
interface EsploraVout { scriptpubkey_address?: string; value?: number }
interface EsploraTx {
  txid: string
  status?: { block_time?: number }
  vin?: EsploraVin[]
  vout?: EsploraVout[]
}

async function fetchBtcAddressDeltas(addr: string, cutoffSec: number): Promise<Map<string, number> | null> {
  const deltas = new Map<string, number>()
  let lastSeen = ''
  let stopped = false
  for (let page = 0; page < BTC_MAX_PAGES_PER_ADDR && !stopped; page++) {
    const url = `https://blockstream.info/api/address/${addr}/txs/chain${lastSeen ? '/' + lastSeen : ''}`
    let txs: EsploraTx[]
    try {
      const r = await fetch(url, { next: { revalidate: 600 } })
      if (!r.ok) return null
      txs = (await r.json()) as EsploraTx[]
    } catch { return null }
    if (!Array.isArray(txs) || txs.length === 0) break
    for (const tx of txs) {
      const t = tx?.status?.block_time
      if (!t) continue
      if (t < cutoffSec) { stopped = true; break }
      const date = new Date(t * 1000).toISOString().slice(0, 10)
      let sat = 0
      for (const out of tx.vout || []) {
        if (out?.scriptpubkey_address === addr) sat += Number(out.value || 0)
      }
      for (const inp of tx.vin || []) {
        if (inp?.prevout?.scriptpubkey_address === addr) sat -= Number(inp.prevout.value || 0)
      }
      if (sat !== 0) deltas.set(date, (deltas.get(date) || 0) + sat)
    }
    if (txs.length < 25) break
    lastSeen = txs[txs.length - 1]?.txid || ''
    if (!lastSeen) break
  }
  return deltas
}

async function fetchBtcNetflow(btcPrice: number): Promise<{ history: FlowPoint[]; addressesUsed: number } | null> {
  const addresses = wallets.btc.map((w) => w.address)
  if (!addresses.length) return null
  const cutoffSec = Math.floor(Date.now() / 1000) - HISTORY_DAYS * 86400

  const allDeltas = new Map<string, number>()
  let usable = 0
  for (const addr of addresses) {
    const d = await fetchBtcAddressDeltas(addr, cutoffSec)
    if (d == null) continue
    usable++
    for (const [date, sat] of d) {
      allDeltas.set(date, (allDeltas.get(date) || 0) + sat)
    }
  }
  if (usable === 0) return null

  const history: FlowPoint[] = []
  for (let d = HISTORY_DAYS - 1; d >= 0; d--) {
    const date = new Date(Date.now() - d * 86400000).toISOString().slice(0, 10)
    const sat = allDeltas.get(date) || 0
    history.push({ date, netflow: (sat / 1e8) * btcPrice })
  }
  return { history, addressesUsed: usable }
}

// ─── Synthetic fallback (continuous, deterministic) ────────────────────────
// Used only when the real source for a given asset is unreachable, so the
// chart/KPI stay populated. Marked status:'synthetic' and surfaced via the
// top-level `estimated:true`.
function syntheticHistory(asset: 'btc' | 'eth', amplitudeUsd: number): FlowPoint[] {
  const out: FlowPoint[] = []
  // Simple deterministic seed per asset so subsequent renders are stable.
  const seed = asset === 'btc' ? 0.37 : 0.61
  for (let d = HISTORY_DAYS - 1; d >= 0; d--) {
    const date = new Date(Date.now() - d * 86400000).toISOString().slice(0, 10)
    const phase = (d * seed * Math.PI) / 5
    const noise = Math.sin(phase) * 0.6 + Math.sin(phase * 1.7) * 0.4
    out.push({ date, netflow: noise * amplitudeUsd })
  }
  return out
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function sumLast(h: FlowPoint[], n: number): number {
  return h.slice(-n).reduce((s, p) => s + p.netflow, 0)
}
function realSeries(history: FlowPoint[], walletCount: number): SeriesView {
  return {
    netflow7d: sumLast(history, 7),
    netflow30d: sumLast(history, 30),
    history,
    status: 'real',
    walletCount,
  }
}
function syntheticSeries(history: FlowPoint[], reason: string): SeriesView {
  return {
    netflow7d: sumLast(history, 7),
    netflow30d: sumLast(history, 30),
    history,
    status: 'synthetic',
    reason,
  }
}
function unavailable(reason: string): SeriesView {
  return { netflow7d: null, netflow30d: null, history: [], status: 'unavailable', reason }
}

// Build the `total` aggregate by date-aligning component histories.
function aggregateTotal(parts: SeriesView[]): SeriesView {
  const valid = parts.filter((p) => p.history.length > 0)
  if (valid.length === 0) return unavailable('no component series available')
  const byDate = new Map<string, number>()
  for (const p of valid) {
    for (const point of p.history) {
      byDate.set(point.date, (byDate.get(point.date) || 0) + point.netflow)
    }
  }
  const history = Array.from(byDate.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, netflow]) => ({ date, netflow }))
  const allReal = parts.every((p) => p.status === 'real')
  return {
    netflow7d: sumLast(history, 7),
    netflow30d: sumLast(history, 30),
    history,
    status: allReal ? 'real' : 'synthetic',
    reason: allReal ? undefined : 'one or more component series synthetic/unavailable',
  }
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
      return NextResponse.json({
        success: true,
        data: cache.data,
        cached: true,
        estimated: hasSynthetic(cache.data),
      })
    }

    const [stableHist, prices] = await Promise.all([fetchStableHistory(), fetchPrices()])

    const stable: SeriesView = stableHist.length
      ? realSeries(stableHist, 0)
      : unavailable('DefiLlama stablecoincharts unreachable')
    // overwrite walletCount we don't track for stable
    if (stable.status === 'real') delete stable.walletCount

    let btc: SeriesView
    let eth: SeriesView

    if (!prices) {
      btc = syntheticSeries(syntheticHistory('btc', 50_000_000), 'CoinGecko price feed unavailable')
      eth = syntheticSeries(syntheticHistory('eth', 30_000_000), 'CoinGecko price feed unavailable')
    } else {
      const [ethRes, btcRes] = await Promise.all([
        fetchEthNetflow(prices.eth).catch((e: unknown) => {
          console.warn('[exchange-flows] eth failed:', (e as Error)?.message)
          return null
        }),
        fetchBtcNetflow(prices.btc).catch((e: unknown) => {
          console.warn('[exchange-flows] btc failed:', (e as Error)?.message)
          return null
        }),
      ])
      eth = ethRes
        ? realSeries(ethRes.history, ethRes.addressesUsed)
        : syntheticSeries(
            syntheticHistory('eth', 30_000_000),
            process.env.ALCHEMY_API_KEY
              ? 'Alchemy historical balance fetch failed — synthetic fallback'
              : 'ALCHEMY_API_KEY not configured — synthetic fallback',
          )
      btc = btcRes
        ? realSeries(btcRes.history, btcRes.addressesUsed)
        : syntheticSeries(syntheticHistory('btc', 50_000_000), 'blockstream.info esplora unreachable — synthetic fallback')
    }

    const total = aggregateTotal([btc, eth, stable])

    const data: ExchangeFlowsData = {
      btc,
      eth,
      stable,
      total,
      seriesStatus: { btc: btc.status, eth: eth.status, stable: stable.status, total: total.status },
      source: 'defillama (stable) + alchemy labelled wallets (eth) + blockstream esplora (btc)',
      lastUpdated: new Date().toISOString(),
    }

    cache = { data, timestamp: Date.now() }
    return NextResponse.json({ success: true, data, estimated: hasSynthetic(data) })
  } catch (e: unknown) {
    if (cache) {
      return NextResponse.json({
        success: true,
        data: cache.data,
        stale: true,
        estimated: hasSynthetic(cache.data),
      })
    }
    return NextResponse.json(
      { success: false, error: (e as Error)?.message || 'exchange-flows fetch failed' },
      { status: 502 },
    )
  }
}

function hasSynthetic(d: ExchangeFlowsData): boolean {
  const series: SeriesView[] = [d.btc, d.eth, d.stable]
  return series.some((s) => s.status !== 'real')
}
