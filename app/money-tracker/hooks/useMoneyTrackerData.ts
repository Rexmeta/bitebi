import { useState, useEffect, useCallback, useRef } from 'react'

export interface MarketIndexData {
  sp500: number
  sp500History: { date: string; value: number }[]
  nasdaq100: number
  nasdaq100History: { date: string; value: number }[]
  gold: number
  goldHistory: { date: string; value: number }[]
}

export interface FearGreedItem {
  value: string
  value_classification: string
  timestamp: string
}

export interface MonetaryData {
  usM2: number | null
  usM2History: { date: string; value: number }[]
  fedFundsRate: number | null
  fedFundsHistory: { date: string; value: number }[]
  globalM2: number | null
  globalM2History: { date: string; value: number }[]
  regionalM2: { eu: number; jp: number; uk: number }
  marketIndices: MarketIndexData
  lastUpdated: string
  hasFredKey: boolean
}

export interface StablecoinItem {
  id: string
  name: string
  symbol: string
  circulating_supply: number
  market_cap: number
  dominance: number
  change_7d: number
  change_30d: number
  chains: { chain: string; circulating: number }[]
}

export interface StablecoinData {
  stablecoins: StablecoinItem[]
  totalSupply: number
  source: string
  lastUpdated: string
}

export interface DefiStatsData {
  stablecoins: { name: string; symbol: string; marketCap: number; change7d: number; change30d: number }[]
  totalStablecoinSupply: number
  chainDistribution: { chain: string; totalCirculating: number }[]
  tvlHistory: { date: number; tvl: number }[]
  currentTvl: number
  btcPriceHistory: { date: number; price: number }[]
  lastUpdated: string
}

export interface Signal {
  type: 'positive' | 'warning' | 'danger'
  title: string
  description: string
  value?: string
}

export interface MoneyTrackerState {
  stablecoinData: StablecoinData | null
  monetaryData: MonetaryData | null
  defiStats: DefiStatsData | null
  fearGreedData: FearGreedItem[] | null
  loading: boolean
  error: string | null
  lastFetchTime: string | null
  signals: Signal[]
  refetch: () => void
}

const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000

function generateSignals(
  stablecoinData: StablecoinData | null,
  monetaryData: MonetaryData | null,
  defiStats: DefiStatsData | null,
  fearGreedData: FearGreedItem[] | null
): Signal[] {
  const signals: Signal[] = []

  if (fearGreedData && fearGreedData.length > 0) {
    const latest = parseInt(fearGreedData[0].value)
    if (latest < 20) {
      signals.push({
        type: 'positive',
        title: '극도의 공포 (기회)',
        description: `공포/탐욕 지수가 ${latest}로 매우 낮습니다. 역사적으로 과매도 구간일 가능성이 높습니다.`,
        value: `${latest}`,
      })
    } else if (latest > 80) {
      signals.push({
        type: 'danger',
        title: '극도의 탐욕 (주의)',
        description: `지수가 ${latest}로 매우 높습니다. 시장의 과열을 주의해야 합니다.`,
        value: `${latest}`,
      })
    }
  }

  if (defiStats) {
    const topStable = defiStats.stablecoins?.[0]
    if (topStable) {
      if (topStable.change7d > 5) {
        signals.push({
          type: 'positive',
          title: '유동성 유입 신호',
          description: `${topStable.name} 7일 공급량 +${topStable.change7d.toFixed(1)}% - 유동성이 유입되고 있습니다`,
          value: `+${topStable.change7d.toFixed(1)}%`,
        })
      }
    }
  }

  if (monetaryData) {
    if (monetaryData.globalM2History && monetaryData.globalM2History.length >= 2) {
      const latest = monetaryData.globalM2History[monetaryData.globalM2History.length - 1]?.value || 0
      const prev = monetaryData.globalM2History[monetaryData.globalM2History.length - 2]?.value || 0
      if (prev > 0) {
        const m2Change = ((latest - prev) / prev) * 100
        if (m2Change > 0.5) {
          signals.push({
            type: 'positive',
            title: '글로벌 유동성 확장',
            description: `주요국 M2 통화량 전월 대비 +${m2Change.toFixed(2)}% 증가 - 유동성 공급 환경`,
            value: `+${m2Change.toFixed(2)}%`,
          })
        }
      }
    }
  }

  return signals.length > 0 ? signals : [{ type: 'positive', title: '안정적 시장 환경', description: '현재 특별한 이상 신호가 감지되지 않았습니다' }]
}

export function useMoneyTrackerData(): MoneyTrackerState {
  const [stablecoinData, setStablecoinData] = useState<StablecoinData | null>(null)
  const [monetaryData, setMonetaryData] = useState<MonetaryData | null>(null)
  const [defiStats, setDefiStats] = useState<DefiStatsData | null>(null)
  const [fearGreedData, setFearGreedData] = useState<FearGreedItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastFetchTime, setLastFetchTime] = useState<string | null>(null)
  const [signals, setSignals] = useState<Signal[]>([])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [stableRes, monetaryRes, defiRes, fearRes] = await Promise.allSettled([
        fetch('/api/stablecoins').then(r => r.json()),
        fetch('/api/monetary').then(r => r.json()),
        fetch('/api/defi-stats').then(r => r.json()),
        fetch('/api/fear-greed').then(r => r.json()),
      ])

      let newStable: StablecoinData | null = null
      let newMonetary: MonetaryData | null = null
      let newDefi: DefiStatsData | null = null
      let newFear: FearGreedItem[] | null = null

      if (stableRes.status === 'fulfilled' && !stableRes.value.error) {
        newStable = stableRes.value
        setStablecoinData(newStable)
      }

      if (monetaryRes.status === 'fulfilled' && monetaryRes.value.success) {
        newMonetary = monetaryRes.value.data
        setMonetaryData(newMonetary)
      }

      if (defiRes.status === 'fulfilled' && defiRes.value.success) {
        newDefi = defiRes.value.data
        setDefiStats(newDefi)
      }

      if (fearRes.status === 'fulfilled' && fearRes.value.success) {
        newFear = fearRes.value.data
        setFearGreedData(newFear)
      }

      const newSignals = generateSignals(newStable, newMonetary, newDefi, newFear)
      setSignals(newSignals)

      if (!newStable && !newMonetary && !newDefi) {
        setError('모든 데이터 소스에서 데이터를 가져올 수 없습니다')
      }

      setLastFetchTime(new Date().toISOString())
    } catch (e) {
      setError('데이터를 불러오는 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    intervalRef.current = setInterval(fetchData, AUTO_REFRESH_INTERVAL)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchData])

  return {
    stablecoinData,
    monetaryData,
    defiStats,
    fearGreedData,
    loading,
    error,
    lastFetchTime,
    signals,
    refetch: fetchData,
  }
}
