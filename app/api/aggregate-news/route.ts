import { NextResponse } from 'next/server'
import Parser from 'rss-parser'

const parser = new Parser()
const FEEDS = [
  { source: 'Cointelegraph', url: 'https://cointelegraph.com/rss' },
  { source: 'Decrypt', url: 'https://decrypt.co/feed' },
  { source: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
  { source: 'CryptoSlate', url: 'https://cryptoslate.com/feed/' },
  { source: 'Bitcoin Magazine', url: 'https://bitcoinmagazine.com/.rss/full/' },
]

interface Article {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

let cachedData: { articles: Article[]; timestamp: number } | null = null;
const CACHE_TTL = 60 * 1000;

export async function GET() {
  try {
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
      return NextResponse.json({ success: true, articles: cachedData.articles })
    }

    const results = await Promise.allSettled(
      FEEDS.map(async (feed) => {
        try {
          const parsed = await parser.parseURL(feed.url)
          return parsed.items.map((item) => ({
            title: item.title || '',
            link: item.link || '',
            pubDate: item.pubDate || '',
            source: feed.source,
          }))
        } catch (feedError) {
          console.error(`[ERROR] ${feed.source} 피드 로딩 실패:`, feedError);
          return []
        }
      })
    )

    const allItems: Article[] = results
      .filter((r): r is PromiseFulfilledResult<Article[]> => r.status === 'fulfilled')
      .flatMap(r => r.value)

    allItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())

    const articles = allItems.slice(0, 50)

    if (articles.length === 0) {
      return NextResponse.json({
        success: false,
        error: '뉴스 수집 실패'
      }, { status: 500 })
    }

    cachedData = { articles, timestamp: Date.now() }

    return NextResponse.json({ success: true, articles })
  } catch (e) {
    console.error('[AGGREGATOR ERROR]', e)
    return NextResponse.json({
      success: false,
      error: '뉴스 수집 실패'
    }, { status: 500 })
  }
}
