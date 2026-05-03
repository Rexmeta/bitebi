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

export default function MoneySupplyTab({ stablecoinData, monetaryData, defiStats, loading, onRetry }: MoneySupplyTabProps) {
  const m2ChartRef      = useRef<Chart | null>(null)
  const m2CanvasRef     = useRef<HTMLCanvasElement>(null)
  const historyChartRef = useRef<Chart | null>(null)
  const historyCanvasRef = useRef<HTMLCanvasElement>(null)
  const chainChartRef   = useRef<Chart | null>(null)
  const chainCanvasRef  = useRef<HTMLCanvasElement>(null)

  const usM2        = monetaryData?.usM2 || null
  const totalSupply = stablecoinData?.totalSupply || defiStats?.totalStablecoinSupply || 0
  const penetration = usM2 && totalSupply > 0 ? (totalSupply / usM2) * 100 : null

  useEffect(() => {
    if (m2ChartRef.current)      { m2ChartRef.current.destroy();      m2ChartRef.current = null }
    if (historyChartRef.current) { historyChartRef.current.destroy(); historyChartRef.current = null }
    if (chainChartRef.current)   { chainChartRef.current.destroy();   chainChartRef.current = null }

    const tooltipDefaults = {
      backgroundColor: '#1c2128', borderColor: '#30363d', borderWidth: 1,
      titleColor: '#e6edf3', bodyColor: '#8b949e',
    }

    // M2 vs 스테이블코인 바차트
    if (m2CanvasRef.current) {
      const ctx = m2CanvasRef.current.getContext('2d')
      if (ctx) {
        const labels = ['미국 M2']
        const values = [usM2 ? usM2 / 1e12 : 0]
        const colors = ['#818cf8']
        if (totalSupply > 0) { labels.push('스테이블코인'); values.push(totalSupply / 1e12); colors.push('#f59e0b') }

        m2ChartRef.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels,
            datasets: [{ label: '통화량 (조 달러)', data: values, backgroundColor: colors, borderRadius: 6 }],
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { ...tooltipDefaults, callbacks: { label: (c) => `$${(c.raw as number).toFixed(3)}T` } } },
            scales: {
              y: { beginAtZero: true, ticks: { color: '#6b7280' }, grid: { color: '#21262d' }, title: { display: true, text: '조$', color: '#6b7280' } },
              x: { ticks: { color: '#6b7280' }, grid: { color: '#21262d' } },
            },
          },
        })
      }
    }

    // 미국 M2 추이 라인차트
    if (historyCanvasRef.current && monetaryData?.usM2History && monetaryData.usM2History.length > 0) {
      const ctx = historyCanvasRef.current.getContext('2d')
      if (ctx) {
        const labels = monetaryData.usM2History.map(d => {
          const date = new Date(d.date)
          return `${date.getFullYear()}.${date.getMonth() + 1}`
        })
        historyChartRef.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels,
            datasets: [{
              label: '미국 M2 (조 달러)',
              data: monetaryData.usM2History.map(d => d.value / 1e12),
              borderColor: '#818cf8',
              backgroundColor: 'rgba(129,140,248,0.08)',
              tension: 0.4,
              fill: true,
              pointRadius: 2,
            }],
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { ...tooltipDefaults, callbacks: { label: (c) => `M2: $${(c.raw as number).toFixed(2)}T` } } },
            scales: {
              y: { ticks: { color: '#6b7280' }, grid: { color: '#21262d' }, title: { display: true, text: '조$', color: '#6b7280' } },
              x: { ticks: { color: '#6b7280', maxTicksLimit: 8 }, grid: { color: '#21262d' } },
            },
          },
        })
      }
    }

    // 체인별 스테이블코인 수평 바차트
    if (chainCanvasRef.current && defiStats?.chainDistribution && defiStats.chainDistribution.length > 0) {
      const ctx = chainCanvasRef.current.getContext('2d')
      if (ctx) {
        const top = defiStats.chainDistribution.slice(0, 8)
        const colors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#f97316', '#ec4899', '#64748b']
        chainChartRef.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: top.map(c => c.chain),
            datasets: [{
              label: '스테이블 유통량 (B$)',
              data: top.map(c => c.totalCirculating / 1e9),
              backgroundColor: colors,
              borderRadius: 4,
            }],
          },
          options: {
            indexAxis: 'y' as const,
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { ...tooltipDefaults, callbacks: { label: (c) => `$${(c.raw as number).toFixed(2)}B` } } },
            scales: {
              x: { ticks: { color: '#6b7280' }, grid: { color: '#21262d' } },
              y: { ticks: { color: '#9ca3af' }, grid: { color: '#21262d' } },
            },
          },
        })
      }
    }

    return () => {
      if (m2ChartRef.current)      m2ChartRef.current.destroy()
      if (historyChartRef.current) historyChartRef.current.destroy()
      if (chainChartRef.current)   chainChartRef.current.destroy()
    }
  }, [monetaryData, stablecoinData, defiStats, usM2, totalSupply])

  if (loading && !monetaryData && !stablecoinData) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  const diag = monetaryData?.diagnostics
  const reasons = diag?.missingReasons || {}
  const isEstimated = diag?.isEstimated
  const sourceTag =
    diag?.source === 'fred' ? 'FRED'
      : diag?.source === 'hybrid' ? 'FRED + 폴백'
        : monetaryData?.fredKeyInvalid ? '키 무효 → 폴백' : '무료 API 폴백'

  type MetricKey = 'usM2' | 'fedFunds' | 'globalM2' | 'regionalM2' | 'sp500' | 'nasdaq100' | 'gold'
  const microLabelFor = (key: MetricKey, hasValue: boolean): string | null => {
    if (!hasValue) return reasons[key] ? `데이터 없음 (${reasons[key]})` : '데이터 없음'
    if (isEstimated) return `추정치 · ${sourceTag}`
    return null
  }
  type KpiItem = { key: MetricKey | null; has: boolean; label: string; value: string; color: string; dot: string; sub: string }
  type MarketKpiItem = { key: MetricKey; has: boolean; label: string; value: string; color: string; dot: string; sub: string }

  // 지역별 M2
  const regional = monetaryData?.regionalM2
  const regionRows = [
    { name: '미국 (US)',     value: usM2,               color: 'bg-blue-500' },
    { name: '유로존 (EU)',   value: regional?.eu || null, color: 'bg-indigo-500' },
    { name: '일본 (JP)',     value: regional?.jp || null, color: 'bg-cyan-500' },
    { name: '영국 (UK)',     value: regional?.uk || null, color: 'bg-violet-500' },
  ].filter(r => r.value != null)

  // Prefer API-computed global M2 (FRED 합산 또는 fallback proxy).
  // 지역 합계는 상세 카드 표시용으로만 사용한다.
  const globalM2Total = monetaryData?.globalM2 || ((usM2 || 0) + (regional?.eu || 0) + (regional?.jp || 0) + (regional?.uk || 0))

  return (
    <div className="space-y-6">

      {/* ── KPI 카드 4개 ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {([
          { key: 'usM2',     has: !!usM2,             label: '미국 M2',      value: usM2 ? `$${(usM2/1e12).toFixed(2)}T` : '-', color: 'text-indigo-400', dot: 'bg-indigo-400', sub: '연준 기준 통화량' },
          { key: null,       has: totalSupply > 0,    label: '스테이블 총량', value: totalSupply > 0 ? `$${(totalSupply/1e9).toFixed(0)}B` : '-', color: 'text-amber-400', dot: 'bg-amber-400', sub: '온체인 달러 공급' },
          { key: null,       has: penetration != null,label: 'M2 침투율',    value: penetration != null ? `${penetration.toFixed(3)}%` : '-', color: 'text-cyan-400', dot: 'bg-cyan-400', sub: '스테이블/미국 M2' },
          { key: 'globalM2', has: globalM2Total > 0,  label: '글로벌 M2',    value: globalM2Total > 0 ? `$${(globalM2Total/1e12).toFixed(2)}T` : '-', color: 'text-emerald-400', dot: 'bg-emerald-400', sub: 'US+EU+JP+UK' },
        ] satisfies KpiItem[]).map(kpi => {
          const micro = kpi.key ? microLabelFor(kpi.key, kpi.has) : null
          return (
            <div key={kpi.label} className="bg-[#161b22] border border-[#21262d] rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <span className={`w-1.5 h-1.5 rounded-full ${kpi.dot}`} />
                <span className="text-xs text-gray-400">{kpi.label}</span>
              </div>
              <div className={`text-xl sm:text-2xl font-bold ${kpi.color} mb-0.5`}>{kpi.value}</div>
              <div className="text-xs text-gray-500">{kpi.sub}</div>
              {micro && (
                <div className={`mt-1 text-[10px] ${kpi.has ? 'text-amber-300/80' : 'text-red-300/80'}`}>
                  {micro}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── 시장지수 KPI (S&P/Nasdaq/Gold/연준) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {([
          { key: 'fedFunds',  has: monetaryData?.fedFundsRate != null,        label: '연준 금리',  value: monetaryData?.fedFundsRate != null ? `${monetaryData.fedFundsRate}%` : '-', color: 'text-rose-400', dot: 'bg-rose-400', sub: 'Fed Funds Rate' },
          { key: 'sp500',     has: !!monetaryData?.marketIndices?.sp500,      label: 'S&P 500',    value: monetaryData?.marketIndices?.sp500 ? monetaryData.marketIndices.sp500.toFixed(2) : '-', color: 'text-sky-400', dot: 'bg-sky-400', sub: '미국 대형주 지수' },
          { key: 'nasdaq100', has: !!monetaryData?.marketIndices?.nasdaq100,  label: 'Nasdaq-100', value: monetaryData?.marketIndices?.nasdaq100 ? monetaryData.marketIndices.nasdaq100.toFixed(2) : '-', color: 'text-violet-400', dot: 'bg-violet-400', sub: '나스닥 100' },
          { key: 'gold',      has: !!monetaryData?.marketIndices?.gold,       label: '금 가격',    value: monetaryData?.marketIndices?.gold ? `$${monetaryData.marketIndices.gold.toFixed(0)}` : '-', color: 'text-yellow-400', dot: 'bg-yellow-400', sub: 'XAU / oz' },
        ] satisfies MarketKpiItem[]).map(kpi => {
          const micro = microLabelFor(kpi.key, kpi.has)
          return (
            <div key={kpi.label} className="bg-[#161b22] border border-[#21262d] rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <span className={`w-1.5 h-1.5 rounded-full ${kpi.dot}`} />
                <span className="text-xs text-gray-400">{kpi.label}</span>
              </div>
              <div className={`text-xl sm:text-2xl font-bold ${kpi.color} mb-0.5`}>{kpi.value}</div>
              <div className="text-xs text-gray-500">{kpi.sub}</div>
              {micro && (
                <div className={`mt-1 text-[10px] ${kpi.has ? 'text-amber-300/80' : 'text-red-300/80'}`}>
                  {micro}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── FRED API 경고 ── */}
      {!monetaryData?.hasFredKey && (
        <div className="flex items-start gap-3 bg-amber-400/5 border border-amber-400/20 rounded-xl p-4 text-sm">
          <span className="text-amber-400 text-lg mt-0.5">⚠</span>
          <div>
            <div className="text-amber-400 font-medium mb-0.5">
              {monetaryData?.fredKeyInvalid ? 'FRED API 키 무효 → 폴백 사용 중' : 'FRED API 키 미설정'}
            </div>
            <div className="text-gray-400 text-xs">
              {monetaryData?.fredKeyInvalid
                ? '제공된 FRED 키가 거부되어 World Bank · NY Fed · Yahoo Finance 무료 데이터로 자동 전환되었습니다.'
                : <>환경변수 <code className="bg-[#21262d] px-1 rounded text-amber-300">FRED_API_KEY</code>를 설정하면 실시간 미국 M2 데이터를 표시합니다. 현재는 무료 폴백을 사용합니다.</>}
            </div>
          </div>
        </div>
      )}

      {/* ── 차트 2열 ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* M2 vs 스테이블코인 비교 */}
        <DarkCard title="미국 M2 vs 스테이블코인 규모" icon="🏛️" timestamp={monetaryData?.lastUpdated || null}>
          <div className="h-52">
            <canvas ref={m2CanvasRef} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-gray-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-indigo-400 shrink-0" />
              미국 M2: {usM2 ? `$${(usM2/1e12).toFixed(2)}T` : '-'}
            </div>
            <div className="flex items-center gap-1.5 text-gray-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 shrink-0" />
              스테이블: {totalSupply > 0 ? `$${(totalSupply/1e9).toFixed(0)}B` : '-'}
            </div>
          </div>
        </DarkCard>

        {/* M2 추이 */}
        <DarkCard title="미국 M2 통화량 추이" icon="📊" timestamp={monetaryData?.lastUpdated || null}>
          <div className="h-64">
            {monetaryData?.usM2History && monetaryData.usM2History.length > 0 ? (
              <canvas ref={historyCanvasRef} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                {monetaryData?.hasFredKey ? '데이터 로딩 중...' : 'FRED API 키 필요'}
              </div>
            )}
          </div>
        </DarkCard>

      </div>

      {/* ── 침투율 게이지 + 지역별 M2 ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* M2 침투율 게이지 */}
        <DarkCard title="M2 대비 스테이블코인 침투율" icon="⚖️">
          <div className="flex flex-col items-center py-4">
            {/* 원형 게이지 */}
            <div className="relative w-36 h-36 mb-6">
              {(() => {
                const pct = Math.min(penetration || 0, 10) // 10%를 최대로 시각화
                const circumference = 2 * Math.PI * 40
                const offset = circumference - (circumference * pct) / 10
                const color = (penetration || 0) < 1 ? '#f59e0b' : (penetration || 0) < 3 ? '#818cf8' : '#34d399'
                return (
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#21262d" strokeWidth="10" />
                    <circle
                      cx="50" cy="50" r="40" fill="none"
                      stroke={color} strokeWidth="10"
                      strokeDasharray={circumference}
                      strokeDashoffset={offset}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                    />
                    <text x="50" y="50" className="rotate-90" textAnchor="middle" dominantBaseline="middle"
                      style={{ fill: color, fontSize: '14px', fontWeight: 'bold', transform: 'rotate(90deg)', transformOrigin: '50% 50%' }}>
                      {penetration !== null ? `${penetration.toFixed(2)}%` : '-'}
                    </text>
                    <text x="50" y="62" textAnchor="middle" dominantBaseline="middle"
                      style={{ fill: '#6b7280', fontSize: '7px', transform: 'rotate(90deg)', transformOrigin: '50% 50%' }}>
                      침투율
                    </text>
                  </svg>
                )
              })()}
            </div>

            {/* 마일스톤 */}
            <div className="w-full space-y-2">
              {[
                { threshold: 1, label: '1% — 시스템적 중요성 확보', color: 'text-amber-400', border: 'border-amber-400/30 bg-amber-400/5' },
                { threshold: 3, label: '3% — 통화정책 영향 시작',  color: 'text-indigo-400', border: 'border-indigo-400/30 bg-indigo-400/5' },
                { threshold: 5, label: '5% — 기축통화 역할 본격화', color: 'text-emerald-400', border: 'border-emerald-400/30 bg-emerald-400/5' },
              ].map(m => {
                const reached = (penetration || 0) >= m.threshold
                return (
                  <div key={m.threshold} className={`flex items-center justify-between text-xs px-3 py-2 rounded-lg border ${m.border}`}>
                    <span className={reached ? m.color : 'text-gray-500'}>{m.label}</span>
                    <span className={reached ? m.color + ' font-bold' : 'text-gray-600'}>{reached ? '✓ 달성' : '미달'}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </DarkCard>

        {/* 지역별 M2 */}
        <DarkCard title="지역별 M2 통화량 비교" icon="🌍" timestamp={monetaryData?.lastUpdated || null}>
          {regionRows.length > 0 ? (
            <div className="space-y-4">
              {regionRows.map(r => {
                const pct = globalM2Total > 0 && r.value ? (r.value / globalM2Total) * 100 : 0
                return (
                  <div key={r.name}>
                    <div className="flex justify-between mb-1.5 text-xs">
                      <span className="text-gray-300 font-medium">{r.name}</span>
                      <span className="text-gray-400">
                        {r.value ? `$${(r.value/1e12).toFixed(2)}T` : '-'}
                        <span className="text-gray-600 ml-1">({pct.toFixed(1)}%)</span>
                      </span>
                    </div>
                    <div className="bg-[#21262d] h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${r.color} rounded-full transition-all duration-700`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
              {regionRows.length === 0 && (
                <p className="text-gray-500 text-center py-8">지역별 데이터 없음</p>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">데이터 로딩 중...</p>
          )}
        </DarkCard>

      </div>

      {/* ── 체인별 스테이블 분포 (수평 바차트 + 리스트) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <DarkCard title="체인별 스테이블코인 분포 (차트)" icon="🔗">
          <div className="h-72">
            {defiStats?.chainDistribution && defiStats.chainDistribution.length > 0 ? (
              <canvas ref={chainCanvasRef} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">데이터 로딩 중...</div>
            )}
          </div>
        </DarkCard>

        <DarkCard title="체인별 스테이블코인 분포 (상세)" icon="📋" timestamp={defiStats?.lastUpdated || null}>
          {defiStats?.chainDistribution && defiStats.chainDistribution.length > 0 ? (
            <div className="space-y-3 overflow-y-auto max-h-72">
              {defiStats.chainDistribution.map((chain, idx) => {
                const percent = totalSupply > 0 ? (chain.totalCirculating / totalSupply) * 100 : 0
                const colors = ['bg-blue-500', 'bg-indigo-500', 'bg-cyan-500', 'bg-emerald-500', 'bg-amber-500', 'bg-orange-500', 'bg-pink-500', 'bg-slate-500']
                const color = colors[idx % colors.length]
                return (
                  <div key={chain.chain}>
                    <div className="flex justify-between mb-1 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${color} shrink-0`} />
                        <span className="text-gray-300 font-medium">{chain.chain}</span>
                      </div>
                      <span className="text-gray-400">
                        ${(chain.totalCirculating/1e9).toFixed(2)}B
                        <span className="text-gray-600 ml-1">({percent.toFixed(1)}%)</span>
                      </span>
                    </div>
                    <div className="bg-[#21262d] h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color} rounded-full transition-all duration-500`}
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

      </div>

      {/* ── 유동성 순환 분석 ── */}
      <DarkCard title="유동성 순환 분석" icon="🔄">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#21262d] border border-[#30363d] rounded-lg p-4">
            <div className="text-xs text-indigo-400 font-bold mb-2">📊 분석 포인트</div>
            <p className="text-sm text-gray-300 leading-relaxed">
              {penetration !== null
                ? `스테이블코인이 미국 M2의 ${penetration.toFixed(2)}%를 차지하며, ${penetration < 1 ? '1% 돌파 시 시스템적 중요성 확보 예상' : '이미 시스템적 중요성을 확보한 수준'}`
                : '데이터를 로딩하면 침투율 분석을 표시합니다'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: '침투율', value: penetration != null ? `${penetration.toFixed(2)}%` : '-', color: 'text-cyan-400' },
              { label: 'DeFi TVL', value: defiStats?.currentTvl ? `$${(defiStats.currentTvl/1e9).toFixed(1)}B` : '-', color: 'text-purple-400' },
              { label: '스테이블 총량', value: totalSupply > 0 ? `$${(totalSupply/1e9).toFixed(0)}B` : '-', color: 'text-amber-400' },
              { label: '미국 M2', value: usM2 ? `$${(usM2/1e12).toFixed(2)}T` : '-', color: 'text-indigo-400' },
            ].map(kpi => (
              <div key={kpi.label} className="bg-[#21262d] rounded-lg p-3 text-center">
                <div className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{kpi.label}</div>
              </div>
            ))}
          </div>
        </div>
      </DarkCard>

    </div>
  )
}
