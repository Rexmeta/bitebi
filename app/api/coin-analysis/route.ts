import { NextResponse } from 'next/server'
import { generateCoinAnalysis } from '@/lib/contentGenerator'
import fs from 'fs'
import path from 'path'

const CONTENT_DIR = path.join(process.cwd(), 'public', 'content', 'coin-analysis')

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const coinId = searchParams.get('coinId') ?? 'bitcoin'

  // 오늘 날짜 기준으로 주차 계산
  const now = new Date()
  const week = Math.ceil((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 604800000)
  const slug = `${coinId}-${now.getFullYear()}-week-${week}`

  const cacheFile = path.join(CONTENT_DIR, `${slug}.json`)
  if (fs.existsSync(cacheFile)) {
    const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'))
    return NextResponse.json({ success: true, data: cached, cached: true })
  }

  try {
    const analysis = await generateCoinAnalysis(coinId)

    ensureDir(CONTENT_DIR)
    fs.writeFileSync(
      path.join(CONTENT_DIR, `${analysis.slug}.json`),
      JSON.stringify(analysis, null, 2),
      'utf-8'
    )

    return NextResponse.json({ success: true, data: analysis, cached: false })
  } catch (err) {
    console.error('[coin-analysis] 생성 오류:', err)
    return NextResponse.json({ success: false, error: '코인 분석 생성 실패' }, { status: 500 })
  }
}
