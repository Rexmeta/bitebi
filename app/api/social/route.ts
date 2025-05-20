import { NextResponse } from 'next/server'
import { XMLParser } from 'fast-xml-parser'

// 소셜 피드 타입 정의
interface SocialFeed {
  id: string
  title: string
  content: string
  url: string
  author: string
  publishedAt: string
  source: string
  category: string
  formattedDate: string
}

// 소셜 피드 소스
const SOCIAL_SOURCES = [
  {
    name: 'Bitcoin Subreddit',
    type: 'reddit',
    url: 'https://www.reddit.com/r/bitcoin/.rss',
    category: 'community'
  },
  {
    name: 'Cryptocurrency Subreddit',
    type: 'reddit',
    url: 'https://www.reddit.com/r/cryptocurrency/.rss',
    category: 'community'
  },
  {
    name: 'Bitcoin Magazine',
    type: 'medium',
    url: 'https://medium.com/feed/bitcoin-magazine',
    category: 'news'
  },
  {
    name: 'The Bitcoin Express',
    type: 'twitter',
    url: 'https://nitter.net/rss/TheBitcoinExpress',
    category: 'news'
  },
  {
    name: 'Andreas Antonopoulos',
    type: 'twitter',
    url: 'https://nitter.net/rss/aantonop',
    category: 'education'
  }
]

// RSS 피드 파싱
async function parseRSSFeed(feedUrl: string, source: any): Promise<SocialFeed[]> {
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
    
    return entries.map((item: any) => {
      // Reddit 포스트
      if (source.type === 'reddit') {
        return {
          id: item.id,
          title: item.title,
          content: item.content,
          url: item.link,
          author: item.author,
          publishedAt: item.pubDate,
          source: source.name,
          category: source.category,
          formattedDate: new Date(item.pubDate).toLocaleDateString()
        }
      }
      
      // Medium 포스트
      if (source.type === 'medium') {
        return {
          id: item.guid,
          title: item.title,
          content: item['content:encoded'],
          url: item.link,
          author: item.author,
          publishedAt: item.pubDate,
          source: source.name,
          category: source.category,
          formattedDate: new Date(item.pubDate).toLocaleDateString()
        }
      }
      
      // Twitter 포스트
      if (source.type === 'twitter') {
        return {
          id: item.id,
          title: item.title,
          content: item.description,
          url: item.link,
          author: item.author,
          publishedAt: item.pubDate,
          source: source.name,
          category: source.category,
          formattedDate: new Date(item.pubDate).toLocaleDateString()
        }
      }
      
      return null
    }).filter((item): item is SocialFeed => 
      item !== null && 
      typeof item.publishedAt === 'string' &&
      !isNaN(new Date(item.publishedAt).getTime())
    )
  } catch (error) {
    console.error('Error parsing RSS feed:', error)
    return []
  }
}

export async function GET() {
  try {
    const feeds: SocialFeed[] = []
    let successCount = 0
    
    for (const source of SOCIAL_SOURCES) {
      try {
        const sourceFeeds = await parseRSSFeed(source.url, source)
        
        if (sourceFeeds.length > 0) {
          feeds.push(...sourceFeeds)
          successCount++
        }
      } catch (error) {
        console.error(`Error fetching feeds for ${source.name}:`, error)
        continue
      }
    }

    if (successCount === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch feeds from any source'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      feeds: feeds.sort((a, b) => 
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      ).slice(0, 30)
    })
  } catch (error) {
    console.error('Error in Social API route:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch feeds'
      },
      { status: 500 }
    )
  }
} 