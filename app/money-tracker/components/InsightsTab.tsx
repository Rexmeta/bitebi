'use client'
import React, { useEffect, useRef } from 'react'
import Chart from 'chart.js/auto'
import type { MonetaryData, FearGreedItem, Signal, StablecoinData } from '../hooks/useMoneyTrackerData'
import { UpdateTimestamp } from './UpdateTimestamp'
import { SkeletonCard } from './SkeletonCard'

interface InsightsTabProps {
  monetaryData: MonetaryData | null
  fearGreedData: FearGreedItem[] | null
  stablecoinData: StablecoinData | null
  signals: Signal[]
  loading: boolean
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

// 공포/탐욕 게이지 컴포넌트
function FearGreedGauge({ value, classification }: { value: number; classification: string }) {
  const color = value < 25 ? '#f87171' : value < 45 ? '#fb923c' : value < 55 ? '#facc15' : value < 75 ? '#4ade80' : '#34d399'
  const bgClass = value < 25 ? 'text-red-400' : value < 45 ? 'text-orange-400' : value < 55 ? 'text-yellow-400' : value < 75 ? 'text-green-400' : 'text-emerald-300'
  const circumference = 2 * Math.PI * 40
  const offset = circumference - (circumference * value) / 100

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36">
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
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-black ${bgClass}`}>{value}</span>
          <span className="text-[10px] text-gray-400 mt-0.5">{classification}</span>
        </div>
      </div>
      <div className="mt-2 flex gap-1.5 text-[10px] text-gray-500">
        <span className="text-red-400">공포</span>
        <span>·</span>
        <span className="text-yellow-400">중립</span>
        <span>·</span>
        <span className="text-emerald-400">탐욕</span>
      </div>
    </div>
  )
}

export default function InsightsTab({ monetaryData, fearGreedData, stablecoinData, signals, loading }: InsightsTabProps) {
  const correlationChartRef = useRef<Chart | null>(null)
  const correlationCanvasRef = useRef<HTMLCanvasElement>(null)
  const sentimentChartRef = useRef<Chart | null>(null)
  const sentimentCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (correlationChartRef.current) { correlationChartRef.current.destroy(); correlationChartRef.current = null }
    if (sentimentChartRef.current) { sentimentChartRef.current.destroy(); sentimentChartRef.current = null }

    // 1. Global M2 vs Nasdaq-100 상관관계 차트
    if (correlationCanvasRef.current && monetaryData?.globalM2History && monetaryData.marketIndices?.nasdaq100History) {
      const ctx = correlationCanvasRef.current.getContext('2d')
      if (ctx) {
        const m2Hist = monetaryData.globalM2History
        const nasdaqHist = monetaryData.marketIndices.nasdaq100History
        const labels = m2Hist.map(d => d.date.substring(0, 7))
        const m2Data = m2Hist.map(d => d.value / 1e12)
        const nasdaqData = nasdaqHist.slice(-m2Hist.length).map(d => d.value)

        correlationChartRef.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels,
            datasets: [
              {
                label: '글로벌 M2 유동성 (조$)',
                data: m2Data,
                borderColor: '#818cf8',
                backgroundColor: 'rgba(129, 140, 248, 0.08)',
                yAxisID: 'y',
                tension: 0.4,
                fill: true,
                pointRadius: 0,
              },
              {
                label: 'Nasdaq-100 지수',
                data: nasdaqData,
                borderColor: '#34d399',
                backgroundColor: 'transparent',
                yAxisID: 'y1',
                tension: 0.4,
                pointRadius: 0,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
              legend: { labels: { color: '#9ca3af', font: { size: 11 } } },
              tooltip: { backgroundColor: '#1c2128', borderColor: '#30363d', borderWidth: 1, titleColor: '#e6edf3', bodyColor: '#8b949e' },
            },
            scales: {
              y:  { type: 'linear', position: 'left',  ticks: { color: '#6b7280' }, grid: { color: '#21262d' }, title: { display: true, text: '유동성 (T$)', color: '#6b7280' } },
              y1: { type: 'linear', position: 'right', ticks: { color: '#6b7280' }, grid: { drawOnChartArea: false }, title: { display: true, text: 'Nasdaq', color: '#6b7280' } },
              x:  { ticks: { color: '#6b7280', maxTicksLimit: 8 }, grid: { color: '#21262d' } },
            },
          },
        })
      }
    }

    // 2. 공포/탐욕 히스토리 차트
    if (sentimentCanvasRef.current && fearGreedData && fearGreedData.length > 0) {
      const ctx = sentimentCanvasRef.current.getContext('2d')
      if (ctx) {
        const history = [...fearGreedData].reverse()
        const labels = history.map(d => {
          const date = new Date(parseInt(d.timestamp) * 1000)
          return `${date.getMonth() + 1}/${date.getDate()}`
        })
        const data = history.map(d => parseInt(d.value))

        sentimentChartRef.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels,
            datasets: [{
              label: '공포/탐욕 지수',
              data,
              borderColor: '#f59e0b',
              backgroundColor: 'rgba(245,158,11,0.08)',
              fill: true,
              pointRadius: 0,
              tension: 0.3,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: { backgroundColor: '#1c2128', borderColor: '#30363d', borderWidth: 1, titleColor: '#e6edf3', bodyColor: '#8b949e' },
            },
            scales: {
              y: { min: 0, max: 100, ticks: { color: '#6b7280' }, grid: { color: '#21262d' } },
              x: { ticks: { color: '#6b7280', maxTicksLimit: 8 }, grid: { color: '#21262d' } },
            },
          },
        })
      }
    }

    return () => {
      if (correlationChartRef.current) correlationChartRef.current.destroy()
      if (sentimentChartRef.current) sentimentChartRef.current.destroy()
    }
  }, [monetaryData, fearGreedData])

  if (loading && !monetaryData) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  const latestFNG = fearGreedData?.[0]
  const fngValue = latestFNG ? parseInt(latestFNG.value) : 50
  const fngClass = latestFNG?.value_classification || 'Neutral'

  // 글로벌 M2 트렌드
  const m2Hist = monetaryData?.globalM2History || []
  const m2Latest = m2Hist[m2Hist.length - 1]?.value || 0
  const m2Prev   = m2Hist[m2Hist.length - 2]?.value || 0
  const m2Trend  = m2Prev > 0 ? ((m2Latest - m2Prev) / m2Prev) * 100 : 0
  const m2TrendUp = m2Trend > 0

  // 인사이트 서사 생성
  const narrative = fngValue < 30
    ? '시장에 공포가 만연하지만 글로벌 유동성 공급은 지속되고 있습니다. 역사적으로 이런 구간은 우량 자산 매수 기회였습니다.'
    : fngValue > 70
    ? '유동성 증가 대비 시장 심리가 과열된 상태입니다. 단기 조정 가능성에 대비한 리스크 관리가 필요합니다.'
    : '현재 유동성과 심리 지수가 중립적 균형을 이루고 있습니다. 거시 지표 변화를 모니터링하며 분할 접근이 유효합니다.'

  // 시그널 분류
  const positiveSignals = signals.filter(s => s.type === 'positive')
  const dangerSignals   = signals.filter(s => s.type === 'danger')
  const warningSignals  = signals.filter(s => s.type === 'warning')

  return (
    <div className="space-y-6">

      {/* ── 상단 3열 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* 시장 서사 카드 */}
        <div className="lg:col-span-2 bg-[#161b22] border border-[#21262d] rounded-xl p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold text-white mb-4">
            <span>🧠</span> 데이터 기반 시장 서사 (Market Narrative)
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-[#21262d] rounded-lg">
              <span className="text-2xl">📊</span>
              <div>
                <div className="text-xs text-gray-400 mb-1">글로벌 M2 유동성</div>
                <div className="text-white font-bold text-lg">${((monetaryData?.globalM2 || 0) / 1e12).toFixed(2)}T</div>
                <div className={`text-xs mt-0.5 ${m2TrendUp ? 'text-emerald-400' : 'text-red-400'}`}>
                  {m2TrendUp ? '▲ 확장' : '▼ 수축'} {Math.abs(m2Trend).toFixed(2)}% (전월 대비)
                </div>
              </div>
            </div>

            <div className="border-l-2 border-indigo-500 pl-4 py-1">
              <h3 className="text-xs font-bold text-indigo-400 mb-1.5">인사이트 요약</h3>
              <p className="text-sm text-gray-300 leading-relaxed">{narrative}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#21262d] border border-[#30363d] rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">🥇 Safe Haven (Gold)</div>
                <div className="text-base font-bold text-yellow-400">
                  ${(monetaryData?.marketIndices?.gold || 0).toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">인플레이션 헤지</div>
              </div>
              <div className="bg-[#21262d] border border-[#30363d] rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">📈 Risk-on (S&P 500)</div>
                <div className="text-base font-bold text-emerald-400">
                  {(monetaryData?.marketIndices?.sp500 || 0).toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">기관 투자 신뢰도</div>
              </div>
            </div>

            <UpdateTimestamp timestamp={monetaryData?.lastUpdated || null} />
          </div>
        </div>

        {/* 공포/탐욕 게이지 + 히스토리 */}
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5 flex flex-col items-center">
          <h2 className="text-sm font-bold text-white mb-4 w-full">🎭 대중 심리 (Fear & Greed)</h2>

          <FearGreedGauge value={fngValue} classification={fngClass} />

          <div className="w-full mt-4">
            <div className="text-xs text-gray-500 mb-2 text-center">최근 30일 추이</div>
            <div className="h-24">
              <canvas ref={sentimentCanvasRef} />
            </div>
          </div>

          {/* 심리 해석 레이블 */}
          <div className="mt-4 w-full space-y-1.5">
            {[
              { range: '0–24',  label: '극도의 공포',  color: 'bg-red-500/20 text-red-400 border-red-500/30' },
              { range: '25–44', label: '공포',         color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
              { range: '45–55', label: '중립',         color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
              { range: '56–75', label: '탐욕',         color: 'bg-green-500/20 text-green-400 border-green-500/30' },
              { range: '76–100',label: '극도의 탐욕',  color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
            ].map(item => (
              <div key={item.range} className={`flex justify-between text-[10px] px-2 py-1 rounded border ${item.color}`}>
                <span>{item.label}</span>
                <span className="font-mono">{item.range}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 신호 패널 ── */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#21262d]">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span>🔔</span> 자동 데이터 신호 ({signals.length}개)
          </h2>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-400/30">{positiveSignals.length} Bullish</span>
            <span className="px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 border border-yellow-400/30">{warningSignals.length} Neutral</span>
            <span className="px-2 py-0.5 rounded-full bg-red-400/10 text-red-400 border border-red-400/30">{dangerSignals.length} Bearish</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
          {signals.map((signal, idx) => {
            const cfg = signal.type === 'positive'
              ? { icon: '↑', cls: 'border-emerald-500/30 bg-emerald-500/5', tCls: 'text-emerald-400', badgeCls: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/30', label: 'Bullish' }
              : signal.type === 'danger'
              ? { icon: '↓', cls: 'border-red-500/30 bg-red-500/5', tCls: 'text-red-400', badgeCls: 'bg-red-400/10 text-red-400 border-red-400/30', label: 'Bearish' }
              : { icon: '→', cls: 'border-yellow-500/30 bg-yellow-500/5', tCls: 'text-yellow-400', badgeCls: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/30', label: 'Neutral' }
            return (
              <div key={idx} className={`border rounded-lg p-3.5 ${cfg.cls}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-bold ${cfg.tCls}`}>{cfg.icon} {signal.title}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded border ${cfg.badgeCls}`}>{cfg.label}</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">{signal.description}</p>
                {signal.value && <span className={`text-xs font-mono font-bold ${cfg.tCls} mt-1.5 block`}>{signal.value}</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 상관관계 차트 ── */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5">
        <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
          <span>📊</span> 글로벌 유동성 vs Nasdaq-100 상관관계
        </h2>
        <div className="h-64">
          {monetaryData?.globalM2History && monetaryData?.marketIndices?.nasdaq100History ? (
            <canvas ref={correlationCanvasRef} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              M2 또는 Nasdaq 데이터 로딩 중...
            </div>
          )}
        </div>
        <p className="text-[10px] text-gray-600 mt-3 text-right">* 글로벌 M2 (US+EU+JP+UK) 와 나스닥 지수의 월간 동기화 차트</p>
      </div>

    </div>
  )
}
