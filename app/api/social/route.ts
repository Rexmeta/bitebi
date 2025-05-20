import { NextResponse } from 'next/server'
import { XMLParser } from 'fast-xml-parser'
import { SocialFeed, SocialSource } from '@/app/types/social'

// 소셜 피드 소스
const SOCIAL_SOURCES: SocialSource[] = [
  {
    name: 'Bitcoin Subreddit',
    type: 'reddit',
    url: 'https://www.reddit.com/r/bitcoin/hot/.rss',
    category: 'community'
  },
  {
    name: 'Cryptocurrency Subreddit',
    type: 'reddit',
    url: 'https://www.reddit.com/r/cryptocurrency/hot/.rss',
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
async function parseRSSFeed(feedUrl: string, source: SocialSource): Promise<SocialFeed[]> {
  try {
    console.log(`Fetching RSS feed from: ${feedUrl}`)
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      cache: 'no-store' // 캐시 비활성화
    })
    
    if (!response.ok) {
      console.error(`Failed to fetch RSS feed: ${response.status} ${response.statusText}`)
      return []
    }
    
    const xml = await response.text()
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseAttributeValue: true,
      parseTagValue: true,
      trimValues: true
    })
    
    const result = parser.parse(xml)
    console.log(`Parsed RSS feed structure:`, Object.keys(result))
    
    if (!result.feed?.entry && !result.rss?.channel?.item) {
      console.error('No feed entries found in RSS feed')
      return []
    }
    
    const items = result.feed?.entry || result.rss?.channel?.item || []
    const entries = Array.isArray(items) ? items : [items]
    
    return entries.map((item: any) => {
      // Reddit 포스트
      if (source.type === 'reddit') {
        return {
          id: item.id || item.guid,
          title: item.title,
          content: item.content || item.description || '',
          url: item.link,
          author: item.author?.name || item.author || 'Unknown',
          publishedAt: item.published || item.pubDate,
          source: source.name,
          category: source.category,
          formattedDate: new Date(item.published || item.pubDate).toLocaleDateString(),
          platform: 'reddit'
        }
      }
      
      // Medium 포스트
      if (source.type === 'medium') {
        return {
          id: item.guid,
          title: item.title,
          content: item['content:encoded'] || item.content || item.description || '',
          url: item.link,
          author: item.author?.name || item.author || 'Unknown',
          publishedAt: item.published || item.pubDate,
          source: source.name,
          category: source.category,
          formattedDate: new Date(item.published || item.pubDate).toLocaleDateString(),
          platform: 'medium'
        }
      }
      
      // Twitter 포스트
      if (source.type === 'twitter') {
        return {
          id: item.id || item.guid,
          title: item.title,
          content: item.description || item.content || '',
          url: item.link,
          author: item.author?.name || item.author || 'Unknown',
          publishedAt: item.published || item.pubDate,
          source: source.name,
          category: source.category,
          formattedDate: new Date(item.published || item.pubDate).toLocaleDateString(),
          platform: 'twitter'
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

// API 라우트 핸들러
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const platform = searchParams.get('platform')
    const category = searchParams.get('category')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = 30
    const offset = (page - 1) * limit

    const feeds: SocialFeed[] = []
    let successCount = 0
    
    // 필터링된 소스 목록
    const filteredSources = SOCIAL_SOURCES.filter(source => {
      if (platform && source.type !== platform) return false
      if (category && source.category !== category) return false
      return true
    })
    
    // 병렬로 피드 가져오기
    const feedPromises = filteredSources.map(async (source) => {
      try {
        console.log(`Processing source: ${source.name}`)
        const sourceFeeds = await parseRSSFeed(source.url, source)
        
        if (sourceFeeds.length > 0) {
          feeds.push(...sourceFeeds)
          successCount++
          console.log(`Successfully fetched ${sourceFeeds.length} feeds from ${source.name}`)
        } else {
          console.warn(`No feeds found for ${source.name}`)
        }
      } catch (error) {
        console.error(`Error fetching feeds for ${source.name}:`, error)
      }
    })

    // 모든 피드 가져오기 완료 대기
    await Promise.all(feedPromises)

    if (successCount === 0) {
      console.error('Failed to fetch feeds from any source')
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch feeds from any source'
        },
        { status: 404 }
      )
    }

    // 날짜순 정렬 및 페이지네이션
    const sortedFeeds = feeds.sort((a, b) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )

    const paginatedFeeds = sortedFeeds.slice(offset, offset + limit)
    const hasMore = offset + limit < sortedFeeds.length

    return NextResponse.json({ 
      success: true, 
      feeds: paginatedFeeds,
      hasMore,
      total: sortedFeeds.length
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