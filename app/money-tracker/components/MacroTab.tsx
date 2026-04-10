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

// CryptoQuant 스타일 상태 배지
function StatusBadge({ type }: { type: 'positive' | 'warning' | 'danger' | 'neutral' }) {
  const cfg = {
    positive: { label: 'Bullish',  cls: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/30' },
    warning:  { label: 'Neutral',  cls: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/30' },
    danger:   { label: 'Bearish',  cls: 'bg-red-400/10 text-red-400 border-red-400/30' },
    neutral:  { label: 'Neutral',  cls: 'bg-gray-400/10 text-gray-400 border-gray-400/30' },
  }[type]
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

// 다크 카드 래퍼
function DarkCard({ title, icon, children, timestamp, className = '' }: {
  title: string; icon: string; children: React.ReactNode; timestamp?: string | null; className?: string
}) {
  return (
    <div className={`bg-[#161b22] border border-[#21262d] rounded-xl p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="flex items-center gap-2 text-sm font-bold text-white">
          <span>{icon}</span> {title}
        </h2>
        {timestamp && <UpdateTimestamp timestamp={timestamp} />}
      </div>
      {children}
    </div>
  )
}

export default function MacroTab({ monetaryData, defiStats, stablecoinData, signals, loading, onRetry }: MacroTabProps) {
  const rateChartRef     = useRef<Chart | null>(null)
  const rateCanvasRef    = useRef<HTMLCanvasElement>(null)
  const btcChartRef      = useRef<Chart | null>(null)
  const btcCanvasRef     = useRef<HTMLCanvasElement>(null)
  const liquidityChartRef = useRef<Chart | null>(null)
  const liquidityCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (rateChartRef.current)      { rateChartRef.current.destroy();      rateChartRef.current = null }
    if (btcChartRef.current)       { btcChartRef.current.destroy();       btcChartRef.current = null }
    if (liquidityChartRef.current) { liquidityChartRef.current.destroy(); liquidityChartRef.current = null }

    const chartDefaults = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#9ca3af', font: { size: 11 } } },
        tooltip: { backgroundColor: '#1c2128', borderColor: '#30363d', borderWidth: 1, titleColor: '#e6edf3', bodyColor: '#8b949e' },
      },
      scales: {
        x: { ticks: { color: '#6b7280', maxTicksLimit: 8 }, grid: { color: '#21262d' } },
        y: { ticks: { color: '#6b7280' }, grid: { color: '#21262d' } },
      },
    }

    // 연준 금리 추이
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
              borderColor: '#f87171',
              backgroundColor: 'rgba(248,113,113,0.08)',
              tension: 0.4,
              fill: true,
              pointRadius: 2,
            }],
          },
          options: {
            ...chartDefaults,
            scales: {
              ...chartDefaults.scales,
              y: { ...chartDefaults.scales.y, title: { display: true, text: '%', color: '#6b7280' } },
            },
          },
        })
      }
    }

    // BTC vs DeFi TVL
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
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245,158,11,0.08)',
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
            borderColor: '#818cf8',
            backgroundColor: 'rgba(129,140,248,0.08)',
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
            plugins: { ...chartDefaults.plugins },
            scales: {
              x:  { ticks: { color: '#6b7280', maxTicksLimit: 8 }, grid: { color: '#21262d' } },
              y:  { type: 'linear', position: 'left',  ticks: { color: '#6b7280' }, grid: { color: '#21262d' }, title: { display: true, text: 'BTC (USD)', color: '#6b7280' } },
              y1: { type: 'linear', position: 'right', ticks: { color: '#6b7280' }, grid: { drawOnChartArea: false }, title: { display: true, text: 'TVL (B$)', color: '#6b7280' } },
            },
          },
        })
      }
    }

    // 글로벌 유동성 차트
    if (liquidityCanvasRef.current && monetaryData?.globalM2History && monetaryData.globalM2History.length > 0) {
      const ctx = liquidityCanvasRef.current.getContext('2d')
      if (ctx) {
        const labels = monetaryData.globalM2History.map(d => {
          const date = new Date(d.date)
          return `${date.getFullYear()}.${date.getMonth() + 1}`
        })
        const m2Data = monetaryData.globalM2History.map(d => d.value / 1e12)
        const totalSupply = stablecoinData?.totalSupply || defiStats?.totalStablecoinSupply || 0
        const stableData = monetaryData.globalM2History.map(() => totalSupply / 1e12)

        liquidityChartRef.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels,
            datasets: [
              {
                label: '글로벌 M2 (조$)',
                data: m2Data,
                borderColor: '#818cf8',
                backgroundColor: 'rgba(129,140,248,0.08)',
                fill: true,
                tension: 0.4,
                pointRadius: 0,
              },
              {
                label: '스테이블코인 (조$)',
                data: stableData,
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245,158,11,0.08)',
                fill: true,
                tension: 0.4,
                pointRadius: 0,
              },
            ],
          },
          options: {
            ...chartDefaults,
            scales: {
              ...chartDefaults.scales,
              y: { ...chartDefaults.scales.y, title: { display: true, text: '조 달러', color: '#6b7280' } },
            },
          },
        })
      }
    }

    return () => {
      if (rateChartRef.current)      rateChartRef.current.destroy()
      if (btcChartRef.current)       btcChartRef.current.destroy()
      if (liquidityChartRef.current) liquidityChartRef.current.destroy()
    }
  }, [monetaryData, defiStats, stablecoinData])

  if (loading && !monetaryData && !defiStats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  const totalSupply  = stablecoinData?.totalSupply || defiStats?.totalStablecoinSupply || 0
  const usM2         = monetaryData?.usM2 || 0
  const globalM2     = monetaryData?.globalM2 || 0
  const globalLiq    = globalM2 + totalSupply
  const penetration  = usM2 > 0 ? (totalSupply / usM2) * 100 : null
  const fedRate      = monetaryData?.fedFundsRate
  const policyStance = fedRate == null ? '-' : fedRate >= 5 ? '긴축적' : fedRate >= 3 ? '중립적' : '완화적'
  const policyColor  = fedRate == null ? 'text-gray-400' : fedRate >= 5 ? 'text-red-400' : fedRate >= 3 ? 'text-yellow-400' : 'text-emerald-400'

  // 매크로 인디케이터 테이블
  const macroIndicators = [
    {
      name: '연준 기준금리',
      value: fedRate != null ? `${fedRate}%` : '-',
      status: fedRate != null ? (fedRate >= 5 ? 'danger' : fedRate >= 3 ? 'warning' : 'positive') : 'neutral' as any,
      description: policyStance + ' 기조',
      source: 'FRED',
    },
    {
      name: '글로벌 M2',
      value: globalM2 > 0 ? `$${(globalM2 / 1e12).toFixed(2)}T` : '-',
      status: (monetaryData?.globalM2History?.length ?? 0) >= 2
        ? ((monetaryData!.globalM2History[monetaryData!.globalM2History.length-1]?.value ?? 0) >
           (monetaryData!.globalM2History[monetaryData!.globalM2History.length-2]?.value ?? 0) ? 'positive' : 'danger')
        : 'neutral' as any,
      description: 'US + EU + JP + UK',
      source: 'WorldBank',
    },
    {
      name: '통합 유동성',
      value: globalLiq > 0 ? `$${(globalLiq / 1e12).toFixed(2)}T` : '-',
      status: 'neutral' as any,
      description: 'M2 + 스테이블코인 합산',
      source: '내부',
    },
    {
      name: 'M2 침투율',
      value: penetration != null ? `${penetration.toFixed(3)}%` : '-',
      status: (penetration ?? 0) > 1 ? 'positive' : 'warning' as any,
      description: '스테이블코인 / 미국 M2',
      source: '내부',
    },
    {
      name: 'DeFi TVL',
      value: defiStats?.currentTvl ? `$${(defiStats.currentTvl / 1e9).toFixed(1)}B` : '-',
      status: 'neutral' as any,
      description: 'DefiLlama 기준',
      source: 'DefiLlama',
    },
    {
      name: 'Gold',
      value: monetaryData?.marketIndices?.gold ? `$${(monetaryData.marketIndices.gold).toLocaleString()}` : '-',
      status: 'neutral' as any,
      description: '안전자산 수요 지표',
      source: '시장',
    },
  ]

  return (
    <div className="space-y-6">

      {/* ── 매크로 인디케이터 테이블 ── */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#21262d]">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span>🔗</span> 거시경제 인디케이터
          </h2>
          <UpdateTimestamp timestamp={monetaryData?.lastUpdated || null} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#21262d]">
                <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">인디케이터</th>
                <th className="text-left px-3 py-3 text-xs text-gray-500 font-medium hidden sm:table-cell">소스</th>
                <th className="text-right px-3 py-3 text-xs text-gray-500 font-medium">현재값</th>
                <th className="text-right px-5 py-3 text-xs text-gray-500 font-medium">상태</th>
              </tr>
            </thead>
            <tbody>
              {macroIndicators.map((ind, idx) => (
                <tr key={idx} className="border-b border-[#21262d]/50 hover:bg-[#21262d]/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-gray-200 text-sm">{ind.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{ind.description}</div>
                  </td>
                  <td className="px-3 py-3.5 hidden sm:table-cell">
                    <span className="text-xs bg-[#21262d] text-gray-400 px-2 py-0.5 rounded-full">{ind.source}</span>
                  </td>
                  <td className="px-3 py-3.5 text-right">
                    <span className="font-mono font-bold text-white">{ind.value}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <StatusBadge type={ind.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 차트 2열 ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* 연준 금리 추이 */}
        <DarkCard title="미국 연준 기준금리 추이" icon="📉" timestamp={monetaryData?.lastUpdated || null}>
          {/* KPI 미니 카드 */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-[#21262d] rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-white">{fedRate != null ? `${fedRate}%` : '-'}</div>
              <div className="text-xs text-gray-400 mt-0.5">현재 금리</div>
            </div>
            <div className="bg-[#21262d] rounded-lg p-3 text-center">
              <div className={`text-xl font-bold ${policyColor}`}>{policyStance}</div>
              <div className="text-xs text-gray-400 mt-0.5">정책 기조</div>
            </div>
          </div>
          <div className="h-44">
            {monetaryData?.fedFundsHistory && monetaryData.fedFundsHistory.length > 0 ? (
              <canvas ref={rateCanvasRef} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                {monetaryData?.hasFredKey ? '데이터 로딩 중...' : 'FRED API 키가 필요합니다'}
              </div>
            )}
          </div>
        </DarkCard>

        {/* BTC vs DeFi TVL */}
        <DarkCard title="BTC 가격 vs DeFi TVL" icon="₿" timestamp={defiStats?.lastUpdated || null}>
          <div className="h-[220px]">
            {defiStats?.btcPriceHistory && defiStats.btcPriceHistory.length > 0 ? (
              <canvas ref={btcCanvasRef} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">데이터 로딩 중...</div>
            )}
          </div>
        </DarkCard>

        {/* 글로벌 유동성 지수 */}
        <DarkCard title="글로벌 유동성 지수 (M2 + 스테이블코인)" icon="🌊" timestamp={monetaryData?.lastUpdated || null}>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: 'M2+스테이블', value: globalLiq > 0 ? `$${(globalLiq/1e12).toFixed(2)}T` : '-', color: 'text-indigo-400' },
              { label: '침투율',      value: penetration != null ? `${penetration.toFixed(3)}%` : '-', color: 'text-cyan-400' },
              { label: 'DeFi TVL',   value: defiStats?.currentTvl ? `$${(defiStats.currentTvl/1e9).toFixed(0)}B` : '-', color: 'text-purple-400' },
            ].map(kpi => (
              <div key={kpi.label} className="bg-[#21262d] rounded-lg p-2.5 text-center">
                <div className={`text-base font-bold ${kpi.color}`}>{kpi.value}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">{kpi.label}</div>
              </div>
            ))}
          </div>
          <div className="h-44">
            {monetaryData?.globalM2History && monetaryData.globalM2History.length > 0 ? (
              <canvas ref={liquidityCanvasRef} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                {monetaryData?.hasFredKey ? '데이터 로딩 중...' : 'FRED API 키 설정 시 유동성 차트 표시'}
              </div>
            )}
          </div>
        </DarkCard>

        {/* 데이터 기반 신호 */}
        <DarkCard title="데이터 기반 자동 신호" icon="🔔">
          <div className="space-y-2.5 overflow-y-auto max-h-72">
            {signals.map((signal, idx) => {
              const cfg = signal.type === 'positive'
                ? { icon: '↑', cls: 'border-emerald-500/30 bg-emerald-500/5', tCls: 'text-emerald-400', label: 'Bullish' }
                : signal.type === 'danger'
                ? { icon: '↓', cls: 'border-red-500/30 bg-red-500/5', tCls: 'text-red-400', label: 'Bearish' }
                : { icon: '→', cls: 'border-yellow-500/30 bg-yellow-500/5', tCls: 'text-yellow-400', label: 'Neutral' }
              return (
                <div key={idx} className={`border rounded-lg p-3 ${cfg.cls}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold ${cfg.tCls}`}>{cfg.icon} {signal.title}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${cfg.tCls} bg-current/10 opacity-80`}>{cfg.label}</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{signal.description}</p>
                  {signal.value && <span className={`text-xs font-mono font-bold ${cfg.tCls} mt-1 block`}>{signal.value}</span>}
                </div>
              )
            })}
          </div>
        </DarkCard>
      </div>

    </div>
  )
}
