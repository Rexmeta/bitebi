import fs from 'fs'
import path from 'path'

export type ContentBucket =
  | 'daily-reports'
  | 'flash-briefs'
  | 'topics'
  | 'glossary'
  | 'coin-analysis'
  | 'generate-news'

const CONTENT_ROOT = path.join(process.cwd(), 'public', 'content')

function getBucketDir(bucket: ContentBucket): string {
  return path.join(CONTENT_ROOT, bucket)
}

function getFilePath(bucket: ContentBucket, key: string): string {
  return path.join(getBucketDir(bucket), `${key}.json`)
}

export function isReadonlyFsError(err: unknown): boolean {
  return typeof err === 'object'
    && err !== null
    && 'code' in err
    && (err as NodeJS.ErrnoException).code === 'EROFS'
}

export function hasContent(bucket: ContentBucket, key: string): boolean {
  return fs.existsSync(getFilePath(bucket, key))
}

export function isCacheStale(bucket: ContentBucket, key: string, maxAgeMs: number): boolean {
  try {
    const filePath = getFilePath(bucket, key)
    if (!fs.existsSync(filePath)) return true
    const mtime = fs.statSync(filePath).mtime.getTime()
    return Date.now() - mtime > maxAgeMs
  } catch {
    return true
  }
}

export function readContent<T>(bucket: ContentBucket, key: string): T | null {
  try {
    const filePath = getFilePath(bucket, key)
    if (!fs.existsSync(filePath)) return null
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T
  } catch {
    return null
  }
}

export function writeContent(
  bucket: ContentBucket,
  key: string,
  data: unknown
): { written: boolean; reason?: 'readonly' | 'unknown' } {
  try {
    fs.mkdirSync(getBucketDir(bucket), { recursive: true })
    fs.writeFileSync(getFilePath(bucket, key), JSON.stringify(data, null, 2), 'utf-8')
    return { written: true }
  } catch (err) {
    if (isReadonlyFsError(err)) {
      return { written: false, reason: 'readonly' }
    }
    console.error(`[contentStore] write 실패 (${bucket}/${key})`, err)
    return { written: false, reason: 'unknown' }
  }
}

export function listContentKeys(bucket: ContentBucket): string[] {
  try {
    const dir = getBucketDir(bucket)
    if (!fs.existsSync(dir)) return []
    return fs.readdirSync(dir)
      .filter((f) => f.endsWith('.json') && !f.startsWith('.'))
      .map((f) => f.replace(/\.json$/, ''))
      .sort()
      .reverse()
  } catch {
    return []
  }
}

