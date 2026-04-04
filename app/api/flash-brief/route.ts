import { NextResponse } from 'next/server'
import { generateFlashBrief } from '@/lib/contentGenerator'
import fs from 'fs'
import path from 'path'

const CONTENT_DIR = path.join(process.cwd(), 'public', 'content', 'flash-briefs')

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0]
  const sessionParam = searchParams.get('session')
  const session = (sessionParam === 'afternoon' ? 'afternoon' : 'morning') as 'morning' | 'afternoon'
  const id = `${date}-${session}`

  // 캐시 확인
  const cacheFile = path.join(CONTENT_DIR, `${id}.json`)
  if (fs.existsSync(cacheFile)) {
    const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'))
    // 브리핑은 6시간 유효
    const ageMs = Date.now() - new Date(cached.generatedAt).getTime()
    if (ageMs < 6 * 60 * 60 * 1000) {
      return NextResponse.json({ success: true, data: cached, cached: true })
    }
  }

  try {
    const brief = await generateFlashBrief(date, session)

    ensureDir(CONTENT_DIR)
    fs.writeFileSync(cacheFile, JSON.stringify(brief, null, 2), 'utf-8')

    return NextResponse.json({ success: true, data: brief, cached: false })
  } catch (err) {
    console.error('[flash-brief] 생성 오류:', err)
    return NextResponse.json({ success: false, error: '브리핑 생성 실패' }, { status: 500 })
  }
}
