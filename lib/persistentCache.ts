import { promises as fs } from 'fs'
import path from 'path'

const CACHE_DIR =
  process.env.PERSISTENT_CACHE_DIR ||
  path.join(process.cwd(), '.cache', 'api-responses')

interface DiskEntry<T> {
  data: T
  timestamp: number
  version?: number
}

const memCache = new Map<string, DiskEntry<any>>()
const inflight = new Map<string, Promise<any>>()
const diskLoaded = new Set<string>()

let dirEnsured = false
async function ensureDir(): Promise<boolean> {
  if (dirEnsured) return true
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true })
    dirEnsured = true
    return true
  } catch (err) {
    console.warn('[persistentCache] mkdir failed:', (err as Error).message)
    return false
  }
}

function fileFor(key: string): string {
  const safe = key.replace(/[^a-zA-Z0-9_.-]/g, '_')
  return path.join(CACHE_DIR, `${safe}.json`)
}

async function readDisk<T>(key: string): Promise<DiskEntry<T> | null> {
  try {
    const buf = await fs.readFile(fileFor(key), 'utf-8')
    return JSON.parse(buf) as DiskEntry<T>
  } catch {
    return null
  }
}

async function writeDisk<T>(key: string, entry: DiskEntry<T>): Promise<void> {
  if (!(await ensureDir())) return
  const target = fileFor(key)
  const tmp = `${target}.${process.pid}.${Date.now()}.tmp`
  try {
    await fs.writeFile(tmp, JSON.stringify(entry))
    await fs.rename(tmp, target)
  } catch (err) {
    console.warn(`[persistentCache] write failed for ${key}:`, (err as Error).message)
    try { await fs.unlink(tmp) } catch {}
  }
}

async function loadIntoMemory<T>(key: string): Promise<DiskEntry<T> | null> {
  if (memCache.has(key)) return memCache.get(key) as DiskEntry<T>
  if (diskLoaded.has(key)) return null
  diskLoaded.add(key)
  const disk = await readDisk<T>(key)
  if (disk) memCache.set(key, disk)
  return disk
}

export interface SwrResult<T> {
  data: T
  age: number
  stale: boolean
  fromCache: boolean
  revalidating: boolean
  source: 'memory' | 'disk' | 'fresh'
}

export interface SwrOptions<T> {
  key: string
  /** Either a fixed fresh window, or a function deriving it from the cached value. */
  freshTtlMs: number | ((data: T) => number)
  fetcher: () => Promise<T>
  /** Only persist when the value passes this check (e.g. completeness threshold). */
  shouldStore?: (data: T) => boolean
}

export async function swrCache<T>(opts: SwrOptions<T>): Promise<SwrResult<T>> {
  const { key, freshTtlMs, fetcher, shouldStore } = opts
  const hadMem = memCache.has(key)
  const cached = await loadIntoMemory<T>(key)
  const now = Date.now()

  if (cached) {
    const age = now - cached.timestamp
    const ttl = typeof freshTtlMs === 'function' ? freshTtlMs(cached.data) : freshTtlMs
    const stale = age >= ttl
    if (!stale) {
      return {
        data: cached.data,
        age,
        stale: false,
        fromCache: true,
        revalidating: false,
        source: hadMem ? 'memory' : 'disk',
      }
    }
    const kicked = startRevalidate(key, fetcher, shouldStore)
    return {
      data: cached.data,
      age,
      stale: true,
      fromCache: true,
      revalidating: kicked,
      source: hadMem ? 'memory' : 'disk',
    }
  }

  const data = await runFetcher(key, fetcher, shouldStore)
  return {
    data,
    age: 0,
    stale: false,
    fromCache: false,
    revalidating: false,
    source: 'fresh',
  }
}

function startRevalidate<T>(
  key: string,
  fetcher: () => Promise<T>,
  shouldStore?: (d: T) => boolean,
): boolean {
  if (inflight.has(key)) return false
  const p = runFetcher(key, fetcher, shouldStore).catch((err) => {
    console.warn(`[persistentCache] revalidate failed ${key}:`, (err as Error)?.message)
  })
  void p
  return true
}

async function runFetcher<T>(
  key: string,
  fetcher: () => Promise<T>,
  shouldStore?: (d: T) => boolean,
): Promise<T> {
  const existing = inflight.get(key)
  if (existing) return existing as Promise<T>
  const p = (async () => {
    try {
      const data = await fetcher()
      if (!shouldStore || shouldStore(data)) {
        const entry: DiskEntry<T> = { data, timestamp: Date.now() }
        memCache.set(key, entry)
        await writeDisk(key, entry)
      }
      return data
    } finally {
      inflight.delete(key)
    }
  })()
  inflight.set(key, p)
  return p
}

export function _resetForTests() {
  memCache.clear()
  inflight.clear()
  diskLoaded.clear()
  dirEnsured = false
}

export function getCacheDir(): string {
  return CACHE_DIR
}

/**
 * Explicitly set a cached value (and persist to disk). Useful when callers
 * compute a fresh value through a side path (e.g. `?force=1`) and want to
 * seed the cache without going through `swrCache`.
 */
export async function setCached<T>(key: string, data: T): Promise<void> {
  const entry: DiskEntry<T> = { data, timestamp: Date.now() }
  memCache.set(key, entry)
  await writeDisk(key, entry)
}
