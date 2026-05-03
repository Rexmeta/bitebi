import { notFound } from 'next/navigation'
import { getMetric } from '@/lib/metrics'
import { getBaseUrl } from '@/lib/baseUrl'
import MetricChart from '@/app/money-tracker/[metric]/MetricChart'

// Render at request-time so we don't self-fetch our own /api routes during
// `next build` (no server is listening then).
export const dynamic = 'force-dynamic'

async function fetchMetricData(id: string, base: string) {
  try {
    const r = await fetch(`${base}/api/metric-data/${id}`, { cache: 'no-store' })
    const j = await r.json()
    if (!j.success) return null
    return j.data
  } catch { return null }
}

export default async function EmbedPage({ params }: { params: Promise<{ metric: string }> }) {
  const { metric } = await params
  const m = getMetric(metric)
  if (!m) notFound()
  const base = await getBaseUrl()
  const data = await fetchMetricData(m.id, base)
  const history = data?.history || []
  const current = data?.current

  return (
    <div className="bg-[#0d1117] text-white p-3 min-h-screen">
      <div className="flex items-baseline justify-between mb-2">
        <div>
          <div className="text-xs text-gray-400">{m.shortTitle}</div>
          <div className="text-lg font-bold">
            {typeof current === 'number' ? current.toLocaleString(undefined, { maximumFractionDigits: 4 }) : String(current ?? '-')}
          </div>
        </div>
        <a
          href={`/money-tracker/${m.id}`}
          target="_blank"
          rel="noreferrer"
          className="text-[10px] text-gray-400 hover:text-white"
        >
          bitebi.vercel.app
        </a>
      </div>
      <div className="h-[240px]">
        <MetricChart history={history} unit={m.unit} />
      </div>
    </div>
  )
}
