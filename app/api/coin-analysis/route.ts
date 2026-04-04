import { NextResponse } from 'next/server'
import { generateCoinAnalysis } from '@/lib/contentGenerator'
import type { CoinAnalysis } from '@/app/types/content'
import { readContent, writeContent } from '@/lib/contentStore'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const coinId = searchParams.get('coinId') ?? 'bitcoin'

  // 오늘 날짜 기준으로 주차 계산
  const now = new Date()
  const week = Math.ceil((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 604800000)
  const slug = `${coinId}-${now.getFullYear()}-week-${week}`

  const cached = readContent<CoinAnalysis>('coin-analysis', slug)
  if (cached) {
    return NextResponse.json({ success: true, data: cached, cached: true })
  }

  try {
    const analysis = await generateCoinAnalysis(coinId)

    const write = writeContent('coin-analysis', analysis.slug, analysis)
    if (!write.written && write.reason === 'readonly') {
      console.warn('[coin-analysis] read-only 파일시스템 환경으로 캐시 저장을 건너뜁니다.')
    }

    return NextResponse.json({ success: true, data: analysis, cached: false })
  } catch (err) {
    console.error('[coin-analysis] 생성 오류:', err)
    return NextResponse.json({ success: false, error: '코인 분석 생성 실패' }, { status: 500 })
  }
}
