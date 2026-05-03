'use client'
import React, { useEffect, useState } from 'react'

interface KoreaData {
  kimchiPremium: { value: number; upbitKrw: number; coinbaseUsd: number; usdKrw: number }
  upbit: { volume24hKrw: number; topGainers: { market: string; changeRate: number }[] }
  bithumb: { volume24hKrw: number }
  marketShare: { upbit: number; bithumb: number }
  lastUpdated: string
}

export default function KoreaPulse() {
  const [data, setData] = useState<KoreaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const r = await fetch('/api/korea')
        const j = await r.json()
        if (!cancelled) {
          if (j.success) setData(j.data)
          else setErr(j.error || '로드 실패')
        }
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || '네트워크 오류')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    const t = setInterval(load, 2 * 60 * 1000)
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  if (loading) return <div className="text-gray-400 text-sm py-8 text-center">Korea 데이터 로딩 중…</div>
  if (err) return <div className="text-red-400 text-sm py-8 text-center">{err}</div>
  if (!data) return null

  const kp = data.kimchiPremium.value
  const kpColor = kp >= 3 ? 'text-red-400' : kp >= 1 ? 'text-amber-400' : kp >= -1 ? 'text-emerald-400' : 'text-blue-400'
  const fmtKrwT = (v: number) => `₩${(v / 1e12).toFixed(2)}조`

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card label="김치프리미엄" value={`${kp >= 0 ? '+' : ''}${kp.toFixed(2)}%`} valueClass={kpColor}
          sub={`업비트 ₩${data.kimchiPremium.upbitKrw.toLocaleString()} / 글로벌 $${data.kimchiPremium.coinbaseUsd.toLocaleString()}`} />
        <Card label="업비트 24h 거래대금" value={fmtKrwT(data.upbit.volume24hKrw)} sub={`점유율 ${data.marketShare.upbit.toFixed(1)}%`} valueClass="text-blue-400" />
        <Card label="빗썸 24h 거래대금" value={fmtKrwT(data.bithumb.volume24hKrw)} sub={`점유율 ${data.marketShare.bithumb.toFixed(1)}%`} valueClass="text-violet-400" />
        <Card label="USD/KRW" value={`₩${data.kimchiPremium.usdKrw.toFixed(0)}`} sub="exchangerate.host" valueClass="text-cyan-400" />
      </div>

      <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5">
        <h2 className="text-sm font-bold text-white mb-4">업비트 KRW 마켓 상승률 TOP 10</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#21262d]">
                <th className="text-left px-2 py-2 text-xs text-gray-500 font-medium">#</th>
                <th className="text-left px-2 py-2 text-xs text-gray-500 font-medium">마켓</th>
                <th className="text-right px-2 py-2 text-xs text-gray-500 font-medium">24h 변화</th>
              </tr>
            </thead>
            <tbody>
              {data.upbit.topGainers.map((g, i) => (
                <tr key={g.market} className="border-b border-[#21262d]/50">
                  <td className="px-2 py-2 text-gray-500 font-mono text-xs">{i + 1}</td>
                  <td className="px-2 py-2 font-medium text-white">{g.market}</td>
                  <td className={`px-2 py-2 text-right font-mono ${g.changeRate >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {g.changeRate >= 0 ? '+' : ''}{g.changeRate.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-gray-500 text-right">
        업데이트: {new Date(data.lastUpdated).toLocaleString('ko-KR')}
      </div>
    </div>
  )
}

function Card({ label, value, sub, valueClass = 'text-white' }: { label: string; value: string; sub?: string; valueClass?: string }) {
  return (
    <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className={`text-xl font-bold mb-0.5 ${valueClass}`}>{value}</div>
      {sub && <div className="text-[11px] text-gray-500">{sub}</div>}
    </div>
  )
}
