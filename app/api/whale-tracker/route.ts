import { NextRequest, NextResponse } from 'next/server'

interface CacheEntry {
  data: unknown
  timestamp: number
  minAmount: number
}

let cache: CacheEntry | null = null
// ✅ FIX: Increased from 30s to 2 min to reduce expensive Alchemy calls
const CACHE_TTL = 2 * 60 * 1000

// ─────────────────────────────────────────────────────────────
// Known ERC-20 stablecoin contracts (Ethereum mainnet)
// We track large USDT / USDC / DAI / USDS transfers
// because their tx.value = 0 (native ETH value) — they move
// via Transfer events, not ETH value.
// ─────────────────────────────────────────────────────────────
const STABLECOIN_CONTRACTS: Record<string, { symbol: string; decimals: number }> = {
  '0xdac17f958d2ee523a2206206994597c13d831ec7': { symbol: 'USDT',  decimals: 6  },
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': { symbol: 'USDC',  decimals: 6  },
  '0x6b175474e89094c44da98b954eedeac495271d0f': { symbol: 'DAI',   decimals: 18 },
  '0x0000000000085d4780b73119b644ae5ecd22b376': { symbol: 'TUSD',  decimals: 18 },
  '0x83f798e925bcd4017eb265844fddabb448f1707d': { symbol: 'USDS',  decimals: 18 },
}

// Transfer(address,address,uint256) keccak-256 topic
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

// Alchemy JSON-RPC helper (avoids importing the full SDK for token log queries)
async function alchemyRpc(apiKey: string, method: string, params: any[]) {
  const res = await fetch(`https://eth-mainnet.g.alchemy.com/v2/${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  if (!res.ok) throw new Error(`Alchemy RPC error ${res.status}`)
  const json = await res.json()
  if (json.error) throw new Error(json.error.message)
  return json.result
}

// Decode a uint256 hex string (no 0x prefix) to a numeric amount
function hexToAmount(hex: string, decimals: number): number {
  const raw = BigInt('0x' + hex.padStart(64, '0'))
  return Number(raw) / Math.pow(10, decimals)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rawAmount = Number(searchParams.get('minAmount') || '500000')  // default $500k USD
    const minAmount = isNaN(rawAmount) || rawAmount <= 0 ? 500000 : rawAmount

    if (cache && cache.minAmount === minAmount && Date.now() - cache.timestamp < CACHE_TTL) {
      return NextResponse.json(cache.data)
    }

    const apiKey = process.env.ALCHEMY_API_KEY
    if (!apiKey) {
      // ✅ FIX: Return empty array instead of 500 error when key is missing,
      // so the UI can render gracefully without crashing
      return NextResponse.json({
        transactions: [],
        error: 'Alchemy API key not configured — whale tracking disabled',
        hasApiKey: false,
      })
    }

    // ── 1. Get the latest block number ─────────────────────────────────────────
    const latestBlockHex: string = await alchemyRpc(apiKey, 'eth_blockNumber', [])
    const latestBlock = parseInt(latestBlockHex, 16)

    // ── 2. ETH native whale transactions (recent 3 blocks — less data, faster) ─
    //     Reduced from 10 blocks → 3 blocks to lower Alchemy compute-unit cost
    const blockNums = Array.from({ length: 3 }, (_, i) => latestBlock - i)
    const ethTxs: any[] = []

    for (const num of blockNums) {
      const block = await alchemyRpc(apiKey, 'eth_getBlockByNumber', [`0x${num.toString(16)}`, true])
      if (!block?.transactions) continue
      const ts = new Date(parseInt(block.timestamp, 16) * 1000).toISOString()

      for (const tx of block.transactions) {
        const ethValue = Number(BigInt(tx.value || '0x0')) / 1e18
        if (ethValue >= minAmount / 2000) { // approximate: 1 ETH ≈ $2000
          ethTxs.push({
            hash: tx.hash,
            from: tx.from,
            to: tx.to || '',
            value: ethValue.toFixed(4),
            valueUsd: Math.round(ethValue * 2000),
            token: 'ETH',
            timestamp: ts,
            blockNum: num.toString(),
            type: 'native',
          })
        }
      }
    }

    // ── 3. ERC-20 stablecoin whale transfers (last ~250 blocks ≈ ~1 hour) ─────
    const fromBlock = `0x${(latestBlock - 250).toString(16)}`
    const toBlock   = `0x${latestBlock.toString(16)}`

    const tokenTxs: any[] = []

    for (const [contractAddr, meta] of Object.entries(STABLECOIN_CONTRACTS)) {
      try {
        const logs: any[] = await alchemyRpc(apiKey, 'eth_getLogs', [{
          fromBlock,
          toBlock,
          address: contractAddr,
          topics: [TRANSFER_TOPIC],
        }])

        for (const log of logs) {
          // topics[1] = from address (padded), topics[2] = to address (padded)
          // data = uint256 amount (padded hex)
          const amount = hexToAmount(log.data.slice(2), meta.decimals)
          if (amount < minAmount) continue

          const fromAddr = '0x' + (log.topics[1] || '').slice(26)
          const toAddr   = '0x' + (log.topics[2] || '').slice(26)
          const ts = new Date(parseInt(log.blockNumber, 16) * 1000 /* approx */).toISOString()

          tokenTxs.push({
            hash:     log.transactionHash,
            from:     fromAddr,
            to:       toAddr,
            value:    amount.toFixed(2),
            valueUsd: Math.round(amount), // stablecoins ≈ $1
            token:    meta.symbol,
            timestamp: ts,
            blockNum: parseInt(log.blockNumber, 16).toString(),
            type: 'erc20',
          })
        }
      } catch (err) {
        console.warn(`[whale-tracker] Failed to fetch ${meta.symbol} logs:`, err)
      }
    }

    // ── 4. Merge, sort by value descending, cap at 100 results ───────────────
    const allTxs = [...ethTxs, ...tokenTxs]
      .sort((a, b) => b.valueUsd - a.valueUsd)
      .slice(0, 100)

    const result = {
      transactions: allTxs,
      hasApiKey: true,
      ethCount:   ethTxs.length,
      tokenCount: tokenTxs.length,
      minAmount,
      lastUpdated: new Date().toISOString(),
    }

    cache = { data: result, timestamp: Date.now(), minAmount }
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching whale transactions:', error)
    if (cache) {
      return NextResponse.json(cache.data)
    }
    return NextResponse.json(
      {
        transactions: [],
        error: '트랜잭션을 불러오는 중 오류가 발생했습니다.',
        hasApiKey: !!process.env.ALCHEMY_API_KEY,
      },
      { status: 500 }
    )
  }
}
