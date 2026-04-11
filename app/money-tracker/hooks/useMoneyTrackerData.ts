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
  diagnostics?: {
    source: 'fred' | 'hybrid' | 'fallback'
    isEstimated: boolean
    completeness: number
    available: number
    total: number
    missing: string[]
  }
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

  // ── 1. 공포/탐욕 지수 ──────────────────────────────────────────
  if (fearGreedData && fearGreedData.length > 0) {
    const latest = parseInt(fearGreedData[0].value)
    if (latest < 20) {
      signals.push({ type: 'positive', title: '극도의 공포 — 매수 기회', description: `공포/탐욕 지수 ${latest}. 역사적으로 과매도 구간이며 장기 매수 기회로 평가됩니다.`, value: `F&G: ${latest}` })
    } else if (latest < 40) {
      signals.push({ type: 'warning', title: '공포 구간', description: `공포/탐욕 지수 ${latest}. 시장 심리가 위축돼 있으나 회복 가능성을 모니터링하세요.`, value: `F&G: ${latest}` })
    } else if (latest > 80) {
      signals.push({ type: 'danger', title: '극도의 탐욕 — 과열 경고', description: `공포/탐욕 지수 ${latest}. 과열 상태로 단기 조정 리스크가 높습니다.`, value: `F&G: ${latest}` })
    } else if (latest > 65) {
      signals.push({ type: 'warning', title: '탐욕 구간', description: `공포/탐욕 지수 ${latest}. 탐욕 상태가 지속되면 추가 조정에 주의하세요.`, value: `F&G: ${latest}` })
    }
  }

  // ── 2. 스테이블코인 유동성 신호 ──────────────────────────────
  if (defiStats) {
    const topStable = defiStats.stablecoins?.[0]
    if (topStable) {
      if (topStable.change7d > 5) {
        signals.push({ type: 'positive', title: '스테이블 유동성 급증', description: `${topStable.name} 7일 공급량 +${topStable.change7d.toFixed(1)}%. 신규 자본이 대거 유입되고 있습니다.`, value: `+${topStable.change7d.toFixed(1)}%` })
      } else if (topStable.change7d > 2) {
        signals.push({ type: 'positive', title: '유동성 점진적 증가', description: `${topStable.name} 7일 +${topStable.change7d.toFixed(1)}%. 완만한 유동성 공급 확대.`, value: `+${topStable.change7d.toFixed(1)}%` })
      } else if (topStable.change7d < -3) {
        signals.push({ type: 'danger', title: '스테이블 유동성 감소', description: `${topStable.name} 7일 ${topStable.change7d.toFixed(1)}%. 유동성 이탈 가능성에 주의하세요.`, value: `${topStable.change7d.toFixed(1)}%` })
      }
    }
  }

  // ── 3. 글로벌 M2 유동성 신호 ─────────────────────────────────
  if (monetaryData?.globalM2History && monetaryData.globalM2History.length >= 2) {
    const latest = monetaryData.globalM2History[monetaryData.globalM2History.length - 1]?.value || 0
    const prev   = monetaryData.globalM2History[monetaryData.globalM2History.length - 2]?.value || 0
    if (prev > 0) {
      const m2Change = ((latest - prev) / prev) * 100
      if (m2Change > 1) {
        signals.push({ type: 'positive', title: '글로벌 M2 급속 확장', description: `주요국 M2 전월 대비 +${m2Change.toFixed(2)}%. 강력한 유동성 공급 환경이 형성됩니다.`, value: `+${m2Change.toFixed(2)}%` })
      } else if (m2Change > 0.3) {
        signals.push({ type: 'positive', title: '글로벌 유동성 확장', description: `주요국 M2 전월 대비 +${m2Change.toFixed(2)}%. 온건한 유동성 확장 추세.`, value: `+${m2Change.toFixed(2)}%` })
      } else if (m2Change < -0.5) {
        signals.push({ type: 'danger', title: '글로벌 M2 축소 경고', description: `주요국 M2 전월 대비 ${m2Change.toFixed(2)}%. 유동성 긴축 환경으로 전환될 수 있습니다.`, value: `${m2Change.toFixed(2)}%` })
      }
    }
  }

  // ── 4. 연준 금리 정책 신호 ────────────────────────────────────
  if (monetaryData?.fedFundsRate !== null && monetaryData?.fedFundsRate !== undefined) {
    const rate = monetaryData.fedFundsRate
    if (rate >= 5.25) {
      signals.push({ type: 'danger', title: '연준 고금리 — 긴축 최고조', description: `기준금리 ${rate}%. 위험자산에 강한 역풍이 작용하는 환경입니다.`, value: `${rate}%` })
    } else if (rate >= 4) {
      signals.push({ type: 'warning', title: '연준 고금리 — 긴축 지속', description: `기준금리 ${rate}%. 유동성 제한 환경이 지속되고 있습니다.`, value: `${rate}%` })
    } else if (rate < 2) {
      signals.push({ type: 'positive', title: '연준 저금리 — 유동성 확장', description: `기준금리 ${rate}%. 저금리 환경에서 위험자산 선호가 높아집니다.`, value: `${rate}%` })
    }
  }

  // ── 5. DeFi TVL 신호 ──────────────────────────────────────────
  if (defiStats?.tvlHistory && defiStats.tvlHistory.length >= 7) {
    const recent  = defiStats.tvlHistory[defiStats.tvlHistory.length - 1]?.tvl || 0
    const weekAgo = defiStats.tvlHistory[defiStats.tvlHistory.length - 7]?.tvl || 0
    if (weekAgo > 0) {
      const tvlChange = ((recent - weekAgo) / weekAgo) * 100
      if (tvlChange > 10) {
        signals.push({ type: 'positive', title: 'DeFi TVL 급증', description: `7일 DeFi TVL +${tvlChange.toFixed(1)}%. DeFi 생태계로 자금이 급속히 유입됩니다.`, value: `+${tvlChange.toFixed(1)}%` })
      } else if (tvlChange > 3) {
        signals.push({ type: 'positive', title: 'DeFi TVL 증가', description: `7일 DeFi TVL +${tvlChange.toFixed(1)}%. 온체인 유동성이 꾸준히 증가하고 있습니다.`, value: `+${tvlChange.toFixed(1)}%` })
      } else if (tvlChange < -10) {
        signals.push({ type: 'danger', title: 'DeFi TVL 급락 경고', description: `7일 DeFi TVL ${tvlChange.toFixed(1)}%. 대규모 자금 이탈이 감지됩니다.`, value: `${tvlChange.toFixed(1)}%` })
      } else if (tvlChange < -3) {
        signals.push({ type: 'warning', title: 'DeFi TVL 감소', description: `7일 DeFi TVL ${tvlChange.toFixed(1)}%. 온체인 유동성이 소폭 감소하고 있습니다.`, value: `${tvlChange.toFixed(1)}%` })
      }
    }
  }

  // ── 6. 스테이블코인 시총 임계점 신호 ─────────────────────────
  const totalStable = stablecoinData?.totalSupply || defiStats?.totalStablecoinSupply || 0
  if (totalStable > 0) {
    if (totalStable >= 5e11) {
      signals.push({ type: 'positive', title: '스테이블 시총 $500B 돌파', description: '스테이블코인 총 시가총액이 $500B를 초과. 시스템적 중요성이 확보된 역사적 수준입니다.', value: `$${(totalStable/1e9).toFixed(0)}B` })
    } else if (totalStable >= 4e11) {
      signals.push({ type: 'warning', title: '$500B 임박 — 모니터링 필요', description: `스테이블 총량 $${(totalStable/1e9).toFixed(0)}B. $500B 임계점 90% 달성.`, value: `$${(totalStable/1e9).toFixed(0)}B` })
    }
  }

  // ── 7. 종합 복합 신호 ─────────────────────────────────────────
  const positiveCount = signals.filter(s => s.type === 'positive').length
  const dangerCount   = signals.filter(s => s.type === 'danger').length

  if (positiveCount >= 3 && dangerCount === 0) {
    signals.push({ type: 'positive', title: '복합 강세 환경 감지', description: `${positiveCount}개의 긍정 신호가 동시 발생. 글로벌 유동성·심리·온체인 지표가 모두 강세를 지지합니다.`, value: `강세 ${positiveCount}개` })
  } else if (dangerCount >= 3) {
    signals.push({ type: 'danger', title: '복합 위험 신호 경보', description: `${dangerCount}개의 위험 신호가 동시 발생. 리스크 관리와 포지션 축소를 검토하세요.`, value: `경보 ${dangerCount}개` })
  }

  return signals.length > 0 ? signals : [
    { type: 'warning', title: '안정적 시장 환경', description: '현재 특별한 이상 신호가 감지되지 않았습니다. 데이터를 지속 모니터링 중입니다.' }
  ]
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
