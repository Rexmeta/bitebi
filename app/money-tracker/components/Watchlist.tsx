'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { listMetrics } from '@/lib/metrics'

interface WatchItem {
  metricId: string
  threshold?: number
  direction?: 'above' | 'below'
}

const STORAGE_KEY = 'mt_watchlist_v1'

function load(): WatchItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}
function save(items: WatchItem[]) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)) } catch { /* ignore */ }
}

export default function Watchlist() {
  const metrics = listMetrics()
  const [items, setItems] = useState<WatchItem[]>([])
  const [add, setAdd] = useState<string>(metrics[0]?.id || '')
  const [permission, setPermission] = useState<string>('default')

  useEffect(() => {
    setItems(load())
    if (typeof Notification !== 'undefined') setPermission(Notification.permission)
  }, [])

  const persist = (next: WatchItem[]) => { setItems(next); save(next) }
  const addItem = () => {
    if (!add) return
    if (items.find(i => i.metricId === add)) return
    persist([...items, { metricId: add }])
  }
  const removeItem = (id: string) => persist(items.filter(i => i.metricId !== id))
  const setThreshold = (id: string, threshold: number, direction: 'above' | 'below') =>
    persist(items.map(i => i.metricId === id ? { ...i, threshold, direction } : i))

  // Periodically poll watched metrics and fire local notifications when thresholds breach.
  useEffect(() => {
    if (!items.length) return
    let cancelled = false
    const check = async () => {
      for (const w of items) {
        if (w.threshold == null || !w.direction) continue
        try {
          const r = await fetch(`/api/metric-data/${w.metricId}`)
          const j = await r.json()
          if (!j.success) continue
          const cur = Number(j.data.current)
          if (!isFinite(cur)) continue
          const breach =
            w.direction === 'above' ? cur > w.threshold :
            w.direction === 'below' ? cur < w.threshold : false
          if (breach && permission === 'granted' && !cancelled) {
            new Notification(`머니트래커 알림: ${j.data.title}`, {
              body: `현재값 ${cur} ${w.direction === 'above' ? '>' : '<'} 임계값 ${w.threshold}`,
            })
          }
        } catch { /* ignore */ }
      }
    }
    check()
    const t = setInterval(check, 5 * 60 * 1000)
    return () => { cancelled = true; clearInterval(t) }
  }, [items, permission])

  const reqNotif = async () => {
    if (typeof Notification === 'undefined') return
    const p = await Notification.requestPermission()
    setPermission(p)
  }

  return (
    <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-white">⭐ 워치리스트 & 임계값 알림</h2>
        {permission !== 'granted' && (
          <button onClick={reqNotif} className="text-xs px-2.5 py-1 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-gray-200 border border-[#30363d]">
            브라우저 알림 켜기
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 mb-4">
        <select value={add} onChange={e => setAdd(e.target.value)} className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white">
          {metrics.map(m => <option key={m.id} value={m.id}>{m.shortTitle}</option>)}
        </select>
        <button onClick={addItem} className="text-xs px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white">추가</button>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-gray-500 text-center py-4">관심 지표를 추가하면 임계값 도달 시 브라우저 알림을 받을 수 있습니다.</p>
      ) : (
        <div className="space-y-2">
          {items.map(w => {
            const m = metrics.find(x => x.id === w.metricId)
            if (!m) return null
            return (
              <div key={w.metricId} className="bg-[#0d1117] border border-[#21262d] rounded-lg p-3 flex items-center gap-2">
                <Link href={`/money-tracker/${m.id}`} className="flex-1 text-sm text-white hover:text-blue-300">
                  {m.shortTitle}
                </Link>
                <select
                  value={w.direction || ''}
                  onChange={e => setThreshold(w.metricId, w.threshold ?? 0, e.target.value as 'above' | 'below')}
                  className="bg-[#161b22] border border-[#30363d] rounded px-2 py-1 text-xs text-gray-200"
                >
                  <option value="">방향</option>
                  <option value="above">초과</option>
                  <option value="below">미만</option>
                </select>
                <input
                  type="number"
                  defaultValue={w.threshold}
                  placeholder="임계값"
                  onBlur={e => setThreshold(w.metricId, parseFloat(e.target.value), w.direction || 'above')}
                  className="w-28 bg-[#161b22] border border-[#30363d] rounded px-2 py-1 text-xs text-gray-200"
                />
                <button onClick={() => removeItem(w.metricId)} className="text-xs text-red-400 hover:text-red-300">삭제</button>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-[11px] text-gray-500 mt-3">
        * 알림은 브라우저 로컬에서만 작동합니다. 이메일/텔레그램 알림은 후속 task로 분리되었습니다.
      </p>
    </div>
  )
}
