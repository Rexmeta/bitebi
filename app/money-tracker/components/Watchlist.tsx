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
const TOKEN_KEY = 'mt_device_token_v1'

function loadLocal(): WatchItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}
function saveLocal(items: WatchItem[]) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)) } catch { /* ignore */ }
}

function getOrCreateToken(): string {
  if (typeof window === 'undefined') return ''
  try {
    let t = localStorage.getItem(TOKEN_KEY)
    if (t && /^[A-Za-z0-9_-]{16,128}$/.test(t)) return t
    // 32-char URL-safe token
    const bytes = new Uint8Array(24)
    crypto.getRandomValues(bytes)
    t = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    localStorage.setItem(TOKEN_KEY, t)
    return t
  } catch {
    return ''
  }
}

export default function Watchlist() {
  const metrics = listMetrics()
  const [items, setItems] = useState<WatchItem[]>([])
  const [add, setAdd] = useState<string>(metrics[0]?.id || '')
  const [permission, setPermission] = useState<string>('default')
  const [token, setToken] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [savedEmail, setSavedEmail] = useState<string | null>(null)
  const [telegramChatId, setTelegramChatId] = useState<string>('')
  const [savedTelegram, setSavedTelegram] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string>('')

  // Initial bootstrap: device token + load local items, then sync with server.
  useEffect(() => {
    const t = getOrCreateToken()
    setToken(t)
    setItems(loadLocal())
    if (typeof Notification !== 'undefined') setPermission(Notification.permission)
    if (!t) return
    ;(async () => {
      try {
        const r = await fetch('/api/watchlist', { headers: { 'x-device-token': t } })
        const j = await r.json()
        if (j?.success && j.data) {
          if (Array.isArray(j.data.items) && j.data.items.length > 0) {
            const remote: WatchItem[] = j.data.items.map((i: any) => ({
              metricId: i.metricId, threshold: i.threshold, direction: i.direction,
            }))
            setItems(remote)
            saveLocal(remote)
          }
          if (j.data.email) { setEmail(j.data.email); setSavedEmail(j.data.email) }
          if (j.data.telegramChatId) { setTelegramChatId(j.data.telegramChatId); setSavedTelegram(j.data.telegramChatId) }
        }
      } catch { /* ignore */ }
    })()
  }, [])

  const pushToServer = async (next: WatchItem[], extra?: { email?: string | null; telegramChatId?: string | null }) => {
    if (!token) return
    setSyncing(true)
    try {
      const body: any = { items: next }
      if (extra && 'email' in extra) body.email = extra.email
      if (extra && 'telegramChatId' in extra) body.telegramChatId = extra.telegramChatId
      const r = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-device-token': token },
        body: JSON.stringify(body),
      })
      const j = await r.json()
      if (j?.success) {
        setSyncMsg('서버 저장 완료')
        if (j.data?.email !== undefined) setSavedEmail(j.data.email || null)
        if (j.data?.telegramChatId !== undefined) setSavedTelegram(j.data.telegramChatId || null)
      } else {
        setSyncMsg(j?.error || '저장 실패')
      }
    } catch (e: any) {
      setSyncMsg(e?.message || '저장 실패')
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMsg(''), 2500)
    }
  }

  const persist = (next: WatchItem[]) => {
    setItems(next); saveLocal(next); pushToServer(next)
  }
  const addItem = () => {
    if (!add) return
    if (items.find(i => i.metricId === add)) return
    persist([...items, { metricId: add }])
  }
  const removeItem = (id: string) => persist(items.filter(i => i.metricId !== id))
  const setThreshold = (id: string, threshold: number, direction: 'above' | 'below') =>
    persist(items.map(i => i.metricId === id ? { ...i, threshold, direction } : i))

  const saveEmail = () => {
    const v = email.trim()
    if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { setSyncMsg('이메일 형식 오류'); return }
    pushToServer(items, { email: v || null })
  }
  const saveTelegram = () => {
    const v = telegramChatId.trim()
    if (v && !/^-?\d{3,20}$/.test(v)) { setSyncMsg('텔레그램 chat_id는 숫자여야 합니다'); return }
    pushToServer(items, { telegramChatId: v || null })
  }

  // Periodically poll watched metrics and fire local notifications when thresholds breach.
  // Server-side cron sends email/Telegram independently; this is best-effort foreground UX.
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
        <div className="flex items-center gap-2">
          {syncMsg && <span className="text-[11px] text-gray-400">{syncMsg}</span>}
          {permission !== 'granted' && (
            <button onClick={reqNotif} className="text-xs px-2.5 py-1 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-gray-200 border border-[#30363d]">
              브라우저 알림 켜기
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <select value={add} onChange={e => setAdd(e.target.value)} className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white">
          {metrics.map(m => <option key={m.id} value={m.id}>{m.shortTitle}</option>)}
        </select>
        <button onClick={addItem} disabled={syncing} className="text-xs px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50">추가</button>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-gray-500 text-center py-4">관심 지표를 추가하면 임계값 도달 시 알림을 받을 수 있습니다.</p>
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

      <div className="mt-4 pt-4 border-t border-[#21262d] space-y-3">
        <p className="text-[11px] text-gray-500">
          서버에 등록하면 브라우저를 닫아도 5분 주기 평가로 이메일·텔레그램 알림이 전송됩니다.
        </p>

        <div>
          <label className="block text-[11px] text-gray-400 mb-1">이메일 추가 {savedEmail && <span className="text-green-400">· 저장됨: {savedEmail}</span>}</label>
          <div className="flex items-center gap-2">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white"
            />
            <button onClick={saveEmail} disabled={syncing} className="text-xs px-3 py-2 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-gray-200 border border-[#30363d] disabled:opacity-50">저장</button>
          </div>
        </div>

        <div>
          <label className="block text-[11px] text-gray-400 mb-1">
            텔레그램 연결 {savedTelegram && <span className="text-green-400">· 저장됨: {savedTelegram}</span>}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={telegramChatId}
              onChange={e => setTelegramChatId(e.target.value)}
              placeholder="텔레그램 chat_id (숫자)"
              className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white"
            />
            <button onClick={saveTelegram} disabled={syncing} className="text-xs px-3 py-2 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-gray-200 border border-[#30363d] disabled:opacity-50">저장</button>
          </div>
          <p className="text-[10px] text-gray-500 mt-1">
            봇과 1:1 대화를 시작한 뒤 <a href="https://t.me/userinfobot" target="_blank" rel="noopener" className="text-blue-400 hover:underline">@userinfobot</a> 로 본인 chat_id를 확인하세요.
          </p>
        </div>
      </div>
    </div>
  )
}
