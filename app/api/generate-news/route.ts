// src/app/api/generate-news/route.ts
import { fetchAndGenerateNews } from '@/lib/generateNews'
import { NextResponse } from 'next/server'

async function rewriteWithOllama(title: string, summary: string): Promise<string> {
    try {
      const res = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.2:latest',
          prompt: `다음 뉴스 내용을 흥미롭고 읽기 쉽게 다시 써줘.\n\n제목: ${title}\n내용: ${summary}`,
          stream: true,
        }),
      })
  
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let result = ''
  
      if (reader) {
        let buffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
  
          // 한 줄씩 끊어서 처리
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''
  
          for (const line of lines) {
            if (!line.trim()) continue
            try {
              const json = JSON.parse(line)
              result += json.response
            } catch (err) {
              console.warn('파싱 실패:', line)
            }
          }
        }
      }
  
      return result.trim()
    } catch (e) {
      console.error('[OLLAMA ERROR]', e)
      return summary
    }
  }
  

export async function GET() {
  try {
    const rawArticles = await fetchAndGenerateNews()

    const rewrittenArticles = await Promise.all(
      rawArticles.map(async (article) => {
        const rewritten = await rewriteWithOllama(article.title, article.summary)
        const [titleLine, ...rest] = rewritten.split('\n').filter(Boolean)
        const title = titleLine.replace(/^제목[:：]?\s*/, '')
        const summary = rest.join(' ').trim()

        return {
          title: title || article.title,
          summary: summary || article.summary,
          date: article.date,
        }
      })
    )

    return NextResponse.json({ success: true, articles: rewrittenArticles })
  } catch (err) {
    console.error('[API ERROR] generate-news:', err)
    return NextResponse.json({ success: false, error: '뉴스 생성 중 오류 발생' }, { status: 500 })
  }
}