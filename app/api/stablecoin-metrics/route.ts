import { NextResponse } from 'next/server'
import { Alchemy, Network } from 'alchemy-sdk'

interface StablecoinInfo {
  name: string
  address: string
  decimals: number
}

const STABLECOINS: Record<string, StablecoinInfo> = {
  USDT: {
    name: 'Tether USD',
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    decimals: 6,
  },
  USDC: {
    name: 'USD Coin',
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    decimals: 6,
  },
  DAI: {
    name: 'Dai Stablecoin',
    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    decimals: 18,
  },
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

const config = {
  apiKey: process.env.ALCHEMY_API_KEY,
  network: Network.ETH_MAINNET,
}

const alchemy = new Alchemy(config)

interface TransferEvent {
  blockNumber: number
  data: string
  topics: string[]
}

interface ProcessedEvent {
  timestamp: number
  value: number
  type: 'mint' | 'burn' | 'transfer'
}

interface GroupedData {
  transfers: number
  mints: number
  burns: number
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const coin = searchParams.get('coin') || 'USDT'
  const timeframe = searchParams.get('timeframe') || 'daily'

  if (!STABLECOINS[coin]) {
    return NextResponse.json({ error: 'Invalid coin' }, { status: 400 })
  }

  try {
    const tokenAddress = STABLECOINS[coin].address
    const decimals = STABLECOINS[coin].decimals

    // Get transfer events
    const transferEvents = await alchemy.core.getLogs({
      address: tokenAddress,
      topics: [
        '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', // Transfer event signature
      ],
      fromBlock: '0x' + (Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60).toString(16), // Last 30 days
      toBlock: 'latest',
    }) as TransferEvent[]

    // Process events
    const events = transferEvents.map((event) => {
      const value = BigInt(event.data)
      const from = '0x' + event.topics[1].slice(26)
      const to = '0x' + event.topics[2].slice(26)
      
      return {
        timestamp: event.blockNumber,
        value: Number(value) / Math.pow(10, decimals),
        type: from === ZERO_ADDRESS ? 'mint' : to === ZERO_ADDRESS ? 'burn' : 'transfer',
      } as ProcessedEvent
    })

    // Group by timeframe
    const groupedData = groupByTimeframe(events, timeframe)

    return NextResponse.json(groupedData)
  } catch (error) {
    console.error('Error fetching stablecoin data:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}

function groupByTimeframe(events: ProcessedEvent[], timeframe: string) {
  const groups: Record<string, GroupedData> = {}
  
  events.forEach((event) => {
    const date = new Date(event.timestamp * 1000)
    let key: string

    switch (timeframe) {
      case 'daily':
        key = date.toISOString().split('T')[0]
        break
      case 'weekly':
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        key = weekStart.toISOString().split('T')[0]
        break
      case 'monthly':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        break
      default:
        key = date.toISOString().split('T')[0]
    }

    if (!groups[key]) {
      groups[key] = {
        transfers: 0,
        mints: 0,
        burns: 0,
      }
    }

    switch (event.type) {
      case 'transfer':
        groups[key].transfers += event.value
        break
      case 'mint':
        groups[key].mints += event.value
        break
      case 'burn':
        groups[key].burns += event.value
        break
    }
  })

  const sortedKeys = Object.keys(groups).sort()
  
  return {
    labels: sortedKeys,
    transfers: sortedKeys.map(key => groups[key].transfers),
    mints: sortedKeys.map(key => groups[key].mints),
    burns: sortedKeys.map(key => groups[key].burns),
  }
} 