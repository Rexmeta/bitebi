// src/app/api/aggregate-news/route.ts
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

// 타임아웃 추가된 fetch 함수
async function fetchWithTimeout(url: string, timeout = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function GET() {
  try {
    const allItems = []
    for (const feed of FEEDS) {
      try {
        const parsed = await parser.parseURL(feed.url)
        parsed.items.forEach((item) => {
          allItems.push({
            title: item.title,
            link: item.link,
            pubDate: item.pubDate,
            source: feed.source,
          })
        })
      } catch (feedError) {
        console.error(`[ERROR] ${feed.source} 피드 로딩 실패:`, feedError);
        // 개별 피드 오류는 무시하고 계속 진행
        continue;
      }
    }
    
    // 날짜별로 정렬
    allItems.sort((a, b) => new Date(b.pubDate!).getTime() - new Date(a.pubDate!).getTime())
    
    if (allItems.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: '뉴스 수집 실패' 
      }, { status: 500 })
    }
    
    return NextResponse.json({ success: true, articles: allItems.slice(0, 50) })
  } catch (e) {
    console.error('[AGGREGATOR ERROR]', e)
    return NextResponse.json({ 
      success: false, 
      error: '뉴스 수집 실패' 
    }, { status: 500 })
  }
}