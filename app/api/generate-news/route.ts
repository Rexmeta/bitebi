// src/app/api/generate-news/route.ts
import { generateAiNews } from '@/lib/generateNews'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const articles = await generateAiNews()
    return NextResponse.json({ success: true, articles })
  } catch (err) {
    console.error('[API ERROR] generate-news:', err)
    return NextResponse.json({ success: false, error: '뉴스 생성 중 오류 발생' }, { status: 500 })
  }
}
