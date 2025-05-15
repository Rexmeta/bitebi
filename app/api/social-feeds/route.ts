import { NextResponse } from 'next/server'
import axios from 'axios'
import Parser from 'rss-parser'
import { Telegram } from 'telegraf'

const parser = new Parser()

interface SocialPost {
  id: string
  platform: 'twitter' | 'reddit' | 'telegram'
  author: string
  content: string
  timestamp: string
  link: string
  engagement?: {
    likes?: number
    comments?: number
    shares?: number
    views?: number
  }
  keywords?: string[]
}

const TWITTER_ACCOUNTS = [
  'cz_binance',
  'saylor',
  'VitalikButerin',
  'elonmusk',
  'CryptoCapo_'
]

const REDDIT_SUBREDDITS = [
  'Bitcoin',
  'CryptoCurrency',
  'CryptoMarkets'
]

const TELEGRAM_CHANNELS = [
  'binancekr',
  'upbitglobal',
  'cryptodaily'
]

const KEYWORDS = [
  'bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'blockchain',
  '비트코인', '이더리움', '크립토', '블록체인'
]

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const platform = searchParams.get('platform')
    const keyword = searchParams.get('keyword')

    // 임시 데이터 (실제로는 각 플랫폼 API에서 데이터를 가져와야 함)
    const mockPosts = Array.from({ length: 10 }, (_, i) => ({
      id: `post-${page}-${i}`,
      platform: platform || ['twitter', 'reddit', 'telegram'][Math.floor(Math.random() * 3)],
      author: `User${i}`,
      content: `This is a sample post ${i} about #Bitcoin and #Crypto`,
      timestamp: new Date(Date.now() - i * 3600000).toISOString(),
      link: 'https://example.com',
      engagement: {
        likes: Math.floor(Math.random() * 1000),
        comments: Math.floor(Math.random() * 100),
      }
    }))

    return NextResponse.json({
      success: true,
      posts: mockPosts,
      hasMore: page < 5 // 5페이지까지만 제공
    })
  } catch (e) {
    console.error('[SOCIAL FEEDS ERROR]', e)
    return NextResponse.json({
      success: false,
      error: '소셜 피드를 가져오는데 실패했습니다.'
    })
  }
} 