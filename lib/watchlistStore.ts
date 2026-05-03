// File-backed watchlist store keyed by lightweight device token.
//
// Data shape:
//   {
//     [deviceToken]: {
//       email?: string
//       telegramChatId?: string
//       items: { metricId, threshold?, direction?, lastNotifiedAt?, lastValue? }[]
//       createdAt: string
//       updatedAt: string
//     }
//   }
//
// Persisted at data/watchlists.json. On read-only filesystems writes silently no-op.

import fs from 'fs'
import path from 'path'

export interface WatchItem {
  metricId: string
  threshold?: number
  direction?: 'above' | 'below'
  lastNotifiedAt?: string
  lastValue?: number
}

export interface WatchlistRecord {
  email?: string
  telegramChatId?: string
  items: WatchItem[]
  createdAt: string
  updatedAt: string
}

const DATA_DIR = path.join(process.cwd(), 'data')
const STORE_FILE = path.join(DATA_DIR, 'watchlists.json')

function safeReadJson<T>(file: string, fallback: T): T {
  try {
    if (!fs.existsSync(file)) return fallback
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as T
  } catch { return fallback }
}

function safeWriteJson(file: string, data: any): boolean {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8')
    return true
  } catch { return false }
}

export function loadAll(): Record<string, WatchlistRecord> {
  return safeReadJson<Record<string, WatchlistRecord>>(STORE_FILE, {})
}

export function saveAll(all: Record<string, WatchlistRecord>): boolean {
  return safeWriteJson(STORE_FILE, all)
}

function now() { return new Date().toISOString() }

const TOKEN_RE = /^[A-Za-z0-9_-]{16,128}$/

export function isValidToken(token: string | null | undefined): token is string {
  return !!token && TOKEN_RE.test(token)
}

export function getRecord(token: string): WatchlistRecord | null {
  if (!isValidToken(token)) return null
  return loadAll()[token] || null
}

export function upsertRecord(token: string, mutator: (r: WatchlistRecord) => WatchlistRecord): WatchlistRecord | null {
  if (!isValidToken(token)) return null
  const all = loadAll()
  const existing = all[token] || { items: [], createdAt: now(), updatedAt: now() }
  const next = mutator({ ...existing, items: [...existing.items] })
  next.updatedAt = now()
  all[token] = next
  saveAll(all)
  return next
}

export function deleteRecord(token: string): boolean {
  if (!isValidToken(token)) return false
  const all = loadAll()
  if (!all[token]) return false
  delete all[token]
  return saveAll(all)
}
