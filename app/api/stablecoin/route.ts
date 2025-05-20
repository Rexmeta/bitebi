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

// 스테이블코인 이벤트 가져오기
async function getStablecoinEvents(address: string, fromBlock: number, toBlock: number) {
  try {
    const events = await alchemy.core.getLogs({
      address,
      fromBlock,
      toBlock,
      topics: [
        // Transfer 이벤트 시그니처
        '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
      ],
    })

    return events
  } catch (error) {
    console.error('Error fetching stablecoin events:', error)
    return []
  }
}

// 이벤트 처리
function processEvents(events: TransferEvent[], decimals: number): ProcessedEvent[] {
  return events.map(event => {
    const timestamp = event.blockNumber // 실제로는 블록 타임스탬프를 가져와야 함
    const value = parseInt(event.data, 16) / Math.pow(10, decimals)
    
    // 발신자가 0x0이면 mint, 수신자가 0x0이면 burn
    const from = '0x' + event.topics[1].slice(26)
    const to = '0x' + event.topics[2].slice(26)
    
    let type: 'mint' | 'burn' | 'transfer' = 'transfer'
    if (from === ZERO_ADDRESS) {
      type = 'mint'
    } else if (to === ZERO_ADDRESS) {
      type = 'burn'
    }

    return {
      timestamp,
      value,
      type,
    }
  })
}

// 블록 번호로 타임스탬프 가져오기
async function getBlockTimestamp(blockNumber: number): Promise<number> {
  try {
    const block = await alchemy.core.getBlock(blockNumber)
    return block?.timestamp || 0
  } catch (error) {
    console.error('Error fetching block timestamp:', error)
    return 0
  }
}

export async function GET() {
  try {
    const now = Math.floor(Date.now() / 1000)
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60)
    
    // 최근 블록 번호 가져오기
    const latestBlock = await alchemy.core.getBlockNumber()
    const fromBlock = latestBlock - 200000 // 약 30일치 블록

    const metrics = []
    
    // 각 스테이블코인에 대해 데이터 수집
    for (const [symbol, info] of Object.entries(STABLECOINS)) {
      const events = await getStablecoinEvents(info.address, fromBlock, latestBlock)
      const processedEvents = processEvents(events, info.decimals)
      
      // 일별 데이터 그룹화
      const dailyData = groupByTimeframe(processedEvents, 'daily')
      
      // 총 공급량 계산 (mint - burn)
      const totalSupply = dailyData.mints.reduce((a, b) => a + b, 0) - 
                         dailyData.burns.reduce((a, b) => a + b, 0)
      
      // 24시간 거래량
      const volume24h = dailyData.transfers[dailyData.transfers.length - 1] || 0
      
      metrics.push({
        symbol,
        name: info.name,
        totalSupply,
        marketCap: totalSupply, // 실제로는 현재 가격을 곱해야 함
        volume24h,
        dailyData
      })
    }

    return NextResponse.json(metrics)
  } catch (error) {
    console.error('Error in stablecoin API:', error)
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