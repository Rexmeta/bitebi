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

// 변화율 색상
function changeColor(v: number) {
  return v >= 0 ? 'text-emerald-400' : 'text-red-400'
}
function changePrefix(v: number) {
  return v >= 0 ? '+' : ''
}

export default function MetricsTab({ defiStats, stablecoinData, loading, onRetry }: MetricsTabProps) {
  const tvlChartRef    = useRef<Chart | null>(null)
  const tvlCanvasRef   = useRef<HTMLCanvasElement>(null)
  const supplyChartRef = useRef<Chart | null>(null)
  const supplyCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (tvlChartRef.current)    { tvlChartRef.current.destroy();    tvlChartRef.current = null }
    if (supplyChartRef.current) { supplyChartRef.current.destroy(); supplyChartRef.current = null }

    const tooltipDefaults = {
      backgroundColor: '#1c2128', borderColor: '#30363d', borderWidth: 1,
      titleColor: '#e6edf3', bodyColor: '#8b949e',
    }

    // TVL 라인 차트
    if (tvlCanvasRef.current && defiStats?.tvlHistory && defiStats.tvlHistory.length > 0) {
      const ctx = tvlCanvasRef.current.getContext('2d')
      if (ctx) {
        const monthly = defiStats.tvlHistory.filter((_, i) => i % 7 === 0 || i === defiStats.tvlHistory.length - 1)
        const labels = monthly.map(d => {
          const date = new Date(d.date * 1000)
          return `${date.getFullYear()}.${date.getMonth() + 1}`
        })
        tvlChartRef.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels,
            datasets: [{
              label: 'DeFi TVL (십억 달러)',
              data: monthly.map(d => d.tvl / 1e9),
              borderColor: '#818cf8',
              backgroundColor: 'rgba(129,140,248,0.08)',
              tension: 0.4,
              fill: true,
              pointRadius: 0,
            }],
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { ...tooltipDefaults, callbacks: { label: (c) => `TVL: $${(c.raw as number).toFixed(1)}B` } } },
            scales: {
              y: { beginAtZero: false, ticks: { color: '#6b7280' }, grid: { color: '#21262d' }, title: { display: true, text: 'B$', color: '#6b7280' } },
              x: { ticks: { color: '#6b7280', maxTicksLimit: 8 }, grid: { color: '#21262d' } },
            },
          },
        })
      }
    }

    // 스테이블코인 시가총액 바 차트
    if (supplyCanvasRef.current && defiStats?.stablecoins && defiStats.stablecoins.length > 0) {
      const ctx = supplyCanvasRef.current.getContext('2d')
      if (ctx) {
        const top = defiStats.stablecoins.slice(0, 6)
        const colors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#64748b']
        supplyChartRef.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: top.map(s => s.symbol),
            datasets: [{
              label: '시가총액 (십억$)',
              data: top.map(s => s.marketCap / 1e9),
              backgroundColor: colors,
              borderRadius: 4,
            }],
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { ...tooltipDefaults, callbacks: { label: (c) => `${c.label}: $${(c.raw as number).toFixed(2)}B` } } },
            scales: {
              y: { beginAtZero: true, ticks: { color: '#6b7280' }, grid: { color: '#21262d' } },
              x: { ticks: { color: '#6b7280' }, grid: { color: '#21262d' } },
            },
          },
        })
      }
    }

    return () => {
      if (tvlChartRef.current)    tvlChartRef.current.destroy()
      if (supplyChartRef.current) supplyChartRef.current.destroy()
    }
  }, [defiStats])

  if (loading && !defiStats && !stablecoinData) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  const totalSupply = stablecoinData?.totalSupply || defiStats?.totalStablecoinSupply || 0
  const currentTvl  = defiStats?.currentTvl || 0

  let tvl7dChange: number | null = null
  if (defiStats?.tvlHistory && defiStats.tvlHistory.length >= 7) {
    const recent  = defiStats.tvlHistory[defiStats.tvlHistory.length - 1]?.tvl || 0
    const weekAgo = defiStats.tvlHistory[defiStats.tvlHistory.length - 7]?.tvl || 0
    if (weekAgo > 0) tvl7dChange = ((recent - weekAgo) / weekAgo) * 100
  }

  // 스테이블코인 랭킹 (stablecoinData 우선, 없으면 defiStats)
  const rankedStables = stablecoinData?.stablecoins
    ? stablecoinData.stablecoins.map((s, idx) => ({
        rank: idx + 1,
        symbol: s.symbol,
        name: s.name,
        marketCap: s.market_cap,
        dominance: s.dominance,
        change7d: s.change_7d,
        change30d: s.change_30d,
      }))
    : (defiStats?.stablecoins || []).map((s, idx) => ({
        rank: idx + 1,
        symbol: s.symbol,
        name: s.name,
        marketCap: s.marketCap,
        dominance: 0,
        change7d: s.change7d,
        change30d: s.change30d,
      }))

  return (
    <div className="space-y-6">

      {/* ── KPI 4개 카드 ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: '스테이블 총량', value: totalSupply > 0 ? `$${(totalSupply/1e9).toFixed(0)}B` : '-', sub: `${stablecoinData?.stablecoins?.length || defiStats?.stablecoins?.length || 0}개 추적`, color: 'text-blue-400', dot: 'bg-blue-400' },
          { label: 'DeFi TVL',    value: currentTvl > 0 ? `$${(currentTvl/1e9).toFixed(1)}B` : '-', sub: `7일 ${tvl7dChange != null ? `${tvl7dChange >= 0 ? '+' : ''}${tvl7dChange.toFixed(1)}%` : '-'}`, color: tvl7dChange != null && tvl7dChange >= 0 ? 'text-emerald-400' : 'text-red-400', dot: 'bg-purple-400' },
          { label: 'TVL 목표 달성', value: currentTvl > 0 ? `${((currentTvl/2e11)*100).toFixed(0)}%` : '-', sub: '$200B 대비', color: 'text-cyan-400', dot: 'bg-cyan-400' },
          { label: '시총 목표 달성', value: totalSupply > 0 ? `${((totalSupply/5e11)*100).toFixed(0)}%` : '-', sub: '$500B 대비', color: 'text-violet-400', dot: 'bg-violet-400' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-[#161b22] border border-[#21262d] rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <span className={`w-1.5 h-1.5 rounded-full ${kpi.dot}`} />
              <span className="text-xs text-gray-400">{kpi.label}</span>
            </div>
            <div className={`text-xl sm:text-2xl font-bold ${kpi.color} mb-0.5`}>{kpi.value}</div>
            <div className="text-xs text-gray-500">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* ── 스테이블코인 랭킹 테이블 (CryptoQuant 핵심 UI) ── */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#21262d]">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span>🏆</span> 스테이블코인 랭킹
          </h2>
          <UpdateTimestamp timestamp={stablecoinData?.lastUpdated || defiStats?.lastUpdated || null} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#21262d]">
                <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">#</th>
                <th className="text-left px-3 py-3 text-xs text-gray-500 font-medium">심볼</th>
                <th className="text-right px-3 py-3 text-xs text-gray-500 font-medium">시가총액</th>
                {stablecoinData && <th className="text-right px-3 py-3 text-xs text-gray-500 font-medium hidden sm:table-cell">도미넌스</th>}
                <th className="text-right px-3 py-3 text-xs text-gray-500 font-medium">7일</th>
                <th className="text-right px-5 py-3 text-xs text-gray-500 font-medium hidden md:table-cell">30일</th>
                <th className="text-right px-5 py-3 text-xs text-gray-500 font-medium">상태</th>
              </tr>
            </thead>
            <tbody>
              {rankedStables.slice(0, 10).map((s) => {
                const status = s.change7d > 2 ? 'positive' : s.change7d < -2 ? 'danger' : 'warning'
                return (
                  <tr key={s.symbol} className="border-b border-[#21262d]/50 hover:bg-[#21262d]/40 transition-colors">
                    <td className="px-5 py-3.5 text-gray-500 font-mono text-xs">{s.rank}</td>
                    <td className="px-3 py-3.5">
                      <div className="font-bold text-white">{s.symbol}</div>
                      <div className="text-xs text-gray-500">{s.name}</div>
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono font-bold text-white">
                      ${(s.marketCap / 1e9).toFixed(2)}B
                    </td>
                    {stablecoinData && (
                      <td className="px-3 py-3.5 text-right text-gray-400 hidden sm:table-cell">
                        {s.dominance.toFixed(1)}%
                      </td>
                    )}
                    <td className={`px-3 py-3.5 text-right font-medium ${changeColor(s.change7d)}`}>
                      {changePrefix(s.change7d)}{s.change7d.toFixed(1)}%
                    </td>
                    <td className={`px-5 py-3.5 text-right font-medium hidden md:table-cell ${changeColor(s.change30d)}`}>
                      {changePrefix(s.change30d)}{s.change30d.toFixed(1)}%
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <StatusBadge type={status as any} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 차트 2열 ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <DarkCard title="DeFi TVL 추이" icon="📈" timestamp={defiStats?.lastUpdated || null}>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-[#21262d] rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-white">{currentTvl > 0 ? `$${(currentTvl/1e9).toFixed(1)}B` : '-'}</div>
              <div className="text-xs text-gray-400 mt-0.5">현재 TVL</div>
            </div>
            <div className="bg-[#21262d] rounded-lg p-3 text-center">
              <div className={`text-lg font-bold ${tvl7dChange != null ? (tvl7dChange >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-white'}`}>
                {tvl7dChange != null ? `${tvl7dChange >= 0 ? '+' : ''}${tvl7dChange.toFixed(1)}%` : '-'}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">7일 변화율</div>
            </div>
          </div>
          <div className="h-44">
            <canvas ref={tvlCanvasRef} />
          </div>
        </DarkCard>

        <DarkCard title="스테이블코인 시가총액 비교" icon="💰" timestamp={defiStats?.lastUpdated || null}>
          <div className="h-[220px]">
            <canvas ref={supplyCanvasRef} />
          </div>
        </DarkCard>

      </div>

      {/* ── 임계점 지표 ── */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5">
        <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
          <span>🎯</span> 마켓 임계점 모니터
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              label: '스테이블 시총 $500B',
              current: totalSupply,
              target: 5e11,
              color: 'from-blue-500 to-blue-400',
              borderColor: 'border-blue-400/30',
              textColor: 'text-blue-400',
            },
            {
              label: 'DeFi TVL $200B',
              current: currentTvl,
              target: 2e11,
              color: 'from-purple-500 to-purple-400',
              borderColor: 'border-purple-400/30',
              textColor: 'text-purple-400',
            },
            {
              label: 'TVL $100B 유지',
              current: currentTvl,
              target: 1e11,
              color: 'from-cyan-500 to-cyan-400',
              borderColor: 'border-cyan-400/30',
              textColor: 'text-cyan-400',
            },
          ].map(item => {
            const pct = item.target > 0 ? Math.min((item.current / item.target) * 100, 100) : 0
            return (
              <div key={item.label} className={`bg-[#21262d] border ${item.borderColor} rounded-xl p-4`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400">{item.label}</span>
                  <span className={`text-lg font-bold ${item.textColor}`}>{pct.toFixed(0)}%</span>
                </div>
                <div className="bg-[#161b22] h-2 rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full bg-gradient-to-r ${item.color} rounded-full transition-all duration-700`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500">
                  현재 ${(item.current / 1e9).toFixed(1)}B / 목표 ${(item.target / 1e9).toFixed(0)}B
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
