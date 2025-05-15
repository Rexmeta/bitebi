import { NextResponse } from 'next/server'
import axios from 'axios'
import Parser from 'rss-parser'
import { Telegram } from 'telegraf'

const parser = new Parser()
const telegram = new Telegram(process.env.TELEGRAM_BOT_TOKEN || '')

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
    
    let posts: SocialPost[] = []

    if (!platform || platform === 'telegram') {
      // 텔레그램 채널에서 메시지 가져오기
      for (const channel of TELEGRAM_CHANNELS) {
        try {
          const messages = await telegram.getUpdates()
          const channelPosts = messages
            .filter(msg => msg.channel_post)
            .map(msg => ({
              id: `telegram-${msg.update_id}`,
              platform: 'telegram',
              author: channel,
              content: msg.channel_post?.text || '',
              timestamp: new Date(msg.channel_post?.date * 1000).toISOString(),
              link: `https://t.me/${channel}`,
              engagement: {
                views: msg.channel_post?.views
              }
            }))
          posts = [...posts, ...channelPosts]
        } catch (error) {
          console.error(`Telegram channel ${channel} error:`, error)
        }
      }
    }

    // 키워드 필터링
    if (keyword) {
      posts = posts.filter(post => 
        post.content.toLowerCase().includes(keyword.toLowerCase())
      )
    }

    // 페이지네이션
    const postsPerPage = 10
    const start = (page - 1) * postsPerPage
    const end = start + postsPerPage
    const paginatedPosts = posts.slice(start, end)

    return NextResponse.json({
      success: true,
      posts: paginatedPosts,
      hasMore: end < posts.length
    })
  } catch (e) {
    console.error('[SOCIAL FEEDS ERROR]', e)
    return NextResponse.json({
      success: false,
      error: '소셜 피드를 가져오는데 실패했습니다.'
    })
  }
} 