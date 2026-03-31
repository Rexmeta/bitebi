'use client'

import { useEffect, useState } from 'react'

interface MarketSummary {
  totalMarketCap: number
  totalVolume24h: number
  btcDominance: number
  ethDominance: number
  activeCryptocurrencies: number
  marketCapChangePercentage24h: number
}

function formatNumber(num: number): string {
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`
  return `$${num.toLocaleString()}`
}

export default function MarketSummaryCard() {
  const [data, setData] = useState<MarketSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/market-summary')
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setData(json.data)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-[#161b22] rounded-lg p-3 border border-[#2d333b] animate-pulse">
            <div className="h-3 bg-[#2d333b] rounded w-20 mb-2" />
            <div className="h-5 bg-[#2d333b] rounded w-24" />
          </div>
        ))}
      </div>
    )
  }

  if (!data) return null

  const change = data.marketCapChangePercentage24h
  const changeColor = change >= 0 ? 'text-green-400' : 'text-red-400'
  const changeIcon = change >= 0 ? '▲' : '▼'

  const cards = [
    {
      label: '전체 시가총액',
      value: formatNumber(data.totalMarketCap),
      sub: `${changeIcon} ${Math.abs(change).toFixed(2)}%`,
      subColor: changeColor,
      icon: '💰',
    },
    {
      label: '24시간 거래량',
      value: formatNumber(data.totalVolume24h),
      icon: '📊',
    },
    {
      label: 'BTC 도미넌스',
      value: `${data.btcDominance.toFixed(1)}%`,
      icon: '₿',
    },
    {
      label: 'ETH 도미넌스',
      value: `${data.ethDominance.toFixed(1)}%`,
      icon: 'Ξ',
    },
    {
      label: '활성 암호화폐',
      value: data.activeCryptocurrencies.toLocaleString(),
      icon: '🪙',
    },
    {
      label: '시장 상태',
      value: change >= 0 ? '상승세' : '하락세',
      sub: `${changeIcon} ${Math.abs(change).toFixed(2)}%`,
      subColor: changeColor,
      icon: change >= 0 ? '🟢' : '🔴',
    },
  ]

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-yellow-400 mb-3">📈 오늘의 시장</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="bg-[#161b22] rounded-lg p-2 sm:p-3 border border-[#2d333b] hover:border-yellow-400/30 transition-colors"
          >
            <div className="flex items-center gap-1 mb-1">
              <span className="text-sm">{card.icon}</span>
              <span className="text-xs text-gray-400 truncate">{card.label}</span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-white truncate">{card.value}</div>
            {card.sub && (
              <div className={`text-xs mt-0.5 ${card.subColor || 'text-gray-400'}`}>
                {card.sub}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
