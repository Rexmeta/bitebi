import { NextResponse } from 'next/server'
import { generateGlossaryTerm, GLOSSARY_TERMS } from '@/lib/contentGenerator'
import type { GlossaryTerm } from '@/app/types/content'
import { hasContent, readContent, writeContent } from '@/lib/contentStore'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')

  // 목록 요청
  if (!slug) {
    const terms = GLOSSARY_TERMS.map((t) => {
      const exists = hasContent('glossary', t.slug)
      return { ...t, generated: exists }
    })
    return NextResponse.json({ success: true, terms })
  }

  // 캐시 확인 (용어 사전은 7일마다 갱신)
  const cached = readContent<GlossaryTerm>('glossary', slug)
  if (cached) {
    const ageMs = Date.now() - new Date(cached.generatedAt).getTime()
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000
    if (ageMs < SEVEN_DAYS) {
      return NextResponse.json({ success: true, data: cached, cached: true })
    }
  }

  try {
    const term = await generateGlossaryTerm(slug)

    const write = writeContent('glossary', slug, term)
    if (!write.written && write.reason === 'readonly') {
      console.warn('[glossary] read-only 파일시스템 환경으로 캐시 저장을 건너뜁니다.')
    }

    return NextResponse.json({ success: true, data: term, cached: false })
  } catch (err) {
    console.error('[glossary] 생성 오류:', err)
    return NextResponse.json({ success: false, error: '용어 생성 실패' }, { status: 500 })
  }
}
