import { NextRequest, NextResponse } from 'next/server'
import { XMLParser } from 'fast-xml-parser'
import type { YouTubeChannel, YouTubeVideo, YouTubeCategory, YouTubeLanguage } from '../../types'

const CHANNELS: YouTubeChannel[] = [
  { id: 'UCzbpiKRG28T50WlNEzNlSIQ', name: '크립토 팩트', language: 'ko', category: '시장 분석' },
  { id: 'UCLo-Trw-byo_n4tXb6631Ng', name: '크립토 톡스', language: 'ko', category: '뉴스' },
  { id: 'UCxfPHtfRL4gwxo3U1sY_cXw', name: '크립토 머니랩', language: 'ko', category: '시장 분석' },
  { id: 'UCcE8ajx3I2N-FF0-9GOEJbA', name: '코인만랩', language: 'ko', category: '뉴스' },
  { id: 'UC-oJfTuiIIs5fQpxQvZD8DA', name: '웹3 스쿨', language: 'ko', category: '교육/입문' },
  { id: 'UCaxivA1QU3kAyMAnvls1Ssw', name: '재핀', language: 'ko', category: '시장 분석' },
  { id: 'UC7uFGmwzzXok18RdOh9FDfQ', name: 'algoran 알고란', language: 'ko', category: '기술/개발' },
  { id: 'UCqK_GSMbpiV8spgD3ZGloSw', name: 'Coin Bureau', language: 'en', category: '교육/입문' },
  { id: 'UCY0xL8V6NzzFcwzHCgB8orQ', name: 'Dapp University', language: 'en', category: '기술/개발' },
  { id: 'UCLnQ34ZBSjy2JQjeRudFEDw', name: 'The Cryptoverse', language: 'en', category: '시장 분석' },
  { id: 'UCiUnrCUGCJTCC7KjuW493Ww', name: 'Crypto Zombie', language: 'en', category: '뉴스' },
  { id: 'UCavTvSwEoRABvnPtLg0e6LQ', name: 'Crypto Tips', language: 'en', category: '교육/입문' },
  { id: 'UCRvqjQPSeaWn-uEx-w0XOIg', name: 'Benjamin Cowen', language: 'en', category: '시장 분석' },
  { id: 'UCMtJYS0PrtiUwlk6zjGDEMA', name: 'EllioTrades', language: 'en', category: '시장 분석' },
  { id: 'UCbLhGKVY-bJPcawebgtNfbw', name: 'Altcoin Daily', language: 'en', category: '뉴스' },
  { id: 'UC4nXWTjZqK4bv7feoRntSog', name: 'Coin Mastery', language: 'en', category: '시장 분석' },
  { id: 'UCCatR7nWbYrkVXdxXb4cGXw', name: 'DataDash', language: 'en', category: '시장 분석' },
]

interface CacheEntry {
  data: YouTubeVideo[]
  timestamp: number
}

interface RSSEntry {
  'yt:videoId'?: string
  title?: string
  published?: string
  author?: { name?: string }
  'media:group'?: {
    'media:description'?: string
    'media:thumbnail'?: { '@_url'?: string; url?: string }
  }
}

const cache = new Map<string, CacheEntry>()
const CACHE_TTL = 5 * 60 * 1000

async function parseRSSFeed(channel: YouTubeChannel): Promise<YouTubeVideo[]> {
  const cacheKey = `channel_${channel.id}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  try {
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.id}`
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    if (!response.ok) {
      console.error(`Failed to fetch RSS feed for ${channel.name}: ${response.status}`)
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

    const items: RSSEntry[] = Array.isArray(result.feed.entry) ? result.feed.entry : [result.feed.entry]
    const videos: YouTubeVideo[] = items.map((item: RSSEntry) => {
      const videoId = item['yt:videoId'] || ''
      const mediaGroup = item['media:group'] || {}
      const thumbnail = mediaGroup['media:thumbnail'] || {}

      return {
        id: videoId,
        title: item.title || '',
        description: mediaGroup['media:description'] || '',
        publishedAt: item.published || '',
        channelTitle: item.author?.name || channel.name,
        thumbnailUrl: thumbnail['@_url'] || thumbnail.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        formattedDate: new Date(item.published || '').toLocaleDateString(),
        category: channel.category,
        language: channel.language,
        channelId: channel.id,
      }
    })

    cache.set(cacheKey, { data: videos, timestamp: Date.now() })
    return videos
  } catch (error) {
    console.error(`Error parsing RSS feed for ${channel.name}:`, error)
    return []
  }
}

export const dynamic = 'force-dynamic'

const VALID_LANGUAGES: YouTubeLanguage[] = ['ko', 'en']
const VALID_CATEGORIES: YouTubeCategory[] = ['시장 분석', '교육/입문', '뉴스', '기술/개발']

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const languageParam = searchParams.get('language')
    const categoryParam = searchParams.get('category')
    const channelId = searchParams.get('channelId')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20))

    const language: YouTubeLanguage | null = languageParam && VALID_LANGUAGES.includes(languageParam as YouTubeLanguage)
      ? (languageParam as YouTubeLanguage)
      : null
    const category: YouTubeCategory | null = categoryParam && VALID_CATEGORIES.includes(categoryParam as YouTubeCategory)
      ? (categoryParam as YouTubeCategory)
      : null

    let filteredChannels = CHANNELS
    if (language) {
      filteredChannels = filteredChannels.filter(c => c.language === language)
    }
    if (category) {
      filteredChannels = filteredChannels.filter(c => c.category === category)
    }
    if (channelId) {
      filteredChannels = filteredChannels.filter(c => c.id === channelId)
    }

    const allVideos = await Promise.all(filteredChannels.map(ch => parseRSSFeed(ch)))
    const videos = allVideos.flat()

    videos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())

    const total = videos.length
    const start = (page - 1) * limit
    const paginatedVideos = videos.slice(start, start + limit)

    const highlightMap = new Map<string, YouTubeVideo>()
    for (const v of videos) {
      if (!highlightMap.has(v.channelId)) {
        highlightMap.set(v.channelId, v)
      }
    }
    const highlights = Array.from(highlightMap.values())

    return NextResponse.json({
      success: true,
      videos: paginatedVideos,
      highlights,
      channels: CHANNELS,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error in YouTube API route:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch videos' },
      { status: 500 }
    )
  }
}
