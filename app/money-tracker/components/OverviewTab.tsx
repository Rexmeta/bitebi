'use client'
import React, { useEffect, useRef } from 'react'
import Chart from 'chart.js/auto'
import type { StablecoinData, DefiStatsData, Signal, MonetaryData, FetchStatus } from '../hooks/useMoneyTrackerData'
import { SkeletonCard } from './SkeletonCard'
import { UpdateTimestamp } from './UpdateTimestamp'

interface OverviewTabProps {
  stablecoinData: StablecoinData | null
  monetaryData: MonetaryData | null
  defiStats: DefiStatsData | null
  loading: boolean
  signals: Signal[]
  onRetry: () => void
  monetaryStatus?: FetchStatus
  monetaryError?: string | null
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

// 카드 래퍼 (CryptoQuant 다크 스타일)
function DarkCard({ title, icon, children, timestamp, className = '' }: {
  title: string; icon: string; children: React.ReactNode; timestamp?: string | null; className?: string
}) {
  return (
    <div className={`bg-[#161b22] border border-[#21262d] rounded-xl p-4 sm:p-6 ${className}`}>
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

export default function OverviewTab({ stablecoinData, monetaryData, defiStats, loading, signals, onRetry, monetaryStatus, monetaryError }: OverviewTabProps) {
  const marketCanvasRef = useRef<HTMLCanvasElement>(null)
  const marketChartRef  = useRef<Chart | null>(null)
  const tvlCanvasRef    = useRef<HTMLCanvasElement>(null)
  const tvlChartRef     = useRef<Chart | null>(null)

  useEffect(() => {
    if (marketChartRef.current) { marketChartRef.current.destroy(); marketChartRef.current = null }
    if (tvlChartRef.current)    { tvlChartRef.current.destroy();    tvlChartRef.current = null }

    // 스테이블코인 도넛 차트
    const stables = stablecoinData?.stablecoins || defiStats?.stablecoins
    if (marketCanvasRef.current && stables && stables.length > 0) {
      const ctx = marketCanvasRef.current.getContext('2d')
      if (ctx) {
        const top5 = stables.slice(0, 5)
        const otherMcap = stables.slice(5).reduce((sum, s) => sum + (('marketCap' in s ? s.marketCap : (s as any).market_cap) || 0), 0)
        const labels = [...top5.map(s => s.symbol || s.name), '기타']
        const data   = [...top5.map(s => 'marketCap' in s ? s.marketCap : (s as any).market_cap || 0), otherMcap]
        const colors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#374151']
        marketChartRef.current = new Chart(ctx, {
          type: 'doughnut',
          data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0 }] },
          options: {
            plugins: {
              legend: { position: 'right', labels: { color: '#9ca3af', font: { size: 11 }, padding: 8 } },
              tooltip: { callbacks: { label: (c) => `${c.label}: $${((c.raw as number) / 1e9).toFixed(2)}B` } },
            },
            responsive: true, maintainAspectRatio: false,
          },
        })
      }
    }

    // DeFi TVL 라인 차트
    if (tvlCanvasRef.current && defiStats?.tvlHistory && defiStats.tvlHistory.length > 0) {
      const ctx = tvlCanvasRef.current.getContext('2d')
      if (ctx) {
        const recent = defiStats.tvlHistory.slice(-30)
        const labels = recent.map(d => {
          const date = new Date(d.date * 1000)
          return `${date.getMonth() + 1}/${date.getDate()}`
        })
        tvlChartRef.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels,
            datasets: [{
              label: 'DeFi TVL (B$)',
              data: recent.map(d => d.tvl / 1e9),
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59,130,246,0.08)',
              tension: 0.4, fill: true, pointRadius: 0,
            }],
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
              y: { beginAtZero: false, ticks: { color: '#6b7280' }, grid: { color: '#21262d' } },
              x: { display: true, ticks: { color: '#6b7280', maxTicksLimit: 7 }, grid: { color: '#21262d' } },
            },
            plugins: {
              legend: { display: false },
              tooltip: { callbacks: { label: (c) => `TVL: $${(c.raw as number).toFixed(1)}B` } },
            },
          },
        })
      }
    }

    return () => {
      if (marketChartRef.current) marketChartRef.current.destroy()
      if (tvlChartRef.current)    tvlChartRef.current.destroy()
    }
  }, [stablecoinData, defiStats])

  // Show skeleton only on the very first load (no data anywhere yet) AND
  // we are still loading. Once any source has returned, prefer rendering
  // partial KPIs over an indefinite skeleton — even if monetary failed.
  if (loading && !stablecoinData && !defiStats && !monetaryData) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  const stables    = stablecoinData?.stablecoins
  const totalSupply = stablecoinData?.totalSupply || defiStats?.totalStablecoinSupply || 0
  const globalM2   = monetaryData?.globalM2 || 0
  const globalLiq  = globalM2 + totalSupply
  const globalM2Estimated = !!monetaryData?.globalM2Estimated
  const globalM2MissingRegions = monetaryData?.globalM2MissingRegions || []
  const monetaryLoading = monetaryStatus === 'loading' && !monetaryData
  const monetaryFailed  = monetaryStatus === 'error' && !monetaryData
  const monetaryStale   = monetaryStatus === 'error' && !!monetaryData
  const topStable  = stables?.[0]
  const usdtDom    = topStable?.dominance?.toFixed(1) || null
  const penetration = globalM2 > 0 ? ((totalSupply / globalM2) * 100).toFixed(3) : null
  const currentTvl = defiStats?.currentTvl || 0

  // 시그널 요약
  const positiveCount = signals.filter(s => s.type === 'positive').length
  const dangerCount   = signals.filter(s => s.type === 'danger').length
  const overallType   = dangerCount > 1 ? 'danger' : positiveCount >= 2 ? 'positive' : 'warning'

  // 온체인 인디케이터 테이블 데이터
  const indicators = [
    {
      name: '글로벌 M2 통화량',
      category: '매크로',
      value: globalM2 > 0 ? `$${(globalM2 / 1e12).toFixed(2)}T` : '-',
      status: (monetaryData?.globalM2History?.length ?? 0) >= 2
        ? ((monetaryData!.globalM2History[monetaryData!.globalM2History.length-1]?.value ?? 0) >
           (monetaryData!.globalM2History[monetaryData!.globalM2History.length-2]?.value ?? 0) ? 'positive' : 'danger')
        : 'neutral' as 'positive' | 'danger' | 'neutral',
      description: 'US+EU+JP+UK 합산',
    },
    {
      name: '스테이블코인 공급량',
      category: '유동성',
      value: totalSupply > 0 ? `$${(totalSupply / 1e9).toFixed(0)}B` : '-',
      status: (stables?.[0]?.change_7d ?? 0) > 0 ? 'positive' : 'warning' as 'positive' | 'warning',
      description: `7일 변화 ${stables?.[0]?.change_7d !== undefined ? `${stables[0].change_7d > 0 ? '+' : ''}${stables[0].change_7d.toFixed(1)}%` : '-'}`,
    },
    {
      name: 'DeFi TVL',
      category: 'DeFi',
      value: currentTvl > 0 ? `$${(currentTvl / 1e9).toFixed(1)}B` : '-',
      status: 'neutral' as 'neutral',
      description: 'DefiLlama 기준',
    },
    {
      name: 'M2 침투율',
      category: '채택률',
      value: penetration ? `${penetration}%` : '-',
      status: parseFloat(penetration || '0') > 1 ? 'positive' : 'warning' as 'positive' | 'warning',
      description: '스테이블코인 / 미국 M2',
    },
    {
      name: 'USDT 도미넌스',
      category: '점유율',
      value: usdtDom ? `${usdtDom}%` : '-',
      status: parseFloat(usdtDom || '0') > 60 ? 'warning' : 'positive' as 'positive' | 'warning',
      description: topStable?.name || 'Tether USD',
    },
    {
      name: '연준 기준금리',
      category: '통화정책',
      value: monetaryData?.fedFundsRate !== undefined && monetaryData.fedFundsRate !== null
        ? `${monetaryData.fedFundsRate}%` : '-',
      status: (monetaryData?.fedFundsRate ?? 0) >= 5 ? 'danger' : (monetaryData?.fedFundsRate ?? 0) >= 3 ? 'warning' : 'positive' as 'positive' | 'warning' | 'danger',
      description: monetaryData?.fedFundsRate !== undefined && monetaryData.fedFundsRate !== null
        ? (monetaryData.fedFundsRate >= 5 ? '긴축적 기조' : monetaryData.fedFundsRate >= 3 ? '중립적 기조' : '완화적 기조')
        : 'FRED API 키 필요',
    },
  ]

  return (
    <div className="space-y-6">

      {/* ── KPI 요약 카드 4개 ──────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span className="text-xs text-gray-400">스테이블 총량</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-blue-400 mb-0.5">{totalSupply > 0 ? `$${(totalSupply/1e9).toFixed(0)}B` : '-'}</div>
          <div className="text-xs text-gray-500">{`${stables?.length || 0}개 추적`}</div>
        </div>
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            <span className="text-xs text-gray-400">DeFi TVL</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-purple-400 mb-0.5">{currentTvl > 0 ? `$${(currentTvl/1e9).toFixed(1)}B` : '-'}</div>
          <div className="text-xs text-gray-500">30일 평균 대비</div>
        </div>
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span className="text-xs text-gray-400">글로벌 M2</span>
          </div>
          {monetaryLoading ? (
            <div className="h-7 w-24 rounded bg-[#21262d] animate-pulse mb-0.5" aria-label="글로벌 M2 로딩 중" />
          ) : monetaryFailed ? (
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xl sm:text-2xl font-bold text-red-400">⚠</span>
              <button
                onClick={onRetry}
                className="text-xs px-2 py-1 rounded-lg bg-red-400/10 text-red-300 border border-red-400/30 hover:bg-red-400/20"
                title={monetaryError || '데이터를 가져오지 못했습니다'}
              >
                재시도
              </button>
            </div>
          ) : (
            <div className="text-xl sm:text-2xl font-bold text-cyan-400 mb-0.5">
              {globalM2 > 0 ? `$${(globalM2/1e12).toFixed(2)}T` : '-'}
            </div>
          )}
          <div className="text-xs text-gray-500">
            {monetaryFailed ? (monetaryError || '데이터 불러오기 실패') : '주요 4개국 합산'}
          </div>
          {globalM2Estimated && globalM2 > 0 && !monetaryFailed && (
            <div
              className="mt-1 text-[10px] inline-block px-1.5 py-0.5 rounded border border-amber-400/30 text-amber-300 bg-amber-400/10"
              title={globalM2MissingRegions.length ? `누락 지역 추정 보간: ${globalM2MissingRegions.join(', ').toUpperCase()}` : '추정치'}
            >
              추정치{globalM2MissingRegions.length ? ` · ${globalM2MissingRegions.join(', ').toUpperCase()} 보간` : ''}
            </div>
          )}
          {monetaryStale && globalM2 > 0 && (
            <button
              onClick={onRetry}
              className="mt-1 ml-1 text-[10px] inline-block px-1.5 py-0.5 rounded border border-orange-400/30 text-orange-300 bg-orange-400/10 hover:bg-orange-400/20"
              title={monetaryError ? `갱신 실패: ${monetaryError} — 직전 값 표시 중` : '갱신 실패 — 직전 값 표시 중'}
            >
              갱신 실패 · 재시도
            </button>
          )}
        </div>
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-xs text-gray-400">통합 유동성</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-400 mb-0.5">{globalLiq > 0 ? `$${(globalLiq/1e12).toFixed(2)}T` : '-'}</div>
          <div className="text-xs text-gray-500">M2 + 스테이블코인</div>
        </div>
      </div>

      {/* ── 온체인 인디케이터 테이블 (CryptoQuant 핵심 UI) ── */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#21262d]">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span>⚡</span> 글로벌 유동성 인디케이터
          </h2>
          <StatusBadge type={overallType} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#21262d]">
                <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">인디케이터</th>
                <th className="text-left px-3 py-3 text-xs text-gray-500 font-medium hidden sm:table-cell">카테고리</th>
                <th className="text-right px-3 py-3 text-xs text-gray-500 font-medium">현재값</th>
                <th className="text-right px-5 py-3 text-xs text-gray-500 font-medium">상태</th>
              </tr>
            </thead>
            <tbody>
              {indicators.map((ind, idx) => (
                <tr key={idx} className="border-b border-[#21262d]/50 hover:bg-[#21262d]/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-gray-200 text-sm">{ind.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{ind.description}</div>
                  </td>
                  <td className="px-3 py-3.5 hidden sm:table-cell">
                    <span className="text-xs bg-[#21262d] text-gray-400 px-2 py-0.5 rounded-full">{ind.category}</span>
                  </td>
                  <td className="px-3 py-3.5 text-right">
                    <span className="font-mono font-bold text-white">{ind.value}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <StatusBadge type={ind.status as any} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 차트 2개 + 신호 ──────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* 스테이블코인 도넛 */}
        <DarkCard title="스테이블코인 시장 점유율" icon="🥧" timestamp={stablecoinData?.lastUpdated || defiStats?.lastUpdated || null}>
          <div className="h-52">
            {stables && stables.length > 0
              ? <canvas ref={marketCanvasRef} />
              : <p className="text-gray-500 text-center py-16">데이터 로딩 중...</p>}
          </div>
        </DarkCard>

        {/* TVL 라인 */}
        <DarkCard title="DeFi TVL 추이 (30일)" icon="📈" timestamp={defiStats?.lastUpdated || null}>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-[#21262d] rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-white">{currentTvl > 0 ? `$${(currentTvl/1e9).toFixed(1)}B` : '-'}</div>
              <div className="text-xs text-gray-400 mt-0.5">현재 TVL</div>
            </div>
            <div className="bg-[#21262d] rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-white">{stables?.length ?? '-'}</div>
              <div className="text-xs text-gray-400 mt-0.5">추적 스테이블코인</div>
            </div>
          </div>
          <div className="h-36">
            {defiStats?.tvlHistory && defiStats.tvlHistory.length > 0
              ? <canvas ref={tvlCanvasRef} />
              : <p className="text-gray-500 text-center py-10">TVL 데이터 로딩 중...</p>}
          </div>
        </DarkCard>

        {/* 체인별 분포 */}
        <DarkCard title="체인별 스테이블코인 분포" icon="🔗">
          {defiStats?.chainDistribution && defiStats.chainDistribution.length > 0 ? (
            <div className="space-y-3">
              {defiStats.chainDistribution.slice(0, 7).map((chain) => {
                const percent = totalSupply > 0 ? (chain.totalCirculating / totalSupply) * 100 : 0
                return (
                  <div key={chain.chain}>
                    <div className="flex justify-between mb-1 text-xs">
                      <span className="text-gray-300 font-medium">{chain.chain}</span>
                      <span className="text-gray-400">${(chain.totalCirculating/1e9).toFixed(2)}B <span className="text-gray-600">({percent.toFixed(1)}%)</span></span>
                    </div>
                    <div className="bg-[#21262d] h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(percent, 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">데이터 로딩 중...</p>
          )}
        </DarkCard>

        {/* 신호 패널 */}
        <DarkCard title="데이터 기반 신호" icon="🔔">
          <div className="space-y-2.5">
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
