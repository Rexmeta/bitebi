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
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`StablecoinStats API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('StablecoinStats API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stablecoin data' },
      { status: 500 }
    )
  }
} 