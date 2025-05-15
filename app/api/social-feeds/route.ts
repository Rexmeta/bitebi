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
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const platform = searchParams.get('platform')
  const keyword = searchParams.get('keyword')?.toLowerCase()
  const limit = 20

  try {
    const posts: SocialPost[] = []

    // Twitter 피드
    if (!platform || platform === 'twitter') {
      for (const account of TWITTER_ACCOUNTS) {
        try {
          const response = await axios.get(`https://nitter.net/${account}/rss`, {
            timeout: 5000,
            responseType: 'text'
          })
          const feed = await parser.parseString(response.data)
          
          feed.items.slice(0, 5).forEach(item => {
            const content = item.title || ''
            const keywords = KEYWORDS.filter(kw => 
              content.toLowerCase().includes(kw.toLowerCase())
            )
            
            if (keywords.length > 0) {
              posts.push({
                id: item.guid || item.link || '',
                platform: 'twitter',
                author: account,
                content,
                timestamp: item.pubDate || '',
                link: item.link || '',
                keywords,
                engagement: {
                  likes: parseInt(item.description?.match(/(\d+) likes/)?.[1] || '0'),
                  shares: parseInt(item.description?.match(/(\d+) retweets/)?.[1] || '0')
                }
              })
            }
          })
        } catch (e) {
          console.error(`Twitter feed error for ${account}:`, e)
        }
      }
    }

    // Reddit 피드
    if (!platform || platform === 'reddit') {
      for (const subreddit of REDDIT_SUBREDDITS) {
        try {
          const response = await axios.get(
            `https://www.reddit.com/r/${subreddit}/hot/.rss`,
            { timeout: 5000 }
          )
          const feed = await parser.parseString(response.data)
          
          feed.items.slice(0, 3).forEach(item => {
            const content = item.title || ''
            const keywords = KEYWORDS.filter(kw => 
              content.toLowerCase().includes(kw.toLowerCase())
            )
            
            if (keywords.length > 0) {
              posts.push({
                id: item.guid || item.link || '',
                platform: 'reddit',
                author: `r/${subreddit}`,
                content,
                timestamp: item.pubDate || '',
                link: item.link || '',
                keywords,
                engagement: {
                  comments: parseInt(item.description?.match(/(\d+) comments/)?.[1] || '0')
                }
              })
            }
          })
        } catch (e) {
          console.error(`Reddit feed error for ${subreddit}:`, e)
        }
      }
    }

    // Telegram 피드
    if (!platform || platform === 'telegram') {
      const bot = new Telegram(process.env.TELEGRAM_BOT_TOKEN!)
      
      for (const channel of TELEGRAM_CHANNELS) {
        try {
          const messages = await bot.getUpdates({ 
            allowed_updates: ['channel_post'],
            limit: 5
          })
          
          messages.forEach(msg => {
            if (msg.channel_post?.text) {
              const content = msg.channel_post.text
              const keywords = KEYWORDS.filter(kw => 
                content.toLowerCase().includes(kw.toLowerCase())
              )
              
              if (keywords.length > 0) {
                posts.push({
                  id: `${channel}-${msg.update_id}`,
                  platform: 'telegram',
                  author: channel,
                  content,
                  timestamp: new Date(msg.channel_post.date * 1000).toISOString(),
                  link: `https://t.me/${channel}/${msg.channel_post.message_id}`,
                  keywords,
                  engagement: {
                    views: msg.channel_post.views
                  }
                })
              }
            }
          })
        } catch (e) {
          console.error(`Telegram feed error for ${channel}:`, e)
        }
      }
    }

    // 키워드 필터링
    let filteredPosts = posts
    if (keyword) {
      filteredPosts = posts.filter(post => 
        post.keywords?.some(kw => kw.toLowerCase().includes(keyword))
      )
    }

    // 시간순 정렬
    filteredPosts.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    // 페이지네이션
    const start = (page - 1) * limit
    const paginatedPosts = filteredPosts.slice(start, start + limit)
    const hasMore = filteredPosts.length > start + limit

    return NextResponse.json({ 
      success: true,
      posts: paginatedPosts,
      hasMore,
      total: filteredPosts.length
    })
  } catch (e) {
    console.error('[SOCIAL FEEDS ERROR]', e)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch social feeds' 
    }, { status: 500 })
  }
} 