'use client'
import React, { useEffect, useState } from 'react'
import type { Signal } from '../hooks/useMoneyTrackerData'

interface HistoryEntry {
  id: string
  type: 'positive' | 'warning' | 'danger'
  title: string
  description: string
  firstSeen: string
  lastSeen: string
  count: number
}

interface BacktestEntry {
  signalId: string
  occurrences: number
  avgReturn30d: number | null
  medianReturn30d?: number | null
  avgReturn90d: number | null
  medianReturn90d?: number | null
  hitRate30d?: number | null
}

export default function SignalHistoryPanel({ currentSignals: _currentSignals }: { currentSignals: Signal[] }) {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [backtest, setBacktest] = useState<BacktestEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch('/api/signals')
        const j = await r.json()
        if (j.success) {
          setHistory(j.history || [])
          setBacktest(j.backtest || [])
        }
      } catch { /* ignore */ } finally { setLoading(false) }
    }
    load()
    // Read-only panel. Signal ingestion is handled by trusted server-side
    // jobs (POST /api/signals requires SIGNALS_WRITE_TOKEN); the browser
    // intentionally does not write to avoid public history poisoning.
  }, [])

  const lastYear = Date.now() - 365 * 24 * 60 * 60 * 1000
  const recent = history.filter(h => new Date(h.firstSeen).getTime() >= lastYear)

  const fmtPct = (n: number | null) => n == null ? '-' : `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
  const colorFor = (n: number | null) => n == null ? 'text-gray-400' : n > 0 ? 'text-emerald-400' : 'text-red-400'

  return (
    <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5">
      <h2 className="text-sm font-bold text-white mb-4">📜 시그널 히스토리 + 간이 백테스트</h2>
      {loading ? (
        <p className="text-xs text-gray-500">로드 중…</p>
      ) : recent.length === 0 ? (
        <p className="text-xs text-gray-500">아직 서버에 기록된 시그널 발동 이력이 없습니다. 시그널 발동은 서버 측 정기 작업(인증된 토큰)으로만 적재됩니다.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#21262d]">
                <th className="text-left px-2 py-2 text-xs text-gray-500 font-medium">시그널</th>
                <th className="text-right px-2 py-2 text-xs text-gray-500 font-medium">발동 횟수</th>
                <th className="text-right px-2 py-2 text-xs text-gray-500 font-medium">최초/최근</th>
                <th className="text-right px-2 py-2 text-xs text-gray-500 font-medium">+30D BTC (평균/중앙)</th>
                <th className="text-right px-2 py-2 text-xs text-gray-500 font-medium">+30D 적중률</th>
                <th className="text-right px-2 py-2 text-xs text-gray-500 font-medium">+90D BTC (평균/중앙)</th>
              </tr>
            </thead>
            <tbody>
              {recent.map(h => {
                const bt = backtest.find(b => b.signalId === h.id)
                return (
                  <tr key={h.id} className="border-b border-[#21262d]/50">
                    <td className="px-2 py-2">
                      <div className="text-sm text-white">{h.title}</div>
                      <div className="text-[11px] text-gray-500">{h.description}</div>
                    </td>
                    <td className="px-2 py-2 text-right font-mono text-gray-200">{h.count}</td>
                    <td className="px-2 py-2 text-right text-[11px] text-gray-400">
                      {h.firstSeen.slice(0, 10)}<br />→ {h.lastSeen.slice(0, 10)}
                    </td>
                    <td className={`px-2 py-2 text-right font-mono ${colorFor(bt?.avgReturn30d ?? null)}`}>
                      {fmtPct(bt?.avgReturn30d ?? null)}
                      <span className="text-[10px] text-gray-500 block">중앙 {fmtPct(bt?.medianReturn30d ?? null)}</span>
                    </td>
                    <td className={`px-2 py-2 text-right font-mono ${colorFor(bt?.hitRate30d ? (bt.hitRate30d - 0.5) * 100 : null)}`}>
                      {bt?.hitRate30d != null ? `${(bt.hitRate30d * 100).toFixed(0)}%` : '-'}
                    </td>
                    <td className={`px-2 py-2 text-right font-mono ${colorFor(bt?.avgReturn90d ?? null)}`}>
                      {fmtPct(bt?.avgReturn90d ?? null)}
                      <span className="text-[10px] text-gray-500 block">중앙 {fmtPct(bt?.medianReturn90d ?? null)}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[11px] text-gray-500 mt-3">
        * 백테스트는 각 신호의 개별 발동 시점 기준 +30/+90일 BTC 종가 변화율의 평균/중앙값/적중률입니다. 표본이 적을수록 신뢰도가 낮습니다.<br />
        * 시그널 적재는 서버 측 인증 작업으로만 이루어지며, 브라우저에서는 직접 기록하지 않습니다(공용 데이터 위변조 방지).
      </p>
    </div>
  )
}
