'use client'
import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { trackEvent } from '@/lib/analytics'
import { listMetrics, MetricDefinition } from '@/lib/metrics'

interface MetricSnapshot {
  id: string
  current: number | string | null
  history: { date: string; value: number }[]
}

const CORE_METRIC_IDS = [
  'global-liquidity',
  'stablecoin-supply',
  'exchange-netflow',
  'derivatives',
  'etf-flows',
  'onchain-cohorts',
]

function fmtValue(v: any, unit: string): string {
  if (v == null || v === '') return '-'
  const n = typeof v === 'number' ? v : Number(v)
  if (!isFinite(n)) return String(v)
  if (unit === '%') return `${n.toFixed(2)}%`
  if (unit === 'index' || unit === 'ratio') return n.toFixed(2)
  if (unit === 'USD') {
    const abs = Math.abs(n)
    if (abs >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
    if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
    if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
    return `$${n.toLocaleString()}`
  }
  return n.toLocaleString()
}

function periodChange(history: { date: string; value: number }[], days: number): number | null {
  if (history.length < days + 1) return null
  const cur = history[history.length - 1]?.value
  const prev = history[history.length - 1 - days]?.value
  if (!prev) return null
  return ((cur - prev) / prev) * 100
}

function ytdChange(history: { date: string; value: number }[]): number | null {
  if (!history.length) return null
  const year = new Date().getUTCFullYear()
  const firstOfYear = history.find(p => p.date >= `${year}-01-01`)
  const last = history[history.length - 1]
  if (!firstOfYear || !last || !firstOfYear.value) return null
  return ((last.value - firstOfYear.value) / firstOfYear.value) * 100
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const ref = useRef<SVGSVGElement>(null)
  const w = 120, h = 30
  if (!values.length) return <div style={{ width: w, height: h }} />
  const min = Math.min(...values), max = Math.max(...values)
  const range = max - min || 1
  const step = w / Math.max(1, values.length - 1)
  const points = values.map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / range) * h).toFixed(1)}`).join(' ')
  return (
    <svg ref={ref} width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
    </svg>
  )
}

function ChangeChip({ label, value }: { label: string; value: number | null }) {
  const cls = value == null ? 'text-gray-500' : value >= 0 ? 'text-emerald-400' : 'text-red-400'
  return (
    <div className="flex flex-col items-center px-1.5 py-1 rounded bg-[#0d1117] border border-[#21262d] text-[10px]">
      <span className="text-gray-500">{label}</span>
      <span className={`font-mono font-bold ${cls}`}>{value == null ? '-' : `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`}</span>
    </div>
  )
}

export default function CoreKpiGrid() {
  const metrics = CORE_METRIC_IDS.map((id) => listMetrics().find(m => m.id === id)).filter(Boolean) as MetricDefinition[]
  const [snapshots, setSnapshots] = useState<Record<string, MetricSnapshot>>({})

  useEffect(() => {
    let cancelled = false
    Promise.all(metrics.map(async (m) => {
      try {
        const r = await fetch(`/api/metric-data/${m.id}`)
        const j = await r.json()
        if (j.success) return { id: m.id, current: j.data.current, history: j.data.history || [] } as MetricSnapshot
      } catch { /* ignore */ }
      return { id: m.id, current: null, history: [] } as MetricSnapshot
    })).then((arr) => {
      if (cancelled) return
      const map: Record<string, MetricSnapshot> = {}
      arr.forEach(s => { map[s.id] = s })
      setSnapshots(map)
    })
    return () => { cancelled = true }
  }, [])

  const colors = ['#818cf8', '#34d399', '#f59e0b', '#f472b6', '#22d3ee', '#a78bfa']

  return (
    <div className="-mx-4 px-4 md:mx-0 md:px-0">
      <div className="flex md:grid md:grid-cols-3 gap-3 md:gap-4 overflow-x-auto md:overflow-visible scrollbar-none snap-x snap-mandatory">
        {metrics.map((m, idx) => {
          const snap = snapshots[m.id]
          const c1 = snap ? periodChange(snap.history, 1) : null
          const c7 = snap ? periodChange(snap.history, 7) : null
          const c30 = snap ? periodChange(snap.history, 30) : null
          const cYtd = snap ? ytdChange(snap.history) : null
          const sparkValues = snap?.history.slice(-30).map(p => p.value) || []
          return (
            <Link
              key={m.id}
              href={`/money-tracker/${m.id}`}
              onClick={() => trackEvent('mt_kpi_card_click', { metric: m.id })}
              className="snap-start shrink-0 md:shrink w-[78%] sm:w-[60%] md:w-auto bg-[#161b22] border border-[#21262d] hover:border-[#30363d] rounded-xl p-4 transition-colors"
            >
              <div className="flex items-center justify-between mb-2 gap-1">
                <div className="text-xs text-gray-400 flex items-center gap-1.5 truncate">
                  {m.shortTitle}
                  {m.isProxy && (
                    <span title="원본 데이터가 아닌 파생/근사 지표입니다" className="text-[9px] text-amber-300 border border-amber-300/40 rounded px-1 py-0.5 leading-none">
                      근사
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-gray-500 px-1.5 py-0.5 rounded border border-[#21262d] shrink-0">{m.category}</span>
              </div>
              <div className="text-2xl font-bold text-white mb-2">
                {fmtValue(snap?.current, m.unit)}
              </div>
              <div className="mb-3">
                <Sparkline values={sparkValues} color={colors[idx % colors.length]} />
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                <ChangeChip label="1D" value={c1} />
                <ChangeChip label="7D" value={c7} />
                <ChangeChip label="30D" value={c30} />
                <ChangeChip label="YTD" value={cYtd} />
              </div>
              <div className="mt-2 text-[10px] text-blue-400 hover:underline">자세히 →</div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
