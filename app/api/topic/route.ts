import { NextResponse } from 'next/server'
import { generateTopicArticle, TRENDING_TOPICS } from '@/lib/contentGenerator'
import type { TopicArticle } from '@/app/types/content'
import { hasContent, readContent, writeContent } from '@/lib/contentStore'

// 모든 토픽 목록 반환
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')

  // 목록 요청
  if (!slug) {
    const topics = TRENDING_TOPICS.map((t) => {
      const exists = hasContent('topics', t.slug)
      return { ...t, generated: exists }
    })
    return NextResponse.json({ success: true, topics })
  }

  // 캐시 확인 (토픽은 3일마다 갱신)
  const cached = readContent<TopicArticle>('topics', slug)
  if (cached) {
    const ageMs = Date.now() - new Date(cached.generatedAt).getTime()
    const THREE_DAYS = 3 * 24 * 60 * 60 * 1000
    if (ageMs < THREE_DAYS) {
      return NextResponse.json({ success: true, data: cached, cached: true })
    }
  }

  try {
    const article = await generateTopicArticle(slug)

    const write = writeContent('topics', slug, article)
    if (!write.written && write.reason === 'readonly') {
      console.warn('[topic] read-only 파일시스템 환경으로 캐시 저장을 건너뜁니다.')
    }

    return NextResponse.json({ success: true, data: article, cached: false })
  } catch (err) {
    console.error('[topic] 생성 오류:', err)
    return NextResponse.json({ success: false, error: '토픽 기사 생성 실패' }, { status: 500 })
  }
}
