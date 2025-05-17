import axios from 'axios'

const TELEGRAM_BOT_TOKEN = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN
const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN

// API 키 확인을 위한 로깅 추가
console.log('Telegram Bot Token:', TELEGRAM_BOT_TOKEN ? '설정됨' : '설정되지 않음')

// 주요 비트코인 텔레그램 채널 목록
const TELEGRAM_CHANNELS = [
  'bitcoin',
  'cryptosignals',
  'cryptodaily',
  'cryptonews',
  'bitcoinnews'
]

export interface SocialFeed {
  id: string
  content: string
  author: string
  platform: 'twitter' | 'reddit' | 'telegram'
  timestamp: string
  url: string
  likes?: number
  retweets?: number
  comments?: number
}

export async function getSocialFeeds(): Promise<SocialFeed[]> {
  const feeds: SocialFeed[] = []

  try {
    // Twitter 피드 가져오기
    if (TWITTER_BEARER_TOKEN) {
      try {
        const twitterFeeds = await getTwitterFeeds()
        feeds.push(...twitterFeeds)
      } catch (error) {
        console.error('Twitter feeds error:', error)
      }
    }

    // Reddit 피드 가져오기
    try {
      const redditFeeds = await getRedditFeeds()
      feeds.push(...redditFeeds)
    } catch (error) {
      console.error('Reddit feeds error:', error)
    }

    // Telegram 피드 가져오기
    if (TELEGRAM_BOT_TOKEN) {
      try {
        const telegramFeeds = await getTelegramFeeds()
        feeds.push(...telegramFeeds)
      } catch (error) {
        console.error('Telegram feeds error:', error)
      }
    }

    // 타임스탬프 기준으로 정렬
    return feeds.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  } catch (error) {
    console.error('Error fetching social feeds:', error)
    return []
  }
}

async function getTwitterFeeds(): Promise<SocialFeed[]> {
  try {
    const response = await axios.get(
      'https://api.twitter.com/2/tweets/search/recent',
      {
        params: {
          query: 'bitcoin OR btc',
          max_results: 10,
          'tweet.fields': 'created_at,public_metrics'
        },
        headers: {
          Authorization: `Bearer ${TWITTER_BEARER_TOKEN}`
        }
      }
    )

    return response.data.data.map((tweet: any) => ({
      id: tweet.id,
      content: tweet.text,
      author: tweet.author_id,
      platform: 'twitter',
      timestamp: tweet.created_at,
      url: `https://twitter.com/user/status/${tweet.id}`,
      likes: tweet.public_metrics.like_count,
      retweets: tweet.public_metrics.retweet_count
    }))
  } catch (error) {
    console.error('Error fetching Twitter feeds:', error)
    return []
  }
}

async function getRedditFeeds(): Promise<SocialFeed[]> {
  try {
    const response = await axios.get(
      'https://www.reddit.com/r/Bitcoin/hot.json',
      {
        params: {
          limit: 10
        }
      }
    )

    return response.data.data.children.map((post: any) => ({
      id: post.data.id,
      content: post.data.title,
      author: post.data.author,
      platform: 'reddit',
      timestamp: new Date(post.data.created_utc * 1000).toISOString(),
      url: `https://reddit.com${post.data.permalink}`,
      likes: post.data.ups,
      comments: post.data.num_comments
    }))
  } catch (error) {
    console.error('Error fetching Reddit feeds:', error)
    return []
  }
}

async function getTelegramFeeds(): Promise<SocialFeed[]> {
  try {
    if (!TELEGRAM_BOT_TOKEN) {
      console.error('Telegram bot token is not configured')
      return []
    }

    const feeds: SocialFeed[] = []

    for (const channel of TELEGRAM_CHANNELS) {
      try {
        // 채널의 최근 메시지 가져오기
        const response = await axios.get(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getChatHistory`,
          {
            params: {
              chat_id: `@${channel}`,
              limit: 10
            },
            timeout: 5000
          }
        )

        if (!response.data.ok) {
          console.warn(`Failed to get messages for @${channel}`)
          continue
        }

        const messages = response.data.result.messages || []
        
        messages.forEach((message: any) => {
          if (message.text && message.text.toLowerCase().includes('bitcoin')) {
            feeds.push({
              id: message.id.toString(),
              content: message.text,
              author: channel,
              platform: 'telegram',
              timestamp: new Date(message.date * 1000).toISOString(),
              url: `https://t.me/${channel}/${message.id}`
            })
          }
        })
      } catch (channelError) {
        console.error(`Error fetching channel @${channel}:`, channelError)
        continue
      }
    }

    return feeds
  } catch (error) {
    console.error('Error fetching Telegram feeds:', error)
    return []
  }
} 