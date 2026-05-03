import { ImageResponse } from 'next/og'
import { getMetric } from '@/lib/metrics'
import { getBaseUrl } from '@/lib/baseUrl'

export const runtime = 'nodejs'
export const alt = '머니트래커 지표'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

async function loadHistory(metricId: string, base: string): Promise<{ current: any; history: { date: string; value: number }[] } | null> {
  try {
    const r = await fetch(`${base}/api/metric-data/${metricId}`, { cache: 'no-store' })
    const j = await r.json()
    if (!j.success) return null
    return j.data
  } catch { return null }
}

function fmtValue(v: any, unit: string): string {
  if (v == null || v === '') return '-'
  const n = typeof v === 'number' ? v : Number(v)
  if (!isFinite(n)) return String(v)
  if (unit === '%') return `${n.toFixed(2)}%`
  if (unit === 'index' || unit === 'ratio') return n.toFixed(2)
  if (unit === 'USD') {
    const a = Math.abs(n)
    if (a >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
    if (a >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
    if (a >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
    return `$${n.toLocaleString()}`
  }
  return n.toLocaleString()
}

function sparkPoints(values: number[], w: number, h: number): string {
  if (!values.length) return ''
  const min = Math.min(...values), max = Math.max(...values), range = max - min || 1
  const step = w / Math.max(1, values.length - 1)
  return values.map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / range) * h).toFixed(1)}`).join(' ')
}

export default async function MetricOgImage({ params }: { params: { metric: string } }) {
  const m = getMetric(params.metric)
  if (!m) {
    return new ImageResponse(<div style={{ display: 'flex', width: '100%', height: '100%', background: '#0d1117', color: 'white', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>머니트래커</div>, size)
  }

  const base = await getBaseUrl()
  const data = await loadHistory(m.id, base)
  const history = data?.history?.slice(-30) || []
  const values = history.map(h => h.value)

  const w = 1100, h = 220
  const points = sparkPoints(values, w, h)

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#0d1117', color: 'white', padding: 50, fontFamily: 'system-ui' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 22, color: '#94a3b8' }}>
          <div style={{ display: 'flex', width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)' }} />
          <div style={{ display: 'flex' }}>Bitebi · 머니트래커 · {m.category.toUpperCase()}</div>
        </div>
        <div style={{ display: 'flex', fontSize: 56, fontWeight: 700, marginTop: 16 }}>{m.title}</div>
        <div style={{ display: 'flex', fontSize: 110, fontWeight: 800, marginTop: 4, color: '#a5b4fc' }}>
          {fmtValue(data?.current, m.unit)}
        </div>
        <div style={{ display: 'flex', flex: 1, marginTop: 8 }}>
          <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
            <polyline fill="none" stroke="#818cf8" strokeWidth={3} points={points} />
          </svg>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 22, color: '#64748b' }}>
          <div style={{ display: 'flex' }}>{m.source}</div>
          <div style={{ display: 'flex' }}>bitebi.vercel.app/money-tracker/{m.id}</div>
        </div>
      </div>
    ),
    size,
  )
}
