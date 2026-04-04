import { NextResponse } from 'next/server'
import { generateGlossaryTerm, GLOSSARY_TERMS } from '@/lib/contentGenerator'
import fs from 'fs'
import path from 'path'

const CONTENT_DIR = path.join(process.cwd(), 'public', 'content', 'glossary')

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')

  // 목록 요청
  if (!slug) {
    const terms = GLOSSARY_TERMS.map((t) => {
      const cacheFile = path.join(CONTENT_DIR, `${t.slug}.json`)
      const exists = fs.existsSync(cacheFile)
      return { ...t, generated: exists }
    })
    return NextResponse.json({ success: true, terms })
  }

  // 캐시 확인 (용어 사전은 7일마다 갱신)
  const cacheFile = path.join(CONTENT_DIR, `${slug}.json`)
  if (fs.existsSync(cacheFile)) {
    const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'))
    const ageMs = Date.now() - new Date(cached.generatedAt).getTime()
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000
    if (ageMs < SEVEN_DAYS) {
      return NextResponse.json({ success: true, data: cached, cached: true })
    }
  }

  try {
    const term = await generateGlossaryTerm(slug)

    ensureDir(CONTENT_DIR)
    fs.writeFileSync(cacheFile, JSON.stringify(term, null, 2), 'utf-8')

    return NextResponse.json({ success: true, data: term, cached: false })
  } catch (err) {
    console.error('[glossary] 생성 오류:', err)
    return NextResponse.json({ success: false, error: '용어 생성 실패' }, { status: 500 })
  }
}
