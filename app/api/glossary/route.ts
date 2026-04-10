import { NextResponse } from 'next/server'
import { generateGlossaryTerm, GLOSSARY_TERMS } from '@/lib/contentGenerator'
import type { GlossaryTerm } from '@/app/types/content'
import { hasContent, readContent, writeContent, isContentExpired } from '@/lib/contentStore'

/**
 * /api/glossary
 *
 * 생성 정책: 최초 생성 후 6개월(180일) 경과 시 재생성한다.
 * - 처음 요청 시 AI로 생성 후 public/content/glossary/{slug}.json 에 저장
 * - 180일 이내 재요청 시 파일을 그대로 반환 (AI 호출 없음)
 * - 180일 경과 시 재생성
 *
 * ※ Vercel 프로덕션(읽기 전용 FS)에서는 저장이 불가능하므로
 *    매 요청마다 생성된다. → GitHub Actions pre-generate 스크립트로 해결해야 한다.
 */

const GLOSSARY_TTL_MS = 180 * 24 * 60 * 60 * 1000 // 180일 (6개월)

function getExpiresAt(generatedAt: string): string {
  return new Date(new Date(generatedAt).getTime() + GLOSSARY_TTL_MS).toISOString()
}

// ── 목록 요청 (/api/glossary) ───────────────────────────────
function getTermList() {
  return GLOSSARY_TERMS.map((t) => {
    const cached  = readContent<GlossaryTerm>('glossary', t.slug)
    const expired = isContentExpired('glossary', t.slug, GLOSSARY_TTL_MS)
    return {
      ...t,
      generated:   !!cached && !expired,
      expired:     !!cached && expired,
      generatedAt: cached?.generatedAt ?? null,
      expiresAt:   cached ? getExpiresAt(cached.generatedAt) : null,
    }
  })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')

  // ── 목록 요청 ─────────────────────────────────────────────
  if (!slug) {
    return NextResponse.json({ success: true, terms: getTermList() })
  }

  // ── 단건 조회 ─────────────────────────────────────────────

  // 1. 유효한 캐시가 있으면 즉시 반환 (AI 호출 없음)
  if (!isContentExpired('glossary', slug, GLOSSARY_TTL_MS)) {
    const cached = readContent<GlossaryTerm>('glossary', slug)
    if (cached) {
      console.log(`[glossary] 캐시 반환: ${slug} (생성일: ${cached.generatedAt})`)
      return NextResponse.json({
        success:  true,
        data:     cached,
        source:   'cache',
        expiresAt: getExpiresAt(cached.generatedAt),
      })
    }
  }

  // 2. 캐시 없거나 6개월 만료 → AI 생성
  const alreadyExists = hasContent('glossary', slug)
  console.log(`[glossary] ${alreadyExists ? '만료 재생성' : '최초 생성'}: ${slug}`)

  try {
    const term = await generateGlossaryTerm(slug)

    // 3. 파일 저장
    const result = writeContent('glossary', slug, term)
    if (!result.written) {
      if (result.reason === 'readonly') {
        console.warn(
          `[glossary] 읽기 전용 환경 — 파일 저장 불가 (${slug}). ` +
          `매 요청마다 재생성됩니다. GitHub Actions pre-generate 스크립트를 사용하세요.`
        )
      } else {
        console.error(`[glossary] 파일 저장 실패 (${slug}):`, result)
      }
    } else {
      console.log(`[glossary] 저장 완료: ${result.path}`)
    }

    return NextResponse.json({
      success:  true,
      data:     term,
      source:   'generated',
      expiresAt: getExpiresAt(term.generatedAt),
    })
  } catch (err) {
    console.error('[glossary] 생성 오류:', err)

    // 만료된 캐시라도 반환 (마지막 보루)
    const stale = readContent<GlossaryTerm>('glossary', slug)
    if (stale) {
      console.warn(`[glossary] 만료 캐시 반환 (stale): ${slug}`)
      return NextResponse.json({
        success:  true,
        data:     stale,
        source:   'stale-cache',
        expiresAt: getExpiresAt(stale.generatedAt),
      })
    }

    return NextResponse.json(
      { success: false, error: '용어 생성 실패' },
      { status: 500 }
    )
  }
}
