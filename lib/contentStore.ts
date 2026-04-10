import fs from 'fs'
import path from 'path'

export type ContentBucket =
  | 'daily-reports'
  | 'flash-briefs'
  | 'topics'
  | 'glossary'
  | 'coin-analysis'
  | 'generate-news'
  | 'youtube-cache'
  | 'news'          // ← 뉴스 AI 요약 버킷 추가

const CONTENT_ROOT = path.join(process.cwd(), 'public', 'content')

function getBucketDir(bucket: ContentBucket): string {
  return path.join(CONTENT_ROOT, bucket)
}

function getFilePath(bucket: ContentBucket, key: string): string {
  // key에 경로 이동 문자가 포함되면 거부
  const safeKey = path.basename(key)
  return path.join(getBucketDir(bucket), `${safeKey}.json`)
}

export function isReadonlyFsError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as NodeJS.ErrnoException).code === 'EROFS'
  )
}

export function hasContent(bucket: ContentBucket, key: string): boolean {
  try {
    return fs.existsSync(getFilePath(bucket, key))
  } catch {
    return false
  }
}

/**
 * 파일 수정 시각(mtime) 기준으로 캐시 만료 여부를 판단한다.
 * - 파일이 없으면 항상 만료(true)로 취급한다.
 */
export function isCacheStale(
  bucket: ContentBucket,
  key: string,
  maxAgeMs: number
): boolean {
  try {
    const filePath = getFilePath(bucket, key)
    if (!fs.existsSync(filePath)) return true
    const mtime = fs.statSync(filePath).mtime.getTime()
    return Date.now() - mtime > maxAgeMs
  } catch {
    return true
  }
}

/**
 * generatedAt 필드 기준으로 만료 여부를 판단한다.
 * - 파일이 없으면 항상 만료(true)로 취급한다.
 * - 파일은 있지만 generatedAt 필드가 없으면 만료로 취급한다.
 */
export function isContentExpired(
  bucket: ContentBucket,
  key: string,
  maxAgeMs: number
): boolean {
  try {
    const filePath = getFilePath(bucket, key)
    if (!fs.existsSync(filePath)) return true
    const raw = fs.readFileSync(filePath, 'utf-8')
    const data = JSON.parse(raw)
    if (!data?.generatedAt) return true
    const age = Date.now() - new Date(data.generatedAt).getTime()
    return age > maxAgeMs
  } catch {
    return true
  }
}

export function readContent<T>(bucket: ContentBucket, key: string): T | null {
  try {
    const filePath = getFilePath(bucket, key)
    if (!fs.existsSync(filePath)) return null
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T
  } catch (err) {
    console.error(`[contentStore] read 실패 (${bucket}/${key})`, err)
    return null
  }
}

/**
 * 콘텐츠를 JSON 파일로 저장한다.
 *
 * - 버킷 디렉터리가 없으면 자동으로 생성한다.
 * - 읽기 전용 파일시스템(EROFS)이면 { written: false, reason: 'readonly' }
 * - 그 외 오류는 { written: false, reason: 'unknown' }
 *
 * ⚠️ Vercel/Next.js 서버리스 환경에서는 /tmp 만 쓰기 가능하므로,
 *    배포 환경에서는 저장이 불가할 수 있다. 이 경우 readonly가 반환된다.
 */
export function writeContent(
  bucket: ContentBucket,
  key: string,
  data: unknown
): { written: boolean; reason?: 'readonly' | 'unknown'; path?: string } {
  const bucketDir = getBucketDir(bucket)
  const filePath  = getFilePath(bucket, key)

  try {
    // 디렉터리 생성 (없으면)
    if (!fs.existsSync(bucketDir)) {
      fs.mkdirSync(bucketDir, { recursive: true })
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
    return { written: true, path: filePath }
  } catch (err) {
    if (isReadonlyFsError(err)) {
      // Vercel 프로덕션 환경 — 쓰기 불가 (정상적인 상황)
      console.warn(
        `[contentStore] 읽기 전용 파일시스템 — 캐시 저장 생략 (${bucket}/${key})`
      )
      return { written: false, reason: 'readonly' }
    }
    // 그 외 예상치 못한 오류
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

/**
 * 오늘 날짜(KST 기준) 문자열을 YYYY-MM-DD 형식으로 반환한다.
 * 서버 TZ가 UTC인 경우에도 올바른 한국 날짜를 반환한다.
 */
export function todayKST(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]
}

/**
 * 자정(KST 00:00) 이후 처음 요청되었는지 판단한다.
 * 파일의 generatedAt이 오늘 날짜(KST)와 다르면 true(새로 생성 필요).
 */
export function isNewDayContent(
  bucket: ContentBucket,
  key: string
): boolean {
  const today = todayKST()
  const cached = readContent<{ generatedAt?: string }>(bucket, key)
  if (!cached?.generatedAt) return true
  // generatedAt은 ISO 8601 → UTC 날짜를 KST로 변환
  const genDateKST = new Date(
    new Date(cached.generatedAt).getTime() + 9 * 60 * 60 * 1000
  )
    .toISOString()
    .split('T')[0]
  return genDateKST !== today
}
