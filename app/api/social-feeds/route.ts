import { NextResponse } from 'next/server'
import axios from 'axios'
import Parser from 'rss-parser'

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
  }
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

export async function GET() {
  try {
    const posts: SocialPost[] = []

    // Twitter RSS 피드 (Nitter를 통해)
    for (const account of TWITTER_ACCOUNTS) {
      try {
        const response = await axios.get(`https://nitter.net/${account}/rss`, {
          timeout: 5000,
          responseType: 'text'
        })
        const feed = await parser.parseString(response.data)
        
        feed.items.slice(0, 5).forEach(item => {
          if (item.title?.toLowerCase().includes('bitcoin') || 
              item.title?.toLowerCase().includes('crypto')) {
            posts.push({
              id: item.guid || item.link || '',
              platform: 'twitter',
              author: account,
              content: item.title || '',
              timestamp: item.pubDate || '',
              link: item.link || '',
            })
          }
        })
      } catch (e) {
        console.error(`Twitter feed error for ${account}:`, e)
      }
    }

    // Reddit RSS 피드
    for (const subreddit of REDDIT_SUBREDDITS) {
      try {
        const response = await axios.get(
          `https://www.reddit.com/r/${subreddit}/hot/.rss`,
          { timeout: 5000 }
        )
        const feed = await parser.parseString(response.data)
        
        feed.items.slice(0, 3).forEach(item => {
          posts.push({
            id: item.guid || item.link || '',
            platform: 'reddit',
            author: `r/${subreddit}`,
            content: item.title || '',
            timestamp: item.pubDate || '',
            link: item.link || '',
          })
        })
      } catch (e) {
        console.error(`Reddit feed error for ${subreddit}:`, e)
      }
    }

    // 시간순 정렬
    posts.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    return NextResponse.json({ success: true, posts })
  } catch (e) {
    console.error('[SOCIAL FEEDS ERROR]', e)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch social feeds' 
    }, { status: 500 })
  }
} 