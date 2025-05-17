import axios from 'axios'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN

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
      const twitterFeeds = await getTwitterFeeds()
      feeds.push(...twitterFeeds)
    }

    // Reddit 피드 가져오기
    const redditFeeds = await getRedditFeeds()
    feeds.push(...redditFeeds)

    // Telegram 피드 가져오기
    if (TELEGRAM_BOT_TOKEN) {
      const telegramFeeds = await getTelegramFeeds()
      feeds.push(...telegramFeeds)
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
    if (!TELEGRAM_BOT_TOKEN) return []

    // Telegram API를 직접 호출
    const response = await axios.get(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates`,
      {
        params: {
          offset: -1,
          limit: 10,
          timeout: 0,
          allowed_updates: ['channel_post', 'message']
        }
      }
    )

    return response.data.result
      .filter((update: any) => {
        const message = update.channel_post || update.message
        return message && message.text && message.text.toLowerCase().includes('bitcoin')
      })
      .map((update: any) => {
        const message = update.channel_post || update.message
        return {
          id: message.message_id.toString(),
          content: message.text,
          author: message.from?.username || 'Unknown',
          platform: 'telegram',
          timestamp: new Date(message.date * 1000).toISOString(),
          url: `https://t.me/${message.chat.username}/${message.message_id}`
        }
      })
  } catch (error) {
    console.error('Error fetching Telegram feeds:', error)
    return []
  }
} 