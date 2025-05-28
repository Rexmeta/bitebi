import { NextResponse } from 'next/server'

interface StablecoinStats {
  circulation: number
  circulation_change_24h: number
  circulation_percent_change_24h: number
  name: string
  price: number
  price_percent_change_24h: number
  symbol: string
  volume: number
  volume_change_24h: number
  volume_percent_change_24h: number
}

interface ProcessedStablecoin {
  id: string
  name: string
  symbol: string
  current_price: number
  market_cap: number
  total_volume: number
  circulating_supply: number
  price_change_percentage_24h: number
  volume_change_percentage_24h: number
  circulation_change_percentage_24h: number
  last_updated: string
}

export async function GET() {
  try {
    const response = await fetch('https://stablecoinstats.com/api/summary', {
      headers: {
        'Accept': 'application/json'
      },
      next: { revalidate: 60 } // 1분마다 캐시 갱신
    })

    if (!response.ok) {
      throw new Error(`StablecoinStats API error: ${response.status}`)
    }

    const data = await response.json() as Record<string, StablecoinStats>
    
    // 필요한 데이터만 추출하고 정렬
    const stablecoins = Object.entries(data)
      .map(([symbol, stats]): ProcessedStablecoin => ({
        id: symbol.toLowerCase(),
        name: stats.name,
        symbol: stats.symbol,
        current_price: stats.price,
        market_cap: stats.circulation * stats.price,
        total_volume: stats.volume,
        circulating_supply: stats.circulation,
        price_change_percentage_24h: stats.price_percent_change_24h,
        volume_change_percentage_24h: stats.volume_percent_change_24h,
        circulation_change_percentage_24h: stats.circulation_percent_change_24h,
        last_updated: new Date().toISOString()
      }))
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