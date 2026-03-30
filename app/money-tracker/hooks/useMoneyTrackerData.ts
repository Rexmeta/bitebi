import { useState, useEffect, useCallback, useRef } from 'react'

export interface MonetaryData {
  usM2: number | null
  usM2History: { date: string; value: number }[]
  fedFundsRate: number | null
  fedFundsHistory: { date: string; value: number }[]
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
  defiStats: DefiStatsData | null
): Signal[] {
  const signals: Signal[] = []

  if (defiStats) {
    const topStable = defiStats.stablecoins?.[0]
    if (topStable) {
      if (topStable.change7d > 5) {
        signals.push({
          type: 'positive',
          title: '유동성 유입 신호',
          description: `${topStable.name} 7일 공급량 ${topStable.change7d > 0 ? '+' : ''}${topStable.change7d.toFixed(1)}% 변화 - 유동성이 유입되고 있습니다`,
          value: `${topStable.change7d > 0 ? '+' : ''}${topStable.change7d.toFixed(1)}%`,
        })
      } else if (topStable.change7d < -5) {
        signals.push({
          type: 'danger',
          title: '유동성 유출 경고',
          description: `${topStable.name} 7일 공급량 ${topStable.change7d.toFixed(1)}% 감소 - 유동성이 빠져나가고 있습니다`,
          value: `${topStable.change7d.toFixed(1)}%`,
        })
      }
    }

    const totalChange = defiStats.stablecoins?.reduce((sum, s) => sum + s.change30d, 0) || 0
    const avgChange = defiStats.stablecoins?.length ? totalChange / defiStats.stablecoins.length : 0
    if (avgChange > 10) {
      signals.push({
        type: 'positive',
        title: '스테이블코인 공급 확대',
        description: `평균 30일 공급량 ${avgChange.toFixed(1)}% 증가 - 시장에 유동성이 공급되고 있습니다`,
        value: `+${avgChange.toFixed(1)}%`,
      })
    }

    if (defiStats.tvlHistory && defiStats.tvlHistory.length >= 7) {
      const recent = defiStats.tvlHistory[defiStats.tvlHistory.length - 1]?.tvl || 0
      const weekAgo = defiStats.tvlHistory[defiStats.tvlHistory.length - 7]?.tvl || 0
      if (weekAgo > 0) {
        const tvlChange = ((recent - weekAgo) / weekAgo) * 100
        if (tvlChange > 5) {
          signals.push({
            type: 'positive',
            title: 'DeFi 활성화 신호',
            description: `TVL 7일간 ${tvlChange.toFixed(1)}% 증가 - DeFi 생태계가 활발해지고 있습니다`,
            value: `+${tvlChange.toFixed(1)}%`,
          })
        } else if (tvlChange < -5) {
          signals.push({
            type: 'warning',
            title: 'DeFi TVL 감소 주의',
            description: `TVL 7일간 ${tvlChange.toFixed(1)}% 감소 - DeFi 자금이 유출되고 있습니다`,
            value: `${tvlChange.toFixed(1)}%`,
          })
        }
      }
    }
  }

  if (monetaryData) {
    if (monetaryData.usM2History && monetaryData.usM2History.length >= 2) {
      const latest = monetaryData.usM2History[monetaryData.usM2History.length - 1]?.value || 0
      const prev = monetaryData.usM2History[monetaryData.usM2History.length - 2]?.value || 0
      if (prev > 0) {
        const m2Change = ((latest - prev) / prev) * 100
        if (m2Change < 0) {
          signals.push({
            type: 'warning',
            title: '긴축 주의 신호',
            description: `미국 M2 통화량 전월 대비 ${m2Change.toFixed(2)}% 감소 - 유동성 긴축 환경`,
            value: `${m2Change.toFixed(2)}%`,
          })
        } else if (m2Change > 1) {
          signals.push({
            type: 'positive',
            title: '유동성 완화 신호',
            description: `미국 M2 통화량 전월 대비 +${m2Change.toFixed(2)}% 증가 - 유동성 확장 환경`,
            value: `+${m2Change.toFixed(2)}%`,
          })
        }
      }
    }

    if (monetaryData.fedFundsRate !== null) {
      if (monetaryData.fedFundsRate >= 5) {
        signals.push({
          type: 'warning',
          title: '고금리 환경',
          description: `연방기금금리 ${monetaryData.fedFundsRate}% - 높은 금리가 위험자산에 압력을 줄 수 있습니다`,
          value: `${monetaryData.fedFundsRate}%`,
        })
      } else if (monetaryData.fedFundsRate < 3) {
        signals.push({
          type: 'positive',
          title: '저금리 유동성 환경',
          description: `연방기금금리 ${monetaryData.fedFundsRate}% - 낮은 금리가 암호화폐 시장에 호재`,
          value: `${monetaryData.fedFundsRate}%`,
        })
      }
    }
  }

  if (stablecoinData && stablecoinData.totalSupply > 0 && monetaryData?.usM2) {
    const penetration = (stablecoinData.totalSupply / monetaryData.usM2) * 100
    if (penetration > 1) {
      signals.push({
        type: 'positive',
        title: '스테이블코인 침투율 1% 돌파',
        description: `미국 M2 대비 스테이블코인 비중 ${penetration.toFixed(2)}% - 시스템적 중요성 확보`,
        value: `${penetration.toFixed(2)}%`,
      })
    }
  }

  if (signals.length === 0) {
    signals.push({
      type: 'positive',
      title: '안정적 시장 환경',
      description: '현재 특별한 이상 신호가 감지되지 않았습니다',
    })
  }

  return signals
}

export function useMoneyTrackerData(): MoneyTrackerState {
  const [stablecoinData, setStablecoinData] = useState<StablecoinData | null>(null)
  const [monetaryData, setMonetaryData] = useState<MonetaryData | null>(null)
  const [defiStats, setDefiStats] = useState<DefiStatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastFetchTime, setLastFetchTime] = useState<string | null>(null)
  const [signals, setSignals] = useState<Signal[]>([])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [stableRes, monetaryRes, defiRes] = await Promise.allSettled([
        fetch('/api/stablecoins').then(r => r.json()),
        fetch('/api/monetary').then(r => r.json()),
        fetch('/api/defi-stats').then(r => r.json()),
      ])

      let newStable: StablecoinData | null = null
      let newMonetary: MonetaryData | null = null
      let newDefi: DefiStatsData | null = null

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

      const newSignals = generateSignals(newStable, newMonetary, newDefi)
      setSignals(newSignals)

      setLastFetchTime(new Date().toISOString())

      if (!newStable && !newMonetary && !newDefi) {
        setError('모든 데이터 소스에서 데이터를 가져올 수 없습니다')
      }
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
    loading,
    error,
    lastFetchTime,
    signals,
    refetch: fetchData,
  }
}
