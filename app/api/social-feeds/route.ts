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
          // 텔레그램 API를 통해 채널 메시지 가져오기
          const response = await axios.get(
            `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getUpdates`,
            {
              params: {
                allowed_updates: ['channel_post'],
                limit: 10
              }
            }
          )

          if (response.data.ok) {
            const channelPosts = response.data.result
              .filter((update: any) => update.channel_post)
              .map((update: any) => ({
                id: `telegram-${update.update_id}`,
                platform: 'telegram' as const,
                author: channel,
                content: update.channel_post?.text || '',
                timestamp: new Date(update.channel_post?.date * 1000).toISOString(),
                link: `https://t.me/${channel}`,
                engagement: {
                  views: update.channel_post?.views
                }
              }))
            posts = [...posts, ...channelPosts]
          }
        } catch (error) {
          console.error(`Telegram channel ${channel} error:`, error)
        }
      }
    }

    // 키워드 필터링
    if (keyword) {
      posts = posts.filter(post => 
        post.content.toLowerCase().includes(keyword.toLowerCase()) ||
        KEYWORDS.some(kw => post.content.toLowerCase().includes(kw.toLowerCase()))
      )
    }

    // 최신순 정렬
    posts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

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