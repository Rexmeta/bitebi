import { NextResponse } from 'next/server'
import { generateTopicArticle, TRENDING_TOPICS } from '@/lib/contentGenerator'
import type { TopicArticle } from '@/app/types/content'
import { hasContent, readContent, writeContent, isContentExpired } from '@/lib/contentStore'

/**
 * /api/topic
 *
 * 생성 정책: 30일(1개월)에 한 번 재생성한다.
 * - 처음 요청 시 AI로 생성 후 public/content/topics/{slug}.json 에 저장
 * - 30일 이내 재요청 시 파일을 그대로 반환 (AI 호출 없음)
 * - 30일 경과 시 재생성
 *
 * ※ Vercel 프로덕션(읽기 전용 FS)에서는 저장이 불가능하므로
 *    매 요청마다 생성된다. 이 경우 로그에 'readonly' 경고가 출력된다.
 *    → 해결: GitHub Actions 사전 빌드 시 pre-generate 스크립트로 파일을 커밋해 두어야 한다.
 */

const TOPIC_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30일

// ── 목록 요청 (/api/topic) ──────────────────────────────────
function getTopicList() {
  return TRENDING_TOPICS.map((t) => {
    const exists  = hasContent('topics', t.slug)
    const expired = isContentExpired('topics', t.slug, TOPIC_TTL_MS)
    const cached  = exists ? readContent<TopicArticle>('topics', t.slug) : null

    return {
      ...t,
      generated:   exists && !expired,
      expired:     exists && expired,
      generatedAt: cached?.generatedAt ?? null,
      expiresAt:   cached?.generatedAt
        ? new Date(new Date(cached.generatedAt).getTime() + TOPIC_TTL_MS).toISOString()
        : null,
    }
  })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')

  // ── 목록 요청 ─────────────────────────────────────────────
  if (!slug) {
    return NextResponse.json({ success: true, topics: getTopicList() })
  }

  // ── 단건 조회 ─────────────────────────────────────────────

  // 1. 유효한 캐시가 있으면 즉시 반환 (AI 호출 없음)
  if (!isContentExpired('topics', slug, TOPIC_TTL_MS)) {
    const cached = readContent<TopicArticle>('topics', slug)
    if (cached) {
      console.log(`[topic] 캐시 반환: ${slug} (생성일: ${cached.generatedAt})`)
      return NextResponse.json({
        success:    true,
        data:       cached,
        cached:     true,
        generatedAt: cached.generatedAt,
        expiresAt:  new Date(new Date(cached.generatedAt).getTime() + TOPIC_TTL_MS).toISOString(),
      })
    }
  }

  // 2. 캐시 없거나 30일 만료 → AI 생성
  const expired = hasContent('topics', slug)
  console.log(`[topic] ${expired ? '만료 재생성' : '최초 생성'}: ${slug}`)

  try {
    const article = await generateTopicArticle(slug)

    // 3. 파일 저장
    const result = writeContent('topics', slug, article)
    if (!result.written) {
      if (result.reason === 'readonly') {
        console.warn(
          `[topic] 읽기 전용 환경 — 파일 저장 불가 (${slug}). ` +
          `매 요청마다 재생성됩니다. GitHub Actions pre-generate 스크립트를 사용하세요.`
        )
      } else {
        console.error(`[topic] 파일 저장 실패 (${slug}):`, result)
      }
    } else {
      console.log(`[topic] 저장 완료: ${result.path}`)
    }

    return NextResponse.json({
      success:    true,
      data:       article,
      cached:     false,
      generatedAt: article.generatedAt,
      expiresAt:  new Date(new Date(article.generatedAt).getTime() + TOPIC_TTL_MS).toISOString(),
    })
  } catch (err) {
    console.error('[topic] 생성 오류:', err)

    // 만료된 캐시라도 반환 (마지막 보루)
    const stale = readContent<TopicArticle>('topics', slug)
    if (stale) {
      console.warn(`[topic] 만료 캐시 반환 (stale): ${slug}`)
      return NextResponse.json({
        success:   true,
        data:      stale,
        cached:    true,
        stale:     true,
        generatedAt: stale.generatedAt,
      })
    }

    return NextResponse.json(
      { success: false, error: '토픽 기사 생성 실패' },
      { status: 500 }
    )
  }
}
