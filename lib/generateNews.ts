// src/lib/generateNews.ts
import axios from 'axios'
import { generateTextWithGemini } from '@/lib/geminiClient'

export interface NewsItem {
  title: string
  summary: string
  date: string
}

function extractTitlesFromRss(xml: string, skip = 1, limit = 3): string[] {
  const match = xml.match(/<title>(.*?)<\/title>/g)
  return (match ?? [])
    .slice(skip, skip + limit)
    .map((t) => t.replace(/<\/?title>/g, '').trim())
    .filter(Boolean)
}

function parseJsonArrayResponse(text: string): Array<{ title?: string; summary?: string }> | null {
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  try {
    const parsed = JSON.parse(cleaned)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

export async function fetchAndGenerateNews(): Promise<NewsItem[]> {
  const date = new Date().toISOString().split('T')[0]

  const [marketResult, fearResult, rssResult, tweetResult] = await Promise.allSettled([
    axios.get('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin'),
    axios.get('https://api.alternative.me/fng/'),
    axios.get('https://cryptopanic.com/news/rss/', { responseType: 'text' }),
    axios.get('https://nitter.net/elonmusk/rss', { responseType: 'text' }),
  ])

  const articles: NewsItem[] = []

  if (marketResult.status === 'fulfilled') {
    const btc = marketResult.value.data?.[0]
    if (btc?.price_change_percentage_24h !== null && Math.abs(btc?.price_change_percentage_24h) > 2) {
      const direction = btc.price_change_percentage_24h > 0 ? '상승' : '하락'
      articles.push({
        title: `📊 비트코인 ${direction} ${btc.price_change_percentage_24h.toFixed(2)}%`,
        summary: `비트코인 가격은 현재 $${btc.current_price?.toLocaleString() || 'N/A'}이며, 24시간 동안 ${direction}했습니다. 거래량: $${btc.total_volume?.toLocaleString() || 'N/A'}.`,
        date,
      })
    }
  } else {
    console.error('[CoinGecko Error]', marketResult.reason)
  }

  if (fearResult.status === 'fulfilled') {
    const index = fearResult.value.data?.data?.[0]
    if (index) {
      articles.push({
        title: `😨 시장 심리 지수: ${index.value_classification}`,
        summary: `현재 공포/탐욕 지수는 ${index.value} (${index.value_classification})입니다. (${index.timestamp})`,
        date,
      })
    }
  } else {
    console.error('[Fear & Greed Index Error]', fearResult.reason)
  }

  if (rssResult.status === 'fulfilled') {
    extractTitlesFromRss(rssResult.value.data, 1, 3).forEach((title) => {
      articles.push({
        title: `📰 ${title}`,
        summary: `CryptoPanic 헤드라인: ${title}`,
        date,
      })
    })
  } else {
    console.error('[CryptoPanic Error]', rssResult.reason)
  }

  if (tweetResult.status === 'fulfilled') {
    const latest = extractTitlesFromRss(tweetResult.value.data, 1, 1)[0]
    if (latest && latest.toLowerCase().includes('bitcoin')) {
      articles.push({
        title: `🐦 일론 머스크 트윗: ${latest}`,
        summary: `일론 머스크가 최근 트윗에서 비트코인을 언급했습니다. 내용: ${latest}`,
        date,
      })
    }
  } else {
    console.error('[Nitter Error]', tweetResult.reason)
  }

  return articles
}

async function rewriteNewsBatchWithGemini(articles: NewsItem[]): Promise<NewsItem[]> {
  const prompt = [
    '아래 JSON 배열의 각 항목을 한국어 뉴스 스타일로 재작성해줘.',
    '규칙:',
    '1) 원래 의미를 유지',
    '2) 과장/허위 금지',
    '3) 제목 60자 내외, 요약 1~2문장',
    '4) 반드시 JSON 배열만 반환',
    '',
    JSON.stringify(articles),
  ].join('\n')

  const text = await generateTextWithGemini(
    prompt,
    '당신은 암호화폐 뉴스 에디터다. 출력은 JSON 배열만 허용한다.'
  )

  const parsed = parseJsonArrayResponse(text)
  if (!parsed || parsed.length !== articles.length) {
    return articles
  }

  return articles.map((article, index) => ({
    date: article.date,
    title: parsed[index]?.title?.trim() || article.title,
    summary: parsed[index]?.summary?.trim() || article.summary,
  }))
}

export async function generateAiNews(): Promise<NewsItem[]> {
  const rawArticles = await fetchAndGenerateNews()
  if (rawArticles.length === 0) return []
  return rewriteNewsBatchWithGemini(rawArticles)
}
