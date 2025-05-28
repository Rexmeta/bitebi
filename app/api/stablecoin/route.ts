import { NextResponse } from 'next/server'

interface ChainCirculating {
  current: {
    peggedUSD: number
  }
  circulatingPrevDay: {
    peggedUSD: number
  }
  circulatingPrevWeek: {
    peggedUSD: number
  }
  circulatingPrevMonth: {
    peggedUSD: number
  }
}

interface Stablecoin {
  id: string
  name: string
  symbol: string
  gecko_id: string
  pegType: string
  priceSource: string
  pegMechanism: string
  circulating: {
    peggedUSD: number
  }
  circulatingPrevDay: {
    peggedUSD: number
  }
  circulatingPrevWeek: {
    peggedUSD: number
  }
  circulatingPrevMonth: {
    peggedUSD: number
  }
  chainCirculating: {
    [chain: string]: ChainCirculating
  }
}

interface ProcessedStablecoin {
  id: string
  name: string
  symbol: string
  gecko_id: string
  pegMechanism: string
  current_price: number
  market_cap: number
  total_volume: number
  circulating_supply: number
  price_change_percentage_24h: number
  price_change_percentage_7d: number
  price_change_percentage_30d: number
  chain_volumes: Array<{
    chain: string
    volume: number
  }>
  last_updated: string
}

export async function GET() {
  try {
    const response = await fetch('https://stablecoins.llama.fi/stablecoins', {
      headers: {
        'Accept': 'application/json'
      },
      next: { revalidate: 60 } // 1분마다 캐시 갱신
    })

    if (!response.ok) {
      throw new Error(`DefiLlama API error: ${response.status}`)
    }

    const data = await response.json()
    
    // 필요한 데이터만 추출하고 정렬
    const stablecoins = data.peggedAssets
      .filter((coin: Stablecoin) => coin.pegType === 'peggedUSD')
      .map((coin: Stablecoin): ProcessedStablecoin => {
        const totalCirculating = coin.circulating.peggedUSD
        const prevDayCirculating = coin.circulatingPrevDay.peggedUSD
        const prevWeekCirculating = coin.circulatingPrevWeek.peggedUSD
        const prevMonthCirculating = coin.circulatingPrevMonth.peggedUSD

        // 24시간, 7일, 30일 변동률 계산
        const change24h = ((totalCirculating - prevDayCirculating) / prevDayCirculating) * 100
        const change7d = ((totalCirculating - prevWeekCirculating) / prevWeekCirculating) * 100
        const change30d = ((totalCirculating - prevMonthCirculating) / prevMonthCirculating) * 100

        // 체인별 유통량 합계
        const chainVolumes = Object.entries(coin.chainCirculating).map(([chain, data]) => ({
          chain,
          volume: data.current.peggedUSD
        }))

        return {
          id: coin.id,
          name: coin.name,
          symbol: coin.symbol,
          gecko_id: coin.gecko_id,
          pegMechanism: coin.pegMechanism,
          current_price: 1, // 스테이블코인은 항상 1 USD
          market_cap: totalCirculating,
          total_volume: totalCirculating,
          circulating_supply: totalCirculating,
          price_change_percentage_24h: change24h,
          price_change_percentage_7d: change7d,
          price_change_percentage_30d: change30d,
          chain_volumes: chainVolumes,
          last_updated: new Date().toISOString()
        }
      })
      .sort((a: ProcessedStablecoin, b: ProcessedStablecoin) => b.market_cap - a.market_cap) // 시가총액 기준 정렬

    return NextResponse.json(stablecoins)
  } catch (error) {
    console.error('Error fetching stablecoin data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stablecoin data' },
      { status: 500 }
    )
  }
} 