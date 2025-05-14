// src/lib/generateNews.ts
import axios from 'axios'

export interface NewsItem {
  title: string
  summary: string
  date: string
}

export async function fetchAndGenerateNews(): Promise<NewsItem[]> {
  const date = new Date().toISOString().split('T')[0]
  const articles: NewsItem[] = []

  try {
    const market = await axios.get('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin')
    const btc = market.data[0]
    if (Math.abs(btc.price_change_percentage_24h) > 2) {
      const direction = btc.price_change_percentage_24h > 0 ? '상승' : '하락'
      articles.push({
        title: `📊 비트코인 ${direction} ${btc.price_change_percentage_24h.toFixed(2)}%`,
        summary: `비트코인 가격은 현재 $${btc.current_price.toLocaleString()}이며, 24시간 동안 ${direction}했습니다. 거래량: $${btc.total_volume.toLocaleString()}.`,
        date,
      })
    }
  } catch (e) {
    console.error('[CoinGecko Error]', e)
  }

  try {
    const fear = await axios.get('https://api.alternative.me/fng/')
    const index = fear.data.data[0]
    articles.push({
      title: `😨 시장 심리 지수: ${index.value_classification}`,
      summary: `현재 공포/탐욕 지수는 ${index.value} (${index.value_classification})입니다. (${index.timestamp})`,
      date,
    })
  } catch (e) {
    console.error('[Fear & Greed Index Error]', e)
  }

  try {
    const rssRes = await axios.get('https://cryptopanic.com/news/rss/', { responseType: 'text' })
    const match = rssRes.data.match(/<title>(.*?)<\/title>/g)
    const topNews = match?.slice(1, 4).map((t) => t.replace(/<\/?title>/g, '')) || []
    topNews.forEach((title) => {
      articles.push({
        title: `📰 ${title}`,
        summary: `CryptoPanic 헤드라인: ${title}`,
        date,
      })
    })
  } catch (e) {
    console.error('[CryptoPanic Error]', e)
  }

  try {
    const muskTweet = await axios.get('https://nitter.net/elonmusk/rss', { responseType: 'text' })
    const tweets = muskTweet.data.match(/<title>(.*?)<\/title>/g)
    const latest = tweets?.[1]?.replace(/<\/?title>/g, '')
    if (latest && latest.toLowerCase().includes('bitcoin')) {
      articles.push({
        title: `🐦 일론 머스크 트윗: ${latest}`,
        summary: `일론 머스크가 최근 트윗에서 비트코인을 언급했습니다. 내용: ${latest}`,
        date,
      })
    }
  } catch (e) {
    console.error('[Nitter Error]', e)
  }

  return articles
}