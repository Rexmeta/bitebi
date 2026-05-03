'use client'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import Chart from 'chart.js/auto'
import { listMetrics } from '@/lib/metrics'

interface Point { date: string; value: number }

async function loadMetric(id: string): Promise<{ history: Point[]; current: any } | null> {
  try {
    const r = await fetch(`/api/metric-data/${id}`)
    const j = await r.json()
    if (!j.success) return null
    return j.data
  } catch { return null }
}

function alignByDate(a: Point[], b: Point[]): { dates: string[]; av: number[]; bv: number[] } {
  const map = new Map<string, number>()
  for (const p of b) map.set(p.date, p.value)
  const dates: string[] = [], av: number[] = [], bv: number[] = []
  for (const p of a) {
    if (map.has(p.date)) {
      dates.push(p.date)
      av.push(p.value)
      bv.push(map.get(p.date)!)
    }
  }
  return { dates, av, bv }
}

function pearson(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length)
  if (n === 0) return NaN
  const mx = x.reduce((s, v) => s + v, 0) / n
  const my = y.reduce((s, v) => s + v, 0) / n
  let num = 0, dx = 0, dy = 0
  for (let i = 0; i < n; i++) {
    const a = x[i] - mx, b = y[i] - my
    num += a * b; dx += a * a; dy += b * b
  }
  return dx > 0 && dy > 0 ? num / Math.sqrt(dx * dy) : 0
}

function bestLag(av: number[], bv: number[], maxLag = 30): { lag: number; corr: number } {
  let best = { lag: 0, corr: -Infinity }
  for (let lag = -maxLag; lag <= maxLag; lag++) {
    let x: number[], y: number[]
    if (lag >= 0) { x = av.slice(0, av.length - lag); y = bv.slice(lag) }
    else { x = av.slice(-lag); y = bv.slice(0, bv.length + lag) }
    if (x.length < 5) continue
    const c = pearson(x, y)
    if (c > best.corr) best = { lag, corr: c }
  }
  return best
}

export default function CompareTool() {
  const metrics = listMetrics()
  const [a, setA] = useState<string>('global-liquidity')
  const [b, setB] = useState<string>('stablecoin-supply')
  const [aData, setAData] = useState<Point[]>([])
  const [bData, setBData] = useState<Point[]>([])
  const [loading, setLoading] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)

  // load from URL on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    const u = new URL(window.location.href)
    const ap = u.searchParams.get('a'), bp = u.searchParams.get('b')
    if (ap && metrics.find(m => m.id === ap)) setA(ap)
    if (bp && metrics.find(m => m.id === bp)) setB(bp)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // sync url
  useEffect(() => {
    if (typeof window === 'undefined') return
    const u = new URL(window.location.href)
    u.searchParams.set('a', a); u.searchParams.set('b', b)
    window.history.replaceState({}, '', u.toString())
  }, [a, b])

  // load data
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([loadMetric(a), loadMetric(b)]).then(([da, db]) => {
      if (cancelled) return
      setAData(da?.history || [])
      setBData(db?.history || [])
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [a, b])

  const aligned = useMemo(() => alignByDate(aData, bData), [aData, bData])
  const corr = useMemo(() => pearson(aligned.av, aligned.bv), [aligned])
  const lag = useMemo(() => bestLag(aligned.av, aligned.bv, 30), [aligned])

  useEffect(() => {
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }
    if (!canvasRef.current || !aligned.dates.length) return
    const ctx = canvasRef.current.getContext('2d'); if (!ctx) return
    const ma = listMetrics().find(m => m.id === a)
    const mb = listMetrics().find(m => m.id === b)
    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: aligned.dates,
        datasets: [
          { label: ma?.shortTitle || a, data: aligned.av, borderColor: '#818cf8', backgroundColor: 'rgba(129,140,248,0.08)', yAxisID: 'y',  tension: 0.3, fill: true,  pointRadius: 0 },
          { label: mb?.shortTitle || b, data: aligned.bv, borderColor: '#34d399', backgroundColor: 'transparent',           yAxisID: 'y1', tension: 0.3, fill: false, pointRadius: 0 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { labels: { color: '#9ca3af', font: { size: 11 } } } },
        scales: {
          x:  { ticks: { color: '#6b7280', maxTicksLimit: 8 }, grid: { color: '#21262d' } },
          y:  { type: 'linear', position: 'left',  ticks: { color: '#6b7280' }, grid: { color: '#21262d' } },
          y1: { type: 'linear', position: 'right', ticks: { color: '#6b7280' }, grid: { drawOnChartArea: false } },
        },
      },
    })
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [aligned, a, b])

  const downloadPng = () => {
    if (!canvasRef.current) return
    const url = canvasRef.current.toDataURL('image/png')
    const link = document.createElement('a')
    link.href = url
    link.download = `compare-${a}-vs-${b}.png`
    link.click()
  }

  const copyShare = () => {
    if (typeof window === 'undefined') return
    navigator.clipboard?.writeText(window.location.href)
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4 md:p-5 grid grid-cols-1 md:grid-cols-3 gap-3">
        <Selector label="좌측 축 (A)" value={a} onChange={setA} options={metrics.map(m => ({ id: m.id, label: m.shortTitle }))} />
        <Selector label="우측 축 (B)" value={b} onChange={setB} options={metrics.map(m => ({ id: m.id, label: m.shortTitle }))} />
        <div className="flex items-end gap-2">
          <button onClick={copyShare} className="text-xs px-3 py-2 rounded-lg bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-gray-200">공유 URL 복사</button>
          <button onClick={downloadPng} className="text-xs px-3 py-2 rounded-lg bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-gray-200">PNG 다운로드</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="공통 데이터 점" value={`${aligned.dates.length}`} />
        <Stat label="피어슨 상관계수" value={isFinite(corr) ? corr.toFixed(3) : '-'} valueClass={corr > 0.5 ? 'text-emerald-400' : corr < -0.5 ? 'text-red-400' : 'text-gray-200'} />
        <Stat label="최대 상관 lag" value={`${lag.lag}일`} sub={isFinite(lag.corr) ? `r=${lag.corr.toFixed(2)}` : ''} />
        <Stat label="해석" value={lag.lag > 0 ? 'A가 선행' : lag.lag < 0 ? 'B가 선행' : '동시'} valueClass="text-amber-300" />
      </div>

      <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4 md:p-5">
        <div className="h-[420px]">
          {loading
            ? <div className="flex items-center justify-center h-full text-gray-500 text-sm">데이터 로딩 중…</div>
            : aligned.dates.length
              ? <canvas ref={canvasRef} />
              : <div className="flex items-center justify-center h-full text-gray-500 text-sm">두 지표의 공통 날짜가 없습니다.</div>}
        </div>
      </div>
    </div>
  )
}

function Selector({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { id: string; label: string }[] }) {
  return (
    <div>
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white">
        {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </div>
  )
}

function Stat({ label, value, sub, valueClass = 'text-white' }: { label: string; value: string; sub?: string; valueClass?: string }) {
  return (
    <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className={`text-xl font-bold ${valueClass}`}>{value}</div>
      {sub && <div className="text-[11px] text-gray-500 mt-0.5">{sub}</div>}
    </div>
  )
}
