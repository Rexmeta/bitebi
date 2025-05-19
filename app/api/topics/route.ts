import { NextResponse } from 'next/server'
import { getLatestVideos } from '@/app/utils/youtube'
import { getSocialFeeds, SocialFeed } from '@/app/utils/social-feeds'
import axios from 'axios'

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
            ],
            sentiment: 0,
            relatedNews: []
          }
        }
        
        topics[keyword].mentionCount++
        topics[keyword].sources[0].count++
        topics[keyword].lastMentioned = new Date(news.published_at)
        
        // 관련 뉴스 추가
        topics[keyword].relatedNews.push({
          title: news.title,
          url: news.url,
          publishedAt: new Date(news.published_at),
          source: news.source
        })

        // 감성 분석 추가
        const sentiment = analyzeSentiment(title + ' ' + description)
        topics[keyword].sentiment = (topics[keyword].sentiment + sentiment) / 2
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
            ],
            sentiment: 0,
            relatedNews: []
          }
        }
        
        topics[keyword].mentionCount++
        topics[keyword].sources[1].count++
        topics[keyword].lastMentioned = new Date(feed.timestamp)
        
        // 감성 분석 추가
        const sentiment = analyzeSentiment(content)
        topics[keyword].sentiment = (topics[keyword].sentiment + sentiment) / 2
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
            ],
            sentiment: 0,
            relatedNews: []
          }
        }
        
        topics[keyword].mentionCount++
        topics[keyword].sources[2].count++
        topics[keyword].lastMentioned = new Date(video.publishedAt)
        
        // 감성 분석 추가
        const sentiment = analyzeSentiment(title + ' ' + description)
        topics[keyword].sentiment = (topics[keyword].sentiment + sentiment) / 2
      })
    })

    // 트렌드 계산
    const topicsWithTrend = Object.values(topics).map(topic => ({
      ...topic,
      trending: calculateTrend(topic)
    }))

    return NextResponse.json(topicsWithTrend)
  } catch (error) {
    console.error('Error in topics API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch topics' },
      { status: 500 }
    )
  }
}

// 트렌드 계산 함수 개선
function calculateTrend(topic: TopicMention): 'up' | 'down' | 'neutral' {
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000)

  // 최근 24시간 동안의 언급량
  const recentMentions = topic.sources.reduce((sum, source) => sum + source.count, 0)
  
  // 이전 24시간 동안의 언급량 (임시 데이터)
  const previousMentions = Math.floor(recentMentions * 0.7) // 예시로 70%로 가정

  // 감성 점수 반영
  const sentimentScore = topic.sentiment

  // 트렌드 점수 계산
  const trendScore = (recentMentions - previousMentions) * (1 + sentimentScore)

  if (trendScore > 5) return 'up'
  if (trendScore < -5) return 'down'
  return 'neutral'
}

// 감성 분석 함수
function analyzeSentiment(text: string): number {
  // 간단한 감성 분석 구현
  const positiveWords = ['bullish', 'growth', 'increase', 'positive', 'gain', 'up', 'rise']
  const negativeWords = ['bearish', 'decline', 'decrease', 'negative', 'loss', 'down', 'fall']

  const words = text.toLowerCase().split(/\s+/)
  let score = 0

  words.forEach(word => {
    if (positiveWords.includes(word)) score += 1
    if (negativeWords.includes(word)) score -= 1
  })

  // -1에서 1 사이로 정규화
  return Math.max(-1, Math.min(1, score / 10))
}

// 키워드 추출 함수
function extractKeywords(text: string): string[] {
  const keywords = new Set<string>()
  
  // 비트코인 관련 키워드
  const bitcoinKeywords = [
    'bitcoin', 'btc', 'crypto', 'blockchain', 'mining', 'halving',
    'lightning', 'network', 'wallet', 'exchange', 'defi', 'nft',
    'ethereum', 'eth', 'altcoin', 'token', 'stablecoin', 'mining',
    'hashrate', 'difficulty', 'mempool', 'transaction', 'fee',
    'segwit', 'taproot', 'schnorr', 'signature', 'address',
    'private key', 'public key', 'seed', 'mnemonic', 'hardware wallet'
  ]

  // 텍스트에서 키워드 찾기
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
    market: ['price', 'market', 'trading', 'exchange', 'volume', 'liquidity'],
    technology: ['blockchain', 'mining', 'network', 'protocol', 'wallet', 'lightning'],
    regulation: ['regulation', 'law', 'compliance', 'government', 'ban', 'legal'],
    institution: ['institution', 'bank', 'company', 'fund', 'etf', 'investment'],
    defi: ['defi', 'yield', 'lending', 'borrowing', 'amm', 'dex'],
    nft: ['nft', 'token', 'digital', 'art', 'collectible', 'metaverse']
  }

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(k => keyword.includes(k))) {
      return category
    }
  }

  return 'other'
} 