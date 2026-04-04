import { NextResponse } from 'next/server'
import { generateTopicArticle, TRENDING_TOPICS } from '@/lib/contentGenerator'
import fs from 'fs'
import path from 'path'

const CONTENT_DIR = path.join(process.cwd(), 'public', 'content', 'topics')

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

// 모든 토픽 목록 반환
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')

  // 목록 요청
  if (!slug) {
    const topics = TRENDING_TOPICS.map((t) => {
      const cacheFile = path.join(CONTENT_DIR, `${t.slug}.json`)
      const exists = fs.existsSync(cacheFile)
      return { ...t, generated: exists }
    })
    return NextResponse.json({ success: true, topics })
  }

  // 캐시 확인 (토픽은 3일마다 갱신)
  const cacheFile = path.join(CONTENT_DIR, `${slug}.json`)
  if (fs.existsSync(cacheFile)) {
    const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'))
    const ageMs = Date.now() - new Date(cached.generatedAt).getTime()
    const THREE_DAYS = 3 * 24 * 60 * 60 * 1000
    if (ageMs < THREE_DAYS) {
      return NextResponse.json({ success: true, data: cached, cached: true })
    }
  }

  try {
    const article = await generateTopicArticle(slug)

    ensureDir(CONTENT_DIR)
    fs.writeFileSync(cacheFile, JSON.stringify(article, null, 2), 'utf-8')

    return NextResponse.json({ success: true, data: article, cached: false })
  } catch (err) {
    console.error('[topic] 생성 오류:', err)
    return NextResponse.json({ success: false, error: '토픽 기사 생성 실패' }, { status: 500 })
  }
}
