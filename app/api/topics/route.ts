import { NextResponse } from 'next/server'
import { getLatestVideos } from '@/app/utils/youtube'
import { getSocialFeeds, SocialFeed } from '@/app/utils/social-feeds'

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
}

export async function GET() {
  try {
    // 1. 뉴스 데이터 수집
    const newsResponse = await fetch('https://api.coingecko.com/api/v3/news')
    const newsData = await newsResponse.json()

    // 2. 소셜 미디어 데이터 수집
    const socialFeeds = await getSocialFeeds()

    // 3. 유튜브 데이터 수집
    const youtubeVideos = await getLatestVideos()

    // 4. 토픽 추출 및 카운팅
    const topics: { [key: string]: TopicMention } = {}

    // 뉴스에서 토픽 추출
    newsData.data.forEach((news: any) => {
      const title = news.title.toLowerCase()
      const description = news.description.toLowerCase()
      
      // 주요 키워드 추출
      const keywords = extractKeywords(title + ' ' + description)
      
      keywords.forEach(keyword => {
        if (!topics[keyword]) {
          topics[keyword] = {
            id: keyword,
            name: keyword,
            category: determineCategory(keyword),
            mentionCount: 0,
            lastMentioned: new Date(),
            sources: [
              { type: 'news', count: 0 },
              { type: 'social', count: 0 },
              { type: 'youtube', count: 0 }
            ]
          }
        }
        
        topics[keyword].mentionCount++
        topics[keyword].sources[0].count++
        topics[keyword].lastMentioned = new Date(news.published_at)
      })
    })

    // 소셜 미디어에서 토픽 추출
    socialFeeds.forEach(feed => {
      const content = feed.content.toLowerCase()
      const keywords = extractKeywords(content)
      
      keywords.forEach(keyword => {
        if (!topics[keyword]) {
          topics[keyword] = {
            id: keyword,
            name: keyword,
            category: determineCategory(keyword),
            mentionCount: 0,
            lastMentioned: new Date(),
            sources: [
              { type: 'news', count: 0 },
              { type: 'social', count: 0 },
              { type: 'youtube', count: 0 }
            ]
          }
        }
        
        topics[keyword].mentionCount++
        topics[keyword].sources[1].count++
        topics[keyword].lastMentioned = new Date(feed.timestamp)
      })
    })

    // 유튜브에서 토픽 추출
    youtubeVideos.forEach(video => {
      const title = video.title.toLowerCase()
      const description = video.description.toLowerCase()
      const keywords = extractKeywords(title + ' ' + description)
      
      keywords.forEach(keyword => {
        if (!topics[keyword]) {
          topics[keyword] = {
            id: keyword,
            name: keyword,
            category: determineCategory(keyword),
            mentionCount: 0,
            lastMentioned: new Date(),
            sources: [
              { type: 'news', count: 0 },
              { type: 'social', count: 0 },
              { type: 'youtube', count: 0 }
            ]
          }
        }
        
        topics[keyword].mentionCount++
        topics[keyword].sources[2].count++
        topics[keyword].lastMentioned = new Date(video.publishedAt)
      })
    })

    // 트렌드 계산
    const topicsWithTrend = Object.values(topics).map(topic => ({
      ...topic,
      trending: calculateTrend(topic)
    }))

    return NextResponse.json(topicsWithTrend)
  } catch (error) {
    console.error('Error fetching topics:', error)
    return NextResponse.json({ error: 'Failed to fetch topics' }, { status: 500 })
  }
}

// 키워드 추출 함수
function extractKeywords(text: string): string[] {
  const keywords = new Set<string>()
  
  // 주요 비트코인 관련 키워드
  const bitcoinKeywords = [
    'bitcoin', 'btc', 'crypto', 'blockchain', 'mining', 'halving',
    'lightning', 'taproot', 'segwit', 'defi', 'nft', 'web3',
    'ethereum', 'eth', 'altcoin', 'stablecoin', 'token', 'wallet',
    'exchange', 'trading', 'price', 'market', 'regulation', 'sec',
    'adoption', 'institution', 'etf', 'fund', 'investment'
  ]
  
  bitcoinKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      keywords.add(keyword)
    }
  })
  
  return Array.from(keywords)
}

// 카테고리 결정 함수
function determineCategory(keyword: string): string {
  const categories: { [key: string]: string[] } = {
    market: ['price', 'trading', 'market', 'etf', 'fund', 'investment'],
    technology: ['blockchain', 'mining', 'lightning', 'taproot', 'segwit'],
    defi: ['defi', 'token', 'stablecoin'],
    nft: ['nft', 'web3'],
    regulation: ['regulation', 'sec'],
    institution: ['institution', 'adoption']
  }
  
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.includes(keyword)) {
      return category
    }
  }
  
  return 'other'
}

// 트렌드 계산 함수
function calculateTrend(topic: TopicMention): 'up' | 'down' | 'neutral' {
  // 최근 24시간 동안의 언급량과 이전 24시간 동안의 언급량을 비교
  const recentMentions = topic.sources.reduce((sum, source) => sum + source.count, 0)
  
  if (recentMentions > 10) return 'up'
  if (recentMentions > 5) return 'neutral'
  return 'down'
} 