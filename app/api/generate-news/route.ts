// app/api/generate-news/route.ts
import { generateAiNews } from '@/lib/generateNews'
import { NextResponse } from 'next/server'
import { readContent, writeContent, isNewDayContent } from '@/lib/contentStore'

/**
 * /api/generate-news
 *
 * 생성 정책: 하루(KST 자정)에 처음 요청될 때 한 번만 생성한다.
 * - 오늘 날짜로 이미 생성된 파일이 있으면 즉시 캐시에서 반환한다.
 * - 날짜가 바뀌면 자동으로 새로 생성한다.
 *
 * 저장 경로: public/content/generate-news/latest.json
 */
export async function GET() {
  const BUCKET = 'generate-news' as const
  const KEY    = 'latest'

  try {
    // ── 캐시 확인 (오늘 날짜 KST 기준) ────────────────────────────
    if (!isNewDayContent(BUCKET, KEY)) {
      const cached = readContent<any>(BUCKET, KEY)
      if (cached) {
        return NextResponse.json({
          success: true,
          articles: cached.articles ?? cached,
          cached: true,
          generatedAt: cached.generatedAt,
        })
      }
    }

    // ── AI 뉴스 생성 ───────────────────────────────────────────────
    const articles = await generateAiNews()

    // ── 파일 저장 ──────────────────────────────────────────────────
    const payload = {
      articles,
      generatedAt: new Date().toISOString(),
    }
    const result = writeContent(BUCKET, KEY, payload)

    if (!result.written) {
      if (result.reason === 'readonly') {
        console.warn('[generate-news] 읽기 전용 환경 — 캐시 저장 생략 (Vercel 프로덕션)')
      } else {
        console.error('[generate-news] 파일 저장 실패:', result)
      }
    } else {
      console.log(`[generate-news] 저장 완료: ${result.path}`)
    }

    return NextResponse.json({
      success: true,
      articles,
      cached: false,
      generatedAt: payload.generatedAt,
    })
  } catch (err) {
    console.error('[API ERROR] generate-news:', err)

    // 오류 시 오래된 캐시라도 반환
    const stale = readContent<any>(BUCKET, KEY)
    if (stale) {
      return NextResponse.json({
        success: true,
        articles: stale.articles ?? stale,
        cached: true,
        stale: true,
        generatedAt: stale.generatedAt,
      })
    }

    return NextResponse.json(
      { success: false, error: '뉴스 생성 중 오류 발생' },
      { status: 500 }
    )
  }
}
