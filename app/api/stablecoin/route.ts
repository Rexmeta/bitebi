import { NextResponse } from 'next/server'
import { Alchemy, Network } from 'alchemy-sdk'

const STABLECOIN_IDS = ['tether', 'usd-coin', 'dai', 'binance-usd', 'frax', 'true-usd', 'usdd', 'pax-dollar']

interface StablecoinInfo {
  name: string
  symbol: string
  description: string
  website: string
  whitepaper: string
  blockchain: string
  collateral: string
}

const STABLECOIN_INFO: Record<string, StablecoinInfo> = {
  'tether': {
    name: 'Tether USD',
    symbol: 'USDT',
    description: '가장 큰 시가총액을 가진 스테이블코인으로, 달러와 1:1로 연동됩니다.',
    website: 'https://tether.to',
    whitepaper: 'https://tether.to/wp-content/uploads/2016/06/TetherWhitePaper.pdf',
    blockchain: 'Ethereum, Tron, Solana 등',
    collateral: 'USD, 현금 등가물'
  },
  'usd-coin': {
    name: 'USD Coin',
    symbol: 'USDC',
    description: 'Circle과 Coinbase가 발행한 규제를 준수하는 스테이블코인입니다.',
    website: 'https://www.circle.com/en/usdc',
    whitepaper: 'https://www.circle.com/en/usdc',
    blockchain: 'Ethereum, Solana, Avalanche 등',
    collateral: 'USD, 현금 등가물'
  },
  'dai': {
    name: 'Dai',
    symbol: 'DAI',
    description: 'MakerDAO 프로토콜에서 발행되는 탈중앙화 스테이블코인입니다.',
    website: 'https://makerdao.com',
    whitepaper: 'https://makerdao.com/whitepaper/',
    blockchain: 'Ethereum',
    collateral: 'ETH, WBTC, USDC 등'
  },
  'binance-usd': {
    name: 'Binance USD',
    symbol: 'BUSD',
    description: '바이낸스가 발행한 규제를 준수하는 스테이블코인입니다.',
    website: 'https://www.binance.com/en/busd',
    whitepaper: 'https://www.binance.com/en/busd',
    blockchain: 'Ethereum, BNB Chain',
    collateral: 'USD, 현금 등가물'
  },
  'frax': {
    name: 'Frax',
    symbol: 'FRAX',
    description: '부분 담보 스테이블코인으로, 알고리즘과 담보를 혼합한 방식입니다.',
    website: 'https://frax.finance',
    whitepaper: 'https://docs.frax.finance/',
    blockchain: 'Ethereum, Avalanche, Fantom 등',
    collateral: 'USDC, FXS 토큰'
  },
  'true-usd': {
    name: 'TrueUSD',
    symbol: 'TUSD',
    description: 'TrustToken이 발행한 규제를 준수하는 스테이블코인입니다.',
    website: 'https://www.trueusd.com',
    whitepaper: 'https://www.trueusd.com/whitepaper',
    blockchain: 'Ethereum, Avalanche, BNB Chain',
    collateral: 'USD, 현금 등가물'
  },
  'usdd': {
    name: 'USDD',
    symbol: 'USDD',
    description: 'TRON DAO가 발행한 알고리즘 스테이블코인입니다.',
    website: 'https://usdd.io',
    whitepaper: 'https://usdd.io/whitepaper',
    blockchain: 'TRON, Ethereum, BNB Chain',
    collateral: 'TRX, BTC, USDT 등'
  },
  'pax-dollar': {
    name: 'Pax Dollar',
    symbol: 'USDP',
    description: 'Paxos가 발행한 규제를 준수하는 스테이블코인입니다.',
    website: 'https://paxos.com/usdp',
    whitepaper: 'https://paxos.com/usdp',
    blockchain: 'Ethereum',
    collateral: 'USD, 현금 등가물'
  }
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
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${STABLECOIN_IDS.join(',')}&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        next: { revalidate: 60 } // 1분마다 캐시 갱신
      }
    )

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`)
    }

    const data = await response.json()
    
    // 필요한 데이터만 추출
    const stablecoins = data.map((coin: any) => ({
      id: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      image: coin.image,
      current_price: coin.current_price,
      market_cap: coin.market_cap,
      market_cap_rank: coin.market_cap_rank,
      total_volume: coin.total_volume,
      price_change_percentage_24h: coin.price_change_percentage_24h,
      circulating_supply: coin.circulating_supply,
      total_supply: coin.total_supply,
      max_supply: coin.max_supply,
      ath: coin.ath,
      ath_change_percentage: coin.ath_change_percentage,
      ath_date: coin.ath_date,
      atl: coin.atl,
      atl_change_percentage: coin.atl_change_percentage,
      atl_date: coin.atl_date,
      last_updated: coin.last_updated
    }))

    return NextResponse.json(stablecoins)
  } catch (error) {
    console.error('Error fetching stablecoin data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stablecoin data' },
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