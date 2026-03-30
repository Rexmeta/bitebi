'use client'
import React, { useEffect, useRef } from 'react'
import Chart from 'chart.js/auto'
import type { MonetaryData, DefiStatsData, StablecoinData, Signal } from '../hooks/useMoneyTrackerData'
import { SkeletonCard } from './SkeletonCard'
import { UpdateTimestamp } from './UpdateTimestamp'

interface MacroTabProps {
  monetaryData: MonetaryData | null
  defiStats: DefiStatsData | null
  stablecoinData: StablecoinData | null
  signals: Signal[]
  loading: boolean
  onRetry: () => void
}

export default function MacroTab({ monetaryData, defiStats, stablecoinData, signals, loading, onRetry }: MacroTabProps) {
  const rateChartRef = useRef<Chart | null>(null)
  const rateCanvasRef = useRef<HTMLCanvasElement>(null)
  const btcChartRef = useRef<Chart | null>(null)
  const btcCanvasRef = useRef<HTMLCanvasElement>(null)
  const liquidityChartRef = useRef<Chart | null>(null)
  const liquidityCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (rateChartRef.current) { rateChartRef.current.destroy(); rateChartRef.current = null }
    if (btcChartRef.current) { btcChartRef.current.destroy(); btcChartRef.current = null }
    if (liquidityChartRef.current) { liquidityChartRef.current.destroy(); liquidityChartRef.current = null }

    if (rateCanvasRef.current && monetaryData?.fedFundsHistory && monetaryData.fedFundsHistory.length > 0) {
      const ctx = rateCanvasRef.current.getContext('2d')
      if (ctx) {
        const labels = monetaryData.fedFundsHistory.map(d => {
          const date = new Date(d.date)
          return `${date.getFullYear()}.${date.getMonth() + 1}`
        })
        rateChartRef.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels,
            datasets: [{
              label: 'Federal Funds Rate (%)',
              data: monetaryData.fedFundsHistory.map(d => d.value),
              borderColor: '#e53e3e',
              backgroundColor: 'rgba(229, 62, 62, 0.1)',
              tension: 0.4,
              fill: true,
              pointRadius: 2,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: { title: { display: true, text: '%' } },
              x: { ticks: { maxTicksLimit: 8 } },
            },
          },
        })
      }
    }

    if (btcCanvasRef.current && defiStats?.btcPriceHistory && defiStats.btcPriceHistory.length > 0) {
      const ctx = btcCanvasRef.current.getContext('2d')
      if (ctx) {
        const sampled = defiStats.btcPriceHistory.filter((_, i) => i % 7 === 0 || i === defiStats.btcPriceHistory.length - 1)
        const labels = sampled.map(d => {
          const date = new Date(d.date)
          return `${date.getMonth() + 1}/${date.getDate()}`
        })

        const datasets: any[] = [{
          label: 'BTC 가격 (USD)',
          data: sampled.map(d => d.price),
          borderColor: '#ed8936',
          backgroundColor: 'rgba(237, 137, 54, 0.1)',
          tension: 0.4,
          fill: false,
          pointRadius: 0,
          yAxisID: 'y',
        }]

        if (defiStats?.tvlHistory && defiStats.tvlHistory.length > 0) {
          const tvlSampled = defiStats.tvlHistory.filter((_, i) => i % 7 === 0 || i === defiStats.tvlHistory.length - 1)
          const minLen = Math.min(sampled.length, tvlSampled.length)
          datasets.push({
            label: 'DeFi TVL (십억$)',
            data: tvlSampled.slice(-minLen).map(d => d.tvl / 1e9),
            borderColor: '#667eea',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            tension: 0.4,
            fill: false,
            pointRadius: 0,
            yAxisID: 'y1',
          })
        }

        btcChartRef.current = new Chart(ctx, {
          type: 'line',
          data: { labels, datasets },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
              y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'BTC (USD)' } },
              y1: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'TVL (B$)' }, grid: { drawOnChartArea: false } },
              x: { ticks: { maxTicksLimit: 8 } },
            },
          },
        })
      }
    }

    if (liquidityCanvasRef.current && monetaryData?.usM2History && monetaryData.usM2History.length > 0) {
      const ctx = liquidityCanvasRef.current.getContext('2d')
      if (ctx) {
        const totalSupply = stablecoinData?.totalSupply || defiStats?.totalStablecoinSupply || 0
        const labels = monetaryData.usM2History.map(d => {
          const date = new Date(d.date)
          return `${date.getFullYear()}.${date.getMonth() + 1}`
        })
        const m2Data = monetaryData.usM2History.map(d => d.value / 1e12)
        const stableData = monetaryData.usM2History.map(() => totalSupply / 1e12)

        liquidityChartRef.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels,
            datasets: [
              {
                label: '미국 M2 (조$)',
                data: m2Data,
                backgroundColor: 'rgba(102, 126, 234, 0.7)',
              },
              {
                label: '스테이블코인 (조$)',
                data: stableData,
                backgroundColor: 'rgba(237, 137, 54, 0.7)',
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: { stacked: true, title: { display: true, text: '조 달러' } },
              x: { stacked: true, ticks: { maxTicksLimit: 8 } },
            },
          },
        })
      }
    }

    return () => {
      if (rateChartRef.current) rateChartRef.current.destroy()
      if (btcChartRef.current) btcChartRef.current.destroy()
      if (liquidityChartRef.current) liquidityChartRef.current.destroy()
    }
  }, [monetaryData, defiStats, stablecoinData])

  if (loading && !monetaryData && !defiStats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
      </div>
    )
  }

  const totalSupply = stablecoinData?.totalSupply || defiStats?.totalStablecoinSupply || 0
  const usM2 = monetaryData?.usM2 || 0
  const globalLiquidity = usM2 + totalSupply
  const penetration = usM2 > 0 ? (totalSupply / usM2) * 100 : null

  return (
    <div className="dashboard-grid grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
      <div className="card bg-white/95 rounded-2xl p-8 shadow-xl border border-white/20 backdrop-blur text-gray-700">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-700 mb-1">
          <span className="inline-block w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center text-white">📉</span>
          미국 금리 추이 (Federal Funds Rate)
        </h2>
        <UpdateTimestamp timestamp={monetaryData?.lastUpdated || null} />
        <div className="metric-grid grid grid-cols-2 gap-4 mb-4 mt-4">
          <div className="metric text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4 border-l-4 border-red-400">
            <div className="metric-value text-2xl font-bold text-gray-800 mb-1">
              {monetaryData?.fedFundsRate !== null && monetaryData?.fedFundsRate !== undefined ? `${monetaryData.fedFundsRate}%` : '-'}
            </div>
            <div className="metric-label text-xs text-gray-500">현재 금리</div>
          </div>
          <div className="metric text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4 border-l-4 border-red-400">
            <div className="metric-value text-2xl font-bold text-gray-800 mb-1">
              {monetaryData?.fedFundsRate !== null && monetaryData?.fedFundsRate !== undefined
                ? (monetaryData.fedFundsRate >= 5 ? '긴축적' : monetaryData.fedFundsRate >= 3 ? '중립적' : '완화적')
                : '-'}
            </div>
            <div className="metric-label text-xs text-gray-500">정책 기조</div>
          </div>
        </div>
        <div className="chart-container relative h-48">
          {monetaryData?.fedFundsHistory && monetaryData.fedFundsHistory.length > 0 ? (
            <canvas ref={rateCanvasRef}></canvas>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              {monetaryData?.hasFredKey ? '데이터 로딩 중...' : 'FRED API 키 필요'}
            </div>
          )}
        </div>
      </div>

      <div className="card bg-white/95 rounded-2xl p-8 shadow-xl border border-white/20 backdrop-blur text-gray-700">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-700 mb-1">
          <span className="inline-block w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center text-white">₿</span>
          BTC vs DeFi TVL 상관관계
        </h2>
        <UpdateTimestamp timestamp={defiStats?.lastUpdated || null} />
        <div className="chart-container relative h-64 mt-4">
          {defiStats?.btcPriceHistory && defiStats.btcPriceHistory.length > 0 ? (
            <canvas ref={btcCanvasRef}></canvas>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">데이터 로딩 중...</div>
          )}
        </div>
      </div>

      <div className="card bg-white/95 rounded-2xl p-8 shadow-xl border border-white/20 backdrop-blur text-gray-700">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-700 mb-1">
          <span className="inline-block w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">🌊</span>
          글로벌 유동성 지수
        </h2>
        <UpdateTimestamp timestamp={monetaryData?.lastUpdated || null} />
        <div className="metric-grid grid grid-cols-3 gap-4 mb-4 mt-4">
          <div className="metric text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4 border-l-4 border-indigo-400">
            <div className="metric-value text-xl font-bold text-gray-800 mb-1">
              {globalLiquidity > 0 ? `$${(globalLiquidity / 1e12).toFixed(2)}T` : '-'}
            </div>
            <div className="metric-label text-xs text-gray-500">M2+스테이블 합산</div>
          </div>
          <div className="metric text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4 border-l-4 border-indigo-400">
            <div className="metric-value text-xl font-bold text-gray-800 mb-1">
              {penetration !== null ? `${penetration.toFixed(3)}%` : '-'}
            </div>
            <div className="metric-label text-xs text-gray-500">침투율</div>
          </div>
          <div className="metric text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4 border-l-4 border-indigo-400">
            <div className="metric-value text-xl font-bold text-gray-800 mb-1">
              {defiStats?.currentTvl ? `$${(defiStats.currentTvl / 1e9).toFixed(0)}B` : '-'}
            </div>
            <div className="metric-label text-xs text-gray-500">DeFi TVL</div>
          </div>
        </div>
        <div className="chart-container relative h-48">
          {monetaryData?.usM2History && monetaryData.usM2History.length > 0 ? (
            <canvas ref={liquidityCanvasRef}></canvas>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              {monetaryData?.hasFredKey ? '데이터 로딩 중...' : 'FRED API 키 설정 시 유동성 차트 표시'}
            </div>
          )}
        </div>
      </div>

      <div className="card bg-white/95 rounded-2xl p-8 shadow-xl border border-white/20 backdrop-blur text-gray-700">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-700 mb-4">
          <span className="inline-block w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">🔔</span>
          데이터 기반 자동 신호
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
                <h3 className="font-bold mb-1 text-sm">
                  {icon} {signal.title}
                  {signal.value && <span className="ml-2 font-normal text-xs">({signal.value})</span>}
                </h3>
                <p className="text-gray-700 text-xs">{signal.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
