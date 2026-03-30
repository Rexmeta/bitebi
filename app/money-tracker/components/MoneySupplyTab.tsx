'use client'
import React, { useEffect, useRef } from 'react'
import Chart from 'chart.js/auto'
import type { StablecoinData, MonetaryData, DefiStatsData } from '../hooks/useMoneyTrackerData'
import { SkeletonCard } from './SkeletonCard'
import { UpdateTimestamp } from './UpdateTimestamp'

interface MoneySupplyTabProps {
  stablecoinData: StablecoinData | null
  monetaryData: MonetaryData | null
  defiStats: DefiStatsData | null
  loading: boolean
  onRetry: () => void
}

export default function MoneySupplyTab({ stablecoinData, monetaryData, defiStats, loading, onRetry }: MoneySupplyTabProps) {
  const m2ChartRef = useRef<Chart | null>(null)
  const m2CanvasRef = useRef<HTMLCanvasElement>(null)
  const historyChartRef = useRef<Chart | null>(null)
  const historyCanvasRef = useRef<HTMLCanvasElement>(null)

  const usM2 = monetaryData?.usM2 || null
  const totalSupply = stablecoinData?.totalSupply || defiStats?.totalStablecoinSupply || 0
  const penetration = usM2 && totalSupply > 0 ? (totalSupply / usM2) * 100 : null

  useEffect(() => {
    if (m2ChartRef.current) { m2ChartRef.current.destroy(); m2ChartRef.current = null }
    if (historyChartRef.current) { historyChartRef.current.destroy(); historyChartRef.current = null }

    if (m2CanvasRef.current) {
      const ctx = m2CanvasRef.current.getContext('2d')
      if (ctx) {
        const labels = ['미국 M2']
        const values = [usM2 ? usM2 / 1e12 : 0]

        if (totalSupply > 0) {
          labels.push('스테이블코인')
          values.push(totalSupply / 1e12)
        }

        m2ChartRef.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels,
            datasets: [{
              label: '통화량 (조 달러)',
              data: values,
              backgroundColor: ['#667eea', '#ed8936'],
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, title: { display: true, text: '조 달러' } } },
            plugins: {
              legend: { display: false },
              tooltip: { callbacks: { label: (c) => `$${(c.raw as number).toFixed(3)}T` } },
            },
          },
        })
      }
    }

    if (historyCanvasRef.current && monetaryData?.usM2History && monetaryData.usM2History.length > 0) {
      const ctx = historyCanvasRef.current.getContext('2d')
      if (ctx) {
        const labels = monetaryData.usM2History.map(d => {
          const date = new Date(d.date)
          return `${date.getFullYear()}.${date.getMonth() + 1}`
        })
        const data = monetaryData.usM2History.map(d => d.value / 1e12)

        historyChartRef.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels,
            datasets: [{
              label: '미국 M2 (조 달러)',
              data,
              borderColor: '#667eea',
              backgroundColor: 'rgba(102, 126, 234, 0.1)',
              tension: 0.4,
              fill: true,
              pointRadius: 2,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: { title: { display: true, text: '조 달러' } },
              x: { ticks: { maxTicksLimit: 8 } },
            },
            plugins: { tooltip: { callbacks: { label: (c) => `M2: $${(c.raw as number).toFixed(2)}T` } } },
          },
        })
      }
    }

    return () => {
      if (m2ChartRef.current) m2ChartRef.current.destroy()
      if (historyChartRef.current) historyChartRef.current.destroy()
    }
  }, [monetaryData, stablecoinData, defiStats, usM2, totalSupply])

  if (loading && !monetaryData && !stablecoinData) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-8">
        <SkeletonCard /><SkeletonCard /><SkeletonCard />
        <SkeletonCard /><SkeletonCard /><SkeletonCard />
      </div>
    )
  }

  return (
    <div className="dashboard-grid grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-8">
      <div className="card bg-white/95 rounded-2xl p-8 shadow-xl border border-white/20 backdrop-blur text-gray-700">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-700 mb-1">
          <span className="inline-block w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">🏛️</span>
          미국 M2 통화량
        </h2>
        <UpdateTimestamp timestamp={monetaryData?.lastUpdated || null} />
        <div className="metric-grid grid grid-cols-2 gap-4 mb-4 mt-4">
          <div className="metric text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4 border-l-4 border-indigo-400">
            <div className="metric-value text-2xl font-bold text-gray-800 mb-1">
              {usM2 ? `$${(usM2 / 1e12).toFixed(2)}T` : '-'}
            </div>
            <div className="metric-label text-xs text-gray-500">미국 M2</div>
          </div>
          <div className="metric text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4 border-l-4 border-indigo-400">
            <div className="metric-value text-2xl font-bold text-gray-800 mb-1">
              {totalSupply > 0 ? `$${(totalSupply / 1e9).toFixed(1)}B` : '-'}
            </div>
            <div className="metric-label text-xs text-gray-500">스테이블코인 총량</div>
          </div>
        </div>
        {!monetaryData?.hasFredKey && (
          <div className="text-xs text-amber-600 bg-amber-50 rounded p-2 mb-3">
            FRED API 키가 설정되지 않았습니다. 환경변수 FRED_API_KEY를 설정하면 실시간 미국 M2 데이터를 표시합니다.
          </div>
        )}
        <div className="chart-container relative h-48"><canvas ref={m2CanvasRef}></canvas></div>
      </div>

      <div className="card bg-white/95 rounded-2xl p-8 shadow-xl border border-white/20 backdrop-blur text-gray-700">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-700 mb-1">
          <span className="inline-block w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">📊</span>
          M2 통화량 추이
        </h2>
        <UpdateTimestamp timestamp={monetaryData?.lastUpdated || null} />
        <div className="chart-container relative h-64 mt-4">
          {monetaryData?.usM2History && monetaryData.usM2History.length > 0 ? (
            <canvas ref={historyCanvasRef}></canvas>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              {monetaryData?.hasFredKey ? '데이터 로딩 중...' : 'FRED API 키 필요'}
            </div>
          )}
        </div>
      </div>

      <div className="card bg-white/95 rounded-2xl p-8 shadow-xl border border-white/20 backdrop-blur text-gray-700">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-700 mb-4">
          <span className="inline-block w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">⚖️</span>
          M2 대비 스테이블코인 침투율
        </h2>
        <div className="flex justify-center my-6">
          <div
            style={{
              width: 200, height: 200, borderRadius: '50%',
              background: `conic-gradient(#667eea 0deg, #667eea ${(penetration || 0) * 3.6}deg, #e2e8f0 ${(penetration || 0) * 3.6}deg, #e2e8f0 360deg)`,
              position: 'relative',
            }}
          >
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              background: 'white', width: 120, height: 120, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4a5568' }}>
                {penetration !== null ? `${penetration.toFixed(2)}%` : '-'}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#718096' }}>침투율</div>
            </div>
          </div>
        </div>
        <div className="space-y-2 mt-4">
          <div className="bg-gradient-to-r from-green-100 to-green-200 border-l-4 border-green-400 p-3 rounded-lg">
            <p className="text-sm text-gray-700"><strong>1% 돌파:</strong> 시스템적 중요성 확보</p>
          </div>
          <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 border-l-4 border-yellow-400 p-3 rounded-lg">
            <p className="text-sm text-gray-700"><strong>3% 돌파:</strong> 통화정책 영향 시작</p>
          </div>
          <div className="bg-gradient-to-r from-red-100 to-red-200 border-l-4 border-red-400 p-3 rounded-lg">
            <p className="text-sm text-gray-700"><strong>5% 돌파:</strong> 기축통화 역할 본격화</p>
          </div>
        </div>
      </div>

      <div className="card bg-white/95 rounded-2xl p-8 shadow-xl border border-white/20 backdrop-blur text-gray-700">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-700 mb-4">
          <span className="inline-block w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">🌍</span>
          체인별 스테이블코인 분포
        </h2>
        {defiStats?.chainDistribution && defiStats.chainDistribution.length > 0 ? (
          <div className="space-y-3">
            {defiStats.chainDistribution.map((chain) => {
              const percent = totalSupply > 0 ? (chain.totalCirculating / totalSupply) * 100 : 0
              return (
                <div key={chain.chain}>
                  <div className="flex justify-between mb-1 text-sm">
                    <span className="text-gray-700">{chain.chain}</span>
                    <span className="text-gray-600">${(chain.totalCirculating / 1e9).toFixed(2)}B ({percent.toFixed(1)}%)</span>
                  </div>
                  <div className="bg-gray-200 h-4 rounded-lg overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-400 to-purple-400 rounded-lg" style={{ width: `${Math.min(percent, 100)}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-center">데이터 로딩 중...</p>
        )}
      </div>

      <div className="card bg-white/95 rounded-2xl p-8 shadow-xl border border-white/20 backdrop-blur text-gray-700">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-700 mb-4">
          <span className="inline-block w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">💱</span>
          스테이블코인 시장 점유율
        </h2>
        <UpdateTimestamp timestamp={stablecoinData?.lastUpdated || defiStats?.lastUpdated || null} />
        {stablecoinData?.stablecoins && stablecoinData.stablecoins.length > 0 ? (
          <div className="space-y-2 mt-3">
            {stablecoinData.stablecoins.slice(0, 8).map((s) => (
              <div key={s.symbol} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg p-2">
                <span className="font-medium text-gray-700">{s.symbol}</span>
                <span className="text-gray-600">${(s.market_cap / 1e9).toFixed(2)}B</span>
                <span className="text-gray-500">{s.dominance.toFixed(1)}%</span>
                <span className={s.change_7d >= 0 ? 'text-green-600' : 'text-red-500'}>
                  {s.change_7d >= 0 ? '+' : ''}{s.change_7d.toFixed(1)}% (7d)
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center mt-4">데이터 로딩 중...</p>
        )}
      </div>

      <div className="card bg-white/95 rounded-2xl p-8 shadow-xl border border-white/20 backdrop-blur text-gray-700">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-700 mb-4">
          <span className="inline-block w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">🔄</span>
          유동성 순환 분석
        </h2>
        <div className="alert-system bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-400 p-4 rounded-lg mb-4">
          <h3 className="font-bold mb-1 text-blue-900">분석 포인트</h3>
          <p className="text-sm text-gray-700">
            {penetration !== null
              ? `스테이블코인이 미국 M2의 ${penetration.toFixed(2)}%를 차지하며, ${penetration < 1 ? '1% 돌파 시 시스템적 중요성 확보 예상' : '시스템적 중요성을 확보한 수준'}`
              : '데이터를 로딩하면 침투율 분석을 표시합니다'}
          </p>
        </div>
        <div className="metric-grid grid grid-cols-2 gap-4">
          <div className="metric text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4 border-l-4 border-indigo-400">
            <div className="metric-value text-2xl font-bold text-gray-800 mb-1">
              {penetration !== null ? `${penetration.toFixed(2)}%` : '-'}
            </div>
            <div className="metric-label text-xs text-gray-500">미국 M2 대비 침투율</div>
          </div>
          <div className="metric text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-4 border-l-4 border-indigo-400">
            <div className="metric-value text-2xl font-bold text-gray-800 mb-1">
              {defiStats?.currentTvl ? `$${(defiStats.currentTvl / 1e9).toFixed(1)}B` : '-'}
            </div>
            <div className="metric-label text-xs text-gray-500">DeFi TVL</div>
          </div>
        </div>
      </div>
    </div>
  )
}
