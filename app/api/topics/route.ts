import { NextResponse } from 'next/server'
import { getSocialFeeds, SocialFeed } from '@/app/utils/social-feeds'
import axios from 'axios'
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

// 임시 데이터 - 실제로는 데이터베이스나 외부 API에서 가져와야 합니다
const topics = [
  {
    id: '1',
    name: '비트코인',
    description: '가장 큰 시가총액을 가진 암호화폐',
    mentions: 1500,
    lastMentioned: new Date().toISOString(),
    category: 'Layer 1',
    relatedNews: [
      {
        title: '비트코인, 사상 최고가 경신',
        url: 'https://example.com/news/1',
        source: 'Crypto News',
        publishedAt: new Date().toISOString()
      }
    ]
  },
  {
    id: '2',
    name: '이더리움',
    description: '스마트 컨트랙트 플랫폼',
    mentions: 1200,
    lastMentioned: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    category: 'Layer 1',
    relatedNews: [
      {
        title: '이더리움 2.0 업그레이드 진행 중',
        url: 'https://example.com/news/2',
        source: 'ETH News',
        publishedAt: new Date().toISOString()
      }
    ]
  },
  {
    id: '3',
    name: '디파이',
    description: '탈중앙화 금융 서비스',
    mentions: 800,
    lastMentioned: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    category: 'DeFi',
    relatedNews: [
      {
        title: '디파이 프로토콜 총 잠긴 가치 1000억 달러 돌파',
        url: 'https://example.com/news/3',
        source: 'DeFi Pulse',
        publishedAt: new Date().toISOString()
      }
    ]
  }
]

// 채널 ID 목록
const CHANNEL_IDS = [
  'UCtOV5M-T3GcsJAq8QKaf0lg', // otaverse
  'UCJ5v_MCY6GNUBTO8-D3XoAg', // algoran
  'UCdU1KXQFD2T9QlPR-5mG5tA', // BitcoinMagazine
  'UCWZ_8TWTJ3J6z8TzU-Ih1Cg', // BinanceYoutube
  'UCqK_GSMbpiV8spgD3ZGloSw', // aantonop
  'UC6rBzSz6qQbWnaG3SAkZgOA'  // Bitcoin.com
]

// RSS 피드에서 비디오 ID 추출
function extractVideoId(url: string): string {
  const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)
  return match ? match[1] : ''
}

// RSS 피드 파싱
async function parseRSSFeed(feedUrl: string) {
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
    
    if (!result.feed?.entry) {
      return []
    }
    
    const items = Array.isArray(result.feed.entry) ? result.feed.entry : [result.feed.entry]
    return items.map((item: any) => {
      const videoId = extractVideoId(item.link.href)
      const mediaGroup = item['media:group'] || {}
      const thumbnail = mediaGroup['media:thumbnail'] || {}
      
      return {
        id: videoId,
        title: item.title,
        description: mediaGroup['media:description'] || '',
        publishedAt: item.published,
        channelTitle: item.author?.name || 'Unknown Channel',
        thumbnailUrl: thumbnail.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        formattedDate: new Date(item.published).toLocaleDateString()
      }
    })
  } catch (error) {
    console.error('Error parsing RSS feed:', error)
    return []
  }
}

// 최신 비디오 가져오기
async function getLatestVideos() {
  const videos = []
  let successCount = 0
  
  for (const channelId of CHANNEL_IDS) {
    try {
      const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
      const channelVideos = await parseRSSFeed(feedUrl)
      if (channelVideos.length > 0) {
        videos.push(...channelVideos)
        successCount++
      }
    } catch (error) {
      console.error(`Error fetching videos for channel ${channelId}:`, error)
      continue
    }
  }

  if (successCount === 0) {
    throw new Error('Failed to fetch videos from any channel')
  }

  return videos.sort((a, b) => 
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  ).slice(0, 20)
}

export async function GET() {
  try {
    return NextResponse.json(topics)
  } catch (error) {
    return NextResponse.json(
      { error: '토픽 데이터를 가져오는데 실패했습니다.' },
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