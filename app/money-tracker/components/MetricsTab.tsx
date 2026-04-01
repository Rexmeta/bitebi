'use client'
import React, { useEffect, useRef } from 'react'
import Chart from 'chart.js/auto'
import type { DefiStatsData, StablecoinData } from '../hooks/useMoneyTrackerData'
import { SkeletonCard } from './SkeletonCard'
import { UpdateTimestamp } from './UpdateTimestamp'

interface MetricsTabProps {
  defiStats: DefiStatsData | null
  stablecoinData: StablecoinData | null
  loading: boolean
  onRetry: () => void
}

export default function MetricsTab({ defiStats, stablecoinData, loading, onRetry }: MetricsTabProps) {
  const tvlChartRef = useRef<Chart | null>(null)
  const tvlCanvasRef = useRef<HTMLCanvasElement>(null)
  const supplyChartRef = useRef<Chart | null>(null)
  const supplyCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (tvlChartRef.current) { tvlChartRef.current.destroy(); tvlChartRef.current = null }
    if (supplyChartRef.current) { supplyChartRef.current.destroy(); supplyChartRef.current = null }

    if (tvlCanvasRef.current && defiStats?.tvlHistory && defiStats.tvlHistory.length > 0) {
      const ctx = tvlCanvasRef.current.getContext('2d')
      if (ctx) {
        const monthly = defiStats.tvlHistory.filter((_, i) => i % 7 === 0 || i === defiStats.tvlHistory.length - 1)
        const labels = monthly.map(d => {
          const date = new Date(d.date * 1000)
          return `${date.getFullYear()}.${date.getMonth() + 1}`
        })
        const data = monthly.map(d => d.tvl / 1e9)

        tvlChartRef.current = new Chart(ctx, {
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
            scales: {
              y: { beginAtZero: false, title: { display: true, text: '십억 달러' } },
              x: { ticks: { maxTicksLimit: 8 } },
            },
            plugins: { tooltip: { callbacks: { label: (c) => `TVL: $${(c.raw as number).toFixed(1)}B` } } },
          },
        })
      }
    }

    if (supplyCanvasRef.current && defiStats?.stablecoins && defiStats.stablecoins.length > 0) {
      const ctx = supplyCanvasRef.current.getContext('2d')
      if (ctx) {
        const top = defiStats.stablecoins.slice(0, 6)
        supplyChartRef.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: top.map(s => s.symbol),
            datasets: [{
              label: '시가총액 (십억 달러)',
              data: top.map(s => s.marketCap / 1e9),
              backgroundColor: ['#667eea', '#764ba2', '#f093fb', '#48bb78', '#ed8936', '#e2e8f0'],
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, title: { display: true, text: '십억 달러' } } },
            plugins: {
              legend: { display: false },
              tooltip: { callbacks: { label: (c) => `${c.label}: $${(c.raw as number).toFixed(2)}B` } },
            },
          },
        })
      }
    }

    return () => {
      if (tvlChartRef.current) tvlChartRef.current.destroy()
      if (supplyChartRef.current) supplyChartRef.current.destroy()
    }
  }, [defiStats])

  if (loading && !defiStats && !stablecoinData) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-8">
        <SkeletonCard /><SkeletonCard /><SkeletonCard />
        <SkeletonCard className="md:col-span-2 xl:col-span-3" />
      </div>
    )
  }

  const totalSupply = stablecoinData?.totalSupply || defiStats?.totalStablecoinSupply || 0
  const currentTvl = defiStats?.currentTvl || 0

  let tvl7dChange: number | null = null
  if (defiStats?.tvlHistory && defiStats.tvlHistory.length >= 7) {
    const recent = defiStats.tvlHistory[defiStats.tvlHistory.length - 1]?.tvl || 0
    const weekAgo = defiStats.tvlHistory[defiStats.tvlHistory.length - 7]?.tvl || 0
    if (weekAgo > 0) tvl7dChange = ((recent - weekAgo) / weekAgo) * 100
  }

  return (
    <div className="dashboard-grid grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-8 mb-8">
      <div className="card bg-white/95 rounded-2xl p-4 sm:p-8 shadow-xl border border-white/20 backdrop-blur text-gray-700">
        <h2 className="flex items-center gap-2 text-base sm:text-xl font-bold text-gray-700 mb-1">
          <span className="inline-block w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm">📈</span>
          DeFi TVL 추이
        </h2>
        <UpdateTimestamp timestamp={defiStats?.lastUpdated || null} />
        <div className="metric-grid grid grid-cols-2 gap-2 sm:gap-4 mb-4 mt-4">
          <div className="metric text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-2 sm:p-4 border-l-4 border-indigo-400">
            <div className="metric-value text-lg sm:text-2xl font-bold text-gray-800 mb-1">
              {currentTvl > 0 ? `$${(currentTvl / 1e9).toFixed(1)}B` : '-'}
            </div>
            <div className="metric-label text-[10px] sm:text-xs text-gray-500">현재 TVL</div>
          </div>
          <div className="metric text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-2 sm:p-4 border-l-4 border-indigo-400">
            <div className={`metric-value text-lg sm:text-2xl font-bold mb-1 ${tvl7dChange !== null ? (tvl7dChange >= 0 ? 'text-green-600' : 'text-red-500') : 'text-gray-800'}`}>
              {tvl7dChange !== null ? `${tvl7dChange >= 0 ? '+' : ''}${tvl7dChange.toFixed(1)}%` : '-'}
            </div>
            <div className="metric-label text-[10px] sm:text-xs text-gray-500">7일 변화율</div>
          </div>
        </div>
        <div className="chart-container relative h-48"><canvas ref={tvlCanvasRef}></canvas></div>
      </div>

      <div className="card bg-white/95 rounded-2xl p-4 sm:p-8 shadow-xl border border-white/20 backdrop-blur text-gray-700">
        <h2 className="flex items-center gap-2 text-base sm:text-xl font-bold text-gray-700 mb-1">
          <span className="inline-block w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm">💰</span>
          스테이블코인 시가총액
        </h2>
        <UpdateTimestamp timestamp={defiStats?.lastUpdated || null} />
        <div className="chart-container relative h-48 mt-4"><canvas ref={supplyCanvasRef}></canvas></div>
      </div>

      <div className="card bg-white/95 rounded-2xl p-4 sm:p-8 shadow-xl border border-white/20 backdrop-blur text-gray-700">
        <h2 className="flex items-center gap-2 text-base sm:text-xl font-bold text-gray-700 mb-4">
          <span className="inline-block w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm">📊</span>
          스테이블코인 변화율
        </h2>
        {defiStats?.stablecoins && defiStats.stablecoins.length > 0 ? (
          <div className="space-y-3">
            {defiStats.stablecoins.slice(0, 6).map((s) => (
              <div key={s.symbol}>
                <div className="flex justify-between mb-1 text-sm">
                  <span className="text-gray-700 font-medium">{s.symbol}</span>
                  <div className="flex gap-3">
                    <span className={s.change7d >= 0 ? 'text-green-600' : 'text-red-500'}>
                      7d: {s.change7d >= 0 ? '+' : ''}{s.change7d.toFixed(1)}%
                    </span>
                    <span className={s.change30d >= 0 ? 'text-green-600' : 'text-red-500'}>
                      30d: {s.change30d >= 0 ? '+' : ''}{s.change30d.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="bg-gray-200 h-3 rounded-lg overflow-hidden">
                  <div
                    className={`h-full rounded-lg ${s.change30d >= 0 ? 'bg-gradient-to-r from-green-400 to-green-200' : 'bg-gradient-to-r from-red-400 to-red-200'}`}
                    style={{ width: `${Math.min(Math.abs(s.change30d) * 2, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center">데이터 로딩 중...</p>
        )}
      </div>

      <div className="card bg-white/95 rounded-2xl p-4 sm:p-8 shadow-xl border border-white/20 backdrop-blur col-span-1 md:col-span-2 xl:col-span-3 text-gray-700">
        <h2 className="flex items-center gap-2 text-base sm:text-xl font-bold text-gray-700 mb-4">
          <span className="inline-block w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm">🎯</span>
          임계점 지표
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-l-4 border-yellow-400 p-4 rounded-lg">
            <h3 className="font-bold mb-2">시가총액 $500B</h3>
            <div className="text-2xl font-bold text-gray-800 mb-1">
              {totalSupply > 0 ? `${((totalSupply / 5e11) * 100).toFixed(0)}%` : '-'}
            </div>
            <div className="bg-gray-200 h-3 rounded-lg overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-400 to-purple-400 rounded-lg" style={{ width: `${Math.min((totalSupply / 5e11) * 100, 100)}%` }} />
            </div>
            <p className="text-xs text-gray-500 mt-1">현재 ${(totalSupply / 1e9).toFixed(1)}B</p>
          </div>
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-400 p-4 rounded-lg">
            <h3 className="font-bold mb-2">DeFi TVL $200B</h3>
            <div className="text-2xl font-bold text-gray-800 mb-1">
              {currentTvl > 0 ? `${((currentTvl / 2e11) * 100).toFixed(0)}%` : '-'}
            </div>
            <div className="bg-gray-200 h-3 rounded-lg overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-400 to-blue-200 rounded-lg" style={{ width: `${Math.min((currentTvl / 2e11) * 100, 100)}%` }} />
            </div>
            <p className="text-xs text-gray-500 mt-1">현재 ${(currentTvl / 1e9).toFixed(1)}B</p>
          </div>
          <div className="bg-gradient-to-r from-green-50 to-green-100 border-l-4 border-green-400 p-4 rounded-lg">
            <h3 className="font-bold mb-2">스테이블코인 수</h3>
            <div className="text-2xl font-bold text-gray-800 mb-1">
              {defiStats?.stablecoins ? defiStats.stablecoins.length : '-'}
            </div>
            <p className="text-xs text-gray-500 mt-1">주요 USD 페깅 스테이블코인</p>
          </div>
        </div>
      </div>
    </div>
  )
}
