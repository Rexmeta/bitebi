import { NextResponse } from 'next/server'
import { XMLParser } from 'fast-xml-parser'
import { SocialFeed, SocialSource } from '@/app/types/social'

// 소셜 피드 소스
const SOCIAL_SOURCES: SocialSource[] = [
  // 인플루언서 (Twitter via Nitter)
  {
    name: 'Elon Musk',
    type: 'twitter',
    url: 'https://nitter.net/elonmusk/rss',
    category: 'influencer'
  },
  {
    name: 'CZ (Binance CEO)',
    type: 'twitter',
    url: 'https://nitter.net/cz_binance/rss',
    category: 'influencer'
  },
  {
    name: 'Anthony "Pomp" Pompliano',
    type: 'twitter',
    url: 'https://nitter.net/APompliano/rss',
    category: 'influencer'
  },
  {
    name: 'Michael Saylor',
    type: 'twitter',
    url: 'https://nitter.net/michael_saylor/rss',
    category: 'influencer'
  },
  {
    name: 'PlanB',
    type: 'twitter',
    url: 'https://nitter.net/100trillionUSD/rss',
    category: 'influencer'
  },
  {
    name: 'The Bitcoin Express',
    type: 'twitter',
    url: 'https://nitter.net/rss/TheBitcoinExpress',
    category: 'influencer'
  },
  {
    name: 'Andreas Antonopoulos',
    type: 'twitter',
    url: 'https://nitter.net/rss/aantonop',
    category: 'influencer'
  },

  // 커뮤니티 (Reddit)
  {
    name: 'Bitcoin Subreddit',
    type: 'reddit',
    url: 'https://www.reddit.com/r/Bitcoin/.rss',
    category: 'community'
  },
  {
    name: 'Cryptocurrency Subreddit',
    type: 'reddit',
    url: 'https://www.reddit.com/r/CryptoCurrency/.rss',
    category: 'community'
  }
]

// HTML 태그 제거
function stripHtml(html: string): string {
  if (!html) return ''
  return html
    .replace(/<[^>]*>/g, '') // HTML 태그 제거
    .replace(/&nbsp;/g, ' ') // &nbsp;를 공백으로 변환
    .replace(/&amp;/g, '&') // &amp;를 &로 변환
    .replace(/&lt;/g, '<') // &lt;를 <로 변환
    .replace(/&gt;/g, '>') // &gt;를 >로 변환
    .replace(/&quot;/g, '"') // &quot;를 "로 변환
    .replace(/\s+/g, ' ') // 연속된 공백을 하나로 변환
    .trim()
}

// Reddit 컨텐츠 정리
function cleanRedditContent(content: string): string {
  if (!content) return ''
  
  // HTML 테이블 제거
  content = content.replace(/<table[^>]*>[\s\S]*?<\/table>/g, '')
  
  // 이미지 링크 제거
  content = content.replace(/\[link\]/g, '')
  
  // 댓글 링크 제거
  content = content.replace(/\[comments\]/g, '')
  
  // submitted by 제거
  content = content.replace(/submitted by/g, '')
  
  // 사용자 링크 제거
  content = content.replace(/\/u\/[^\s]+/g, '')
  
  // HTML 태그 제거
  content = stripHtml(content)
  
  // 연속된 공백 제거
  content = content.replace(/\s+/g, ' ')
  
  return content.trim()
}

// 작성자 정보 정리
function cleanAuthor(author: any, source: SocialSource): string {
  if (!author) return source.name

  // Reddit 작성자
  if (source.type === 'reddit') {
    if (typeof author === 'string') {
      return author.replace(/\/u\//, '')
    }
    if (author.name) {
      return author.name.replace(/\/u\//, '')
    }
  }

  // Twitter 작성자
  if (source.type === 'twitter') {
    if (typeof author === 'string') {
      return author.replace(/@/, '')
    }
    if (author.name) {
      return author.name.replace(/@/, '')
    }
  }

  return source.name
}

// 객체를 문자열로 변환하는 헬퍼 함수
function toString(value: any): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return stripHtml(value)
  if (typeof value === 'object') {
    if (value['#text']) return stripHtml(value['#text'])
    if (value['@_type'] === 'text') return stripHtml(value['#text'] || '')
    return stripHtml(JSON.stringify(value))
  }
  return String(value)
}

// RSS 피드 파싱
async function parseRSSFeed(feedUrl: string, source: SocialSource): Promise<SocialFeed[]> {
  try {
    console.log(`Fetching RSS feed from: ${feedUrl}`)
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      cache: 'no-store'
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
      trimValues: true,
      textNodeName: '#text'
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
        const title = toString(item.title)
        const rawContent = toString(item.content || item.description || '')
        const content = cleanRedditContent(rawContent)
        const author = cleanAuthor(item.author, source)
        
        return {
          id: toString(item.id || item.guid),
          title: title,
          content: content,
          url: toString(item.link),
          author: author,
          publishedAt: toString(item.published || item.pubDate),
          source: source.name,
          category: source.category,
          formattedDate: new Date(toString(item.published || item.pubDate)).toLocaleDateString(),
          platform: 'reddit'
        }
      }
      
      // Twitter 포스트
      if (source.type === 'twitter') {
        const title = toString(item.title)
        const content = toString(item.description || item.content || '')
        const author = cleanAuthor(item.author, source)
        
        return {
          id: toString(item.id || item.guid),
          title: title,
          content: content,
          url: toString(item.link),
          author: author,
          publishedAt: toString(item.published || item.pubDate),
          source: source.name,
          category: source.category,
          formattedDate: new Date(toString(item.published || item.pubDate)).toLocaleDateString(),
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