'use client'
import React, { useEffect, useRef } from 'react'
import Chart from 'chart.js/auto'
import type { StablecoinData, DefiStatsData, Signal } from '../hooks/useMoneyTrackerData'
import { SkeletonCard } from './SkeletonCard'
import { ErrorState } from './ErrorState'
import { UpdateTimestamp } from './UpdateTimestamp'

interface OverviewTabProps {
  stablecoinData: StablecoinData | null
  defiStats: DefiStatsData | null
  loading: boolean
  signals: Signal[]
  onRetry: () => void
}

export default function OverviewTab({ stablecoinData, defiStats, loading, signals, onRetry }: OverviewTabProps) {
  const marketChartRef = useRef<Chart | null>(null)
  const volumeChartRef = useRef<Chart | null>(null)
  const marketCanvasRef = useRef<HTMLCanvasElement>(null)
  const volumeCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (marketChartRef.current) {
      marketChartRef.current.destroy()
      marketChartRef.current = null
    }
    if (volumeChartRef.current) {
      volumeChartRef.current.destroy()
      volumeChartRef.current = null
    }

    const stables = stablecoinData?.stablecoins || defiStats?.stablecoins
    if (marketCanvasRef.current && stables && stables.length > 0) {
      const ctx = marketCanvasRef.current.getContext('2d')
      if (ctx) {
        const top5 = stables.slice(0, 5)
        const otherMcap = stables.slice(5).reduce((sum, s) => sum + (('marketCap' in s ? s.marketCap : (s as any).market_cap) || 0), 0)
        const labels = [...top5.map(s => s.symbol || s.name), '기타']
        const data = [...top5.map(s => 'marketCap' in s ? s.marketCap : (s as any).market_cap || 0), otherMcap]
        const colors = ['#667eea', '#764ba2', '#f093fb', '#48bb78', '#ed8936', '#e2e8f0']

        marketChartRef.current = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels,
            datasets: [{ data, backgroundColor: colors }],
          },
          options: {
            plugins: {
              legend: { position: 'bottom', labels: { font: { size: 11 } } },
              tooltip: {
                callbacks: {
                  label: (c) => {
                    const val = c.raw as number
                    return `${c.label}: $${(val / 1e9).toFixed(2)}B`
                  },
                },
              },
            },
            responsive: true,
            maintainAspectRatio: false,
          },
        })
      }
    }

    if (volumeCanvasRef.current && defiStats?.tvlHistory && defiStats.tvlHistory.length > 0) {
      const ctx = volumeCanvasRef.current.getContext('2d')
      if (ctx) {
        const recent = defiStats.tvlHistory.slice(-30)
        const labels = recent.map(d => {
          const date = new Date(d.date * 1000)
          return `${date.getMonth() + 1}/${date.getDate()}`
        })
        const data = recent.map(d => d.tvl / 1e9)

        volumeChartRef.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels,
            datasets: [{
              label: 'DeFi TVL (십억 달러)',
              data,
              borderColor: '#667eea',
              backgroundColor: 'rgba(102, 126, 234, 0.1)',
              tension: 0.4,
              fill: true,
              pointRadius: 0,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: false }, x: { display: true, ticks: { maxTicksLimit: 7 } } },
            plugins: { tooltip: { callbacks: { label: (c) => `TVL: $${(c.raw as number).toFixed(1)}B` } } },
          },
        })
      }
    }

    return () => {
      if (marketChartRef.current) marketChartRef.current.destroy()
      if (volumeChartRef.current) volumeChartRef.current.destroy()
    }
  }, [stablecoinData, defiStats])

  if (loading && !stablecoinData && !defiStats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard className="md:col-span-2" />
      </div>
    )
  }

  const stables = stablecoinData?.stablecoins
  const totalSupply = stablecoinData?.totalSupply || defiStats?.totalStablecoinSupply || 0
  const topStable = stables?.[0]
  const usdtDominance = topStable?.dominance?.toFixed(1) || null

  const ethChainData = defiStats?.chainDistribution?.find(c => c.chain.toLowerCase() === 'ethereum')
  const ethShare = ethChainData && totalSupply > 0
    ? ((ethChainData.totalCirculating / totalSupply) * 100).toFixed(1)
    : null

  return (
    <div className="dashboard-grid grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
      <div className="card bg-white/95 rounded-2xl p-4 sm:p-8 shadow-xl hover:-translate-y-2 hover:shadow-2xl transition-all border border-white/20 backdrop-blur h-full flex flex-col">
        <h2 className="flex items-center gap-2 text-base sm:text-xl font-bold text-gray-700 mb-1">
          <span className="inline-block w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm">📊</span>
          시장 현황
        </h2>
        <UpdateTimestamp timestamp={stablecoinData?.lastUpdated || defiStats?.lastUpdated || null} />
        <div className="metric-grid grid grid-cols-3 gap-2 sm:gap-4 mb-4 mt-4">
          <div className="metric text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-2 sm:p-4 border-l-4 border-indigo-400">
            <div className="metric-value text-lg sm:text-2xl font-bold text-gray-800 mb-1">
              {totalSupply > 0 ? `$${(totalSupply / 1e9).toFixed(1)}B` : '$-'}
            </div>
            <div className="metric-label text-[10px] sm:text-xs text-gray-500">총 공급량</div>
          </div>
          <div className="metric text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-2 sm:p-4 border-l-4 border-indigo-400">
            <div className="metric-value text-lg sm:text-2xl font-bold text-gray-800 mb-1">
              {usdtDominance ? `${usdtDominance}%` : '-'}
            </div>
            <div className="metric-label text-[10px] sm:text-xs text-gray-500">{topStable?.symbol || 'USDT'} 점유율</div>
          </div>
          <div className="metric text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-2 sm:p-4 border-l-4 border-indigo-400">
            <div className="metric-value text-lg sm:text-2xl font-bold text-gray-800 mb-1">
              {ethShare ? `${ethShare}%` : '-'}
            </div>
            <div className="metric-label text-[10px] sm:text-xs text-gray-500">ETH 체인 비중</div>
          </div>
        </div>
        <div className="chart-container relative h-48 flex-1"><canvas ref={marketCanvasRef}></canvas></div>
      </div>

      <div className="card bg-white/95 rounded-2xl p-4 sm:p-8 shadow-xl border border-white/20 backdrop-blur h-full flex flex-col">
        <h2 className="flex items-center gap-2 text-base sm:text-xl font-bold text-gray-700 mb-1">
          <span className="inline-block w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm">📈</span>
          DeFi TVL 추이 (30일)
        </h2>
        <UpdateTimestamp timestamp={defiStats?.lastUpdated || null} />
        <div className="metric-grid grid grid-cols-2 gap-2 sm:gap-4 mb-4 mt-4">
          <div className="metric text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-2 sm:p-4 border-l-4 border-indigo-400">
            <div className="metric-value text-lg sm:text-2xl font-bold text-gray-800 mb-1">
              {defiStats?.currentTvl ? `$${(defiStats.currentTvl / 1e9).toFixed(1)}B` : '$-'}
            </div>
            <div className="metric-label text-[10px] sm:text-xs text-gray-500">현재 DeFi TVL</div>
          </div>
          <div className="metric text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-2 sm:p-4 border-l-4 border-indigo-400">
            <div className="metric-value text-lg sm:text-2xl font-bold text-gray-800 mb-1">
              {stables && stables.length > 0 ? stables.length : '-'}
            </div>
            <div className="metric-label text-[10px] sm:text-xs text-gray-500">추적 스테이블코인 수</div>
          </div>
        </div>
        <div className="chart-container relative h-48 flex-1"><canvas ref={volumeCanvasRef}></canvas></div>
      </div>

      <div className="card bg-white/95 rounded-2xl p-4 sm:p-8 shadow-xl border border-white/20 backdrop-blur h-full flex flex-col">
        <h2 className="flex items-center gap-2 text-base sm:text-xl font-bold text-gray-700 mb-4">
          <span className="inline-block w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm">🏦</span>
          체인별 스테이블코인 분포
        </h2>
        {defiStats?.chainDistribution && defiStats.chainDistribution.length > 0 ? (
          <div className="space-y-3">
            {defiStats.chainDistribution.slice(0, 6).map((chain) => {
              const percent = totalSupply > 0 ? (chain.totalCirculating / totalSupply) * 100 : 0
              return (
                <div key={chain.chain}>
                  <div className="flex justify-between mb-1 text-sm">
                    <span className="text-gray-700">{chain.chain}</span>
                    <span className="text-gray-600">${(chain.totalCirculating / 1e9).toFixed(2)}B ({percent.toFixed(1)}%)</span>
                  </div>
                  <div className="bg-gray-200 h-4 rounded-lg overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-400 to-purple-400 rounded-lg transition-all"
                      style={{ width: `${Math.min(percent, 100)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-gray-500">체인별 분포 데이터 로딩 중...</p>
        )}
      </div>

      <div className="card bg-white/95 rounded-2xl p-4 sm:p-8 shadow-xl border border-white/20 backdrop-blur h-full flex flex-col">
        <h2 className="flex items-center gap-2 text-base sm:text-xl font-bold text-gray-700 mb-4">
          <span className="inline-block w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm">⚠️</span>
          위험/기회 신호
        </h2>
        <div className="space-y-3">
          {signals.map((signal, idx) => {
            const bgClass = signal.type === 'positive'
              ? 'bg-gradient-to-r from-green-100 to-green-200 border-l-4 border-green-400'
              : signal.type === 'warning'
              ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 border-l-4 border-yellow-400'
              : 'bg-gradient-to-r from-red-100 to-red-200 border-l-4 border-red-400'
            const icon = signal.type === 'positive' ? '✅' : signal.type === 'warning' ? '⚠️' : '🚨'
            return (
              <div key={idx} className={`${bgClass} p-4 rounded-lg`}>
                <h3 className="font-bold mb-1">
                  {icon} {signal.title}
                  {signal.value && <span className="ml-2 text-sm font-normal">({signal.value})</span>}
                </h3>
                <p className="text-gray-700 text-sm">{signal.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
