import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { getMetric } from '@/lib/metrics'
import { getBaseUrl } from '@/lib/baseUrl'
import MetricChart from './MetricChart'
import MetricExportButtons from './MetricExportButtons'
import RelatedNews from './RelatedNews'

// Render at request-time so we don't self-fetch our own /api routes during
// `next build` (no server is listening then).
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ metric: string }> }): Promise<Metadata> {
  const { metric } = await params
  const m = getMetric(metric)
  if (!m) return {}
  return {
    title: `${m.title} — 머니트래커 | Bitebi`,
    description: m.description.slice(0, 155),
    openGraph: {
      title: `${m.title} — 머니트래커`,
      description: m.description.slice(0, 155),
      url: `https://bitebi.vercel.app/money-tracker/${m.id}`,
      type: 'article',
    },
    alternates: { canonical: `https://bitebi.vercel.app/money-tracker/${m.id}` },
  }
}

async function fetchMetricData(id: string, base: string) {
  try {
    const r = await fetch(`${base}/api/metric-data/${id}`, { cache: 'no-store' })
    const j = await r.json()
    if (!j.success) return null
    return j.data as { current: any; history: { date: string; value: number }[]; source: string }
  } catch { return null }
}

export default async function MetricPage({ params }: { params: Promise<{ metric: string }> }) {
  const { metric } = await params
  const m = getMetric(metric)
  if (!m) notFound()

  const base = await getBaseUrl()
  const data = await fetchMetricData(m.id, base)
  const history = data?.history || []
  const last = history[history.length - 1]?.value
  const current = typeof data?.current === 'number' || typeof data?.current === 'string' ? data?.current : last

  const periodChange = (days: number) => {
    if (history.length < days + 1) return null
    const cur = history[history.length - 1]?.value
    const prev = history[history.length - 1 - days]?.value
    if (!prev) return null
    return ((cur - prev) / prev) * 100
  }
  const c1d = periodChange(1)
  const c7d = periodChange(7)
  const c30d = periodChange(30)

  const fmt = (n: number | null) =>
    n == null ? '-' : `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
  const fmtChangeColor = (n: number | null) =>
    n == null ? 'text-gray-400' : n >= 0 ? 'text-emerald-400' : 'text-red-400'

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6">
        <nav className="text-xs text-gray-400 mb-4">
          <Link href="/money-tracker" className="hover:text-white">머니트래커</Link>
          <span className="mx-2">›</span>
          <span className="text-gray-200">{m.title}</span>
        </nav>

        <header className="mb-6">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-2 flex-wrap">
            <span className="px-2 py-0.5 rounded-full bg-[#21262d] border border-[#30363d]">{m.category.toUpperCase()}</span>
            <span>· 단위 {m.unit}</span>
            {m.isProxy && (
              <span title="원본 데이터가 아닌 파생/근사 지표입니다" className="px-2 py-0.5 rounded-full text-amber-300 border border-amber-300/40">
                근사 / 파생 지표
              </span>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{m.title}</h1>
          <p className="text-sm text-gray-300 leading-relaxed max-w-3xl">{m.description}</p>
        </header>

        {/* KPI grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <KpiBox label="현재값" value={typeof current === 'number' ? current.toLocaleString(undefined, { maximumFractionDigits: 4 }) : String(current ?? '-')} />
          <KpiBox label="1D" value={fmt(c1d)} valueClass={fmtChangeColor(c1d)} />
          <KpiBox label="7D" value={fmt(c7d)} valueClass={fmtChangeColor(c7d)} />
          <KpiBox label="30D" value={fmt(c30d)} valueClass={fmtChangeColor(c30d)} />
        </div>

        {/* Chart */}
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4 md:p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white">장기 추이</h2>
            <MetricExportButtons metricId={m.id} />
          </div>
          <div className="h-[360px]">
            <MetricChart history={history} unit={m.unit} />
          </div>
        </div>

        {/* Definition */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <DefBox title="정의" body={m.description} />
          <DefBox title="계산식 / 데이터 소스">
            <code className="block bg-[#0d1117] border border-[#21262d] rounded-lg px-3 py-2 text-xs text-emerald-300 font-mono mb-2">{m.formula}</code>
            <div className="text-xs text-gray-400">소스: {m.source}</div>
          </DefBox>
        </div>

        {/* Embed snippet */}
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5 mb-6">
          <h2 className="text-sm font-bold text-white mb-3">임베드 코드 (외부 사이트용)</h2>
          <pre className="bg-[#0d1117] border border-[#21262d] rounded-lg p-3 text-xs text-gray-300 overflow-x-auto">
{`<iframe src="https://bitebi.vercel.app/embed/${m.id}" width="100%" height="320" frameborder="0"></iframe>`}
          </pre>
        </div>

        {/* Related news */}
        <div className="mb-6">
          <RelatedNews metricId={m.id} />
        </div>

        {/* Related metrics */}
        {m.relatedMetrics?.length ? (
          <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5">
            <h2 className="text-sm font-bold text-white mb-3">관련 지표</h2>
            <div className="flex flex-wrap gap-2">
              {m.relatedMetrics.map((id) => {
                const r = getMetric(id)
                if (!r) return null
                return (
                  <Link
                    key={id}
                    href={`/money-tracker/${id}`}
                    className="text-xs px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-gray-200 border border-[#30363d]"
                  >
                    {r.shortTitle} →
                  </Link>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function KpiBox({ label, value, valueClass = 'text-white' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className={`text-xl font-bold ${valueClass}`}>{value}</div>
    </div>
  )
}

function DefBox({ title, body, children }: { title: string; body?: string; children?: React.ReactNode }) {
  return (
    <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5">
      <h3 className="text-sm font-bold text-white mb-2">{title}</h3>
      {body && <p className="text-sm text-gray-300 leading-relaxed">{body}</p>}
      {children}
    </div>
  )
}
