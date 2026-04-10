import { NextResponse } from 'next/server'
import { generateGlossaryTerm, GLOSSARY_TERMS } from '@/lib/contentGenerator'
import type { GlossaryTerm } from '@/app/types/content'
import { hasContent, readContent, writeContent } from '@/lib/contentStore'

// 용어 사전 TTL: 6개월 (180일)
// 한번 생성하면 6개월간 재생성 없이 캐시된 내용 그대로 사용
const GLOSSARY_TTL_MS = 180 * 24 * 60 * 60 * 1000 // 180 days

function getExpiresAt(generatedAt: string): string {
  const expireDate = new Date(new Date(generatedAt).getTime() + GLOSSARY_TTL_MS)
  return expireDate.toISOString()
}

function isExpired(generatedAt: string): boolean {
  const ageMs = Date.now() - new Date(generatedAt).getTime()
  return ageMs >= GLOSSARY_TTL_MS
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')

  // ── 목록 요청 (/api/glossary) ──────────────────────────────────
  if (!slug) {
    const terms = GLOSSARY_TERMS.map((t) => {
      const cached = readContent<GlossaryTerm>('glossary', t.slug)
      const generated = !!cached
      const expired = cached ? isExpired(cached.generatedAt) : false
      return {
        ...t,
        generated,
        expired,
        generatedAt: cached?.generatedAt ?? null,
        expiresAt: cached ? getExpiresAt(cached.generatedAt) : null,
      }
    })
    return NextResponse.json({ success: true, terms })
  }

  // ── 단건 조회 (/api/glossary?slug=defi) ───────────────────────

  // 1. 캐시에 콘텐츠가 있고 아직 6개월이 지나지 않았으면 즉시 반환
  if (hasContent('glossary', slug)) {
    const cached = readContent<GlossaryTerm>('glossary', slug)
    if (cached && !isExpired(cached.generatedAt)) {
      return NextResponse.json({
        success: true,
        data: cached,
        source: 'cache',
        expiresAt: getExpiresAt(cached.generatedAt),
      })
    }
    // 캐시는 있지만 6개월 만료 → 재생성 진행 (아래로 이어짐)
  }

  // 2. 캐시 없거나 6개월 만료 → AI 생성
  try {
    const term = await generateGlossaryTerm(slug)

    const write = writeContent('glossary', slug, term)
    if (!write.written && write.reason === 'readonly') {
      console.warn('[glossary] read-only 파일시스템 환경으로 캐시 저장을 건너뜁니다.')
    }

    return NextResponse.json({
      success: true,
      data: term,
      source: 'generated',
      expiresAt: getExpiresAt(term.generatedAt),
    })
  } catch (err) {
    console.error('[glossary] 생성 오류:', err)

    // 3. 생성 실패 시 만료된 캐시라도 반환 (마지막 보루)
    const stale = readContent<GlossaryTerm>('glossary', slug)
    if (stale) {
      return NextResponse.json({
        success: true,
        data: stale,
        source: 'stale-cache',
        expiresAt: getExpiresAt(stale.generatedAt),
      })
    }

    return NextResponse.json({ success: false, error: '용어 생성 실패' }, { status: 500 })
  }
}
