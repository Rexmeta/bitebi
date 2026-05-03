import { NextRequest, NextResponse } from 'next/server'
import { getMetric, resolvePath } from '@/lib/metrics'

// Resolve a same-origin internal API URL safely.
// Never trust the inbound `Host` header (potential SSRF / open-proxy).
function internalBase(req: NextRequest): string {
  // 1. Explicit env override wins (production deploys must set this).
  const env = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_INTERNAL_BASE_URL
  if (env) return env.replace(/\/+$/, '')
  // 2. Fall back to req.nextUrl.origin (provided by Next router, not raw header).
  try {
    const o = req.nextUrl.origin
    if (o) return o
  } catch {}
  // 3. Last resort.
  return 'http://localhost:5000'
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const metric = getMetric(id)
  if (!metric) {
    return NextResponse.json({ success: false, error: 'unknown metric' }, { status: 404 })
  }

  // Whitelist enforcement: metric.apiPath MUST be a known relative API route.
  if (!metric.apiPath.startsWith('/api/')) {
    return NextResponse.json({ success: false, error: 'invalid metric apiPath' }, { status: 500 })
  }

  const url = new URL(req.url)
  const format = url.searchParams.get('format') || 'json'
  const apiUrl = `${internalBase(req)}${metric.apiPath}`

  let upstream: any
  try {
    const r = await fetch(apiUrl, { cache: 'no-store' })
    upstream = await r.json()
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'upstream failed' }, { status: 502 })
  }

  const root = upstream?.data ?? upstream
  const current = resolvePath(root, metric.selector)
  const historyArr = metric.historySelector !== undefined ? resolvePath(root, metric.historySelector) : null
  const valueKey = metric.historyValueKey || 'value'
  const dateKey = metric.historyDateKey || 'date'
  const history: { date: string; value: number }[] = Array.isArray(historyArr)
    ? historyArr.map((p: any) => ({
        date: typeof p[dateKey] === 'number'
          ? new Date(p[dateKey] * (p[dateKey] < 1e12 ? 1000 : 1)).toISOString().slice(0, 10)
          : String(p[dateKey] || ''),
        value: Number(p[valueKey] ?? 0),
      })).filter((p) => p.date)
    : []

  const result = {
    id: metric.id,
    title: metric.title,
    unit: metric.unit,
    current,
    history,
    source: metric.source,
    formula: metric.formula,
    fetchedAt: new Date().toISOString(),
  }

  if (format === 'csv') {
    const header = 'date,value\n'
    const rows = history.map((p) => `${p.date},${p.value}`).join('\n')
    return new NextResponse(header + rows, {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="${metric.id}.csv"`,
      },
    })
  }

  return NextResponse.json({ success: true, data: result })
}
