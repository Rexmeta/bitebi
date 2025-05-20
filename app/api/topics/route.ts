import { NextResponse } from 'next/server'
import { SocialFeed } from '@/app/types/social'
import { XMLParser } from 'fast-xml-parser'

interface TopicMention {
  id: string
  name: string
  category: string
  mentionCount: number
  lastMentioned: Date
  sources: {
    type: 'news' | 'social' | 'youtube'
    count: number
  }[]
  sentiment: number // -1 to 1
  relatedNews: {
    title: string
    url: string
    publishedAt: Date
    source: string
  }[]
}

// RSS 피드 파싱
async function parseRSSFeed(feedUrl: string): Promise<SocialFeed[]> {
  try {
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })
    
    if (!response.ok) {
      console.error('Failed to fetch RSS feed:', response.status, response.statusText)
      return []
    }
    
    const xml = await response.text()
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    })
    
    const result = parser.parse(xml)
    
    if (!result.feed?.entry && !result.rss?.channel?.item) {
      return []
    }
    
    const items = result.feed?.entry || result.rss?.channel?.item || []
    const entries = Array.isArray(items) ? items : [items]
    
    return entries.map((item: any) => ({
      id: item.id || item.guid,
      title: item.title,
      content: item.content || item.description || item['content:encoded'] || '',
      url: item.link,
      author: item.author?.name || item.author || 'Unknown',
      publishedAt: item.published || item.pubDate,
      source: item.source?.name || 'Unknown Source',
      category: 'community',
      formattedDate: new Date(item.published || item.pubDate).toLocaleDateString(),
      platform: 'news'
    }))
  } catch (error) {
    console.error('Error parsing RSS feed:', error)
    return []
  }
}

// 주요 토픽 목록
const TOPICS = [
  {
    id: 'bitcoin',
    name: 'Bitcoin',
    category: 'market',
    keywords: ['bitcoin', 'btc', 'satoshi', 'halving', 'mining']
  },
  {
    id: 'ethereum',
    name: 'Ethereum',
    category: 'technology',
    keywords: ['ethereum', 'eth', 'smart contract', 'defi', 'gas']
  },
  {
    id: 'defi',
    name: 'DeFi',
    category: 'defi',
    keywords: ['defi', 'yield', 'liquidity', 'amm', 'dex']
  },
  {
    id: 'nft',
    name: 'NFT',
    category: 'nft',
    keywords: ['nft', 'token', 'art', 'collectible', 'marketplace']
  },
  {
    id: 'regulation',
    name: 'Regulation',
    category: 'regulation',
    keywords: ['regulation', 'sec', 'compliance', 'legal', 'tax']
  }
]

// 뉴스 소스
const NEWS_SOURCES = [
  {
    name: 'Bitcoin Magazine',
    url: 'https://medium.com/feed/bitcoin-magazine'
  },
  {
    name: 'Coindesk',
    url: 'https://www.coindesk.com/arc/outboundfeeds/rss/'
  },
  {
    name: 'Cointelegraph',
    url: 'https://cointelegraph.com/rss'
  }
]

export async function GET() {
  try {
    const topics: TopicMention[] = []
    const allFeeds: SocialFeed[] = []

    // 뉴스 피드 수집
    for (const source of NEWS_SOURCES) {
      try {
        const feeds = await parseRSSFeed(source.url)
        allFeeds.push(...feeds)
      } catch (error) {
        console.error(`Error fetching feeds for ${source.name}:`, error)
        continue
      }
    }

    // 토픽별 분석
    for (const topic of TOPICS) {
      const mentions = allFeeds.filter(feed => 
        topic.keywords.some(keyword => 
          feed.title.toLowerCase().includes(keyword) || 
          feed.content.toLowerCase().includes(keyword)
        )
      )

      const relatedNews = mentions.map(feed => ({
        title: feed.title,
        url: feed.url,
        publishedAt: new Date(feed.publishedAt),
        source: feed.source
      }))

      // 감성 분석 (간단한 키워드 기반)
      const sentiment = calculateSentiment(mentions)

      topics.push({
        id: topic.id,
        name: topic.name,
        category: topic.category,
        mentionCount: mentions.length,
        lastMentioned: new Date(Math.max(...mentions.map(m => new Date(m.publishedAt).getTime()))),
        sources: [
          {
            type: 'news',
            count: mentions.length
          }
        ],
        sentiment,
        relatedNews
      })
    }

    return NextResponse.json({
      success: true,
      topics: topics.sort((a, b) => b.mentionCount - a.mentionCount)
    })
  } catch (error) {
    console.error('Error in topics API:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch topics'
      },
      { status: 500 }
    )
  }
}

// 간단한 감성 분석 함수
function calculateSentiment(feeds: SocialFeed[]): number {
  const positiveWords = ['bullish', 'growth', 'adoption', 'innovation', 'success']
  const negativeWords = ['bearish', 'crash', 'risk', 'concern', 'ban']

  let score = 0
  feeds.forEach(feed => {
    const content = (feed.title + ' ' + feed.content).toLowerCase()
    positiveWords.forEach(word => {
      if (content.includes(word)) score += 0.2
    })
    negativeWords.forEach(word => {
      if (content.includes(word)) score -= 0.2
    })
  })

  return Math.max(-1, Math.min(1, score / feeds.length))
} 