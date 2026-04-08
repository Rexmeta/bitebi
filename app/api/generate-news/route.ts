// src/app/api/generate-news/route.ts
import { generateAiNews } from '@/lib/generateNews'
import { NextResponse } from 'next/server'
import { readContent, writeContent, isCacheStale } from '@/lib/contentStore'

export async function GET() {
  const BUCKET = 'generate-news'
  const KEY = 'latest'
  const MAX_AGE_MS = 8 * 60 * 60 * 1000 // 8시간

  try {
    // 캐시 확인
    if (!isCacheStale(BUCKET, KEY, MAX_AGE_MS)) {
      const cached = readContent<any>(BUCKET, KEY)
      if (cached) {
        return NextResponse.json({ success: true, articles: cached, cached: true })
      }
    }

    const articles = await generateAiNews()

    // 캐시 저장
    writeContent(BUCKET, KEY, articles)

    return NextResponse.json({ success: true, articles, cached: false })
  } catch (err) {
    console.error('[API ERROR] generate-news:', err)
    return NextResponse.json({ success: false, error: '뉴스 생성 중 오류 발생' }, { status: 500 })
  }
}
