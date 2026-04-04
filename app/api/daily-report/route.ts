import { NextResponse } from 'next/server'
import { generateDailyReport } from '@/lib/contentGenerator'
import fs from 'fs'
import path from 'path'

const CONTENT_DIR = path.join(process.cwd(), 'public', 'content', 'daily-reports')

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0]

  // 캐시된 파일 확인
  const cacheFile = path.join(CONTENT_DIR, `${date}.json`)
  if (fs.existsSync(cacheFile)) {
    const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'))
    return NextResponse.json({ success: true, data: cached, cached: true })
  }

  try {
    const report = await generateDailyReport(date)

    // 파일로 저장 (SSG용)
    ensureDir(CONTENT_DIR)
    fs.writeFileSync(cacheFile, JSON.stringify(report, null, 2), 'utf-8')

    return NextResponse.json({ success: true, data: report, cached: false })
  } catch (err) {
    console.error('[daily-report] 생성 오류:', err)
    return NextResponse.json({ success: false, error: '일일 리포트 생성 실패' }, { status: 500 })
  }
}
