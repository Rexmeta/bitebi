import { NextRequest, NextResponse } from 'next/server'
import { Alchemy, Network } from 'alchemy-sdk'

interface CacheEntry {
  data: unknown
  timestamp: number
  minAmount: number
}

let cache: CacheEntry | null = null
const CACHE_TTL = 30 * 1000

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const minAmount = Number(searchParams.get('minAmount') || '100')

    if (cache && cache.minAmount === minAmount && Date.now() - cache.timestamp < CACHE_TTL) {
      return NextResponse.json(cache.data)
    }

    const apiKey = process.env.ALCHEMY_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Alchemy API key not configured' },
        { status: 500 }
      )
    }

    const alchemy = new Alchemy({
      apiKey,
      network: Network.ETH_MAINNET,
    })

    const latestBlock = await alchemy.core.getBlockNumber()

    const blocks = await Promise.all(
      Array.from({ length: 10 }, (_, i) => latestBlock - i).map(blockNum =>
        alchemy.core.getBlockWithTransactions(blockNum)
      )
    )

    const whaleTxs = blocks.flatMap((block) =>
      block.transactions
        .filter((tx) =>
          tx.value &&
          Number(tx.value) / 1e18 >= minAmount
        )
        .map((tx) => ({
          hash: tx.hash,
          from: tx.from,
          to: tx.to || '',
          value: (Number(tx.value) / 1e18).toFixed(2),
          timestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
          blockNum: block.number.toString()
        }))
    )

    cache = { data: whaleTxs, timestamp: Date.now(), minAmount }
    return NextResponse.json(whaleTxs)
  } catch (error) {
    console.error('Error fetching whale transactions:', error)
    if (cache) {
      return NextResponse.json(cache.data)
    }
    return NextResponse.json(
      { error: '트랜잭션을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
