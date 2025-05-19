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

// 임시 데이터 - 실제로는 데이터베이스나 외부 API에서 가져와야 합니다
const generateMockData = () => {
  const data = []
  const now = Date.now()
  const oneDay = 24 * 60 * 60 * 1000

  for (let i = 30; i >= 0; i--) {
    const timestamp = new Date(now - i * oneDay)
    data.push({
      timestamp: timestamp.toISOString(),
      totalSupply: 150000000000 + Math.random() * 10000000000,
      marketCap: 145000000000 + Math.random() * 10000000000,
      volume24h: 50000000000 + Math.random() * 5000000000
    })
  }

  return data
}

export async function GET() {
  try {
    const metrics = generateMockData()
    return NextResponse.json(metrics)
  } catch (error) {
    return NextResponse.json(
      { error: '스테이블코인 데이터를 가져오는데 실패했습니다.' },
      { status: 500 }
    )
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